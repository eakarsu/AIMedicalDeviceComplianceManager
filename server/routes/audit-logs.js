const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/audit-logs - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM audit_logs');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/audit-logs
router.post('/', async (req, res) => {
  try {
    const { user_name, action, entity_type, entity_id, details, ip_address } = req.body;

    const result = await pool.query(
      `INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_name || req.user.name, action, entity_type, entity_id, details, ip_address || req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create audit log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
