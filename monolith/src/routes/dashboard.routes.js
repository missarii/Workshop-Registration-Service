'use strict';

const express = require('express');
const workshopsRepo = require('../repositories/workshops.repository');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard — Manager + Staff only (per spec: Admin must be refused)
router.get('/', requireRole('manager', 'staff'), async (req, res, next) => {
  try {
    const stats = await workshopsRepo.getDashboardStats();

    // Upcoming workshops (next 10)
    const upcoming = await workshopsRepo.list({ status: 'scheduled' });

    res.json({
      stats,
      upcoming: upcoming.slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
