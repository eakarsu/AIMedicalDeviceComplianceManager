const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/standards - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM regulatory_standards');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      'SELECT * FROM regulatory_standards ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get standards error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/standards/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM regulatory_standards WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Standard not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get standard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/standards
router.post('/', async (req, res) => {
  try {
    const { code, name, category, authority, version, effective_date, description, requirements, status } = req.body;

    const result = await pool.query(
      `INSERT INTO regulatory_standards (code, name, category, authority, version, effective_date, description, requirements, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [code, name, category, authority, version, effective_date, description, requirements, status]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'regulatory_standard', result.rows[0].id, `Created standard: ${code}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create standard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/standards/:id
router.put('/:id', async (req, res) => {
  try {
    const { code, name, category, authority, version, effective_date, description, requirements, status } = req.body;

    const result = await pool.query(
      `UPDATE regulatory_standards SET code=$1, name=$2, category=$3, authority=$4, version=$5, effective_date=$6, description=$7, requirements=$8, status=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [code, name, category, authority, version, effective_date, description, requirements, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Standard not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'regulatory_standard', req.params.id, `Updated standard: ${code}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update standard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/standards/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM regulatory_standards WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Standard not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'regulatory_standard', req.params.id, `Deleted standard: ${result.rows[0].code}`, req.ip]
    );

    res.json({ message: 'Standard deleted successfully' });
  } catch (err) {
    console.error('Delete standard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
