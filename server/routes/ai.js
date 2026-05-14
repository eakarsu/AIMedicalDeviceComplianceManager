const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');

router.use(auth);
router.use(aiRateLimiter);

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

async function callOpenRouter(messages) {
  if (!process.env.OPENROUTER_API_KEY) {
    const err = new Error('AI service unavailable: OPENROUTER_API_KEY is not configured');
    err.status = 503;
    throw err;
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:4000',
      'X-Title': 'AI Medical Device Compliance Manager',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * parseAIJson: 3-strategy parser
 * Strategy 1: direct JSON.parse
 * Strategy 2: strip markdown code fences
 * Strategy 3: extract first {...} block
 */
function parseAIJson(text) {
  try { return JSON.parse(text.trim()); } catch (_) {}
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) { try { return JSON.parse(fenceMatch[1].trim()); } catch (_) {} }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch (_) {} }
  return null;
}

async function saveAnalysis(analysisType, entityType, entityId, prompt, result, model) {
  try {
    await pool.query(
      'INSERT INTO ai_analyses (analysis_type, entity_type, entity_id, prompt, result, model_used) VALUES ($1,$2,$3,$4,$5,$6)',
      [analysisType, entityType, entityId, prompt, result, model || MODEL]
    );
  } catch (err) {
    console.error('Failed to save AI analysis:', err.message);
  }
}

function buildResponse(type, result, structured) {
  return {
    success: true,
    analysis: {
      type,
      result,
      structured: structured || null,
      model: MODEL,
      created_at: new Date().toISOString(),
    },
  };
}

// POST /api/ai/compliance-analysis
router.post('/compliance-analysis', async (req, res) => {
  try {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id is required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [device_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const checklistsResult = await pool.query(
      `SELECT c.*, s.code as standard_code, s.name as standard_name
       FROM compliance_checklists c
       LEFT JOIN regulatory_standards s ON c.standard_id = s.id
       WHERE c.device_id = $1`, [device_id]
    );

    const risksResult = await pool.query(
      'SELECT * FROM risk_assessments WHERE device_id = $1', [device_id]
    );

    const userPrompt = `Analyze the compliance status for this medical device. Return JSON only — no markdown, no prose.

Device Information:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- Status: ${device.status}
- FDA Clearance: ${device.fda_clearance_number || 'None'}
- CE Marking: ${device.ce_marking ? 'Yes' : 'No'}
- Description: ${device.description || 'N/A'}

Compliance Checklists (${checklistsResult.rows.length} items):
${checklistsResult.rows.map(c => `- ${c.item_name} | Standard: ${c.standard_code || 'N/A'} | Status: ${c.status} | Priority: ${c.priority}`).join('\n') || 'No checklist items found.'}

Risk Assessments (${risksResult.rows.length} items):
${risksResult.rows.map(r => `- Hazard: ${r.hazard} | Category: ${r.risk_category} | Severity: ${r.severity} | Probability: ${r.probability} | Risk Level: ${r.risk_level} | Status: ${r.status}`).join('\n') || 'No risk assessments found.'}

Return JSON: { "compliance_status": "compliant|partial|non-compliant", "risk_level": "low|medium|high|critical", "gaps": [{"regulation": "", "gap_description": "", "severity": "low|medium|high|critical", "remediation": ""}], "overall_score": (0-100), "summary": "string" }`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device regulatory compliance consultant with deep knowledge of FDA 21 CFR, ISO 13485, IEC 62304, ISO 14971, EU MDR, and other relevant standards. Provide thorough, actionable compliance analysis.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('compliance_analysis', 'device', device_id, userPrompt, aiResult);

    const structured = parseAIJson(aiResult);
    res.json(buildResponse('compliance_analysis', aiResult, structured));
  } catch (err) {
    console.error('Compliance analysis error:', err);
    res.status(500).json({ error: 'Failed to perform compliance analysis' });
  }
});

// POST /api/ai/risk-prediction
router.post('/risk-prediction', async (req, res) => {
  try {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id is required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [device_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const risksResult = await pool.query('SELECT * FROM risk_assessments WHERE device_id = $1', [device_id]);

    const userPrompt = `Based on this medical device information and existing risk assessments, predict potential risks. Return JSON only.

Device Information:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- Status: ${device.status}
- Description: ${device.description || 'N/A'}
- Department: ${device.department || 'N/A'}

Existing Risk Assessments (${risksResult.rows.length} items):
${risksResult.rows.map(r => `- Hazard: ${r.hazard} | Category: ${r.risk_category} | Severity: ${r.severity} | Probability: ${r.probability} | Risk Level: ${r.risk_level} | Mitigation: ${r.mitigation || 'None'} | Residual Risk: ${r.residual_risk_level || 'N/A'} | Status: ${r.status}`).join('\n') || 'No existing risk assessments.'}

Return JSON: { "risk_score": (0-100), "risk_category": "string", "failure_modes": ["string"], "mitigation_actions": ["string"], "priority": "immediate|short-term|long-term", "summary": "string" }`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device risk management specialist with deep knowledge of ISO 14971, IEC 62366, and FDA guidance on risk management. Provide thorough risk predictions and mitigation strategies.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('risk_prediction', 'device', device_id, userPrompt, aiResult);

    const structured = parseAIJson(aiResult);
    res.json(buildResponse('risk_prediction', aiResult, structured));
  } catch (err) {
    console.error('Risk prediction error:', err);
    res.status(500).json({ error: 'Failed to perform risk prediction' });
  }
});

// POST /api/ai/gap-analysis
router.post('/gap-analysis', async (req, res) => {
  try {
    const { device_id, standard_id } = req.body;
    if (!device_id || !standard_id) return res.status(400).json({ error: 'device_id and standard_id are required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [device_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const standardResult = await pool.query('SELECT * FROM regulatory_standards WHERE id = $1', [standard_id]);
    if (standardResult.rows.length === 0) return res.status(404).json({ error: 'Standard not found' });
    const standard = standardResult.rows[0];

    const checklistsResult = await pool.query(
      'SELECT * FROM compliance_checklists WHERE device_id = $1 AND standard_id = $2', [device_id, standard_id]
    );

    const userPrompt = `Perform a regulatory gap analysis for the following medical device against the specified standard.

Device Information:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- Status: ${device.status}
- Description: ${device.description || 'N/A'}
- FDA Clearance: ${device.fda_clearance_number || 'None'}
- CE Marking: ${device.ce_marking ? 'Yes' : 'No'}

Regulatory Standard:
- Code: ${standard.code}
- Name: ${standard.name}
- Category: ${standard.category || 'N/A'}
- Authority: ${standard.authority || 'N/A'}
- Version: ${standard.version || 'N/A'}
- Requirements: ${standard.requirements || 'N/A'}

Current Compliance Checklist Items (${checklistsResult.rows.length} items):
${checklistsResult.rows.map(c => `- ${c.item_name} | Status: ${c.status} | Priority: ${c.priority} | Evidence: ${c.evidence || 'None'} | Notes: ${c.notes || 'None'}`).join('\n') || 'No checklist items for this device-standard combination.'}

Please provide:
1. Identified regulatory gaps
2. Missing compliance requirements
3. Areas of partial compliance
4. Recommended actions to close each gap
5. Estimated effort and priority for each gap
6. Documentation requirements`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device regulatory affairs specialist with comprehensive knowledge of FDA regulations, ISO standards, EU MDR, and global medical device regulations. Provide detailed gap analysis with actionable remediation steps.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('gap_analysis', 'device', device_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('gap_analysis', aiResult));
  } catch (err) {
    console.error('Gap analysis error:', err);
    res.status(500).json({ error: 'Failed to perform gap analysis' });
  }
});

// POST /api/ai/document-review
router.post('/document-review', async (req, res) => {
  try {
    const { document_id } = req.body;
    if (!document_id) return res.status(400).json({ error: 'document_id is required' });

    const docResult = await pool.query(
      `SELECT doc.*, d.name as device_name
       FROM documents doc
       LEFT JOIN devices d ON doc.device_id = d.id
       WHERE doc.id = $1`, [document_id]
    );
    if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    const doc = docResult.rows[0];

    const userPrompt = `Review the following medical device regulatory document and suggest improvements.

Document Information:
- Title: ${doc.title}
- Type: ${doc.document_type}
- Version: ${doc.version}
- Status: ${doc.status}
- Device: ${doc.device_name || 'N/A'}
- Author: ${doc.author || 'N/A'}
- Approved By: ${doc.approved_by || 'Not approved'}
- Approved Date: ${doc.approved_date || 'N/A'}
- Description: ${doc.description || 'N/A'}
- File Path: ${doc.file_path || 'N/A'}

Please provide:
1. Document completeness assessment
2. Regulatory compliance review
3. Suggested improvements and additions
4. Formatting and structure recommendations
5. Required cross-references to other documents
6. Approval workflow recommendations`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device quality management document reviewer with deep knowledge of FDA QSR, ISO 13485 documentation requirements, and technical writing best practices for regulatory submissions.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('document_review', 'document', document_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('document_review', aiResult));
  } catch (err) {
    console.error('Document review error:', err);
    res.status(500).json({ error: 'Failed to perform document review' });
  }
});

// POST /api/ai/audit-report
router.post('/audit-report', async (req, res) => {
  try {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id is required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [device_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const checklistsResult = await pool.query(
      `SELECT c.*, s.code as standard_code FROM compliance_checklists c
       LEFT JOIN regulatory_standards s ON c.standard_id = s.id
       WHERE c.device_id = $1`, [device_id]
    );

    const risksResult = await pool.query('SELECT * FROM risk_assessments WHERE device_id = $1', [device_id]);
    const docsResult = await pool.query('SELECT * FROM documents WHERE device_id = $1', [device_id]);
    const capaResult = await pool.query('SELECT * FROM capa_records WHERE device_id = $1', [device_id]);
    const ncrResult = await pool.query('SELECT * FROM nonconformance_reports WHERE device_id = $1', [device_id]);
    const ccResult = await pool.query('SELECT * FROM change_controls WHERE device_id = $1', [device_id]);
    const calResult = await pool.query('SELECT * FROM calibration_records WHERE device_id = $1', [device_id]);

    const userPrompt = `Generate a comprehensive audit report for the following medical device and all its related compliance data.

Device Information:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Serial Number: ${device.serial_number || 'N/A'}
- Class: ${device.device_class}
- Status: ${device.status}
- Department: ${device.department || 'N/A'}
- Description: ${device.description || 'N/A'}
- FDA Clearance: ${device.fda_clearance_number || 'None'}
- CE Marking: ${device.ce_marking ? 'Yes' : 'No'}
- Last Inspection: ${device.last_inspection || 'N/A'}
- Next Inspection: ${device.next_inspection || 'N/A'}

Compliance Checklists (${checklistsResult.rows.length} items):
${checklistsResult.rows.map(c => `- ${c.item_name} | Standard: ${c.standard_code || 'N/A'} | Status: ${c.status} | Priority: ${c.priority}`).join('\n') || 'None'}

Risk Assessments (${risksResult.rows.length} items):
${risksResult.rows.map(r => `- ${r.hazard} | Level: ${r.risk_level} | Status: ${r.status}`).join('\n') || 'None'}

Documents (${docsResult.rows.length} items):
${docsResult.rows.map(d => `- ${d.title} | Type: ${d.document_type} | Version: ${d.version} | Status: ${d.status}`).join('\n') || 'None'}

CAPA Records (${capaResult.rows.length} items):
${capaResult.rows.map(c => `- ${c.title} | Type: ${c.type} | Status: ${c.status} | Priority: ${c.priority}`).join('\n') || 'None'}

Nonconformance Reports (${ncrResult.rows.length} items):
${ncrResult.rows.map(n => `- ${n.ncr_number}: ${n.title} | Severity: ${n.severity} | Status: ${n.status}`).join('\n') || 'None'}

Change Controls (${ccResult.rows.length} items):
${ccResult.rows.map(c => `- ${c.change_number}: ${c.title} | Type: ${c.change_type} | Status: ${c.status}`).join('\n') || 'None'}

Calibration Records (${calResult.rows.length} items):
${calResult.rows.map(c => `- ${c.equipment_name} | Type: ${c.calibration_type} | Status: ${c.status} | Next: ${c.next_calibration_date || 'N/A'}`).join('\n') || 'None'}

Please generate a comprehensive audit report including:
1. Executive Summary
2. Device Overview and Classification
3. Regulatory Compliance Status
4. Risk Management Summary
5. Documentation Review
6. CAPA and Nonconformance Analysis
7. Change Control Review
8. Calibration Status
9. Key Findings and Observations
10. Recommendations and Action Items
11. Audit Conclusion`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device quality auditor with extensive experience in FDA QSR audits, ISO 13485 audits, and EU MDR compliance assessments. Generate a professional, comprehensive audit report.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('audit_report', 'device', device_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('audit_report', aiResult));
  } catch (err) {
    console.error('Audit report error:', err);
    res.status(500).json({ error: 'Failed to generate audit report' });
  }
});

// POST /api/ai/classification-advisor
router.post('/classification-advisor', async (req, res) => {
  try {
    const { device_description } = req.body;
    if (!device_description) return res.status(400).json({ error: 'device_description is required' });

    const userPrompt = `Based on the following device description, recommend the appropriate FDA medical device classification.

Device Description:
${device_description}

Please provide:
1. Recommended FDA device classification (Class I, II, or III)
2. Likely product code and regulation number
3. Device panel (advisory committee)
4. Justification for the classification
5. Applicable special controls (if Class II)
6. Similar classified devices (predicate examples)
7. Key regulatory requirements for this classification
8. International classification considerations (EU MDR class, etc.)`;

    const messages = [
      { role: 'system', content: 'You are an expert FDA regulatory affairs specialist with comprehensive knowledge of the FDA medical device classification system, product codes, regulation numbers, and classification panels. Provide accurate classification guidance based on 21 CFR Parts 862-892.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('classification_advisor', 'general', null, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('classification_advisor', aiResult));
  } catch (err) {
    console.error('Classification advisor error:', err);
    res.status(500).json({ error: 'Failed to provide classification advice' });
  }
});

// POST /api/ai/regulatory-pathway
router.post('/regulatory-pathway', async (req, res) => {
  try {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id is required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [device_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const userPrompt = `Recommend the most appropriate regulatory pathway for the following medical device.

Device Information:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- Description: ${device.description || 'N/A'}
- FDA Clearance: ${device.fda_clearance_number || 'None'}
- CE Marking: ${device.ce_marking ? 'Yes' : 'No'}

Please provide:
1. Recommended FDA regulatory pathway (510(k), PMA, De Novo, Exempt)
2. Detailed justification for the recommendation
3. Key requirements for the recommended pathway
4. Estimated timeline and costs
5. Required testing and clinical data
6. Comparison with alternative pathways
7. Common pitfalls and how to avoid them
8. Post-market requirements`;

    const messages = [
      { role: 'system', content: 'You are an expert FDA regulatory affairs consultant with deep knowledge of 510(k), PMA, De Novo, and other regulatory pathways. Provide detailed pathway recommendations with practical guidance for medical device manufacturers.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('regulatory_pathway', 'device', device_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('regulatory_pathway', aiResult));
  } catch (err) {
    console.error('Regulatory pathway error:', err);
    res.status(500).json({ error: 'Failed to recommend regulatory pathway' });
  }
});

// POST /api/ai/predicate-finder
router.post('/predicate-finder', async (req, res) => {
  try {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id is required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [device_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const userPrompt = `Suggest potential predicate devices for a 510(k) submission for the following medical device.

Device Information:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- Description: ${device.description || 'N/A'}
- FDA Clearance: ${device.fda_clearance_number || 'None'}

Please provide:
1. Suggested predicate devices (with 510(k) numbers if possible)
2. Substantial equivalence arguments for each predicate
3. Key similarities and differences to address
4. Recommended primary vs. reference predicates
5. Potential challenges with each predicate comparison
6. Testing requirements to demonstrate substantial equivalence
7. Tips for strengthening the predicate comparison`;

    const messages = [
      { role: 'system', content: 'You are an expert FDA 510(k) regulatory affairs specialist with extensive experience in predicate device identification, substantial equivalence arguments, and FDA submissions. Provide practical predicate device suggestions with detailed comparison strategies.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('predicate_finder', 'device', device_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('predicate_finder', aiResult));
  } catch (err) {
    console.error('Predicate finder error:', err);
    res.status(500).json({ error: 'Failed to find predicate devices' });
  }
});

// ==================== STANDARDS MODULE ====================

// POST /api/ai/standard-interpreter
router.post('/standard-interpreter', async (req, res) => {
  try {
    const { standard_id } = req.body;
    if (!standard_id) return res.status(400).json({ error: 'standard_id is required' });

    const standardResult = await pool.query('SELECT * FROM regulatory_standards WHERE id = $1', [standard_id]);
    if (standardResult.rows.length === 0) return res.status(404).json({ error: 'Standard not found' });
    const standard = standardResult.rows[0];

    const userPrompt = `Interpret the following regulatory standard in plain language and provide practical implementation guidance for medical device manufacturers.

Standard Information:
- Code: ${standard.code}
- Name: ${standard.name}
- Category: ${standard.category || 'N/A'}
- Authority: ${standard.authority || 'N/A'}
- Version: ${standard.version || 'N/A'}
- Requirements: ${standard.requirements || 'N/A'}
- Description: ${standard.description || 'N/A'}

Please provide:
1. Plain language summary of the standard
2. Key requirements broken down into actionable items
3. Who this standard applies to and when
4. Practical implementation steps
5. Common pitfalls and how to avoid them
6. Documentation requirements
7. Relationship to other standards
8. Tips for audit readiness`;

    const messages = [
      { role: 'system', content: 'You are an expert regulatory standards interpreter specializing in medical device regulations including ISO 13485, ISO 14971, IEC 62304, IEC 60601, FDA 21 CFR, and EU MDR. Translate complex regulatory language into clear, actionable guidance.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('standard_interpretation', 'standard', standard_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('standard_interpretation', aiResult));
  } catch (err) {
    console.error('Standard interpreter error:', err);
    res.status(500).json({ error: 'Failed to interpret standard' });
  }
});

// POST /api/ai/standard-comparison
router.post('/standard-comparison', async (req, res) => {
  try {
    const { standard_id_1, standard_id_2 } = req.body;
    if (!standard_id_1 || !standard_id_2) return res.status(400).json({ error: 'standard_id_1 and standard_id_2 are required' });

    const standard1Result = await pool.query('SELECT * FROM regulatory_standards WHERE id = $1', [standard_id_1]);
    if (standard1Result.rows.length === 0) return res.status(404).json({ error: 'Standard 1 not found' });
    const standard1 = standard1Result.rows[0];

    const standard2Result = await pool.query('SELECT * FROM regulatory_standards WHERE id = $1', [standard_id_2]);
    if (standard2Result.rows.length === 0) return res.status(404).json({ error: 'Standard 2 not found' });
    const standard2 = standard2Result.rows[0];

    const userPrompt = `Compare the following two regulatory standards side by side for medical device compliance.

Standard 1:
- Code: ${standard1.code}
- Name: ${standard1.name}
- Category: ${standard1.category || 'N/A'}
- Authority: ${standard1.authority || 'N/A'}
- Version: ${standard1.version || 'N/A'}
- Requirements: ${standard1.requirements || 'N/A'}
- Description: ${standard1.description || 'N/A'}

Standard 2:
- Code: ${standard2.code}
- Name: ${standard2.name}
- Category: ${standard2.category || 'N/A'}
- Authority: ${standard2.authority || 'N/A'}
- Version: ${standard2.version || 'N/A'}
- Requirements: ${standard2.requirements || 'N/A'}
- Description: ${standard2.description || 'N/A'}

Please provide:
1. Side-by-side comparison of scope and applicability
2. Overlapping requirements between the two standards
3. Unique requirements in each standard
4. Which to prioritize and in what situations
5. How compliance with one affects compliance with the other
6. Practical strategy for meeting both standards efficiently
7. Key differences in documentation requirements
8. Recommendations for harmonized compliance approach`;

    const messages = [
      { role: 'system', content: 'You are an expert regulatory affairs specialist with deep knowledge of international medical device standards harmonization. Provide detailed, practical comparisons that help manufacturers efficiently comply with multiple standards.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('standard_comparison', 'standard', standard_id_1, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('standard_comparison', aiResult));
  } catch (err) {
    console.error('Standard comparison error:', err);
    res.status(500).json({ error: 'Failed to compare standards' });
  }
});

// ==================== CHECKLIST MODULE ====================

// POST /api/ai/checklist-auto-generate
router.post('/checklist-auto-generate', async (req, res) => {
  try {
    const { device_id, standard_id } = req.body;
    if (!device_id || !standard_id) return res.status(400).json({ error: 'device_id and standard_id are required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [device_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const standardResult = await pool.query('SELECT * FROM regulatory_standards WHERE id = $1', [standard_id]);
    if (standardResult.rows.length === 0) return res.status(404).json({ error: 'Standard not found' });
    const standard = standardResult.rows[0];

    const userPrompt = `Generate a comprehensive compliance checklist for the following medical device against the specified regulatory standard.

Device Information:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- Status: ${device.status}
- Description: ${device.description || 'N/A'}
- FDA Clearance: ${device.fda_clearance_number || 'None'}
- CE Marking: ${device.ce_marking ? 'Yes' : 'No'}

Regulatory Standard:
- Code: ${standard.code}
- Name: ${standard.name}
- Category: ${standard.category || 'N/A'}
- Authority: ${standard.authority || 'N/A'}
- Version: ${standard.version || 'N/A'}
- Requirements: ${standard.requirements || 'N/A'}

Please generate a detailed compliance checklist including:
1. Checklist items organized by standard sections/clauses
2. Priority level for each item (Critical, High, Medium, Low)
3. Expected evidence/documentation for each item
4. Responsible department or role
5. Estimated effort for each item
6. Dependencies between checklist items
7. Recommended completion order
8. Tips for efficient compliance`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device quality assurance specialist with comprehensive knowledge of regulatory standards compliance. Generate detailed, actionable compliance checklists that cover all requirements of the specified standard for the given device type.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('checklist_auto_generate', 'device', device_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('checklist_auto_generate', aiResult));
  } catch (err) {
    console.error('Checklist auto-generate error:', err);
    res.status(500).json({ error: 'Failed to auto-generate checklist' });
  }
});

// POST /api/ai/checklist-assessment
router.post('/checklist-assessment', async (req, res) => {
  try {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id is required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [device_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const checklistsResult = await pool.query(
      `SELECT c.*, s.code as standard_code, s.name as standard_name
       FROM compliance_checklists c
       LEFT JOIN regulatory_standards s ON c.standard_id = s.id
       WHERE c.device_id = $1`, [device_id]
    );

    const userPrompt = `Assess the overall compliance readiness for the following medical device based on its compliance checklists.

Device Information:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- Status: ${device.status}
- Description: ${device.description || 'N/A'}

Compliance Checklists (${checklistsResult.rows.length} items):
${checklistsResult.rows.map(c => `- ${c.item_name} | Standard: ${c.standard_code || 'N/A'} (${c.standard_name || 'N/A'}) | Status: ${c.status} | Priority: ${c.priority} | Evidence: ${c.evidence || 'None'} | Notes: ${c.notes || 'None'}`).join('\n') || 'No checklist items found.'}

Please provide:
1. Overall compliance readiness score and assessment
2. Breakdown by standard - compliance percentage for each
3. Critical items that are not yet complete
4. Items at risk of non-compliance
5. Recommended prioritization of remaining items
6. Estimated timeline to full compliance
7. Resource recommendations
8. Risk areas that need immediate attention`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device compliance assessor with deep experience in evaluating regulatory readiness. Provide thorough, data-driven assessments of compliance status with clear prioritization guidance.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('checklist_assessment', 'device', device_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('checklist_assessment', aiResult));
  } catch (err) {
    console.error('Checklist assessment error:', err);
    res.status(500).json({ error: 'Failed to assess checklist compliance' });
  }
});

// ==================== AUDIT MODULE ====================

// POST /api/ai/audit-anomaly-detection
router.post('/audit-anomaly-detection', async (req, res) => {
  try {
    const auditLogsResult = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50'
    );

    if (auditLogsResult.rows.length === 0) return res.status(404).json({ error: 'No audit logs found' });

    const userPrompt = `Analyze the following recent audit log entries for suspicious patterns, anomalies, or concerning activities.

Recent Audit Logs (${auditLogsResult.rows.length} entries):
${auditLogsResult.rows.map(l => `- [${l.created_at}] Action: ${l.action} | Entity: ${l.entity_type} (ID: ${l.entity_id}) | User: ${l.user_id} | Details: ${l.details || 'N/A'} | IP: ${l.ip_address || 'N/A'}`).join('\n')}

Please provide:
1. Identified anomalies or suspicious patterns
2. Unusual access patterns or timing
3. Potential security concerns
4. Unusual data modification patterns
5. Users with abnormal activity levels
6. Recommendations for investigation
7. Suggested additional monitoring measures
8. Overall audit trail health assessment`;

    const messages = [
      { role: 'system', content: 'You are an expert IT security and compliance auditor specializing in medical device quality management systems. Analyze audit trails for anomalies, security threats, and compliance concerns with a focus on 21 CFR Part 11, data integrity, and HIPAA requirements.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('audit_anomaly_detection', 'audit', null, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('audit_anomaly_detection', aiResult));
  } catch (err) {
    console.error('Audit anomaly detection error:', err);
    res.status(500).json({ error: 'Failed to detect audit anomalies' });
  }
});

// POST /api/ai/audit-summary
router.post('/audit-summary', async (req, res) => {
  try {
    const days = req.body.days || 30;

    const auditLogsResult = await pool.query(
      'SELECT * FROM audit_logs WHERE created_at >= NOW() - INTERVAL \'1 day\' * $1 ORDER BY created_at DESC',
      [days]
    );

    if (auditLogsResult.rows.length === 0) return res.status(404).json({ error: `No audit logs found in the last ${days} days` });

    const userPrompt = `Summarize the audit activity trends from the following audit logs over the last ${days} days.

Audit Logs (${auditLogsResult.rows.length} entries over ${days} days):
${auditLogsResult.rows.map(l => `- [${l.created_at}] Action: ${l.action} | Entity: ${l.entity_type} (ID: ${l.entity_id}) | User: ${l.user_id} | Details: ${l.details || 'N/A'}`).join('\n')}

Please provide:
1. Executive summary of activity over the period
2. Activity trends (increasing, decreasing, stable)
3. Most active users and their activity patterns
4. Most common actions performed
5. Entity types most frequently modified
6. Peak activity periods
7. Notable events or changes in patterns
8. Recommendations for process improvement`;

    const messages = [
      { role: 'system', content: 'You are an expert quality management system analyst specializing in audit trail analysis for medical device companies. Provide clear, actionable summaries of system activity with trend analysis and improvement recommendations.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('audit_summary', 'audit', null, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('audit_summary', aiResult));
  } catch (err) {
    console.error('Audit summary error:', err);
    res.status(500).json({ error: 'Failed to generate audit summary' });
  }
});

// ==================== DOCUMENT MODULE ====================

// POST /api/ai/document-generator
router.post('/document-generator', async (req, res) => {
  try {
    const { document_type, device_id } = req.body;
    if (!document_type || !device_id) return res.status(400).json({ error: 'document_type and device_id are required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [device_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const userPrompt = `Generate a comprehensive template/draft for a ${document_type} document for the following medical device.

Document Type: ${document_type}

Device Information:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Serial Number: ${device.serial_number || 'N/A'}
- Class: ${device.device_class}
- Status: ${device.status}
- Department: ${device.department || 'N/A'}
- Description: ${device.description || 'N/A'}
- FDA Clearance: ${device.fda_clearance_number || 'None'}
- CE Marking: ${device.ce_marking ? 'Yes' : 'No'}

Please generate a complete document template including:
1. Document header with title, document number placeholder, version, and date
2. Purpose and scope sections
3. All required sections for a ${document_type} per regulatory requirements
4. Placeholder content with guidance notes for each section
5. Required signatures and approval blocks
6. Revision history table
7. References to applicable standards and regulations
8. Appendices as needed`;

    const messages = [
      { role: 'system', content: `You are an expert medical device technical writer and quality documentation specialist with deep knowledge of FDA QSR, ISO 13485, and regulatory documentation requirements. Generate professional, regulatory-compliant ${document_type} documents that meet all applicable standards. Common document types include SOP (Standard Operating Procedure), DHF (Design History File), DMR (Device Master Record), protocols, validation reports, and work instructions.` },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('document_generator', 'device', device_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('document_generator', aiResult));
  } catch (err) {
    console.error('Document generator error:', err);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

// POST /api/ai/document-compliance-check
router.post('/document-compliance-check', async (req, res) => {
  try {
    const { document_id } = req.body;
    if (!document_id) return res.status(400).json({ error: 'document_id is required' });

    const docResult = await pool.query(
      `SELECT doc.*, d.name as device_name, d.device_class, d.manufacturer
       FROM documents doc
       LEFT JOIN devices d ON doc.device_id = d.id
       WHERE doc.id = $1`, [document_id]
    );
    if (docResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    const doc = docResult.rows[0];

    const userPrompt = `Check whether the following document meets regulatory documentation requirements for medical device compliance.

Document Information:
- Title: ${doc.title}
- Type: ${doc.document_type}
- Version: ${doc.version}
- Status: ${doc.status}
- Device: ${doc.device_name || 'N/A'}
- Device Class: ${doc.device_class || 'N/A'}
- Manufacturer: ${doc.manufacturer || 'N/A'}
- Author: ${doc.author || 'N/A'}
- Approved By: ${doc.approved_by || 'Not approved'}
- Approved Date: ${doc.approved_date || 'N/A'}
- Description: ${doc.description || 'N/A'}
- File Path: ${doc.file_path || 'N/A'}

Please provide:
1. Compliance status assessment (Compliant, Partially Compliant, Non-Compliant)
2. Required sections present or missing for this document type
3. Regulatory requirements that are met
4. Regulatory requirements that are NOT met
5. Specific gaps in documentation
6. Required approvals and signatures status
7. Version control and revision history assessment
8. Recommendations to achieve full compliance
9. Applicable regulations and standards for this document type`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device regulatory documentation auditor with comprehensive knowledge of FDA QSR 21 CFR 820, ISO 13485 documentation requirements, EU MDR technical documentation requirements, and 21 CFR Part 11 electronic records requirements. Assess documents for regulatory compliance thoroughness.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('document_compliance_check', 'document', document_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('document_compliance_check', aiResult));
  } catch (err) {
    console.error('Document compliance check error:', err);
    res.status(500).json({ error: 'Failed to perform document compliance check' });
  }
});

// ==================== RISK MODULE ====================

// POST /api/ai/risk-mitigation-advisor
router.post('/risk-mitigation-advisor', async (req, res) => {
  try {
    const { risk_id } = req.body;
    if (!risk_id) return res.status(400).json({ error: 'risk_id is required' });

    const riskResult = await pool.query(
      `SELECT r.*, d.name as device_name, d.device_class, d.manufacturer, d.description as device_description
       FROM risk_assessments r
       LEFT JOIN devices d ON r.device_id = d.id
       WHERE r.id = $1`, [risk_id]
    );
    if (riskResult.rows.length === 0) return res.status(404).json({ error: 'Risk assessment not found' });
    const risk = riskResult.rows[0];

    const userPrompt = `Suggest detailed mitigation strategies for the following medical device risk assessment.

Device Information:
- Name: ${risk.device_name || 'N/A'}
- Class: ${risk.device_class || 'N/A'}
- Manufacturer: ${risk.manufacturer || 'N/A'}
- Description: ${risk.device_description || 'N/A'}

Risk Assessment:
- Hazard: ${risk.hazard}
- Risk Category: ${risk.risk_category}
- Severity: ${risk.severity}
- Probability: ${risk.probability}
- Risk Level: ${risk.risk_level}
- Current Mitigation: ${risk.mitigation || 'None'}
- Residual Risk Level: ${risk.residual_risk_level || 'Not assessed'}
- Status: ${risk.status}
- Description: ${risk.description || 'N/A'}

Please provide:
1. Detailed mitigation strategies ranked by effectiveness
2. Design controls to eliminate or reduce the hazard
3. Protective measures and safeguards
4. Information for safety (warnings, labels, training)
5. Verification and validation requirements for each mitigation
6. Expected residual risk after mitigation
7. Cost-benefit analysis of mitigation options
8. Implementation timeline and priorities
9. Monitoring and review recommendations
10. Compliance with ISO 14971 risk management principles`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device risk management specialist with deep knowledge of ISO 14971, IEC 62366 (usability), and FDA guidance on risk management. Provide detailed, practical mitigation strategies following the risk control hierarchy: inherent safety by design, protective measures, and information for safety.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('risk_mitigation_advisor', 'risk_assessment', risk_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('risk_mitigation_advisor', aiResult));
  } catch (err) {
    console.error('Risk mitigation advisor error:', err);
    res.status(500).json({ error: 'Failed to provide risk mitigation advice' });
  }
});

// POST /api/ai/risk-matrix-analysis
router.post('/risk-matrix-analysis', async (req, res) => {
  try {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id is required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [device_id]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const risksResult = await pool.query('SELECT * FROM risk_assessments WHERE device_id = $1', [device_id]);

    const userPrompt = `Analyze the overall risk matrix for the following medical device and provide a comprehensive heat map analysis.

Device Information:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- Status: ${device.status}
- Description: ${device.description || 'N/A'}

Risk Assessments (${risksResult.rows.length} items):
${risksResult.rows.map(r => `- Hazard: ${r.hazard} | Category: ${r.risk_category} | Severity: ${r.severity} | Probability: ${r.probability} | Risk Level: ${r.risk_level} | Mitigation: ${r.mitigation || 'None'} | Residual Risk: ${r.residual_risk_level || 'N/A'} | Status: ${r.status}`).join('\n') || 'No risk assessments found.'}

Please provide:
1. Overall risk matrix summary (severity vs. probability distribution)
2. Heat map analysis - identify hot spots and clusters
3. Risk distribution by category
4. High and unacceptable risk items requiring immediate action
5. Trends in risk levels across categories
6. Adequacy of current mitigation measures
7. Residual risk assessment
8. Overall benefit-risk analysis
9. Comparison with industry benchmarks for this device class
10. Recommendations for risk management improvement`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device risk management analyst specializing in ISO 14971 risk analysis, risk matrix evaluation, and benefit-risk assessment. Provide thorough quantitative and qualitative analysis of risk profiles with visual descriptions of risk distributions.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('risk_matrix_analysis', 'device', device_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('risk_matrix_analysis', aiResult));
  } catch (err) {
    console.error('Risk matrix analysis error:', err);
    res.status(500).json({ error: 'Failed to perform risk matrix analysis' });
  }
});

// ==================== CAPA MODULE ====================

// POST /api/ai/capa-root-cause
router.post('/capa-root-cause', async (req, res) => {
  try {
    const { capa_id } = req.body;
    if (!capa_id) return res.status(400).json({ error: 'capa_id is required' });

    const capaResult = await pool.query(
      `SELECT c.*, d.name as device_name, d.device_class, d.manufacturer, d.description as device_description
       FROM capa_records c
       LEFT JOIN devices d ON c.device_id = d.id
       WHERE c.id = $1`, [capa_id]
    );
    if (capaResult.rows.length === 0) return res.status(404).json({ error: 'CAPA record not found' });
    const capa = capaResult.rows[0];

    const userPrompt = `Perform a comprehensive root cause analysis for the following CAPA (Corrective and Preventive Action) record.

Device Information:
- Name: ${capa.device_name || 'N/A'}
- Class: ${capa.device_class || 'N/A'}
- Manufacturer: ${capa.manufacturer || 'N/A'}
- Description: ${capa.device_description || 'N/A'}

CAPA Record:
- Title: ${capa.title}
- Type: ${capa.type}
- Status: ${capa.status}
- Priority: ${capa.priority}
- Description: ${capa.description || 'N/A'}
- Root Cause: ${capa.root_cause || 'Not yet determined'}
- Action Plan: ${capa.action_plan || 'Not yet defined'}
- Due Date: ${capa.due_date || 'N/A'}
- Source: ${capa.source || 'N/A'}

Please provide:
1. 5 Whys Analysis - drill down to the root cause
2. Fishbone (Ishikawa) Diagram analysis covering:
   - People (training, competency, staffing)
   - Process (procedures, workflows, controls)
   - Equipment (machinery, tools, calibration)
   - Materials (raw materials, components, suppliers)
   - Environment (conditions, contamination, facility)
   - Measurement (testing, inspection, monitoring)
3. Most likely root cause determination
4. Contributing factors
5. Recommended corrective actions
6. Recommended preventive actions
7. Effectiveness verification plan
8. Timeline for implementation`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device quality engineer specializing in CAPA management and root cause analysis. Apply systematic root cause analysis methodologies including 5 Whys, Fishbone diagrams, Fault Tree Analysis, and other techniques per FDA 21 CFR 820.90 and ISO 13485 requirements.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('capa_root_cause', 'capa', capa_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('capa_root_cause', aiResult));
  } catch (err) {
    console.error('CAPA root cause error:', err);
    res.status(500).json({ error: 'Failed to perform CAPA root cause analysis' });
  }
});

// POST /api/ai/capa-effectiveness
router.post('/capa-effectiveness', async (req, res) => {
  try {
    const { capa_id } = req.body;
    if (!capa_id) return res.status(400).json({ error: 'capa_id is required' });

    const capaResult = await pool.query(
      `SELECT c.*, d.name as device_name, d.device_class, d.manufacturer
       FROM capa_records c
       LEFT JOIN devices d ON c.device_id = d.id
       WHERE c.id = $1`, [capa_id]
    );
    if (capaResult.rows.length === 0) return res.status(404).json({ error: 'CAPA record not found' });
    const capa = capaResult.rows[0];

    const userPrompt = `Evaluate the effectiveness of the action plan for the following CAPA record and suggest improvements.

Device Information:
- Name: ${capa.device_name || 'N/A'}
- Class: ${capa.device_class || 'N/A'}
- Manufacturer: ${capa.manufacturer || 'N/A'}

CAPA Record:
- Title: ${capa.title}
- Type: ${capa.type}
- Status: ${capa.status}
- Priority: ${capa.priority}
- Description: ${capa.description || 'N/A'}
- Root Cause: ${capa.root_cause || 'Not yet determined'}
- Action Plan: ${capa.action_plan || 'Not yet defined'}
- Due Date: ${capa.due_date || 'N/A'}
- Source: ${capa.source || 'N/A'}
- Effectiveness Check: ${capa.effectiveness_check || 'Not yet performed'}

Please provide:
1. Assessment of the current action plan adequacy
2. Whether the action plan addresses the root cause
3. Gaps in the action plan
4. Suggested additional corrective actions
5. Suggested additional preventive actions
6. Effectiveness verification criteria and methods
7. Monitoring plan and metrics
8. Timeline recommendations
9. Resource requirements
10. Risk of recurrence assessment`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device quality management specialist with deep experience in CAPA effectiveness evaluation per FDA 21 CFR 820.90, ISO 13485 Clause 8.5, and industry best practices. Evaluate action plans critically and provide constructive improvement recommendations.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('capa_effectiveness', 'capa', capa_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('capa_effectiveness', aiResult));
  } catch (err) {
    console.error('CAPA effectiveness error:', err);
    res.status(500).json({ error: 'Failed to evaluate CAPA effectiveness' });
  }
});

// ==================== TRAINING MODULE ====================

// POST /api/ai/training-gap-analysis
router.post('/training-gap-analysis', async (req, res) => {
  try {
    const trainingResult = await pool.query('SELECT * FROM training_records ORDER BY created_at DESC');

    if (trainingResult.rows.length === 0) return res.status(404).json({ error: 'No training records found' });

    const userPrompt = `Analyze the following training records to identify training gaps, overdue certifications, and department coverage issues.

Training Records (${trainingResult.rows.length} records):
${trainingResult.rows.map(t => `- Employee: ${t.employee_name || t.user_id} | Department: ${t.department || 'N/A'} | Training: ${t.training_name || t.title} | Type: ${t.training_type || 'N/A'} | Status: ${t.status} | Completion Date: ${t.completion_date || 'Not completed'} | Expiry Date: ${t.expiry_date || 'N/A'} | Score: ${t.score || 'N/A'}`).join('\n')}

Please provide:
1. Overall training compliance status
2. Identified training gaps by department
3. Overdue or expiring certifications
4. Departments with insufficient coverage
5. Critical training areas not adequately covered
6. Employees requiring immediate training
7. Recommended training priorities
8. Suggestions for training program improvement
9. Regulatory training requirements that may be missing
10. Training frequency recommendations`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device training and competency management specialist with knowledge of FDA QSR training requirements (21 CFR 820.25), ISO 13485 competency requirements (Clause 6.2), and GMP training best practices. Identify training gaps and provide actionable recommendations.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('training_gap_analysis', 'training', null, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('training_gap_analysis', aiResult));
  } catch (err) {
    console.error('Training gap analysis error:', err);
    res.status(500).json({ error: 'Failed to perform training gap analysis' });
  }
});

// POST /api/ai/training-plan-generator
router.post('/training-plan-generator', async (req, res) => {
  try {
    const { department } = req.body;
    if (!department) return res.status(400).json({ error: 'department is required' });

    const trainingResult = await pool.query(
      'SELECT * FROM training_records WHERE department = $1 ORDER BY created_at DESC',
      [department]
    );

    const userPrompt = `Generate a comprehensive training plan for the ${department} department based on the following existing training records.

Department: ${department}

Existing Training Records (${trainingResult.rows.length} records):
${trainingResult.rows.map(t => `- Employee: ${t.employee_name || t.user_id} | Training: ${t.training_name || t.title} | Type: ${t.training_type || 'N/A'} | Status: ${t.status} | Completion Date: ${t.completion_date || 'Not completed'} | Expiry Date: ${t.expiry_date || 'N/A'} | Score: ${t.score || 'N/A'}`).join('\n') || 'No existing training records for this department.'}

Please generate a comprehensive training plan including:
1. Required training courses for the department
2. Regulatory-mandated training (FDA, ISO, GMP)
3. Role-specific training requirements
4. Training schedule and frequency
5. Priority order for training completion
6. Recommended training methods (classroom, online, OJT)
7. Assessment and competency verification methods
8. Retraining and refresher schedule
9. New employee onboarding training
10. Budget and resource estimates`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device training program manager with comprehensive knowledge of regulatory training requirements, competency-based training design, and adult learning methodologies. Generate practical, compliant training plans tailored to specific departments.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('training_plan_generator', 'training', null, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('training_plan_generator', aiResult));
  } catch (err) {
    console.error('Training plan generator error:', err);
    res.status(500).json({ error: 'Failed to generate training plan' });
  }
});

// ==================== SUPPLIER MODULE ====================

// POST /api/ai/supplier-risk-assessment
router.post('/supplier-risk-assessment', async (req, res) => {
  try {
    const { supplier_id } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id is required' });

    const supplierResult = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    if (supplierResult.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const supplier = supplierResult.rows[0];

    const userPrompt = `Assess the risk and qualification status of the following medical device supplier.

Supplier Information:
- Name: ${supplier.name}
- Contact: ${supplier.contact_person || 'N/A'}
- Email: ${supplier.email || 'N/A'}
- Phone: ${supplier.phone || 'N/A'}
- Address: ${supplier.address || 'N/A'}
- Type: ${supplier.supplier_type || 'N/A'}
- Status: ${supplier.status || 'N/A'}
- Quality Rating: ${supplier.quality_rating || 'N/A'}
- Certifications: ${supplier.certifications || 'N/A'}
- Products/Services: ${supplier.products_services || 'N/A'}
- Last Audit Date: ${supplier.last_audit_date || 'N/A'}
- Next Audit Date: ${supplier.next_audit_date || 'N/A'}
- Notes: ${supplier.notes || 'N/A'}

Please provide:
1. Overall supplier risk rating (High, Medium, Low)
2. Risk factors identified
3. Qualification status assessment
4. Quality system evaluation
5. Certification adequacy review
6. Supply chain risk analysis
7. Recommended risk mitigation measures
8. Audit frequency recommendation
9. Performance monitoring metrics
10. Approval or qualification recommendations`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device supplier quality management specialist with deep knowledge of FDA 21 CFR 820.50 (purchasing controls), ISO 13485 Clause 7.4 (purchasing), and supplier qualification best practices. Assess supplier risks comprehensively and provide actionable qualification guidance.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('supplier_risk_assessment', 'supplier', supplier_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('supplier_risk_assessment', aiResult));
  } catch (err) {
    console.error('Supplier risk assessment error:', err);
    res.status(500).json({ error: 'Failed to assess supplier risk' });
  }
});

// POST /api/ai/supplier-audit-prep
router.post('/supplier-audit-prep', async (req, res) => {
  try {
    const { supplier_id } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id is required' });

    const supplierResult = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    if (supplierResult.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const supplier = supplierResult.rows[0];

    const userPrompt = `Generate an audit preparation checklist and questions for auditing the following medical device supplier.

Supplier Information:
- Name: ${supplier.name}
- Type: ${supplier.supplier_type || 'N/A'}
- Status: ${supplier.status || 'N/A'}
- Quality Rating: ${supplier.quality_rating || 'N/A'}
- Certifications: ${supplier.certifications || 'N/A'}
- Products/Services: ${supplier.products_services || 'N/A'}
- Last Audit Date: ${supplier.last_audit_date || 'N/A'}
- Notes: ${supplier.notes || 'N/A'}

Please generate:
1. Pre-audit preparation checklist
2. Documents to request from the supplier in advance
3. Quality system audit questions (ISO 13485 focused)
4. Process-specific audit questions
5. Regulatory compliance verification points
6. Corrective action follow-up items (if previous audit exists)
7. On-site inspection checklist
8. Key areas to observe during facility tour
9. Supplier performance metrics to review
10. Post-audit reporting requirements`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device supplier auditor with extensive experience in ISO 13485 supplier audits, FDA supplier qualification, and incoming quality inspection programs. Generate thorough audit preparation materials that ensure comprehensive supplier evaluations.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('supplier_audit_prep', 'supplier', supplier_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('supplier_audit_prep', aiResult));
  } catch (err) {
    console.error('Supplier audit prep error:', err);
    res.status(500).json({ error: 'Failed to generate supplier audit preparation' });
  }
});

// ==================== NON-CONFORMANCE MODULE ====================

// POST /api/ai/ncr-investigation-assistant
router.post('/ncr-investigation-assistant', async (req, res) => {
  try {
    const { ncr_id } = req.body;
    if (!ncr_id) return res.status(400).json({ error: 'ncr_id is required' });

    const ncrResult = await pool.query(
      `SELECT n.*, d.name as device_name, d.device_class, d.manufacturer, d.description as device_description
       FROM nonconformance_reports n
       LEFT JOIN devices d ON n.device_id = d.id
       WHERE n.id = $1`, [ncr_id]
    );
    if (ncrResult.rows.length === 0) return res.status(404).json({ error: 'NCR not found' });
    const ncr = ncrResult.rows[0];

    const userPrompt = `Help investigate the following non-conformance report with root cause suggestions and recommended actions.

Device Information:
- Name: ${ncr.device_name || 'N/A'}
- Class: ${ncr.device_class || 'N/A'}
- Manufacturer: ${ncr.manufacturer || 'N/A'}
- Description: ${ncr.device_description || 'N/A'}

Non-Conformance Report:
- NCR Number: ${ncr.ncr_number || 'N/A'}
- Title: ${ncr.title}
- Severity: ${ncr.severity}
- Status: ${ncr.status}
- Description: ${ncr.description || 'N/A'}
- Source: ${ncr.source || 'N/A'}
- Category: ${ncr.category || 'N/A'}
- Root Cause: ${ncr.root_cause || 'Not yet determined'}
- Corrective Action: ${ncr.corrective_action || 'Not yet defined'}
- Disposition: ${ncr.disposition || 'N/A'}
- Detected Date: ${ncr.detected_date || 'N/A'}
- Reported By: ${ncr.reported_by || 'N/A'}

Please provide:
1. Investigation approach and methodology
2. Potential root causes to investigate
3. Evidence to collect and analyze
4. Immediate containment actions
5. Recommended corrective actions
6. Preventive actions to avoid recurrence
7. Impact assessment on product quality and safety
8. Regulatory reporting considerations (MDR, MedWatch)
9. Disposition recommendations (accept, rework, scrap, return)
10. Documentation requirements for the investigation`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device quality engineer specializing in non-conformance investigation, root cause analysis, and CAPA management. Guide investigations systematically per FDA 21 CFR 820.90, ISO 13485 Clause 8.3 (control of nonconforming product), and industry best practices.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('ncr_investigation', 'nonconformance', ncr_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('ncr_investigation', aiResult));
  } catch (err) {
    console.error('NCR investigation assistant error:', err);
    res.status(500).json({ error: 'Failed to assist with NCR investigation' });
  }
});

// POST /api/ai/ncr-trend-analysis
router.post('/ncr-trend-analysis', async (req, res) => {
  try {
    const ncrResult = await pool.query('SELECT * FROM nonconformance_reports ORDER BY created_at DESC');

    if (ncrResult.rows.length === 0) return res.status(404).json({ error: 'No non-conformance reports found' });

    const userPrompt = `Analyze trends, recurring issues, and patterns in the following non-conformance reports.

Non-Conformance Reports (${ncrResult.rows.length} total):
${ncrResult.rows.map(n => `- NCR: ${n.ncr_number || 'N/A'} | Title: ${n.title} | Severity: ${n.severity} | Status: ${n.status} | Category: ${n.category || 'N/A'} | Source: ${n.source || 'N/A'} | Device ID: ${n.device_id || 'N/A'} | Root Cause: ${n.root_cause || 'N/A'} | Detected: ${n.detected_date || n.created_at} | Disposition: ${n.disposition || 'N/A'}`).join('\n')}

Please provide:
1. Overall NCR trend analysis (increasing, decreasing, stable)
2. Most common non-conformance categories
3. Recurring issues and patterns
4. Severity distribution analysis
5. Root cause patterns across NCRs
6. Devices or areas with highest NCR rates
7. Source analysis (where NCRs originate most)
8. Time-to-resolution trends
9. Effectiveness of corrective actions (recurrence rate)
10. Recommendations for systemic improvements
11. Regulatory concern areas
12. Predictive indicators for future non-conformances`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device quality data analyst specializing in non-conformance trend analysis, statistical process control, and quality improvement. Identify meaningful patterns and provide data-driven recommendations for systemic quality improvements.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('ncr_trend_analysis', 'nonconformance', null, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('ncr_trend_analysis', aiResult));
  } catch (err) {
    console.error('NCR trend analysis error:', err);
    res.status(500).json({ error: 'Failed to perform NCR trend analysis' });
  }
});

// ==================== CHANGE CONTROL MODULE ====================

// POST /api/ai/change-impact-analysis
router.post('/change-impact-analysis', async (req, res) => {
  try {
    const { change_id } = req.body;
    if (!change_id) return res.status(400).json({ error: 'change_id is required' });

    const changeResult = await pool.query(
      `SELECT cc.*, d.name as device_name, d.device_class, d.manufacturer, d.description as device_description
       FROM change_controls cc
       LEFT JOIN devices d ON cc.device_id = d.id
       WHERE cc.id = $1`, [change_id]
    );
    if (changeResult.rows.length === 0) return res.status(404).json({ error: 'Change control not found' });
    const change = changeResult.rows[0];

    const userPrompt = `Analyze the impact of the following proposed change control for a medical device.

Device Information:
- Name: ${change.device_name || 'N/A'}
- Class: ${change.device_class || 'N/A'}
- Manufacturer: ${change.manufacturer || 'N/A'}
- Description: ${change.device_description || 'N/A'}

Change Control:
- Change Number: ${change.change_number || 'N/A'}
- Title: ${change.title}
- Change Type: ${change.change_type || 'N/A'}
- Status: ${change.status}
- Priority: ${change.priority || 'N/A'}
- Description: ${change.description || 'N/A'}
- Reason for Change: ${change.reason || 'N/A'}
- Proposed Solution: ${change.proposed_solution || 'N/A'}
- Impact Assessment: ${change.impact_assessment || 'Not yet assessed'}
- Requested By: ${change.requested_by || 'N/A'}
- Requested Date: ${change.requested_date || 'N/A'}

Please provide:
1. Comprehensive impact analysis covering:
   - Product quality and safety impact
   - Regulatory impact (does this require new submissions?)
   - Manufacturing process impact
   - Supply chain impact
   - Documentation impact
   - Validation/verification requirements
   - Training requirements
2. Affected departments and stakeholders
3. Risk assessment of the change
4. Required regulatory notifications (FDA, notified body)
5. Verification and validation plan
6. Implementation plan recommendations
7. Rollback plan considerations
8. Timeline and resource estimates`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device change control specialist with deep knowledge of FDA 21 CFR 820.30 (design controls), ISO 13485 Clause 7.3.9 (design and development changes), and EU MDR change notification requirements. Provide thorough impact analyses that ensure patient safety and regulatory compliance.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('change_impact_analysis', 'change_control', change_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('change_impact_analysis', aiResult));
  } catch (err) {
    console.error('Change impact analysis error:', err);
    res.status(500).json({ error: 'Failed to perform change impact analysis' });
  }
});

// POST /api/ai/change-risk-assessment
router.post('/change-risk-assessment', async (req, res) => {
  try {
    const { change_id } = req.body;
    if (!change_id) return res.status(400).json({ error: 'change_id is required' });

    const changeResult = await pool.query(
      `SELECT cc.*, d.name as device_name, d.device_class, d.manufacturer, d.description as device_description
       FROM change_controls cc
       LEFT JOIN devices d ON cc.device_id = d.id
       WHERE cc.id = $1`, [change_id]
    );
    if (changeResult.rows.length === 0) return res.status(404).json({ error: 'Change control not found' });
    const change = changeResult.rows[0];

    const userPrompt = `Assess the risks associated with the following change control for a medical device.

Device Information:
- Name: ${change.device_name || 'N/A'}
- Class: ${change.device_class || 'N/A'}
- Manufacturer: ${change.manufacturer || 'N/A'}
- Description: ${change.device_description || 'N/A'}

Change Control:
- Change Number: ${change.change_number || 'N/A'}
- Title: ${change.title}
- Change Type: ${change.change_type || 'N/A'}
- Status: ${change.status}
- Priority: ${change.priority || 'N/A'}
- Description: ${change.description || 'N/A'}
- Reason for Change: ${change.reason || 'N/A'}
- Proposed Solution: ${change.proposed_solution || 'N/A'}

Please provide:
1. Risk identification - all risks associated with implementing this change
2. Risk identification - all risks of NOT implementing this change
3. Severity and probability assessment for each risk
4. Impact on existing risk assessments (ISO 14971)
5. New hazards potentially introduced by the change
6. Risk mitigation strategies for implementation risks
7. Patient safety risk assessment
8. Regulatory risk assessment
9. Business continuity risk assessment
10. Overall risk-benefit conclusion and recommendation (approve/reject/modify)`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device risk management and change control specialist with comprehensive knowledge of ISO 14971, FDA design control requirements, and change management best practices. Assess change-related risks thoroughly to ensure patient safety and regulatory compliance.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('change_risk_assessment', 'change_control', change_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('change_risk_assessment', aiResult));
  } catch (err) {
    console.error('Change risk assessment error:', err);
    res.status(500).json({ error: 'Failed to assess change risks' });
  }
});

// ==================== CALIBRATION MODULE ====================

// POST /api/ai/calibration-schedule-optimizer
router.post('/calibration-schedule-optimizer', async (req, res) => {
  try {
    const calResult = await pool.query('SELECT * FROM calibration_records ORDER BY next_calibration_date ASC');

    if (calResult.rows.length === 0) return res.status(404).json({ error: 'No calibration records found' });

    const userPrompt = `Optimize the calibration schedule for the following equipment records to minimize downtime and ensure compliance.

Calibration Records (${calResult.rows.length} records):
${calResult.rows.map(c => `- Equipment: ${c.equipment_name || 'N/A'} | Type: ${c.calibration_type || 'N/A'} | Status: ${c.status} | Last Calibration: ${c.last_calibration_date || c.calibration_date || 'N/A'} | Next Calibration: ${c.next_calibration_date || 'N/A'} | Frequency: ${c.frequency || 'N/A'} | Tolerance: ${c.tolerance || 'N/A'} | Device ID: ${c.device_id || 'N/A'} | Location: ${c.location || 'N/A'}`).join('\n')}

Please provide:
1. Optimized calibration schedule
2. Equipment grouped by calibration timing for efficiency
3. Critical equipment requiring priority scheduling
4. Overdue calibrations requiring immediate attention
5. Recommended calibration frequency adjustments based on patterns
6. Downtime minimization strategy
7. Resource allocation recommendations
8. Risk-based calibration intervals
9. Seasonal or workload considerations
10. Cost optimization suggestions
11. Backup equipment recommendations during calibration`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device calibration management specialist with deep knowledge of ISO 13485 monitoring and measuring equipment requirements, FDA 21 CFR 820.72 (inspection, measuring, and test equipment), and calibration best practices. Optimize schedules for compliance and efficiency.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('calibration_schedule_optimizer', 'calibration', null, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('calibration_schedule_optimizer', aiResult));
  } catch (err) {
    console.error('Calibration schedule optimizer error:', err);
    res.status(500).json({ error: 'Failed to optimize calibration schedule' });
  }
});

// POST /api/ai/calibration-drift-analysis
router.post('/calibration-drift-analysis', async (req, res) => {
  try {
    const { calibration_id } = req.body;
    if (!calibration_id) return res.status(400).json({ error: 'calibration_id is required' });

    const calResult = await pool.query(
      `SELECT c.*, d.name as device_name, d.device_class, d.manufacturer, d.description as device_description
       FROM calibration_records c
       LEFT JOIN devices d ON c.device_id = d.id
       WHERE c.id = $1`, [calibration_id]
    );
    if (calResult.rows.length === 0) return res.status(404).json({ error: 'Calibration record not found' });
    const cal = calResult.rows[0];

    const userPrompt = `Analyze calibration drift patterns for the following equipment and predict when it may go out of tolerance.

Device Information:
- Name: ${cal.device_name || 'N/A'}
- Class: ${cal.device_class || 'N/A'}
- Manufacturer: ${cal.manufacturer || 'N/A'}
- Description: ${cal.device_description || 'N/A'}

Calibration Record:
- Equipment: ${cal.equipment_name || 'N/A'}
- Calibration Type: ${cal.calibration_type || 'N/A'}
- Status: ${cal.status}
- Last Calibration: ${cal.last_calibration_date || cal.calibration_date || 'N/A'}
- Next Calibration: ${cal.next_calibration_date || 'N/A'}
- Frequency: ${cal.frequency || 'N/A'}
- Tolerance: ${cal.tolerance || 'N/A'}
- Measured Value: ${cal.measured_value || 'N/A'}
- Expected Value: ${cal.expected_value || 'N/A'}
- Deviation: ${cal.deviation || 'N/A'}
- Location: ${cal.location || 'N/A'}
- Performed By: ${cal.performed_by || 'N/A'}
- Notes: ${cal.notes || 'N/A'}

Please provide:
1. Calibration drift pattern analysis
2. Predicted time to go out of tolerance
3. Drift rate assessment
4. Contributing factors to drift
5. Environmental factors that may affect calibration
6. Recommended calibration interval adjustment
7. Preventive maintenance suggestions
8. Risk assessment of continued use
9. Equipment replacement or overhaul recommendations
10. Monitoring strategy between calibrations`;

    const messages = [
      { role: 'system', content: 'You are an expert medical device metrology and calibration specialist with deep knowledge of measurement uncertainty, drift analysis, and predictive maintenance. Analyze calibration data to predict equipment behavior and optimize calibration intervals per ISO 13485 and FDA requirements.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('calibration_drift_analysis', 'calibration', calibration_id, userPrompt, aiResult, process.env.OPENROUTER_MODEL);

    res.json(buildResponse('calibration_drift_analysis', aiResult));
  } catch (err) {
    console.error('Calibration drift analysis error:', err);
    res.status(500).json({ error: 'Failed to perform calibration drift analysis' });
  }
});

// POST /api/ai/submission-package - 510(k) submission package generator
router.post('/submission-package', async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [deviceId]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const [checklistsResult, risksResult, docsResult] = await Promise.all([
      pool.query('SELECT c.*, s.code as standard_code FROM compliance_checklists c LEFT JOIN regulatory_standards s ON c.standard_id = s.id WHERE c.device_id = $1', [deviceId]),
      pool.query('SELECT hazard, risk_category, severity, risk_level, mitigation FROM risk_assessments WHERE device_id = $1', [deviceId]),
      pool.query('SELECT title, document_type, version, status FROM documents WHERE device_id = $1', [deviceId]),
    ]);

    const userPrompt = `Generate a 510(k) submission package outline for this medical device. Return JSON only.

Device:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- FDA Clearance: ${device.fda_clearance_number || 'None'}
- CE Marking: ${device.ce_marking ? 'Yes' : 'No'}
- Description: ${device.description || 'N/A'}

Compliance Checklists: ${checklistsResult.rows.length} items
Risk Assessments: ${risksResult.rows.length} items
Documents on file: ${docsResult.rows.map(d => d.title).join(', ') || 'None'}

Return JSON: {
  "executive_summary": "string",
  "device_description": "string",
  "intended_use": "string",
  "substantial_equivalence_analysis": "string",
  "performance_testing_required": ["string"],
  "labeling_requirements": ["string"],
  "predicate_device_comparison": "string",
  "gaps_to_address": ["string"]
}`;

    const messages = [
      { role: 'system', content: 'You are an expert FDA 510(k) submission specialist. When asked to return JSON, respond ONLY with valid JSON — no markdown fences, no extra text.' },
      { role: 'user', content: userPrompt },
    ];

    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('submission_package', 'device', deviceId, userPrompt, aiResult);

    const structured = parseAIJson(aiResult);
    res.json(buildResponse('submission_package', aiResult, structured));
  } catch (err) {
    console.error('Submission package error:', err);
    res.status(500).json({ error: 'Failed to generate submission package' });
  }
});

// POST /api/ai/submission-review — pre-FDA-submission review (gap-finder)
router.post('/submission-review', async (req, res) => {
  try {
    const { deviceId, submission_type, draft_summary } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
    const subType = submission_type || '510(k)';

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [deviceId]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const [checklistsResult, risksResult, docsResult] = await Promise.all([
      pool.query('SELECT c.*, s.code as standard_code FROM compliance_checklists c LEFT JOIN regulatory_standards s ON c.standard_id = s.id WHERE c.device_id = $1', [deviceId]),
      pool.query('SELECT hazard, risk_category, severity, risk_level, mitigation, status FROM risk_assessments WHERE device_id = $1', [deviceId]),
      pool.query('SELECT title, document_type, version, status FROM documents WHERE device_id = $1', [deviceId]),
    ]);

    const userPrompt = `Perform a pre-submission review of this ${subType} package and identify blockers, weaknesses, and missing items before it reaches the FDA. Return JSON only.

Device:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- FDA Clearance: ${device.fda_clearance_number || 'None'}

Checklists: ${checklistsResult.rows.length} items, ${checklistsResult.rows.filter(c => c.status !== 'completed').length} open
Risks: ${risksResult.rows.length} (${risksResult.rows.filter(r => ['high','critical'].includes(r.risk_level)).length} high/critical)
Documents on file: ${docsResult.rows.length} (${docsResult.rows.filter(d => d.status !== 'approved').length} not approved)
Submitter draft summary: ${draft_summary || '(not provided)'}

Return JSON:
{
  "submission_type": "${subType}",
  "readiness_score": <0-100>,
  "verdict": "ready_to_submit|conditional|not_ready",
  "blockers": [{"area":"...","issue":"...","severity":"low|medium|high|critical","action":"..."}],
  "weaknesses": [{"area":"...","issue":"...","action":"..."}],
  "strengths": ["..."],
  "missing_artifacts": ["..."],
  "predicate_concerns": ["..."],
  "recommended_next_steps": ["..."],
  "estimated_remaining_effort_weeks": <number>
}`;

    const messages = [
      { role: 'system', content: 'You are a senior FDA regulatory submission reviewer with 20+ years of experience auditing 510(k), De Novo, and PMA packages before they reach the agency. Return ONLY valid JSON.' },
      { role: 'user', content: userPrompt },
    ];
    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('submission_review', 'device', deviceId, userPrompt, aiResult);
    const structured = parseAIJson(aiResult);
    res.json(buildResponse('submission_review', aiResult, structured));
  } catch (err) {
    if (err.status === 503) return res.status(503).json({ error: err.message });
    console.error('Submission review error:', err);
    res.status(500).json({ error: 'Failed to perform submission review' });
  }
});

// POST /api/ai/recall-response — automated recall planning
router.post('/recall-response', async (req, res) => {
  try {
    const { deviceId, recall_reason, classification, units_affected, geographic_scope } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
    if (!recall_reason) return res.status(400).json({ error: 'recall_reason is required' });

    const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [deviceId]);
    if (deviceResult.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
    const device = deviceResult.rows[0];

    const userPrompt = `Generate a recall response and field-action plan for this medical device. Return JSON only.

Device:
- Name: ${device.name}
- Manufacturer: ${device.manufacturer}
- Model: ${device.model_number}
- Class: ${device.device_class}
- FDA Clearance: ${device.fda_clearance_number || 'None'}

Recall trigger:
- Reason: ${recall_reason}
- Suggested classification: ${classification || 'undetermined'} (Class I = serious harm/death, II = temporary, III = unlikely harm)
- Estimated units affected: ${units_affected || 'unknown'}
- Geographic scope: ${geographic_scope || 'undetermined'}

Return JSON:
{
  "recommended_recall_class": "I|II|III",
  "recommended_recall_class_rationale": "...",
  "field_action_type": "removal|correction|safety_alert",
  "regulatory_obligations": [{"jurisdiction":"FDA|EU|Health Canada|...","requirement":"...","deadline_days":<number>}],
  "internal_actions": [{"step":"...","owner":"...","due_in_days":<number>}],
  "customer_communications": {"channels":["..."], "key_messages":["..."], "draft_letter":"..."},
  "press_release_required": true,
  "draft_press_release": "...",
  "field_correction_steps": ["..."],
  "effectiveness_check_plan": "...",
  "success_criteria": ["..."],
  "expected_capa_links": ["..."]
}`;

    const messages = [
      { role: 'system', content: 'You are an expert medical-device recall coordinator with deep knowledge of FDA 21 CFR Part 7, EU MDR field-safety-corrective-action requirements, and ISO 13485. Return ONLY valid JSON.' },
      { role: 'user', content: userPrompt },
    ];
    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('recall_response', 'device', deviceId, userPrompt, aiResult);
    const structured = parseAIJson(aiResult);
    res.json(buildResponse('recall_response', aiResult, structured));
  } catch (err) {
    if (err.status === 503) return res.status(503).json({ error: err.message });
    console.error('Recall response error:', err);
    res.status(500).json({ error: 'Failed to generate recall response plan' });
  }
});

// POST /api/ai/complaint-analysis — analyze a customer/safety complaint
router.post('/complaint-analysis', async (req, res) => {
  try {
    const { deviceId, complaint_text, reporter_role, severity_reported, occurrence_date } = req.body || {};
    if (!complaint_text) return res.status(400).json({ error: 'complaint_text is required' });

    let device = null;
    if (deviceId) {
      const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [deviceId]);
      if (deviceResult.rows.length > 0) device = deviceResult.rows[0];
    }

    let recentNcrs = [];
    if (deviceId) {
      try {
        const ncrRes = await pool.query(
          "SELECT id, source, description, severity, status FROM nonconformances WHERE device_id = $1 ORDER BY id DESC LIMIT 10",
          [deviceId]
        );
        recentNcrs = ncrRes.rows;
      } catch (_) { /* table optional */ }
    }

    const userPrompt = `Analyze this medical device complaint. Decide whether it is reportable, classify severity, and recommend next steps. Return JSON only.

Device: ${device ? `${device.name} (${device.manufacturer} ${device.model_number}, Class ${device.device_class})` : 'unspecified'}
Reporter role: ${reporter_role || 'unspecified'}
Reported severity: ${severity_reported || 'unspecified'}
Occurrence date: ${occurrence_date || 'unspecified'}

Complaint text:
${complaint_text}

Recent related NCRs (${recentNcrs.length}):
${recentNcrs.map(n => `- #${n.id} [${n.severity}] ${n.description || ''}`).join('\n') || 'None'}

Return JSON:
{
  "complaint_category": "device_malfunction|user_error|labeling|software|adverse_event|other",
  "severity_assessment": "low|medium|high|critical",
  "patient_harm_indicators": ["..."],
  "mdr_reportability": {"required": true, "rationale": "...", "deadline_days": <number>},
  "vigilance_reportability_eu": {"required": true, "rationale": "..."},
  "root_cause_hypotheses": ["..."],
  "investigation_steps": ["..."],
  "containment_actions": ["..."],
  "capa_recommendation": "open_capa|monitor|close_with_explanation",
  "trend_signal": {"pattern_detected": false, "details": "..."},
  "summary": "2-3 sentence summary"
}`;

    const messages = [
      { role: 'system', content: 'You are an expert medical-device complaint handler / MDR specialist. Return ONLY valid JSON.' },
      { role: 'user', content: userPrompt },
    ];
    const aiResult = await callOpenRouter(messages);
    await saveAnalysis('complaint_analysis', 'device', deviceId || 0, userPrompt, aiResult);
    const structured = parseAIJson(aiResult);
    res.json(buildResponse('complaint_analysis', aiResult, structured));
  } catch (err) {
    if (err.status === 503) return res.status(503).json({ error: err.message });
    console.error('Complaint analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze complaint' });
  }
});

module.exports = router;
