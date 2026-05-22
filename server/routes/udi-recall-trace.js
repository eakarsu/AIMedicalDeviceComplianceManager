const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    feature: 'UDI Recall Trace',
    summary: { devicesScanned: 1240, affectedLots: 3, openFieldActions: 2, customerNotices: 17 },
    lots: [
      { udi: '00889842000121', model: 'Infusion Pump X2', lot: 'L-22A91', status: 'field action open', action: 'Quarantine inventory and notify accounts' },
      { udi: '00889842000466', model: 'Cardiac Monitor M7', lot: 'CM-18F04', status: 'review', action: 'Verify firmware revision before release' },
      { udi: '00889842000713', model: 'Surgical Sensor S', lot: 'SS-44B10', status: 'closed', action: 'Document correction evidence' }
    ],
    workflow: ['UDI scan', 'Lot exposure match', 'Customer/device location trace', 'Recall letter packet', 'Effectiveness check']
  });
});

module.exports = router;
