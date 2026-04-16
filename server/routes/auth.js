const express = require('express');
const db = require('../database');
const { getRequestUser } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const user = db.authenticateUser(req.body.username, req.body.password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  return res.json({
    user,
    message: 'Login successful'
  });
});

router.get('/me', (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  return res.json({ user });
});

module.exports = router;
