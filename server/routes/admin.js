const express = require('express');
const db = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/overview', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  const totalTasks = db.prepare('SELECT COUNT(*) AS count FROM tasks WHERE template_name IS NULL').get().count;
  const totalTemplates = db.prepare('SELECT COUNT(*) AS count FROM tasks WHERE template_name IS NOT NULL').get().count;
  const openTasks = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE status != 'DONE' AND template_name IS NULL").get().count;
  const doneTasks = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE status = 'DONE' AND template_name IS NULL").get().count;

  const statusBreakdown = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM tasks
    WHERE template_name IS NULL
    GROUP BY status
    ORDER BY status
  `).all();

  res.json({
    totalUsers,
    totalTasks,
    totalTemplates,
    openTasks,
    doneTasks,
    statusBreakdown,
    databasePath: db.dbPath
  });
});

router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, display_name, role, created_at
    FROM users
    ORDER BY role DESC, username ASC
  `).all();

  res.json(users);
});

module.exports = router;
