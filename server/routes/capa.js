const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(auth);

// GET /api/capa - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM capa_records');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT c.*, d.name as device_name
       FROM capa_records c
       LEFT JOIN devices d ON c.device_id = d.id
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get CAPA records error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/capa/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, d.name as device_name
       FROM capa_records c
       LEFT JOIN devices d ON c.device_id = d.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CAPA record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get CAPA record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/capa
router.post('/', async (req, res) => {
  try {
    const { title, type, source, device_id, description, root_cause, action_plan, status, priority, assigned_to, due_date, completion_date } = req.body;

    const result = await pool.query(
      `INSERT INTO capa_records (title, type, source, device_id, description, root_cause, action_plan, status, priority, assigned_to, due_date, completion_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [title, type, source, device_id, description, root_cause, action_plan, status, priority, assigned_to, due_date, completion_date]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'capa_record', result.rows[0].id, `Created CAPA: ${title}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create CAPA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/capa/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, type, source, device_id, description, root_cause, action_plan, status, priority, assigned_to, due_date, completion_date } = req.body;

    const result = await pool.query(
      `UPDATE capa_records SET title=$1, type=$2, source=$3, device_id=$4, description=$5, root_cause=$6, action_plan=$7, status=$8, priority=$9, assigned_to=$10, due_date=$11, completion_date=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [title, type, source, device_id, description, root_cause, action_plan, status, priority, assigned_to, due_date, completion_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CAPA record not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'capa_record', req.params.id, `Updated CAPA: ${title}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update CAPA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/capa/:id/close - CAPA closure workflow (admin/quality_manager only)
router.put('/:id/close', requireRole('admin', 'quality_manager'), async (req, res) => {
  try {
    const { closure_reason, effectiveness_verified } = req.body;

    const existing = await pool.query('SELECT * FROM capa_records WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'CAPA record not found' });
    }

    const result = await pool.query(
      `UPDATE capa_records
       SET status='closed', closed_at=NOW(), closure_reason=$1, effectiveness_verified=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [closure_reason || null, effectiveness_verified === true || effectiveness_verified === 'true', req.params.id]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        req.user.name,
        'CAPA_CLOSURE',
        'capa_record',
        req.params.id,
        `Closed CAPA: ${existing.rows[0].title} | Effectiveness verified: ${effectiveness_verified}`,
        req.ip,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Close CAPA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/capa/:id - admin/quality_manager only
router.delete('/:id', requireRole('admin', 'quality_manager'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM capa_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CAPA record not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'capa_record', req.params.id, `Deleted CAPA: ${result.rows[0].title}`, req.ip]
    );

    res.json({ message: 'CAPA record deleted successfully' });
  } catch (err) {
    console.error('Delete CAPA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
