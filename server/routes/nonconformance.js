const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/nonconformance
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, d.name as device_name
       FROM nonconformance_reports n
       LEFT JOIN devices d ON n.device_id = d.id
       ORDER BY n.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get nonconformance reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nonconformance/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, d.name as device_name
       FROM nonconformance_reports n
       LEFT JOIN devices d ON n.device_id = d.id
       WHERE n.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nonconformance report not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get nonconformance report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/nonconformance
router.post('/', async (req, res) => {
  try {
    const { title, device_id, category, severity, description, investigation, disposition, status, reported_by, assigned_to, due_date } = req.body;

    // Auto-generate NCR number: NCR-YYYY-XXXX
    const year = new Date().getFullYear();
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM nonconformance_reports WHERE ncr_number LIKE $1",
      [`NCR-${year}-%`]
    );
    const seq = parseInt(countResult.rows[0].count) + 1;
    const ncr_number = `NCR-${year}-${String(seq).padStart(4, '0')}`;

    const result = await pool.query(
      `INSERT INTO nonconformance_reports (ncr_number, title, device_id, category, severity, description, investigation, disposition, status, reported_by, assigned_to, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [ncr_number, title, device_id, category, severity, description, investigation, disposition, status, reported_by, assigned_to, due_date]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'nonconformance_report', result.rows[0].id, `Created NCR: ${ncr_number} - ${title}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create nonconformance report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/nonconformance/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, device_id, category, severity, description, investigation, disposition, status, reported_by, assigned_to, due_date } = req.body;

    const result = await pool.query(
      `UPDATE nonconformance_reports SET title=$1, device_id=$2, category=$3, severity=$4, description=$5, investigation=$6, disposition=$7, status=$8, reported_by=$9, assigned_to=$10, due_date=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [title, device_id, category, severity, description, investigation, disposition, status, reported_by, assigned_to, due_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nonconformance report not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'nonconformance_report', req.params.id, `Updated NCR: ${result.rows[0].ncr_number} - ${title}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update nonconformance report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/nonconformance/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM nonconformance_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nonconformance report not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'nonconformance_report', req.params.id, `Deleted NCR: ${result.rows[0].ncr_number}`, req.ip]
    );

    res.json({ message: 'Nonconformance report deleted successfully' });
  } catch (err) {
    console.error('Delete nonconformance report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
