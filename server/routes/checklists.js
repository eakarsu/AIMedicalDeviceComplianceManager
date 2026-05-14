const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/checklists - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM compliance_checklists');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      `SELECT c.*, d.name as device_name, s.code as standard_code
       FROM compliance_checklists c
       LEFT JOIN devices d ON c.device_id = d.id
       LEFT JOIN regulatory_standards s ON c.standard_id = s.id
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get checklists error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/checklists/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, d.name as device_name, s.code as standard_code
       FROM compliance_checklists c
       LEFT JOIN devices d ON c.device_id = d.id
       LEFT JOIN regulatory_standards s ON c.standard_id = s.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get checklist error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/checklists
router.post('/', async (req, res) => {
  try {
    const { device_id, standard_id, item_name, description, status, priority, assigned_to, due_date, evidence, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO compliance_checklists (device_id, standard_id, item_name, description, status, priority, assigned_to, due_date, evidence, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [device_id, standard_id, item_name, description, status, priority, assigned_to, due_date, evidence, notes]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'compliance_checklist', result.rows[0].id, `Created checklist item: ${item_name}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create checklist error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/checklists/:id
router.put('/:id', async (req, res) => {
  try {
    const { device_id, standard_id, item_name, description, status, priority, assigned_to, due_date, evidence, notes } = req.body;

    const result = await pool.query(
      `UPDATE compliance_checklists SET device_id=$1, standard_id=$2, item_name=$3, description=$4, status=$5, priority=$6, assigned_to=$7, due_date=$8, evidence=$9, notes=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [device_id, standard_id, item_name, description, status, priority, assigned_to, due_date, evidence, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'compliance_checklist', req.params.id, `Updated checklist item: ${item_name}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update checklist error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/checklists/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compliance_checklists WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'compliance_checklist', req.params.id, `Deleted checklist item: ${result.rows[0].item_name}`, req.ip]
    );

    res.json({ message: 'Checklist item deleted successfully' });
  } catch (err) {
    console.error('Delete checklist error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
