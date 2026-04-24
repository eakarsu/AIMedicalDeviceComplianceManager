import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiCpu, FiMonitor, FiFileText, FiFolder, FiAlertTriangle, FiTool,
  FiUsers, FiTruck, FiAlertCircle, FiGitPullRequest, FiThermometer,
  FiActivity, FiSearch, FiChevronDown, FiChevronRight, FiPlay, FiZap, FiDownload
} from 'react-icons/fi';
import api from '../services/api';
import { getDevices, getStandards, getDocuments } from '../services/api';

// ─── AI Tool Definitions with Sample Data ──────────────────────────────────

const CATEGORIES = [
  {
    id: 'device', label: 'Device Intelligence', icon: FiMonitor, color: '#1a73e8',
    tools: [
      { id: 'compliance-analysis', title: 'Compliance Analysis', desc: 'Analyze device compliance status and get recommendations', endpoint: '/ai/compliance-analysis',
        inputs: [{ key: 'device_id', type: 'device' }],
        samples: [
          { label: 'Cardiac Pacemaker', values: { device_id: 1 } },
          { label: 'Surgical Robot', values: { device_id: 4 } },
          { label: 'Insulin Pump', values: { device_id: 2 } },
        ],
      },
      { id: 'risk-prediction', title: 'Risk Prediction', desc: 'Predict potential risks with AI-powered mitigation suggestions', endpoint: '/ai/risk-prediction',
        inputs: [{ key: 'device_id', type: 'device' }],
        samples: [
          { label: 'Ventilator', values: { device_id: 7 } },
          { label: 'Defibrillator', values: { device_id: 8 } },
          { label: 'MRI Scanner', values: { device_id: 3 } },
        ],
      },
      { id: 'regulatory-pathway', title: 'Regulatory Pathway', desc: 'Determine the best regulatory pathway (510k, PMA, De Novo)', endpoint: '/ai/regulatory-pathway',
        inputs: [{ key: 'device_id', type: 'device' }],
        samples: [
          { label: 'Cochlear Implant', values: { device_id: 16 } },
          { label: 'Blood Glucose Monitor', values: { device_id: 6 } },
          { label: 'Hip Prosthesis', values: { device_id: 5 } },
        ],
      },
      { id: 'predicate-finder', title: 'Predicate Finder', desc: 'Find suitable predicate devices for 510(k) submissions', endpoint: '/ai/predicate-finder',
        inputs: [{ key: 'device_id', type: 'device' }],
        samples: [
          { label: 'Infusion Pump', values: { device_id: 9 } },
          { label: 'Pulse Oximeter', values: { device_id: 15 } },
          { label: 'Ultrasound System', values: { device_id: 10 } },
        ],
      },
      { id: 'classification-advisor', title: 'Classification Advisor', desc: 'Get FDA device classification recommendations', endpoint: '/ai/classification-advisor',
        inputs: [{ key: 'device_description', type: 'text', label: 'Device Description', placeholder: 'Describe the medical device in detail...' }],
        samples: [
          { label: 'AI-Powered Stethoscope', values: { device_description: 'A digital stethoscope with AI-powered heart sound analysis that detects murmurs, arrhythmias, and valve disorders. Uses machine learning algorithms trained on 100,000+ heart recordings. Bluetooth-connected to mobile app for real-time diagnosis assistance.' } },
          { label: 'Smart Wound Dressing', values: { device_description: 'A smart wound dressing with embedded biosensors that continuously monitor wound pH, temperature, moisture levels, and bacterial load. Wirelessly transmits data to healthcare provider dashboard. Contains silver nanoparticle antimicrobial layer.' } },
          { label: 'Robotic Exoskeleton', values: { device_description: 'A lower-limb robotic exoskeleton for rehabilitation of spinal cord injury patients. Uses powered actuators at hip, knee, and ankle joints with force sensors and IMUs for adaptive gait control. Intended for supervised clinical use during physical therapy sessions.' } },
        ],
      },
      { id: 'audit-report', title: 'Audit Report Generator', desc: 'Generate comprehensive AI-powered audit reports', endpoint: '/ai/audit-report',
        inputs: [{ key: 'device_id', type: 'device' }],
        samples: [
          { label: 'CT Scanner Audit', values: { device_id: 11 } },
          { label: 'Endoscope Audit', values: { device_id: 14 } },
          { label: 'Hearing Aid Audit', values: { device_id: 12 } },
        ],
      },
    ],
  },
  {
    id: 'standards', label: 'Standards & Compliance', icon: FiFileText, color: '#ff9800',
    tools: [
      { id: 'gap-analysis', title: 'Gap Analysis', desc: 'Identify gaps between device compliance and regulatory standards', endpoint: '/ai/gap-analysis',
        inputs: [{ key: 'device_id', type: 'device' }, { key: 'standard_id', type: 'standard' }],
        samples: [
          { label: 'Pacemaker vs ISO 13485', values: { device_id: 1, standard_id: 1 } },
          { label: 'Ventilator vs IEC 62304', values: { device_id: 7, standard_id: 3 } },
          { label: 'MRI vs ISO 14971', values: { device_id: 3, standard_id: 2 } },
        ],
      },
      { id: 'standard-interpreter', title: 'Standard Interpreter', desc: 'AI interpretation and explanation of regulatory standards', endpoint: '/ai/standard-interpreter',
        inputs: [{ key: 'standard_id', type: 'standard' }],
        samples: [
          { label: 'ISO 13485 Explained', values: { standard_id: 1 } },
          { label: 'FDA 21 CFR 820', values: { standard_id: 4 } },
          { label: 'EU MDR 2017/745', values: { standard_id: 5 } },
        ],
      },
      { id: 'standard-comparison', title: 'Standard Comparison', desc: 'Compare two regulatory standards side by side', endpoint: '/ai/standard-comparison',
        inputs: [{ key: 'standard_id_1', type: 'standard', label: 'First Standard' }, { key: 'standard_id_2', type: 'standard', label: 'Second Standard' }],
        samples: [
          { label: 'ISO 13485 vs FDA QSR', values: { standard_id_1: 1, standard_id_2: 4 } },
          { label: 'ISO 14971 vs IEC 62366', values: { standard_id_1: 2, standard_id_2: 6 } },
          { label: 'EU MDR vs FDA 21 CFR', values: { standard_id_1: 5, standard_id_2: 4 } },
        ],
      },
      { id: 'checklist-auto-generate', title: 'Checklist Auto-Generator', desc: 'Auto-generate compliance checklists for device and standard', endpoint: '/ai/checklist-auto-generate',
        inputs: [{ key: 'device_id', type: 'device' }, { key: 'standard_id', type: 'standard' }],
        samples: [
          { label: 'Insulin Pump + ISO 14971', values: { device_id: 2, standard_id: 2 } },
          { label: 'Surgical Robot + IEC 62304', values: { device_id: 4, standard_id: 3 } },
          { label: 'Defibrillator + IEC 60601', values: { device_id: 8, standard_id: 7 } },
        ],
      },
      { id: 'checklist-assessment', title: 'Checklist Assessment', desc: 'AI assessment of existing compliance checklists', endpoint: '/ai/checklist-assessment',
        inputs: [{ key: 'device_id', type: 'device' }],
        samples: [
          { label: 'Cardiac Pacemaker', values: { device_id: 1 } },
          { label: 'Blood Glucose Monitor', values: { device_id: 6 } },
          { label: 'Ventilator', values: { device_id: 7 } },
        ],
      },
    ],
  },
  {
    id: 'documents', label: 'Document Intelligence', icon: FiFolder, color: '#4caf50',
    tools: [
      { id: 'document-review', title: 'Document Review', desc: 'AI review of compliance documents with improvement suggestions', endpoint: '/ai/document-review',
        inputs: [{ key: 'document_id', type: 'document' }],
        samples: [
          { label: 'QMS Manual Review', values: { document_id: 1 } },
          { label: 'Risk Management SOP', values: { document_id: 2 } },
          { label: 'Design History File', values: { document_id: 3 } },
        ],
      },
      { id: 'document-generator', title: 'Document Generator', desc: 'Generate compliance documents (SOP, DHF, DMR, etc.)', endpoint: '/ai/document-generator',
        inputs: [{ key: 'document_type', type: 'select', label: 'Document Type', options: ['SOP', 'DHF', 'DMR', 'protocol', 'report', 'certificate', 'manual'] }, { key: 'device_id', type: 'device' }],
        samples: [
          { label: 'SOP for Pacemaker', values: { document_type: 'SOP', device_id: 1 } },
          { label: 'DHF for Insulin Pump', values: { document_type: 'DHF', device_id: 2 } },
          { label: 'Protocol for MRI', values: { document_type: 'protocol', device_id: 3 } },
        ],
      },
      { id: 'document-compliance-check', title: 'Document Compliance Check', desc: 'Check document compliance against regulatory requirements', endpoint: '/ai/document-compliance-check',
        inputs: [{ key: 'document_id', type: 'document' }],
        samples: [
          { label: 'Check QMS Manual', values: { document_id: 1 } },
          { label: 'Check Biocompatibility Report', values: { document_id: 5 } },
          { label: 'Check Software Validation', values: { document_id: 4 } },
        ],
      },
    ],
  },
  {
    id: 'risk', label: 'Risk Management', icon: FiAlertTriangle, color: '#f44336',
    tools: [
      { id: 'risk-mitigation-advisor', title: 'Risk Mitigation Advisor', desc: 'Get AI-powered risk mitigation strategies', endpoint: '/ai/risk-mitigation-advisor',
        inputs: [{ key: 'risk_id', type: 'riskAssessment' }],
        samples: [
          { label: 'Battery Failure Risk', values: { risk_id: 1 } },
          { label: 'Software Malfunction', values: { risk_id: 3 } },
          { label: 'Biocompatibility Risk', values: { risk_id: 5 } },
        ],
      },
      { id: 'risk-matrix-analysis', title: 'Risk Matrix Analysis', desc: 'Analyze the complete risk matrix for a device', endpoint: '/ai/risk-matrix-analysis',
        inputs: [{ key: 'device_id', type: 'device' }],
        samples: [
          { label: 'Pacemaker Risk Matrix', values: { device_id: 1 } },
          { label: 'Surgical Robot Matrix', values: { device_id: 4 } },
          { label: 'Infusion Pump Matrix', values: { device_id: 9 } },
        ],
      },
    ],
  },
  {
    id: 'capa', label: 'CAPA Intelligence', icon: FiTool, color: '#9c27b0',
    tools: [
      { id: 'capa-root-cause', title: 'Root Cause Analyzer', desc: 'AI-powered root cause analysis (5 Whys, Fishbone)', endpoint: '/ai/capa-root-cause',
        inputs: [{ key: 'capa_id', type: 'capa' }],
        samples: [
          { label: 'CAPA #1', values: { capa_id: 1 } },
          { label: 'CAPA #5', values: { capa_id: 5 } },
          { label: 'CAPA #10', values: { capa_id: 10 } },
        ],
      },
      { id: 'capa-effectiveness', title: 'CAPA Effectiveness Review', desc: 'Review effectiveness of CAPA actions', endpoint: '/ai/capa-effectiveness',
        inputs: [{ key: 'capa_id', type: 'capa' }],
        samples: [
          { label: 'CAPA #2', values: { capa_id: 2 } },
          { label: 'CAPA #7', values: { capa_id: 7 } },
          { label: 'CAPA #12', values: { capa_id: 12 } },
        ],
      },
    ],
  },
  {
    id: 'training', label: 'Training Intelligence', icon: FiUsers, color: '#00bcd4',
    tools: [
      { id: 'training-gap-analysis', title: 'Training Gap Analysis', desc: 'Identify training gaps across the organization', endpoint: '/ai/training-gap-analysis',
        inputs: [{ key: 'department', type: 'departmentSelect', label: 'Filter by Department (optional)' }],
        samples: [
          { label: 'All Departments', values: {} },
          { label: 'Quality Assurance', values: { department: 'Quality Assurance' } },
          { label: 'Engineering', values: { department: 'Engineering' } },
        ],
      },
      { id: 'training-plan-generator', title: 'Training Plan Generator', desc: 'Generate a training plan for a department', endpoint: '/ai/training-plan-generator',
        inputs: [{ key: 'department', type: 'text', label: 'Department Name', placeholder: 'Enter department name...' }],
        samples: [
          { label: 'Quality Dept Plan', values: { department: 'Quality Assurance' } },
          { label: 'Engineering Plan', values: { department: 'Engineering' } },
          { label: 'Regulatory Affairs', values: { department: 'Regulatory Affairs' } },
        ],
      },
    ],
  },
  {
    id: 'suppliers', label: 'Supplier Intelligence', icon: FiTruck, color: '#795548',
    tools: [
      { id: 'supplier-risk-assessment', title: 'Supplier Risk Assessment', desc: 'Assess risk levels of suppliers', endpoint: '/ai/supplier-risk-assessment',
        inputs: [{ key: 'supplier_id', type: 'supplier' }],
        samples: [
          { label: 'Supplier #1', values: { supplier_id: 1 } },
          { label: 'Supplier #5', values: { supplier_id: 5 } },
          { label: 'Supplier #10', values: { supplier_id: 10 } },
        ],
      },
      { id: 'supplier-audit-prep', title: 'Supplier Audit Prep', desc: 'Prepare for supplier audits with AI insights', endpoint: '/ai/supplier-audit-prep',
        inputs: [{ key: 'supplier_id', type: 'supplier' }],
        samples: [
          { label: 'Supplier #2', values: { supplier_id: 2 } },
          { label: 'Supplier #7', values: { supplier_id: 7 } },
          { label: 'Supplier #12', values: { supplier_id: 12 } },
        ],
      },
    ],
  },
  {
    id: 'ncr', label: 'NCR Intelligence', icon: FiAlertCircle, color: '#e91e63',
    tools: [
      { id: 'ncr-investigation-assistant', title: 'NCR Investigation Assistant', desc: 'AI-assisted nonconformance investigation', endpoint: '/ai/ncr-investigation-assistant',
        inputs: [{ key: 'ncr_id', type: 'ncr' }],
        samples: [
          { label: 'NCR #1', values: { ncr_id: 1 } },
          { label: 'NCR #5', values: { ncr_id: 5 } },
          { label: 'NCR #10', values: { ncr_id: 10 } },
        ],
      },
      { id: 'ncr-trend-analysis', title: 'NCR Trend Analysis', desc: 'Analyze NCR trends across the organization', endpoint: '/ai/ncr-trend-analysis',
        inputs: [{ key: 'device_id', type: 'device', label: 'Filter by Device (optional)' }],
        samples: [
          { label: 'All NCRs', values: {} },
          { label: 'Pacemaker NCRs', values: { device_id: 1 } },
          { label: 'Ventilator NCRs', values: { device_id: 7 } },
        ],
      },
    ],
  },
  {
    id: 'changeControl', label: 'Change Control Intelligence', icon: FiGitPullRequest, color: '#3f51b5',
    tools: [
      { id: 'change-impact-analysis', title: 'Change Impact Analysis', desc: 'Analyze the impact of proposed changes', endpoint: '/ai/change-impact-analysis',
        inputs: [{ key: 'change_id', type: 'changeControl' }],
        samples: [
          { label: 'Change Control #1', values: { change_id: 1 } },
          { label: 'Change Control #5', values: { change_id: 5 } },
          { label: 'Change Control #10', values: { change_id: 10 } },
        ],
      },
      { id: 'change-risk-assessment', title: 'Change Risk Assessment', desc: 'Assess risks associated with change controls', endpoint: '/ai/change-risk-assessment',
        inputs: [{ key: 'change_id', type: 'changeControl' }],
        samples: [
          { label: 'Change Control #2', values: { change_id: 2 } },
          { label: 'Change Control #8', values: { change_id: 8 } },
          { label: 'Change Control #13', values: { change_id: 13 } },
        ],
      },
    ],
  },
  {
    id: 'calibration', label: 'Calibration Intelligence', icon: FiThermometer, color: '#ff5722',
    tools: [
      { id: 'calibration-schedule-optimizer', title: 'Calibration Schedule Optimizer', desc: 'Optimize calibration schedules with AI', endpoint: '/ai/calibration-schedule-optimizer',
        inputs: [{ key: 'device_id', type: 'device', label: 'Filter by Device (optional)' }],
        samples: [
          { label: 'All Equipment', values: {} },
          { label: 'MRI Scanner Equip', values: { device_id: 3 } },
          { label: 'CT Scanner Equip', values: { device_id: 11 } },
        ],
      },
      { id: 'calibration-drift-analysis', title: 'Calibration Drift Analysis', desc: 'Analyze calibration drift patterns', endpoint: '/ai/calibration-drift-analysis',
        inputs: [{ key: 'calibration_id', type: 'calibration' }],
        samples: [
          { label: 'Calibration #1', values: { calibration_id: 1 } },
          { label: 'Calibration #5', values: { calibration_id: 5 } },
          { label: 'Calibration #10', values: { calibration_id: 10 } },
        ],
      },
    ],
  },
  {
    id: 'audit', label: 'Audit Intelligence', icon: FiActivity, color: '#607d8b',
    tools: [
      { id: 'audit-anomaly-detection', title: 'Audit Anomaly Detection', desc: 'Detect anomalies in audit data', endpoint: '/ai/audit-anomaly-detection',
        inputs: [{ key: 'days', type: 'number', label: 'Lookback Period (days)', placeholder: '30', defaultValue: 30 }],
        samples: [
          { label: 'Last 7 Days', values: { days: 7 } },
          { label: 'Last 30 Days', values: { days: 30 } },
          { label: 'Last 90 Days', values: { days: 90 } },
        ],
      },
      { id: 'audit-summary', title: 'Audit Activity Summary', desc: 'Summarize audit activity over a period', endpoint: '/ai/audit-summary',
        inputs: [{ key: 'days', type: 'number', label: 'Number of Days', placeholder: '30', defaultValue: 30 }],
        samples: [
          { label: 'Weekly Summary', values: { days: 7 } },
          { label: 'Monthly Summary', values: { days: 30 } },
          { label: 'Quarterly Summary', values: { days: 90 } },
        ],
      },
    ],
  },
];

// ─── Format AI Output ───────────────────────────────────────────────────────

function formatAIOutput(text) {
  if (!text) return null;
  const sections = [];
  const lines = text.split('\n');
  let currentSection = { title: '', content: [] };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (/^#{1,3}\s/.test(trimmed) || /^\*\*[^*]+\*\*$/.test(trimmed) || /^\d+\.\s\*\*/.test(trimmed.substring(0, 20))) {
      if (currentSection.title || currentSection.content.length > 0) {
        sections.push({ ...currentSection });
      }
      currentSection = { title: trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, ''), content: [] };
    } else {
      currentSection.content.push(trimmed);
    }
  });
  if (currentSection.title || currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    return <div className="ai-section"><div className="ai-section-body"><p>{text}</p></div></div>;
  }

  const sectionColors = ['#1a73e8', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4', '#3f51b5', '#795548'];

  return sections.map((section, idx) => (
    <div key={idx} className="ai-section" style={{ borderLeftColor: sectionColors[idx % sectionColors.length] }}>
      {section.title && <div className="ai-section-title" style={{ color: sectionColors[idx % sectionColors.length] }}>{section.title}</div>}
      <div className="ai-section-body">
        {section.content.map((line, i) => {
          const isBullet = /^[-\u2022*]\s/.test(line);
          const isNumbered = /^\d+[.)]\s/.test(line);
          const isWarning = /warning|critical|high risk|danger|non.?compliant/i.test(line);
          const isSuccess = /compliant|passed|meets|adequate|sufficient/i.test(line);
          const cleaned = line.replace(/^[-\u2022*]\s/, '').replace(/^\d+[.)]\s/, '').replace(/\*\*/g, '');

          if (isBullet || isNumbered) {
            return (
              <div key={i} className={`ai-bullet ${isWarning ? 'ai-bullet-warning' : ''} ${isSuccess ? 'ai-bullet-success' : ''}`}>
                <span className="ai-bullet-marker">{isNumbered ? line.match(/^\d+/)[0] : '\u2022'}</span>
                <span>{cleaned}</span>
              </div>
            );
          }
          return <p key={i} className={isWarning ? 'ai-text-warning' : isSuccess ? 'ai-text-success' : ''}>{cleaned}</p>;
        })}
      </div>
    </div>
  ));
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  container: { display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: '#f5f7fa' },
  sidebar: { width: 280, minWidth: 280, background: '#fff', borderRight: '1px solid #e0e4e8', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  sidebarHeader: { padding: '20px 16px 12px', borderBottom: '1px solid #e0e4e8', flexShrink: 0 },
  sidebarTitle: { fontSize: 18, fontWeight: 700, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  searchWrapper: { position: 'relative' },
  searchBox: { width: '100%', padding: '8px 12px 8px 34px', border: '1px solid #e0e4e8', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f5f7fa', boxSizing: 'border-box' },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9e9e9e', pointerEvents: 'none' },
  sidebarScroll: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  categoryHeader: { display: 'flex', alignItems: 'center', padding: '10px 16px', cursor: 'pointer', userSelect: 'none', gap: 8, transition: 'background 0.15s', fontSize: 13, fontWeight: 600, color: '#333' },
  categoryBadge: { marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10, color: '#fff' },
  toolItem: { padding: '8px 16px 8px 42px', cursor: 'pointer', fontSize: 13, color: '#555', transition: 'all 0.15s', borderLeft: '3px solid transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  toolItemActive: { background: '#e8f0fe', color: '#1a73e8', fontWeight: 600, borderLeftColor: '#1a73e8' },
  mainContent: { flex: 1, overflowY: 'auto', padding: 32 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9e9e9e', gap: 16 },
  workspaceCard: { maxWidth: 840, margin: '0 auto' },
  toolHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #e0e4e8' },
  toolIconLarge: { width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  inputCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24 },
  resultCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: 24 },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 14 },
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, color: '#666', gap: 16 },
  sampleSection: { borderTop: '1px solid #eee', marginTop: 20, paddingTop: 16 },
  sampleLabel: { fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },
  sampleBtns: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  sampleBtn: {
    padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e4e8', background: '#fafafa',
    cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#444', transition: 'all 0.15s',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AIToolsPage() {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(
    Object.fromEntries(CATEGORIES.map(c => [c.id, true]))
  );
  const [activeToolId, setActiveToolId] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Dropdown data
  const [devices, setDevices] = useState([]);
  const [standards, setStandards] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [capas, setCapas] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ncrs, setNcrs] = useState([]);
  const [changeControls, setChangeControls] = useState([]);
  const [calibrations, setCalibrations] = useState([]);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const normalize = (r) => Array.isArray(r) ? r : (r?.data || []);
    Promise.all([
      getDevices().then(r => setDevices(normalize(r))).catch(() => {}),
      getStandards().then(r => setStandards(normalize(r))).catch(() => {}),
      getDocuments().then(r => setDocuments(normalize(r))).catch(() => {}),
      api.get('/risk-assessments').then(r => setRiskAssessments(normalize(r.data))).catch(() => {}),
      api.get('/capa').then(r => setCapas(normalize(r.data))).catch(() => {}),
      api.get('/suppliers').then(r => setSuppliers(normalize(r.data))).catch(() => {}),
      api.get('/nonconformance').then(r => setNcrs(normalize(r.data))).catch(() => {}),
      api.get('/change-controls').then(r => setChangeControls(normalize(r.data))).catch(() => {}),
      api.get('/calibration').then(r => setCalibrations(normalize(r.data))).catch(() => {}),
    ]);
  }, []);

  // Handle URL query param for category filtering
  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat) {
      const catMap = { device: 'device', standards: 'standards', documents: 'documents', risk: 'risk', capa: 'capa', training: 'training', suppliers: 'suppliers', ncr: 'ncr', change: 'changeControl', calibration: 'calibration', audit: 'audit' };
      const catId = catMap[cat];
      if (catId) {
        setExpandedCategories(prev => ({ ...prev, [catId]: true }));
      }
    }
  }, [searchParams]);

  // Find active tool and its category
  const activeTool = useMemo(() => {
    for (const cat of CATEGORIES) {
      const found = cat.tools.find(t => t.id === activeToolId);
      if (found) return { ...found, categoryColor: cat.color, categoryIcon: cat.icon, categoryLabel: cat.label };
    }
    return null;
  }, [activeToolId]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.toLowerCase();
    return CATEGORIES.map(cat => ({
      ...cat,
      tools: cat.tools.filter(t => t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q)),
    })).filter(cat => cat.tools.length > 0);
  }, [search]);

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const selectTool = (toolId) => {
    setActiveToolId(toolId);
    setResult(null);
    setError('');
    setFormValues({});
  };

  const setFormValue = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const loadSample = (sample) => {
    setFormValues({ ...sample.values });
    setResult(null);
    setError('');
  };

  const getDropdownOptions = (inputType) => {
    switch (inputType) {
      case 'device': return devices.map(d => ({ value: d.id, label: `${d.name}${d.manufacturer ? ' — ' + d.manufacturer : ''}` }));
      case 'standard': return standards.map(s => ({ value: s.id, label: `${s.code || s.name} — ${s.name}` }));
      case 'document': return documents.map(d => ({ value: d.id, label: `${d.title}${d.version ? ' (v' + d.version + ')' : ''}` }));
      case 'riskAssessment': return riskAssessments.map(r => ({ value: r.id, label: `${r.hazard || 'Risk'} — ${r.risk_category || ''} (${r.risk_level || 'N/A'})` }));
      case 'capa': return capas.map(c => ({ value: c.id, label: `${c.title || 'CAPA #' + c.id} — ${c.type || ''} (${c.status || ''})` }));
      case 'supplier': return suppliers.map(s => ({ value: s.id, label: `${s.name || 'Supplier #' + s.id} — ${s.category || ''}` }));
      case 'ncr': return ncrs.map(n => ({ value: n.id, label: `${n.ncr_number || 'NCR #' + n.id}: ${n.title || ''} (${n.severity || ''})` }));
      case 'changeControl': return changeControls.map(c => ({ value: c.id, label: `${c.change_number || 'CC #' + c.id}: ${c.title || ''} (${c.status || ''})` }));
      case 'calibration': return calibrations.map(c => ({ value: c.id, label: `${c.equipment_name || 'Cal #' + c.id} — ${c.equipment_id_str || ''} (${c.status || ''})` }));
      case 'departmentSelect': return [
        { value: '', label: 'All Departments' },
        ...['Quality Assurance', 'Engineering', 'Regulatory Affairs', 'Manufacturing', 'R&D', 'Clinical', 'IT', 'Operations', 'Supply Chain']
          .map(d => ({ value: d, label: d }))
      ];
      default: return [];
    }
  };

  const getInputLabel = (input) => {
    if (input.label) return input.label;
    switch (input.type) {
      case 'device': return 'Select Device';
      case 'standard': return 'Select Standard';
      case 'document': return 'Select Document';
      case 'riskAssessment': return 'Select Risk Assessment';
      case 'capa': return 'Select CAPA';
      case 'supplier': return 'Select Supplier';
      case 'ncr': return 'Select NCR';
      case 'changeControl': return 'Select Change Control';
      case 'calibration': return 'Select Calibration Record';
      case 'departmentSelect': return 'Select Department';
      default: return input.key;
    }
  };

  const canRun = () => {
    if (!activeTool) return false;
    if (activeTool.inputs.length === 0) return true;
    return activeTool.inputs.every(input => {
      if (input.type === 'number') return true;
      if (input.type === 'departmentSelect') return true;
      if (input.label && input.label.includes('optional')) return true;
      const val = formValues[input.key];
      if (!val || (typeof val === 'string' && !val.trim())) return false;
      return true;
    });
  };

  const runAnalysis = async () => {
    if (!activeTool) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const body = {};
      activeTool.inputs.forEach(input => {
        const val = formValues[input.key];
        if (input.type === 'number') {
          body[input.key] = Number(val) || input.defaultValue || 30;
        } else if (val) {
          body[input.key] = val;
        }
      });
      const res = await api.post(activeTool.endpoint, body);
      setResult(res.data.analysis || res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Analysis failed');
    }
    setLoading(false);
  };

  const renderInput = (input) => {
    const dropdownTypes = ['device', 'standard', 'document', 'riskAssessment', 'capa', 'supplier', 'ncr', 'changeControl', 'calibration', 'departmentSelect'];
    if (dropdownTypes.includes(input.type)) {
      const options = getDropdownOptions(input.type);
      return (
        <div key={input.key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>
            {getInputLabel(input)}
          </label>
          <select
            value={formValues[input.key] || ''}
            onChange={e => setFormValue(input.key, e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, background: '#fafafa', fontFamily: 'inherit' }}
          >
            <option value="">Choose...</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    if (input.type === 'select') {
      return (
        <div key={input.key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>{getInputLabel(input)}</label>
          <select
            value={formValues[input.key] || ''}
            onChange={e => setFormValue(input.key, e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, background: '#fafafa', fontFamily: 'inherit' }}
          >
            <option value="">Choose...</option>
            {(input.options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }
    if (input.type === 'text') {
      return (
        <div key={input.key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>{getInputLabel(input)}</label>
          <textarea
            placeholder={input.placeholder || ''}
            value={formValues[input.key] || ''}
            onChange={e => setFormValue(input.key, e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
      );
    }
    if (input.type === 'number') {
      return (
        <div key={input.key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>{getInputLabel(input)}</label>
          <input
            type="number"
            placeholder={input.placeholder || ''}
            value={formValues[input.key] ?? (input.defaultValue || '')}
            onChange={e => setFormValue(input.key, e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>
      );
    }
    return null;
  };

  const CatIcon = activeTool?.categoryIcon;

  return (
    <div style={styles.container}>
      {/* ─── Left Sidebar ─── */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarTitle}>
            <FiZap style={{ color: '#1a73e8' }} /> AI Tools
            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: '#999', background: '#f0f0f0', padding: '2px 8px', borderRadius: 10 }}>30</span>
          </div>
          <div style={styles.searchWrapper}>
            <FiSearch size={14} style={styles.searchIcon} />
            <input style={styles.searchBox} placeholder="Search AI tools..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div style={styles.sidebarScroll}>
          {filteredCategories.map(cat => {
            const Icon = cat.icon;
            const expanded = expandedCategories[cat.id];
            return (
              <div key={cat.id}>
                <div
                  style={styles.categoryHeader}
                  onClick={() => toggleCategory(cat.id)}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f7fa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {expanded ? <FiChevronDown size={14} style={{ color: cat.color }} /> : <FiChevronRight size={14} style={{ color: cat.color }} />}
                  <Icon size={15} style={{ color: cat.color }} />
                  <span style={{ flex: 1 }}>{cat.label}</span>
                  <span style={{ ...styles.categoryBadge, background: cat.color }}>{cat.tools.length}</span>
                </div>
                {expanded && cat.tools.map(tool => (
                  <div
                    key={tool.id}
                    style={{
                      ...styles.toolItem,
                      ...(activeToolId === tool.id ? { ...styles.toolItemActive, borderLeftColor: cat.color, color: cat.color, background: cat.color + '12' } : {}),
                    }}
                    onClick={() => selectTool(tool.id)}
                    onMouseEnter={e => { if (activeToolId !== tool.id) { e.currentTarget.style.background = '#f5f7fa'; e.currentTarget.style.color = '#333'; } }}
                    onMouseLeave={e => { if (activeToolId !== tool.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555'; } }}
                    title={tool.desc}
                  >
                    {tool.title}
                  </div>
                ))}
              </div>
            );
          })}
          {filteredCategories.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>No tools match your search.</div>
          )}
        </div>
      </div>

      {/* ─── Right Main Content ─── */}
      <div style={styles.mainContent}>
        {!activeTool ? (
          <div style={styles.emptyState}>
            <FiCpu size={64} style={{ opacity: 0.3 }} />
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#666', margin: 0 }}>Select an AI Tool</h2>
            <p style={{ fontSize: 14, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
              Choose a tool from the sidebar to get started. We have 30 AI-powered features spanning all compliance modules.
            </p>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, width: '100%', maxWidth: 660 }}>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <div key={cat.id} onClick={() => { setExpandedCategories(prev => ({ ...prev, [cat.id]: true })); selectTool(cat.tools[0].id); }}
                    style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', border: '1px solid #e0e4e8', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e4e8'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <Icon size={18} style={{ color: cat.color }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{cat.label}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{cat.tools.length} tools</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={styles.workspaceCard}>
            {/* Tool Header */}
            <div style={styles.toolHeader}>
              <div style={{ ...styles.toolIconLarge, background: activeTool.categoryColor + '15', color: activeTool.categoryColor }}>
                {CatIcon && <CatIcon size={28} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: activeTool.categoryColor, marginBottom: 4 }}>
                  {activeTool.categoryLabel}
                </div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{activeTool.title}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#777' }}>{activeTool.desc}</p>
              </div>
            </div>

            {/* Input Form */}
            <div style={styles.inputCard}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 16 }}>Configuration</div>

              {activeTool.inputs.length > 0 ? (
                activeTool.inputs.map(input => renderInput(input))
              ) : (
                <p style={{ fontSize: 14, color: '#888', margin: '0 0 16px' }}>
                  This tool analyzes all available data automatically. Click the button below to run.
                </p>
              )}

              {/* Sample Data Buttons */}
              {activeTool.samples && activeTool.samples.length > 0 && (
                <div style={styles.sampleSection}>
                  <div style={styles.sampleLabel}>
                    <FiDownload size={12} /> Quick Load Sample Data
                  </div>
                  <div style={styles.sampleBtns}>
                    {activeTool.samples.map((sample, idx) => (
                      <button
                        key={idx}
                        style={{
                          ...styles.sampleBtn,
                          borderColor: formValues === sample.values ? activeTool.categoryColor : '#e0e4e8',
                        }}
                        onClick={() => loadSample(sample)}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = activeTool.categoryColor; e.currentTarget.style.background = activeTool.categoryColor + '08'; e.currentTarget.style.color = activeTool.categoryColor; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e4e8'; e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.color = '#444'; }}
                      >
                        <FiPlay size={11} /> {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Run Button */}
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={runAnalysis}
                  disabled={!canRun() || loading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 32px', fontSize: 15, fontWeight: 600, borderRadius: 10,
                    border: 'none', cursor: canRun() && !loading ? 'pointer' : 'not-allowed',
                    background: canRun() && !loading ? activeTool.categoryColor : '#ccc',
                    color: '#fff', transition: 'all 0.2s', opacity: canRun() && !loading ? 1 : 0.6,
                  }}
                >
                  {loading ? (
                    <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span> Analyzing...</>
                  ) : (
                    <><FiPlay size={16} /> Run Analysis</>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && <div style={styles.errorBox}><FiAlertTriangle size={18} /> {error}</div>}

            {/* Loading */}
            {loading && (
              <div style={styles.loadingBox}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: activeTool.categoryColor, animation: 'pulse 1.4s ease-in-out infinite' }}></div>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: activeTool.categoryColor, animation: 'pulse 1.4s ease-in-out 0.2s infinite' }}></div>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: activeTool.categoryColor, animation: 'pulse 1.4s ease-in-out 0.4s infinite' }}></div>
                </div>
                <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>AI is analyzing your data...</p>
                <span style={{ fontSize: 13, color: '#999' }}>This may take a moment</span>
              </div>
            )}

            {/* Result */}
            {result && !loading && (
              <div style={styles.resultCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #eee', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: activeTool.categoryColor, color: '#fff',
                    padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  }}>
                    <FiCpu size={14} /> AI Analysis Complete
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    <span>Model: {result.model || 'Claude Haiku'}</span>
                    <span style={{ marginLeft: 12 }}>
                      {result.created_at ? new Date(result.created_at).toLocaleString() : new Date().toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="ai-result-body">
                  {formatAIOutput(result.result || result.content || (typeof result === 'string' ? result : JSON.stringify(result)))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } }
      `}</style>
    </div>
  );
}
