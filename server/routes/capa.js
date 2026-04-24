const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/capa
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, d.name as device_name
       FROM capa_records c
       LEFT JOIN devices d ON c.device_id = d.id
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
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

// DELETE /api/capa/:id
router.delete('/:id', async (req, res) => {
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
