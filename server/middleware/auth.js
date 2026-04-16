const db = require('../database');

function getRequestUser(req) {
  const userId = Number(req.header('x-user-id'));
  if (!userId) {
    return null;
  }
  return db.getUserById(userId);
}

function requireAuth(req, res, next) {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = user;
  return next();
}

function requireAdmin(req, res, next) {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.user = user;
  return next();
}

module.exports = {
  getRequestUser,
  requireAuth,
  requireAdmin
};
