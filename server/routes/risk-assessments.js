const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

function calculateRiskLevel(severity, probability) {
  const score = severity * probability;
  if (score >= 15) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

// GET /api/risk-assessments - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM risk_assessments');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      `SELECT r.*, d.name as device_name
       FROM risk_assessments r
       LEFT JOIN devices d ON r.device_id = d.id
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get risk assessments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/risk-assessments/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, d.name as device_name
       FROM risk_assessments r
       LEFT JOIN devices d ON r.device_id = d.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get risk assessment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/risk-assessments
router.post('/', async (req, res) => {
  try {
    const { device_id, hazard, risk_category, severity, probability, mitigation, residual_risk_level, status, assigned_to, review_date } = req.body;

    const risk_level = calculateRiskLevel(severity, probability);

    const result = await pool.query(
      `INSERT INTO risk_assessments (device_id, hazard, risk_category, severity, probability, risk_level, mitigation, residual_risk_level, status, assigned_to, review_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [device_id, hazard, risk_category, severity, probability, risk_level, mitigation, residual_risk_level, status, assigned_to, review_date]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'risk_assessment', result.rows[0].id, `Created risk assessment: ${hazard}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create risk assessment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/risk-assessments/:id
router.put('/:id', async (req, res) => {
  try {
    const { device_id, hazard, risk_category, severity, probability, mitigation, residual_risk_level, status, assigned_to, review_date } = req.body;

    const risk_level = calculateRiskLevel(severity, probability);

    const result = await pool.query(
      `UPDATE risk_assessments SET device_id=$1, hazard=$2, risk_category=$3, severity=$4, probability=$5, risk_level=$6, mitigation=$7, residual_risk_level=$8, status=$9, assigned_to=$10, review_date=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [device_id, hazard, risk_category, severity, probability, risk_level, mitigation, residual_risk_level, status, assigned_to, review_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'risk_assessment', req.params.id, `Updated risk assessment: ${hazard}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update risk assessment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/risk-assessments/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM risk_assessments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'risk_assessment', req.params.id, `Deleted risk assessment: ${result.rows[0].hazard}`, req.ip]
    );

    res.json({ message: 'Risk assessment deleted successfully' });
  } catch (err) {
    console.error('Delete risk assessment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
