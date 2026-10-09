'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const usersRepo = require('../repositories/users.repository');
const { requireRole } = require('../middleware/auth');
const { validate, createUserSchema, updateUserSchema } = require('../utils/validation');

const router = express.Router();

// GET /api/users — Admin only
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const users = await usersRepo.listAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST /api/users — Admin only
router.post('/', requireRole('admin'), validate(createUserSchema), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.validated;

    // Check for duplicate email
    const existing = await usersRepo.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await usersRepo.create({ name, email, passwordHash, role });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id — Admin only
router.patch('/:id', requireRole('admin'), validate(updateUserSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });

    const target = await usersRepo.findById(id);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const fields = req.validated;

    // Prevent deactivating or demoting the last active admin
    const isDeactivating = fields.is_active === false;
    const isDemoting = fields.role && fields.role !== 'admin' && target.role === 'admin';

    if ((isDeactivating || isDemoting) && target.role === 'admin') {
      const activeAdminCount = await usersRepo.countActiveAdmins();
      if (activeAdminCount <= 1) {
        return res.status(409).json({
          error: 'Cannot deactivate or demote the last active administrator.',
        });
      }
    }

    const updated = await usersRepo.update(id, fields);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
