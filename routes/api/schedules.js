const express = require('express');
const router = express.Router();
const { getConnection } = require('../../config/database');

// Get all schedules for user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await getConnection();
    
    const [rows] = await connection.query(
      'SELECT * FROM fixed_schedules WHERE user_id = ? ORDER BY day_of_week, start_time',
      [userId]
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add schedule entry
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { day_of_week, activity_name, start_time, end_time, category } = req.body;
    
    if (!day_of_week || !activity_name || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await getConnection();
    
    const [result] = await connection.query(
      'INSERT INTO fixed_schedules (user_id, day_of_week, activity_name, start_time, end_time, category) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, day_of_week, activity_name, start_time, end_time, category]
    );
    
    connection.release();
    
    res.status(201).json({ 
      success: true, 
      schedule_id: result.insertId,
      message: 'Schedule created'
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete schedule entry
router.delete('/:userId/:scheduleId', async (req, res) => {
  try {
    const { userId, scheduleId } = req.params;
    const connection = await getConnection();
    
    await connection.query(
      'DELETE FROM fixed_schedules WHERE schedule_id = ? AND user_id = ?',
      [scheduleId, userId]
    );
    
    connection.release();
    
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
