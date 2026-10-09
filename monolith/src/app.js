'use strict';

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const connectPgSimple = require('connect-pg-simple');
const { pool } = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errors');

// Route modules
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const workshopsRoutes = require('./routes/workshops.routes');
const registrationsRoutes = require('./routes/registrations.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// ─────────────────────────────────────────────
// Body parsing
// ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─────────────────────────────────────────────
// Session store (PostgreSQL-backed)
// ─────────────────────────────────────────────
const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: false, // schema.sql creates it
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  })
);

// ─────────────────────────────────────────────
// API routes
// ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/workshops', workshopsRoutes);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─────────────────────────────────────────────
// Serve static frontend assets
// ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback — all non-API routes serve index.html
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// Error handling (must be last)
// ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
