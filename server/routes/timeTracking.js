const express = require('express');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/tasks/:taskId/time', requireAuth, (req, res, next) => {
  try {
    const entries = db.prepare(`
      SELECT * FROM time_entries 
      WHERE task_id = ? 
      ORDER BY started_at ASC
    `).all(req.params.taskId);

    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    res.json({ entries, totalMinutes });
  } catch (err) {
    next(err);
  }
});

router.post('/tasks/:taskId/time/start', requireAuth, (req, res, next) => {
  try {
    // Check if there's already an open entry
    const existing = db.prepare(`
      SELECT id FROM time_entries 
      WHERE task_id = ? AND ended_at IS NULL
    `).get(req.params.taskId);

    if (existing) {
      return res.status(400).json({ error: 'A timer is already running for this task' });
    }

    const result = db.prepare(`
      INSERT INTO time_entries (task_id, started_at)
      VALUES (?, datetime('now'))
    `).run(req.params.taskId);

    res.json({ id: result.lastInsertRowid, task_id: req.params.taskId });
  } catch (err) {
    next(err);
  }
});

router.post('/tasks/:taskId/time/stop', requireAuth, (req, res, next) => {
  try {
    const entry = db.prepare(`
      SELECT id, started_at FROM time_entries 
      WHERE task_id = ? AND ended_at IS NULL
    `).get(req.params.taskId);

    if (!entry) {
      return res.status(400).json({ error: 'No running timer found for this task' });
    }

    db.transaction(() => {
      // Calculate duration
      db.prepare(`
        UPDATE time_entries 
        SET ended_at = datetime('now')
        WHERE id = ?
      `).run(entry.id);

      // Now query back to get the dates to calculate minutes (SQLite datetime math is tricky, do it in JS)
      const updated = db.prepare('SELECT started_at, ended_at FROM time_entries WHERE id = ?').get(entry.id);
      const start = new Date(updated.started_at + 'Z'); // Treat SQLite datetime('now') as UTC
      const end = new Date(updated.ended_at + 'Z');
      const diffMinutes = Math.max(0, Math.round((end - start) / 60000));

      db.prepare(`
        UPDATE time_entries 
        SET duration_minutes = ?
        WHERE id = ?
      `).run(diffMinutes, entry.id);
    })();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
