'use strict';

const express = require('express');
const workshopsRepo = require('../repositories/workshops.repository');
const registrationsRepo = require('../repositories/registrations.repository');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  validate,
  createWorkshopSchema,
  updateWorkshopSchema,
  createRegistrationSchema,
} = require('../utils/validation');

const router = express.Router();

const VALID_STATUSES = ['scheduled', 'cancelled', 'completed'];

// GET /api/workshops — Manager + Staff only (per spec: Admin must be refused)
router.get('/', requireRole('manager', 'staff'), async (req, res, next) => {
  try {
    const { status, from, to, search, availableOnly } = req.query;

    const filters = {};
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.` });
      }
      filters.status = status;
    }
    if (from) filters.from = from;
    if (to) filters.to = to;
    if (search) filters.search = search;
    if (availableOnly === 'true') filters.availableOnly = true;

    const workshops = await workshopsRepo.list(filters);
    res.json(workshops);
  } catch (err) {
    next(err);
  }
});

// GET /api/workshops/:id — Manager + Staff only (per spec: Admin must be refused)
router.get('/:id', requireRole('manager', 'staff'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid workshop ID.' });

    const workshop = await workshopsRepo.findById(id);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found.' });
    res.json(workshop);
  } catch (err) {
    next(err);
  }
});

// POST /api/workshops — Manager only (per spec: Admin must be refused)
router.post(
  '/',
  requireRole('manager'),
  validate(createWorkshopSchema),
  async (req, res, next) => {
    try {
      const workshop = await workshopsRepo.create(req.validated, req.session.user.id);
      res.status(201).json(workshop);
    } catch (err) {
      if (err.code === '23505') {
        // PostgreSQL unique violation
        return res.status(409).json({ error: 'A workshop with this code already exists.' });
      }
      next(err);
    }
  }
);

// PATCH /api/workshops/:id — Manager only (per spec: Admin must be refused)
router.patch(
  '/:id',
  requireRole('manager'),
  validate(updateWorkshopSchema),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid workshop ID.' });

      const updated = await workshopsRepo.update(id, req.validated);
      if (!updated) return res.status(404).json({ error: 'Workshop not found.' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/workshops/:id/registrations — Manager + Staff only (per spec: Admin must be refused)
router.get('/:id/registrations', requireRole('manager', 'staff'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid workshop ID.' });

    const workshop = await workshopsRepo.findById(id);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found.' });

    const { status } = req.query;
    const registrations = await registrationsRepo.listByWorkshop(id, status);
    res.json({ workshop, registrations });
  } catch (err) {
    next(err);
  }
});

// POST /api/workshops/:id/registrations — Manager + Staff only (per spec: Admin must be refused)
router.post(
  '/:id/registrations',
  requireRole('manager', 'staff'),
  validate(createRegistrationSchema),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid workshop ID.' });

      const registration = await registrationsRepo.registerAttendee(
        id,
        req.validated,
        req.session.user.id
      );
      res.status(201).json(registration);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
