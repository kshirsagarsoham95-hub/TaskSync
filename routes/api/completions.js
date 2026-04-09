const express = require('express');
const router = express.Router();
const { getConnection } = require('../../config/database');

// Get all task completions for user on a specific date
router.get('/:userId/:date', async (req, res) => {
  try {
    const { userId, date } = req.params;
    const connection = await getConnection();
    
    const [rows] = await connection.query(
      'SELECT tc.*, t.title, t.points_value FROM task_completions tc JOIN tasks t ON tc.task_id = t.task_id WHERE tc.user_id = ? AND tc.completion_date = ? ORDER BY tc.created_at DESC',
      [userId, date]
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Get completions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all task completions for user (all dates)
router.get('/:userId/all/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await getConnection();
    
    const [rows] = await connection.query(
      'SELECT tc.*, t.title FROM task_completions tc JOIN tasks t ON tc.task_id = t.task_id WHERE tc.user_id = ? ORDER BY tc.completion_date DESC, tc.created_at DESC',
      [userId]
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark task as completed on a specific date
router.post('/:userId/mark-complete', async (req, res) => {
  try {
    const { userId } = req.params;
    const { task_id, completion_date, notes } = req.body;

    if (!task_id || !completion_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await getConnection();
    
    // Check if task exists
    const [taskRows] = await connection.query('SELECT * FROM tasks WHERE task_id = ? AND user_id = ?', [task_id, userId]);
    
    if (taskRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Task not found' });
    }

    const points_earned = 10; // Default points value

    // Insert or update completion
    const [result] = await connection.query(
      'INSERT INTO task_completions (user_id, task_id, completion_date, status, points_earned, notes) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = ?, points_earned = ?, notes = ?',
      [userId, task_id, completion_date, 'completed', points_earned, notes || null, 'completed', points_earned, notes || null]
    );

    // Update user total points
    const [completions] = await connection.query(
      'SELECT COALESCE(SUM(points_earned), 0) as total FROM task_completions WHERE user_id = ? AND status = "completed"',
      [userId]
    );

    const totalPoints = completions[0].total || 0;
    await connection.query('UPDATE user_profiles SET total_points = ? WHERE user_id = ?', [totalPoints, userId]);
    
    connection.release();
    
    res.status(201).json({ 
      success: true,
      message: 'Task marked as complete',
      points_earned: points_earned
    });
  } catch (error) {
    console.error('Mark complete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unmark task completion
router.post('/:userId/mark-incomplete', async (req, res) => {
  try {
    const { userId } = req.params;
    const { task_id, completion_date } = req.body;

    if (!task_id || !completion_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await getConnection();
    
    // Delete completion
    await connection.query(
      'DELETE FROM task_completions WHERE user_id = ? AND task_id = ? AND completion_date = ?',
      [userId, task_id, completion_date]
    );

    // Update user total points
    const [completions] = await connection.query(
      'SELECT SUM(points_earned) as total FROM task_completions WHERE user_id = ? AND status = "completed"',
      [userId]
    );

    const totalPoints = completions[0].total || 0;
    await connection.query('UPDATE user_profiles SET total_points = ? WHERE user_id = ?', [totalPoints, userId]);
    
    connection.release();
    
    res.json({ success: true, message: 'Task marked as incomplete' });
  } catch (error) {
    console.error('Mark incomplete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
