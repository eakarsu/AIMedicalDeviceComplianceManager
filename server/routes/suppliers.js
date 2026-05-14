const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/suppliers - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM suppliers');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      'SELECT * FROM suppliers ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get suppliers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/suppliers/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get supplier error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  try {
    const { name, contact_person, email, phone, address, category, qualification_status, iso_certified, last_audit_date, next_audit_date, risk_rating, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO suppliers (name, contact_person, email, phone, address, category, qualification_status, iso_certified, last_audit_date, next_audit_date, risk_rating, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, contact_person, email, phone, address, category, qualification_status, iso_certified, last_audit_date, next_audit_date, risk_rating, notes]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'supplier', result.rows[0].id, `Created supplier: ${name}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create supplier error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, contact_person, email, phone, address, category, qualification_status, iso_certified, last_audit_date, next_audit_date, risk_rating, notes } = req.body;

    const result = await pool.query(
      `UPDATE suppliers SET name=$1, contact_person=$2, email=$3, phone=$4, address=$5, category=$6, qualification_status=$7, iso_certified=$8, last_audit_date=$9, next_audit_date=$10, risk_rating=$11, notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [name, contact_person, email, phone, address, category, qualification_status, iso_certified, last_audit_date, next_audit_date, risk_rating, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'supplier', req.params.id, `Updated supplier: ${name}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update supplier error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM suppliers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'supplier', req.params.id, `Deleted supplier: ${result.rows[0].name}`, req.ip]
    );

    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    console.error('Delete supplier error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
