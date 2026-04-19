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

router.put('/me/profession', (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const { profession } = req.body;
    if (!profession) {
      return res.status(400).json({ error: 'Profession is required' });
    }
    const updatedUser = db.updateUserProfession(user.id, profession);
    return res.json({ user: updatedUser, message: 'Profession updated' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.put('/me/profile', (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const { display_name } = req.body;
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(display_name.trim(), user.id);
    return res.json({ user: db.getUserById(user.id), message: 'Profile updated' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.put('/me/password', (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required' });
    }
    const fullUser = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id);
    if (fullUser.password_hash !== db.hashPassword(currentPassword)) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(db.hashPassword(newPassword), user.id);
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
