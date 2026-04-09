const express = require('express');
const router = express.Router();
const { getConnection } = require('../../config/database');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const connection = await getConnection();
    const [rows] = await connection.query(
      'SELECT user_id, username, password FROM users WHERE username = ?',
      [username]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({ 
      success: true, 
      userId: user.user_id,
      username: user.username,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const connection = await getConnection();
    
    // Check if username already exists
    const [existing] = await connection.query(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Insert new user
    const [result] = await connection.query(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, password, email || null]
    );

    const userId = result.insertId;

    // Create user profile
    await connection.query(
      'INSERT INTO user_profiles (user_id, timezone) VALUES (?, ?)',
      [userId, 'UTC']
    );

    connection.release();

    res.status(201).json({ 
      success: true, 
      userId: userId,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if user setup is complete
router.get('/user/:userId/setup-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await getConnection();

    // Check profile
    const [profile] = await connection.query(
      'SELECT * FROM user_profiles WHERE user_id = ? AND bio IS NOT NULL',
      [userId]
    );

    // Check schedule
    const [schedule] = await connection.query(
      'SELECT COUNT(*) as count FROM fixed_schedules WHERE user_id = ?',
      [userId]
    );

    // Check goals
    const [goals] = await connection.query(
      'SELECT COUNT(*) as count FROM goals WHERE user_id = ?',
      [userId]
    );

    connection.release();

    res.json({
      profileComplete: profile.length > 0,
      scheduleComplete: schedule[0].count > 0,
      goalsComplete: goals[0].count >= 3,
      setupComplete: profile.length > 0 && schedule[0].count > 0 && goals[0].count >= 3
    });
  } catch (error) {
    console.error('Setup status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
