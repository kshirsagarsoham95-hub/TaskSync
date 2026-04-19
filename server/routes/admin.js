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

router.post('/users', (req, res, next) => {
  try {
    const { username, password, display_name, role } = req.body;
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'Username and password (min 6 chars) are required' });
    }
    
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(String(username).trim());
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, display_name, role)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = insertUser.run(
      String(username).trim(),
      db.hashPassword(password),
      String(display_name || username).trim(),
      role === 'ADMIN' ? 'ADMIN' : 'USER'
    );
    
    res.json(db.getUserById(result.lastInsertRowid));
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', (req, res, next) => {
  try {
    const { getRequestUser } = require('../middleware/auth');
    const user = getRequestUser(req);
    
    if (user.id === Number(req.params.id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id/tasks', (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const tasks = db.prepare(`
      SELECT *
      FROM tasks
      WHERE user_id = ? AND template_name IS NULL
      ORDER BY created_at DESC
    `).all(userId);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id/profile', (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const user = db.prepare(`
      SELECT id, username, display_name, role, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalTasks,
        SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) as doneTasks
      FROM tasks
      WHERE user_id = ? AND template_name IS NULL
    `).get(userId);

    res.json({ ...user, stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
