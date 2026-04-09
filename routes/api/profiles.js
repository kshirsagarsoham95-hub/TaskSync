const express = require('express');
const router = express.Router();
const { getConnection } = require('../../config/database');

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await getConnection();
    
    const [rows] = await connection.query(
      `SELECT up.*, u.email
       FROM user_profiles up
       JOIN users u ON u.user_id = up.user_id
       WHERE up.user_id = ?`,
      [userId]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { bio, timezone, work_start_time, work_end_time, energy_level } = req.body;
    
    const connection = await getConnection();
    
    await connection.query(
      'UPDATE user_profiles SET bio = ?, timezone = ?, work_start_time = ?, work_end_time = ?, energy_level = ? WHERE user_id = ?',
      [bio, timezone, work_start_time, work_end_time, energy_level, userId]
    );
    
    connection.release();
    
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
