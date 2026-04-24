const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/audit-logs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC');
    res.json(result.rows);
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
