const express = require('express');
const db = require('../database');

const router = express.Router();

router.get('/:taskId', (req, res) => {
  const attachments = db.prepare(`
    SELECT id, task_id, link
    FROM attachments
    WHERE task_id = ?
    ORDER BY id
  `).all(req.params.taskId);

  res.json(attachments);
});

module.exports = router;
