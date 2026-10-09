'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const usersRepo = require('../repositories/users.repository');
const { validate, loginSchema } = require('../utils/validation');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated;

    const user = await usersRepo.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Store safe user info in session (never store password_hash)
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.json({
      message: 'Login successful.',
      user: req.session.user,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await usersRepo.findById(req.session.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
