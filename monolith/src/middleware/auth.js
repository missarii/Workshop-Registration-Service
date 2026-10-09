'use strict';

/**
 * requireAuth — ensures the request has an active session.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

/**
 * requireRole — ensures the session user has one of the allowed roles.
 * Always checks authentication first.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
