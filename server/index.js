const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

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
