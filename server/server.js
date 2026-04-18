require('fs').existsSync('.env') && require('fs').readFileSync('.env','utf8')
  .split('\n').forEach(line => {
    const [k,...v] = line.split('=');
    if (k?.trim()) process.env[k.trim()] = v.join('=').trim();
  });

const express = require('express');
const cors = require('cors');
const path = require('path');
require('./database');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/subtasks', require('./routes/subtasks'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api', require('./routes/comments'));
app.use('/api', require('./routes/timeTracking'));
app.use(require('./middleware/errorHandler'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(3000, () => console.log('TaskSync running on http://localhost:3000'));
