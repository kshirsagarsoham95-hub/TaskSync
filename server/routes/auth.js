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

router.post('/register', (req, res) => {
  try {
    const { username, password, display_name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = db.registerUser(username, password, display_name);
    return res.json({ user, message: 'Registration successful' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.put('/me/settings', (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const updatedUser = db.updateUserSettings(user.id, req.body.recommendation_setting);
    return res.json({ user: updatedUser, message: 'Settings updated' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
