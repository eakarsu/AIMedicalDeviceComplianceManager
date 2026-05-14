const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(auth);

// GET /api/devices - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM devices');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM devices ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get devices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/devices/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM devices WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get device error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/devices
router.post('/', async (req, res) => {
  try {
    const {
      name, manufacturer, model_number, serial_number, device_class,
      status, description, department, installation_date, last_inspection,
      next_inspection, fda_clearance_number, ce_marking,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO devices (name, manufacturer, model_number, serial_number, device_class, status, description, department, installation_date, last_inspection, next_inspection, fda_clearance_number, ce_marking)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, manufacturer, model_number, serial_number, device_class, status, description, department, installation_date, last_inspection, next_inspection, fda_clearance_number, ce_marking]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'device', result.rows[0].id, `Created device: ${name}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create device error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/devices/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      name, manufacturer, model_number, serial_number, device_class,
      status, description, department, installation_date, last_inspection,
      next_inspection, fda_clearance_number, ce_marking,
    } = req.body;

    const result = await pool.query(
      `UPDATE devices SET name=$1, manufacturer=$2, model_number=$3, serial_number=$4, device_class=$5, status=$6, description=$7, department=$8, installation_date=$9, last_inspection=$10, next_inspection=$11, fda_clearance_number=$12, ce_marking=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [name, manufacturer, model_number, serial_number, device_class, status, description, department, installation_date, last_inspection, next_inspection, fda_clearance_number, ce_marking, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'device', req.params.id, `Updated device: ${name}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update device error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/devices/:id - admin/quality_manager only
router.delete('/:id', requireRole('admin', 'quality_manager'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'device', req.params.id, `Deleted device: ${result.rows[0].name}`, req.ip]
    );

    res.json({ message: 'Device deleted successfully' });
  } catch (err) {
    console.error('Delete device error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
