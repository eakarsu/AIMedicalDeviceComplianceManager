const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(auth);

// GET /api/documents - with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM documents');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT doc.*, d.name as device_name
       FROM documents doc
       LEFT JOIN devices d ON doc.device_id = d.id
       ORDER BY doc.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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

// GET /api/documents/:id/versions - List version history
router.get('/:id/versions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM document_versions
       WHERE document_id = $1
       ORDER BY version_number DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get document versions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents/:id/version - Save a new version
router.post('/:id/version', async (req, res) => {
  try {
    const { content, change_reason } = req.body;

    // Get current max version number
    const maxVersionResult = await pool.query(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM document_versions WHERE document_id = $1',
      [req.params.id]
    );
    const nextVersion = parseInt(maxVersionResult.rows[0].max_version) + 1;

    // Verify document exists
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const result = await pool.query(
      `INSERT INTO document_versions (document_id, version_number, content, changed_by, change_reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, nextVersion, content || null, req.user.id || null, change_reason || null]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_name, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.name, 'VERSION_SAVE', 'document', req.params.id, `Saved version ${nextVersion} of document: ${docResult.rows[0].title}`, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Save document version error:', err);
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

// DELETE /api/documents/:id - admin/quality_manager only
router.delete('/:id', requireRole('admin', 'quality_manager'), async (req, res) => {
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
