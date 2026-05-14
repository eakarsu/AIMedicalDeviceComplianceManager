const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/training - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM training_records');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      'SELECT * FROM training_records ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get training records error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/training/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM training_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get training record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/training
router.post('/', async (req, res) => {
  try {
    const { employee_name, employee_id_str, department, course_name, course_type, trainer, training_date, expiry_date, status, score, certificate_number } = req.body;

    const result = await pool.query(
      `INSERT INTO training_records (employee_name, employee_id_str, department, course_name, course_type, trainer, training_date, expiry_date, status, score, certificate_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [employee_name, employee_id_str, department, course_name, course_type, trainer, training_date, expiry_date, status, score, certificate_number]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'training_record', result.rows[0].id, `Created training record: ${course_name} for ${employee_name}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create training record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/training/:id
router.put('/:id', async (req, res) => {
  try {
    const { employee_name, employee_id_str, department, course_name, course_type, trainer, training_date, expiry_date, status, score, certificate_number } = req.body;

    const result = await pool.query(
      `UPDATE training_records SET employee_name=$1, employee_id_str=$2, department=$3, course_name=$4, course_type=$5, trainer=$6, training_date=$7, expiry_date=$8, status=$9, score=$10, certificate_number=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [employee_name, employee_id_str, department, course_name, course_type, trainer, training_date, expiry_date, status, score, certificate_number, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training record not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'training_record', req.params.id, `Updated training record: ${course_name}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update training record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/training/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM training_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training record not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'training_record', req.params.id, `Deleted training record: ${result.rows[0].course_name}`, req.ip]
    );

    res.json({ message: 'Training record deleted successfully' });
  } catch (err) {
    console.error('Delete training record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
