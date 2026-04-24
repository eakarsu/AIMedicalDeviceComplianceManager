const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/documents
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT doc.*, d.name as device_name
       FROM documents doc
       LEFT JOIN devices d ON doc.device_id = d.id
       ORDER BY doc.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get documents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT doc.*, d.name as device_name
       FROM documents doc
       LEFT JOIN devices d ON doc.device_id = d.id
       WHERE doc.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents
router.post('/', async (req, res) => {
  try {
    const { title, document_type, version, status, device_id, standard_id, file_path, description, author, approved_by, approved_date } = req.body;

    const result = await pool.query(
      `INSERT INTO documents (title, document_type, version, status, device_id, standard_id, file_path, description, author, approved_by, approved_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [title, document_type, version, status, device_id, standard_id, file_path, description, author, approved_by, approved_date]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'CREATE', 'document', result.rows[0].id, `Created document: ${title}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/documents/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, document_type, version, status, device_id, standard_id, file_path, description, author, approved_by, approved_date } = req.body;

    const result = await pool.query(
      `UPDATE documents SET title=$1, document_type=$2, version=$3, status=$4, device_id=$5, standard_id=$6, file_path=$7, description=$8, author=$9, approved_by=$10, approved_date=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [title, document_type, version, status, device_id, standard_id, file_path, description, author, approved_by, approved_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'UPDATE', 'document', req.params.id, `Updated document: ${title}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'DELETE', 'document', req.params.id, `Deleted document: ${result.rows[0].title}`, req.ip]
    );

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
