const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

function createAdapter(raw) {
  return {
    exec(sql) {
      return raw.exec(sql);
    },
    prepare(sql) {
      return raw.prepare(sql);
    },
    transaction(callback) {
      return (...args) => {
        raw.exec('BEGIN');
        try {
          const result = callback(...args);
          raw.exec('COMMIT');
          return result;
        } catch (error) {
          try {
            raw.exec('ROLLBACK');
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
          throw error;
        }
      };
    },
    close() {
      if (typeof raw.close === 'function') {
        raw.close();
      }
    }
  };
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    recommendation_setting INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    deadline TEXT DEFAULT NULL,
    estimated_minutes INTEGER DEFAULT 60,
    priority INTEGER DEFAULT 3,
    energy_level INTEGER DEFAULT 2,
    scheduled_date TEXT DEFAULT NULL,
    status TEXT DEFAULT 'TODO',
    tags TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    template_name TEXT DEFAULT NULL,
    recurrence TEXT DEFAULT 'NONE',
    recurrence_parent INTEGER DEFAULT NULL,
    buffer_minutes INTEGER DEFAULT 0,
    priority_score REAL DEFAULT 0.0,
    deadline_hit INTEGER DEFAULT 0,
    completed_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    checked INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    link TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tag_colors (
    name TEXT PRIMARY KEY,
    color TEXT NOT NULL DEFAULT '#89B4FA'
  )`,
  `CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_minutes INTEGER
  )`,
  `INSERT OR IGNORE INTO tag_colors (name, color) VALUES
    ('Work','#89B4FA'),('Personal','#A6E3A1'),
    ('Urgent','#F38BA8'),('Health','#FAB387'),
    ('Finance','#F9E2AF'),('Study','#CBA6F7'),('Hobby','#74C7EC')`,
  'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled_date)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline)',
  'CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id)',
  'CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id)'
];

const taskAlterColumns = [
  ['description', "TEXT DEFAULT ''"],
  ['deadline', 'TEXT DEFAULT NULL'],
  ['estimated_minutes', 'INTEGER DEFAULT 60'],
  ['priority', 'INTEGER DEFAULT 3'],
  ['energy_level', 'INTEGER DEFAULT 2'],
  ['scheduled_date', 'TEXT DEFAULT NULL'],
  ['status', "TEXT DEFAULT 'TODO'"],
  ['tags', "TEXT DEFAULT ''"],
  ['notes', "TEXT DEFAULT ''"],
  ['template_name', 'TEXT DEFAULT NULL'],
  ['recurrence', "TEXT DEFAULT 'NONE'"],
  ['recurrence_parent', 'INTEGER DEFAULT NULL'],
  ['buffer_minutes', 'INTEGER DEFAULT 0'],
  ['priority_score', 'REAL DEFAULT 0.0'],
  ['deadline_hit', 'INTEGER DEFAULT 0'],
  ['completed_at', 'TEXT DEFAULT NULL'],
  ['created_at', "TEXT DEFAULT (datetime('now'))"]
];

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function ensureSchema(database) {
  schemaStatements.forEach((statement) => database.exec(statement));
  taskAlterColumns.forEach(([column, definition]) => {
    try {
      database.exec(`ALTER TABLE tasks ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      if (!String(error.message).toLowerCase().includes('duplicate column')) {
        throw error;
      }
    }
  });

  try {
    database.exec('ALTER TABLE subtasks ADD COLUMN sort_order INTEGER DEFAULT 0');
  } catch (error) {
    if (!String(error.message).toLowerCase().includes('duplicate column')) {
      throw error;
    }
  }

  try {
    database.exec('ALTER TABLE users ADD COLUMN recommendation_setting INTEGER DEFAULT 1');
  } catch (error) {
    if (!String(error.message).toLowerCase().includes('duplicate column')) {
      throw error;
    }
  }

  // Safety net in case tables were partially created without being in schemaStatements before
  try {
    database.exec(`CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  } catch (error) {}

  try {
    database.exec(`CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_minutes INTEGER
    )`);
  } catch (error) {}

  const insertUser = database.prepare(`
    INSERT OR IGNORE INTO users (username, password_hash, display_name, role)
    VALUES (?, ?, ?, ?)
  `);
  insertUser.run('admin', hashPassword('admin123'), 'System Admin', 'ADMIN');
  insertUser.run('demo', hashPassword('demo123'), 'Demo User', 'USER');
}

function resolveDatabase() {
  const fallbackDir = path.join(__dirname, '..', '.data');
  fs.mkdirSync(fallbackDir, { recursive: true });

  const candidates = [
    path.join(fallbackDir, 'tasksync.db'),
    path.join(os.tmpdir(), 'tasksync.db')
  ];

  const failures = [];
  for (const dbPath of candidates) {
    try {
      const raw = new DatabaseSync(dbPath);
      const adapter = createAdapter(raw);
      adapter.exec('PRAGMA foreign_keys = ON');
      ensureSchema(adapter);
      adapter.dbPath = dbPath;
      return adapter;
    } catch (error) {
      failures.push(`${dbPath}: ${error.message}`);
    }
  }

  throw new Error(`Unable to initialize SQLite database. ${failures.join(' | ')}`);
}

const db = resolveDatabase();

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function computePriorityScore({ priority = 3, energy_level = 2, deadline = null }) {
  const safePriority = Math.max(1, Math.min(5, Number(priority) || 3));
  const energyMult = Math.max(1, Math.min(3, Number(energy_level) || 2));
  const deadlineIso = toIsoDate(deadline);
  let urgency = 0;

  if (deadlineIso) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((new Date(deadlineIso).getTime() - today.getTime()) / 86400000);
    urgency = daysLeft <= 1 ? 50 : daysLeft <= 3 ? 30 : daysLeft <= 7 ? 15 : 0;
  }

  return (safePriority * 20) + (energyMult * 10) + urgency;
}

function normalizeTaskPayload(payload = {}) {
  const normalized = {
    title: String(payload.title || '').trim(),
    description: String(payload.description || '').trim(),
    deadline: toIsoDate(payload.deadline),
    estimated_minutes: Math.max(0, Number(payload.estimated_minutes) || 60),
    priority: Math.max(1, Math.min(5, Number(payload.priority) || 3)),
    energy_level: Math.max(1, Math.min(3, Number(payload.energy_level) || 2)),
    scheduled_date: toIsoDate(payload.scheduled_date),
    status: ['TODO', 'IN_PROGRESS', 'DONE'].includes(payload.status) ? payload.status : 'TODO',
    tags: Array.isArray(payload.tags)
      ? payload.tags.map((tag) => String(tag).trim()).filter(Boolean).join(',')
      : String(payload.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean).join(','),
    notes: String(payload.notes || '').trim(),
    template_name: payload.template_name ? String(payload.template_name).trim() : null,
    recurrence: ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'].includes(payload.recurrence) ? payload.recurrence : 'NONE',
    recurrence_parent: payload.recurrence_parent ? Number(payload.recurrence_parent) : null,
    buffer_minutes: Math.max(0, Number(payload.buffer_minutes) || 0),
    deadline_hit: Number(payload.deadline_hit) ? 1 : 0,
    completed_at: payload.completed_at || null
  };

  normalized.priority_score = computePriorityScore(normalized);
  return normalized;
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    recommendation_setting: user.recommendation_setting ?? 1,
    created_at: user.created_at
  };
}

function getUserById(userId) {
  return sanitizeUser(db.prepare(`
    SELECT id, username, display_name, role, recommendation_setting, created_at
    FROM users
    WHERE id = ?
  `).get(userId));
}

function registerUser(username, password, displayName) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(String(username).trim());
  if (existing) {
    throw new Error('Username already exists');
  }

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, role)
    VALUES (?, ?, ?, 'USER')
  `);
  
  const result = insertUser.run(
    String(username).trim(),
    hashPassword(password),
    String(displayName || username).trim()
  );
  
  return getUserById(result.lastInsertRowid);
}

function updateUserSettings(userId, recommendationSetting) {
  db.prepare('UPDATE users SET recommendation_setting = ? WHERE id = ?').run(
    recommendationSetting ? 1 : 0,
    userId
  );
  return getUserById(userId);
}

function authenticateUser(username, password) {
  const user = db.prepare(`
    SELECT *
    FROM users
    WHERE username = ?
  `).get(String(username || '').trim());

  if (!user || user.password_hash !== hashPassword(password || '')) {
    return null;
  }

  return sanitizeUser(user);
}

db.toIsoDate = toIsoDate;
db.computePriorityScore = computePriorityScore;
db.normalizeTaskPayload = normalizeTaskPayload;
db.hashPassword = hashPassword;
db.getUserById = getUserById;
db.registerUser = registerUser;
db.updateUserSettings = updateUserSettings;
db.authenticateUser = authenticateUser;
db.sanitizeUser = sanitizeUser;

module.exports = db;
