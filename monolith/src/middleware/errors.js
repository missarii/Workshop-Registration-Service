'use strict';

/**
 * Centralized error handler — must be registered last in Express middleware chain.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'An unexpected error occurred.';

  // Log server errors
  if (status >= 500) {
    console.error('[ERROR]', req.method, req.path, err);
  }

  res.status(status).json({ error: message });
}

/**
 * 404 handler — catches unmatched routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

module.exports = { errorHandler, notFoundHandler };
