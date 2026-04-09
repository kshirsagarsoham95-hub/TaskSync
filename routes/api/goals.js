const express = require('express');
const router = express.Router();
const { getConnection } = require('../../config/database');

// Get all goals for user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await getConnection();
    
    const [rows] = await connection.query(
      'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add goal
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, description, target_date, priority, goal_type } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const connection = await getConnection();
    
    const [result] = await connection.query(
      'INSERT INTO goals (user_id, title, description, target_date, priority, goal_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, title, description || null, target_date || null, priority || 'medium', goal_type || 'target', 'active']
    );
    
    connection.release();
    
    res.status(201).json({ 
      success: true, 
      goal_id: result.insertId,
      message: 'Goal created'
    });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update goal
router.put('/:userId/:goalId', async (req, res) => {
  try {
    const { userId, goalId } = req.params;
    const { title, description, target_date, priority, status } = req.body;
    
    const connection = await getConnection();
    
    await connection.query(
      'UPDATE goals SET title = ?, description = ?, target_date = ?, priority = ?, status = ? WHERE goal_id = ? AND user_id = ?',
      [title, description, target_date, priority, status, goalId, userId]
    );
    
    connection.release();
    
    res.json({ success: true, message: 'Goal updated' });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete goal
router.delete('/:userId/:goalId', async (req, res) => {
  try {
    const { userId, goalId } = req.params;
    const connection = await getConnection();
    
    await connection.query(
      'DELETE FROM goals WHERE goal_id = ? AND user_id = ?',
      [goalId, userId]
    );
    
    connection.release();
    
    res.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
