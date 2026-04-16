const express = require('express');
const multer = require('multer');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth);

const columns = `
  title, description, deadline, estimated_minutes, priority,
  energy_level, scheduled_date, status, tags, notes, template_name,
  recurrence, recurrence_parent, buffer_minutes, priority_score,
  deadline_hit, completed_at
`;

function error(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function taskQuery(where = '', order = '') {
  return `
    SELECT id, ${columns}, created_at
    FROM tasks
    ${where}
    ${order}
  `;
}

function hydrateTask(task) {
  if (!task) {
    return null;
  }

  const subtasks = db.prepare(`
    SELECT id, task_id, title, checked, sort_order
    FROM subtasks
    WHERE task_id = ?
    ORDER BY sort_order, id
  `).all(task.id);

  const attachmentLinks = db.prepare(`
    SELECT link
    FROM attachments
    WHERE task_id = ?
    ORDER BY id
  `).all(task.id).map((row) => row.link);

  return {
    ...task,
    tags: task.tags ? task.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
    subtasks,
    attachmentLinks
  };
}

function findTask(id) {
  return hydrateTask(db.prepare(taskQuery('WHERE id = ?')).get(id));
}

function saveTask(payload) {
  return db.prepare(`
    INSERT INTO tasks (${columns})
    VALUES (
      @title, @description, @deadline, @estimated_minutes, @priority,
      @energy_level, @scheduled_date, @status, @tags, @notes, @template_name,
      @recurrence, @recurrence_parent, @buffer_minutes, @priority_score,
      @deadline_hit, @completed_at
    )
  `).run(payload);
}

function syncSubtasks(taskId, subtasks = []) {
  db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(taskId);
  const insert = db.prepare(`
    INSERT INTO subtasks (task_id, title, checked, sort_order)
    VALUES (?, ?, ?, ?)
  `);
  subtasks
    .filter((subtask) => subtask && String(subtask.title || '').trim())
    .forEach((subtask, index) => {
      insert.run(taskId, String(subtask.title).trim(), subtask.checked ? 1 : 0, index);
    });
}

function syncAttachments(taskId, attachmentLinks = []) {
  db.prepare('DELETE FROM attachments WHERE task_id = ?').run(taskId);
  const insert = db.prepare('INSERT INTO attachments (task_id, link) VALUES (?, ?)');
  attachmentLinks
    .filter((link) => String(link || '').trim())
    .forEach((link) => insert.run(taskId, String(link).trim()));
}

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const cells = [];
      let current = '';
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];
        if (char === '"' && quoted && next === '"') {
          current += '"';
          i += 1;
        } else if (char === '"') {
          quoted = !quoted;
        } else if (char === ',' && !quoted) {
          cells.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current);
      return cells.map((cell) => cell.trim());
    });
}

function nextOccurrence(seed, recurrence) {
  const date = new Date(seed);
  if (recurrence === 'DAILY') {
    date.setDate(date.getDate() + 1);
  } else if (recurrence === 'WEEKLY') {
    date.setDate(date.getDate() + 7);
  } else if (recurrence === 'MONTHLY') {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString().slice(0, 10);
}

function updateTaskStatus(taskId, status) {
  const task = db.prepare(taskQuery('WHERE id = ?')).get(taskId);
  if (!task) {
    throw error(404, 'Task not found');
  }

  let completedAt = null;
  let deadlineHit = 0;
  if (status === 'DONE') {
    completedAt = new Date().toISOString();
    const today = new Date().toISOString().slice(0, 10);
    deadlineHit = !task.deadline || today <= task.deadline ? 1 : 0;
  }

  db.prepare(`
    UPDATE tasks
    SET status = ?, completed_at = ?, deadline_hit = ?
    WHERE id = ?
  `).run(status, completedAt, deadlineHit, taskId);

  return findTask(taskId);
}

router.get('/', (req, res, next) => {
  try {
    const filters = ['template_name IS NULL'];
    const params = [];
    const search = String(req.query.search || '').trim().toLowerCase();
    const status = String(req.query.status || 'ALL');
    const date = db.toIsoDate(req.query.date);

    if (search) {
      const term = `%${search}%`;
      filters.push('(LOWER(title) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(description) LIKE ?)');
      params.push(term, term, term);
    }

    if (status !== 'ALL') {
      filters.push('status = ?');
      params.push(status);
    }

    if (date) {
      filters.push('scheduled_date = ?');
      params.push(date);
    }

    const tasks = db.prepare(
      taskQuery(`WHERE ${filters.join(' AND ')}`, 'ORDER BY priority_score DESC, created_at DESC')
    ).all(...params).map(hydrateTask);

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.get('/templates', (req, res, next) => {
  try {
    const tasks = db.prepare(
      taskQuery('WHERE template_name IS NOT NULL', 'ORDER BY template_name')
    ).all().map(hydrateTask);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.post('/from-template/:templateId', (req, res, next) => {
  try {
    const template = findTask(req.params.templateId);
    if (!template || !template.template_name) {
      throw error(404, 'Template not found');
    }

    const task = db.transaction(() => {
      const payload = db.normalizeTaskPayload({
        ...template,
        template_name: null,
        status: 'TODO',
        completed_at: null,
        deadline_hit: 0
      });
      const result = saveTask(payload);
      syncSubtasks(result.lastInsertRowid, template.subtasks);
      syncAttachments(result.lastInsertRowid, template.attachmentLinks);
      return findTask(result.lastInsertRowid);
    })();

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.get('/recurring/generate', (req, res, next) => {
  try {
    const recurringTasks = db.prepare(
      taskQuery("WHERE recurrence != 'NONE' AND template_name IS NULL")
    ).all();

    const tasks = db.transaction(() => {
      const created = [];
      recurringTasks.forEach((task) => {
        const seed = task.scheduled_date || task.deadline || new Date().toISOString().slice(0, 10);
        const scheduledDate = nextOccurrence(seed, task.recurrence);
        const exists = db.prepare(`
          SELECT id
          FROM tasks
          WHERE recurrence_parent = ? AND scheduled_date = ?
        `).get(task.id, scheduledDate);

        if (!exists) {
          const payload = db.normalizeTaskPayload({
            ...task,
            scheduled_date: scheduledDate,
            deadline: scheduledDate,
            recurrence_parent: task.id,
            template_name: null,
            status: 'TODO',
            deadline_hit: 0,
            completed_at: null
          });
          const result = saveTask(payload);
          created.push(findTask(result.lastInsertRowid));
        }
      });
      return created;
    })();

    res.json({ created: tasks.length, tasks });
  } catch (err) {
    next(err);
  }
});

router.post('/reschedule', (req, res, next) => {
  try {
    const holidays = new Set(Array.isArray(req.body.holidays) ? req.body.holidays : []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);

    const missedTasks = db.prepare(taskQuery(
      "WHERE deadline < ? AND status != 'DONE' AND template_name IS NULL",
      'ORDER BY priority_score DESC, created_at ASC'
    )).all(todayIso);

    const futureTasks = db.prepare(`
      SELECT scheduled_date, estimated_minutes, buffer_minutes
      FROM tasks
      WHERE scheduled_date >= ? AND template_name IS NULL
    `).all(todayIso);

    const capacity = {};
    for (let i = 0; i < 60; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const iso = date.toISOString().slice(0, 10);
      capacity[iso] = holidays.has(iso) ? 0 : 600;
    }

    futureTasks.forEach((task) => {
      if (capacity[task.scheduled_date] !== undefined) {
        capacity[task.scheduled_date] -= (task.estimated_minutes || 0) + (task.buffer_minutes || 0);
      }
    });

    const tasks = db.transaction(() => {
      const updated = [];
      missedTasks.forEach((task) => {
        const effectiveMinutes = (task.estimated_minutes || 0) + (task.buffer_minutes || 0);
        const slot = Object.keys(capacity).find((date) => capacity[date] >= effectiveMinutes);
        if (slot) {
          db.prepare('UPDATE tasks SET scheduled_date = ? WHERE id = ?').run(slot, task.id);
          capacity[slot] -= effectiveMinutes;
          updated.push(findTask(task.id));
        }
      });
      return updated;
    })();

    res.json({ rescheduled: tasks.length, tasks });
  } catch (err) {
    next(err);
  }
});

router.post('/import-csv', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      throw error(400, 'CSV file is required');
    }

    const rows = parseCsv(req.file.buffer.toString('utf8'));
    if (rows.length <= 1) {
      return res.json({ imported: 0, skipped: 0, errors: [] });
    }

    const headers = rows[0];
    let imported = 0;
    let skipped = 0;
    const errors = [];

    db.transaction(() => {
      rows.slice(1).forEach((cells, index) => {
        const row = {};
        headers.forEach((header, cellIndex) => {
          row[header] = cells[cellIndex] || '';
        });

        if (!String(row.title || row.Title || '').trim()) {
          skipped += 1;
          errors.push(`Row ${index + 2}: missing title`);
          return;
        }

        const payload = db.normalizeTaskPayload({
          title: row.title || row.Title,
          description: row.description || row.Description,
          deadline: row.deadline || row.Deadline,
          estimated_minutes: row.estimated_minutes || row.Duration || row.EstimatedMinutes,
          priority: row.priority || row.Priority,
          energy_level: row.energy_level || row.Energy || row.EnergyLevel,
          tags: row.tags || row.Tags,
          notes: row.notes || row.Notes,
          status: row.status || row.Status || 'TODO'
        });
        saveTask(payload);
        imported += 1;
      });
    })();

    res.json({ imported, skipped, errors });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const task = findTask(req.params.id);
    if (!task) {
      throw error(404, 'Task not found');
    }
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const payload = db.normalizeTaskPayload(req.body);
    if (!payload.title) {
      throw error(400, 'Title is required');
    }

    const task = db.transaction(() => {
      const result = saveTask(payload);
      syncSubtasks(result.lastInsertRowid, req.body.subtasks);
      syncAttachments(result.lastInsertRowid, req.body.attachmentLinks);
      return findTask(result.lastInsertRowid);
    })();

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const existing = findTask(req.params.id);
    if (!existing) {
      throw error(404, 'Task not found');
    }

    const payload = db.normalizeTaskPayload({ ...existing, ...req.body });
    if (!payload.title) {
      throw error(400, 'Title is required');
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE tasks
        SET title = @title,
            description = @description,
            deadline = @deadline,
            estimated_minutes = @estimated_minutes,
            priority = @priority,
            energy_level = @energy_level,
            scheduled_date = @scheduled_date,
            status = @status,
            tags = @tags,
            notes = @notes,
            template_name = @template_name,
            recurrence = @recurrence,
            recurrence_parent = @recurrence_parent,
            buffer_minutes = @buffer_minutes,
            priority_score = @priority_score,
            deadline_hit = @deadline_hit,
            completed_at = @completed_at
        WHERE id = ?
      `).run(payload, req.params.id);
      syncSubtasks(req.params.id, req.body.subtasks);
      syncAttachments(req.params.id, req.body.attachmentLinks);
    })();

    res.json(findTask(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', (req, res, next) => {
  try {
    const status = ['TODO', 'IN_PROGRESS', 'DONE'].includes(req.body.status) ? req.body.status : null;
    if (!status) {
      throw error(400, 'Valid status is required');
    }

    res.json(updateTaskStatus(req.params.id, status));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/complete', (req, res, next) => {
  try {
    res.json(updateTaskStatus(req.params.id, 'DONE'));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/incomplete', (req, res, next) => {
  try {
    res.json(updateTaskStatus(req.params.id, 'TODO'));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    if (!result.changes) {
      throw error(404, 'Task not found');
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
