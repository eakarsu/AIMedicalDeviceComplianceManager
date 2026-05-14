const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/calibration - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM calibration_records');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      `SELECT cal.*, d.name as device_name
       FROM calibration_records cal
       LEFT JOIN devices d ON cal.device_id = d.id
       ORDER BY cal.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get calibration records error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calibration/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cal.*, d.name as device_name
       FROM calibration_records cal
       LEFT JOIN devices d ON cal.device_id = d.id
       WHERE cal.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calibration record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get calibration record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/calibration
router.post('/', async (req, res) => {
  try {
    const { equipment_name, equipment_id_str, device_id, calibration_type, calibration_date, next_calibration_date, performed_by, status, standard_used, results, certificate_number } = req.body;

    const result = await pool.query(
      `INSERT INTO calibration_records (equipment_name, equipment_id_str, device_id, calibration_type, calibration_date, next_calibration_date, performed_by, status, standard_used, results, certificate_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [equipment_name, equipment_id_str, device_id, calibration_type, calibration_date, next_calibration_date, performed_by, status, standard_used, results, certificate_number]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'calibration_record', result.rows[0].id, `Created calibration record: ${equipment_name}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create calibration record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/calibration/:id
router.put('/:id', async (req, res) => {
  try {
    const { equipment_name, equipment_id_str, device_id, calibration_type, calibration_date, next_calibration_date, performed_by, status, standard_used, results, certificate_number } = req.body;

    const result = await pool.query(
      `UPDATE calibration_records SET equipment_name=$1, equipment_id_str=$2, device_id=$3, calibration_type=$4, calibration_date=$5, next_calibration_date=$6, performed_by=$7, status=$8, standard_used=$9, results=$10, certificate_number=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [equipment_name, equipment_id_str, device_id, calibration_type, calibration_date, next_calibration_date, performed_by, status, standard_used, results, certificate_number, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calibration record not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'calibration_record', req.params.id, `Updated calibration record: ${equipment_name}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update calibration record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/calibration/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM calibration_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calibration record not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'calibration_record', req.params.id, `Deleted calibration record: ${result.rows[0].equipment_name}`, req.ip]
    );

    res.json({ message: 'Calibration record deleted successfully' });
  } catch (err) {
    console.error('Delete calibration record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
