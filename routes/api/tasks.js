const express = require('express');
const router = express.Router();
const { getConnection } = require('../../config/database');

// Get all tasks for user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await getConnection();
    
    const [rows] = await connection.query(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, description, priority, category, duration, due_date, reminder_time, recurring_days } = req.body;
    
    if (!title || !due_date) {
      return res.status(400).json({ error: 'Title and due date are required' });
    }

    const connection = await getConnection();
    
    const [result] = await connection.query(
      'INSERT INTO tasks (user_id, title, description, priority, category, duration, due_date, reminder_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, title, description || null, priority || 'medium', category || 'General', duration || 0, due_date, reminder_time || null, 'pending']
    );
    
    connection.release();
    
    res.status(201).json({ 
      success: true, 
      task_id: result.insertId,
      message: 'Task created'
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task
router.put('/:userId/:taskId', async (req, res) => {
  try {
    const { userId, taskId } = req.params;
    const { title, description, priority, category, duration, due_date, reminder_time, status } = req.body;
    
    const connection = await getConnection();
    
    await connection.query(
      'UPDATE tasks SET title = ?, description = ?, priority = ?, category = ?, duration = ?, due_date = ?, reminder_time = ?, status = ? WHERE task_id = ? AND user_id = ?',
      [title, description, priority, category, duration, due_date, reminder_time, status, taskId, userId]
    );
    
    connection.release();
    
    res.json({ success: true, message: 'Task updated' });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
router.delete('/:userId/:taskId', async (req, res) => {
  try {
    const { userId, taskId } = req.params;
    const connection = await getConnection();
    
    await connection.query(
      'DELETE FROM tasks WHERE task_id = ? AND user_id = ?',
      [taskId, userId]
    );
    
    connection.release();
    
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
