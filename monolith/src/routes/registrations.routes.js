'use strict';

const express = require('express');
const registrationsRepo = require('../repositories/registrations.repository');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/registrations/history — Manager + Staff only (per spec: Admin must be refused)
router.get('/history', requireRole('manager', 'staff'), async (req, res, next) => {
  try {
    const { status, workshop_id } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (workshop_id) filters.workshop_id = parseInt(workshop_id, 10);
    const registrations = await registrationsRepo.listAll(filters);
    res.json(registrations);
  } catch (err) {
    next(err);
  }
});

// GET /api/registrations/:id/history — Manager + Staff only (per spec: Admin must be refused)
router.get('/:id/history', requireRole('manager', 'staff'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid registration ID.' });

    const registration = await registrationsRepo.findById(id);
    if (!registration) return res.status(404).json({ error: 'Registration not found.' });

    const history = await registrationsRepo.getHistory(id);
    res.json({ registration, history });
  } catch (err) {
    next(err);
  }
});

// POST /api/registrations/:id/cancel — Manager + Staff only (per spec: Admin must be refused)
router.post('/:id/cancel', requireRole('manager', 'staff'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid registration ID.' });

    const { registration, alreadyCancelled } = await registrationsRepo.cancelRegistration(
      id,
      req.session.user.id
    );

    if (alreadyCancelled) {
      return res.json({
        message: 'Registration was already cancelled.',
        registration,
      });
    }

    res.json({ message: 'Registration cancelled successfully.', registration });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
