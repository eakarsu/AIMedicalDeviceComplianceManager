const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const pool = require('./db');
const { validateRuntime } = require('./governance/runtime');
const governanceRouter = require('./governance/router');
const { createProviderGate } = require('./governance/providerGate');

validateRuntime();

// Security middleware
app.use(helmet());
const allowedOrigins = String(process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean);
function normalizedOrigin(value) {
  try {
    const parsed = new URL(value);
    const hostname = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ? 'local-loopback' : parsed.hostname;
    return `${parsed.protocol}//${hostname}:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}`;
  } catch {
    return value;
  }
}
const allowedOriginKeys = allowedOrigins.map(normalizedOrigin);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOriginKeys.includes(normalizedOrigin(origin))) return callback(null, true);
    const error = new Error('Origin not allowed by CORS');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
}));
app.use(express.json());
app.use(createProviderGate(['/api/ai','/api/regulatory-advisor-agent','/api/vision-document-verify','/api/audit-anomaly-stream','/api/capa-autonomous','/api/regulatory-intel-agent']));

// Create required tables at startup
async function initDb() {
  if (process.env.MIGRATE_ON_START !== 'true' && process.env.ENABLE_LEGACY_SCHEMA_BOOTSTRAP !== 'true') return;
  const email = process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Runtime admin credentials are required');
  await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(255),
        entity_id INTEGER,
        details TEXT,
        ip_address VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ai_analyses (
        id SERIAL PRIMARY KEY,
        analysis_type VARCHAR(100),
        entity_type VARCHAR(255),
        entity_id INTEGER,
        prompt TEXT,
        result TEXT,
        model_used VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
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
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email, password, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW()`,
    [email, passwordHash, process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator']
  );
  console.log('Database tables initialized');
}

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
app.use('/api/governed-device-compliance', governanceRouter);

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

initDb()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((error) => {
    console.error('Runtime initialization failed:', error.message);
    process.exit(1);
  });

module.exports = app;

// === BATCH 05 AUTO-MOUNT (custom feature suggestions) ===
app.use('/api/regulatory-advisor-agent', require('./routes/regulatory-advisor-agent'));
app.use('/api/vision-document-verify', require('./routes/vision-document-verify'));
app.use('/api/audit-anomaly-stream', require('./routes/audit-anomaly-stream'));
app.use('/api/capa-autonomous', require('./routes/capa-autonomous'));
app.use('/api/regulatory-intel-agent', require('./routes/regulatory-intel-agent'));

// Generated gap routes are quarantined: no mounts until durable provider contracts and acceptance tests exist.
