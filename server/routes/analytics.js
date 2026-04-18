const express = require('express');
const db      = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function mondayOf(value) {
  const date = value ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  const day    = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date;
}

router.get('/weekly', (req, res, next) => {
  try {
    const start  = mondayOf(req.query.weekStart);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const result = labels.map((day, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = date.toISOString().slice(0, 10);

      const planned = db.prepare(`
        SELECT COUNT(*) AS count
        FROM tasks
        WHERE user_id = ? AND scheduled_date = ? AND template_name IS NULL
      `).get(req.user.id, iso).count;

      const done = db.prepare(`
        SELECT COUNT(*) AS count
        FROM tasks
        WHERE user_id = ? AND status = 'DONE' AND date(completed_at) = ?
      `).get(req.user.id, iso).count;

      return { day, planned, done };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/heatmap', (req, res, next) => {
  try {
    const start = mondayOf();
    start.setDate(start.getDate() - 28);

    const result = Array.from({ length: 35 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const iso = date.toISOString().slice(0, 10);

      const energy = db.prepare(`
        SELECT COALESCE(SUM(energy_level * estimated_minutes), 0) AS total
        FROM tasks
        WHERE scheduled_date = ? AND template_name IS NULL
      `).get(iso).total;

      return { date: iso, energy };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/stats', (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const totalTasks = db.prepare(`
      SELECT COUNT(*) AS count
      FROM tasks
      WHERE template_name IS NULL
    `).get().count;

    const completedTasks = db.prepare(`
      SELECT COUNT(*) AS count
      FROM tasks
      WHERE status = 'DONE' AND template_name IS NULL
    `).get().count;

    const hitRate = db.prepare(`
      SELECT COALESCE(AVG(deadline_hit) * 100, 0) AS hitRate
      FROM tasks
      WHERE status = 'DONE' AND template_name IS NULL
    `).get().hitRate;

    const avgScore = db.prepare(`
      SELECT COALESCE(AVG(priority_score), 0) AS avg
      FROM tasks
      WHERE template_name IS NULL AND status != 'DONE'
    `).get().avg;

    const overdueTasks = db.prepare(`
      SELECT COUNT(*) AS count
      FROM tasks
      WHERE deadline < ?
        AND status != 'DONE'
        AND template_name IS NULL
    `).get(today).count;

    const start = mondayOf();
    start.setDate(start.getDate() - 49);

    const trend = Array.from({ length: 8 }, (_, i) => {
      const week = new Date(start);
      week.setDate(start.getDate() + i * 7);
      const end = new Date(week);
      end.setDate(week.getDate() + 6);

      const count = db.prepare(`
        SELECT COUNT(*) AS count
        FROM tasks
        WHERE status = 'DONE'
          AND date(completed_at) BETWEEN ? AND ?
          AND template_name IS NULL
      `).get(
        week.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10)
      ).count;

      return { week: week.toISOString().slice(0, 10), count };
    });

    res.json({
      hitRate:        Number(Number(hitRate  || 0).toFixed(2)),
      totalTasks,
      completedTasks,
      avgScore:       Math.round(avgScore    || 0),
      overdueTasks:   overdueTasks           || 0,
      trend
    });
  } catch (err) {
    next(err);
  }
});

router.get('/priority-distribution', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT priority, COUNT(*) AS count
      FROM tasks
      WHERE template_name IS NULL AND status != 'DONE'
      GROUP BY priority ORDER BY priority
    `).all();
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;