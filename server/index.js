const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const pool = require('./db');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Create required tables at startup
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id SERIAL PRIMARY KEY,
        document_id INTEGER,
        version_number INTEGER,
        content TEXT,
        changed_by INTEGER,
        change_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Ensure capa_records has closure columns
    await pool.query(`
      ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS closure_reason TEXT
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS effectiveness_verified BOOLEAN DEFAULT FALSE
    `).catch(() => {});
    console.log('Database tables initialized');
  } catch (err) {
    console.error('DB init error (non-fatal):', err.message);
  }
}
initDb();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/standards', require('./routes/standards'));
app.use('/api/checklists', require('./routes/checklists'));
app.use('/api/audit-logs', require('./routes/audit-logs'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/risk-assessments', require('./routes/risk-assessments'));
app.use('/api/capa', require('./routes/capa'));
app.use('/api/training', require('./routes/training'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/nonconformance', require('./routes/nonconformance'));
app.use('/api/change-controls', require('./routes/change-controls'));
app.use('/api/calibration', require('./routes/calibration'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/udi-recall-trace', require('./routes/udi-recall-trace'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

// === BATCH 05 AUTO-MOUNT (custom feature suggestions) ===
app.use('/api/regulatory-advisor-agent', require('./routes/regulatory-advisor-agent'));
app.use('/api/vision-document-verify', require('./routes/vision-document-verify'));
app.use('/api/audit-anomaly-stream', require('./routes/audit-anomaly-stream'));
app.use('/api/capa-autonomous', require('./routes/capa-autonomous'));
app.use('/api/regulatory-intel-agent', require('./routes/regulatory-intel-agent'));

// === Batch 05 Gaps & Frontend Mounts ===
try { const _gap_submission_review = require('./routes/gap-submission-review'); app.use('/api/gap-submission-review', _gap_submission_review); } catch(e) { console.error('gap mount fail submission-review:', e.message); }
try { const _gap_recall_response = require('./routes/gap-recall-response'); app.use('/api/gap-recall-response', _gap_recall_response); } catch(e) { console.error('gap mount fail recall-response:', e.message); }
try { const _gap_complaint_analysis = require('./routes/gap-complaint-analysis'); app.use('/api/gap-complaint-analysis', _gap_complaint_analysis); } catch(e) { console.error('gap mount fail complaint-analysis:', e.message); }
try { const _gap_post_market_surveillance = require('./routes/gap-post-market-surveillance'); app.use('/api/gap-post-market-surveillance', _gap_post_market_surveillance); } catch(e) { console.error('gap mount fail post-market-surveillance:', e.message); }
try { const _gap_document = require('./routes/gap-document'); app.use('/api/gap-document', _gap_document); } catch(e) { console.error('gap mount fail document:', e.message); }
try { const _gap_third_party = require('./routes/gap-third-party'); app.use('/api/gap-third-party', _gap_third_party); } catch(e) { console.error('gap mount fail third-party:', e.message); }
try { const _gap_automated = require('./routes/gap-automated'); app.use('/api/gap-automated', _gap_automated); } catch(e) { console.error('gap mount fail automated:', e.message); }
try { const _gap_erp = require('./routes/gap-erp'); app.use('/api/gap-erp', _gap_erp); } catch(e) { console.error('gap mount fail erp:', e.message); }
try { const _gap_mobile = require('./routes/gap-mobile'); app.use('/api/gap-mobile', _gap_mobile); } catch(e) { console.error('gap mount fail mobile:', e.message); }
try { const _gap_supplier = require('./routes/gap-supplier'); app.use('/api/gap-supplier', _gap_supplier); } catch(e) { console.error('gap mount fail supplier:', e.message); }
try { const _gap_patient = require('./routes/gap-patient'); app.use('/api/gap-patient', _gap_patient); } catch(e) { console.error('gap mount fail patient:', e.message); }
// === End Batch 05 Mounts ===
