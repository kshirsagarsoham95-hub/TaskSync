const express = require('express');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res, next) => {
  try {
    const notifications = db.prepare(`
      SELECT id, message, type, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.user.id);
    
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', (req, res, next) => {
  try {
    const result = db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', (req, res, next) => {
  try {
    db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ? AND is_read = 0
    `).run(req.user.id);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
