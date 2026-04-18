const express = require('express');
const db = require('../database');
const { requireAuth, getRequestUser } = require('../middleware/auth');

const router = express.Router();

router.get('/tasks/:taskId/comments', requireAuth, (req, res, next) => {
  try {
    const comments = db.prepare(`
      SELECT c.id, c.body, c.created_at, u.display_name, u.username, c.user_id
      FROM task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.taskId);
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

router.post('/tasks/:taskId/comments', requireAuth, (req, res, next) => {
  try {
    const user = getRequestUser(req);
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment body cannot be empty' });
    }

    const result = db.prepare(`
      INSERT INTO task_comments (task_id, user_id, body)
      VALUES (?, ?, ?)
    `).run(req.params.taskId, user.id, body.trim());

    const newComment = db.prepare(`
      SELECT c.id, c.body, c.created_at, u.display_name, u.username, c.user_id
      FROM task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.json(newComment);
  } catch (err) {
    next(err);
  }
});

router.delete('/comments/:id', requireAuth, (req, res, next) => {
  try {
    const user = getRequestUser(req);
    const comment = db.prepare('SELECT user_id FROM task_comments WHERE id = ?').get(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    db.prepare('DELETE FROM task_comments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
