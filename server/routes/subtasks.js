const express = require('express');
const db = require('../database');

const router = express.Router();

router.get('/:taskId', (req, res) => {
  const subtasks = db.prepare(`
    SELECT id, task_id, title, checked, sort_order
    FROM subtasks
    WHERE task_id = ?
    ORDER BY sort_order, id
  `).all(req.params.taskId);

  res.json(subtasks);
});

module.exports = router;
