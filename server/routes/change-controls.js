const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/change-controls - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM change_controls');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      `SELECT cc.*, d.name as device_name
       FROM change_controls cc
       LEFT JOIN devices d ON cc.device_id = d.id
       ORDER BY cc.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get change controls error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/change-controls/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cc.*, d.name as device_name
       FROM change_controls cc
       LEFT JOIN devices d ON cc.device_id = d.id
       WHERE cc.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change control not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get change control error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/change-controls
router.post('/', async (req, res) => {
  try {
    const { title, change_type, device_id, description, justification, impact_assessment, status, priority, requested_by, approved_by, implementation_date } = req.body;

    // Auto-generate change number: CC-YYYY-XXXX
    const year = new Date().getFullYear();
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM change_controls WHERE change_number LIKE $1",
      [`CC-${year}-%`]
    );
    const seq = parseInt(countResult.rows[0].count) + 1;
    const change_number = `CC-${year}-${String(seq).padStart(4, '0')}`;

    const result = await pool.query(
      `INSERT INTO change_controls (change_number, title, change_type, device_id, description, justification, impact_assessment, status, priority, requested_by, approved_by, implementation_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [change_number, title, change_type, device_id, description, justification, impact_assessment, status, priority, requested_by, approved_by, implementation_date]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'change_control', result.rows[0].id, `Created change control: ${change_number} - ${title}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create change control error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/change-controls/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, change_type, device_id, description, justification, impact_assessment, status, priority, requested_by, approved_by, implementation_date } = req.body;

    const result = await pool.query(
      `UPDATE change_controls SET title=$1, change_type=$2, device_id=$3, description=$4, justification=$5, impact_assessment=$6, status=$7, priority=$8, requested_by=$9, approved_by=$10, implementation_date=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [title, change_type, device_id, description, justification, impact_assessment, status, priority, requested_by, approved_by, implementation_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change control not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'change_control', req.params.id, `Updated change control: ${result.rows[0].change_number} - ${title}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update change control error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/change-controls/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM change_controls WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change control not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'change_control', req.params.id, `Deleted change control: ${result.rows[0].change_number}`, req.ip]
    );

    res.json({ message: 'Change control deleted successfully' });
  } catch (err) {
    console.error('Delete change control error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
