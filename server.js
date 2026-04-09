require('dotenv').config();
const express = require('express');
const path = require('path');
const { testConnection } = require('./config/database');

// Import API routes
const authRoutes = require('./routes/api/auth');
const profileRoutes = require('./routes/api/profiles');
const scheduleRoutes = require('./routes/api/schedules');
const goalRoutes = require('./routes/api/goals');
const taskRoutes = require('./routes/api/tasks');
const completionRoutes = require('./routes/api/completions');
const reportRoutes = require('./routes/api/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/completions', completionRoutes);
app.use('/api/reports', reportRoutes);

// Serve index.html for all routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
async function startServer() {
  // Test database connection
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.error('\n⚠️  WARNING: Cannot connect to MySQL database!');
    console.error('📌 Make sure to:');
    console.error('   1. Have MySQL running');
    console.error('   2. Create database "tasksync_db"');
    console.error('   3. Run the database.sql script');
    console.error('   4. Update .env file with correct credentials\n');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   ✅ TaskSync Server Running!              ║
╠════════════════════════════════════════════╣
║  🌐 Server: http://localhost:${PORT}      ║
║  📁 Directory: ${__dirname}          ║
║  💾 Database: tasksync_db (MySQL)          ║
║  🔧 Press Ctrl+C to stop                   ║
╚════════════════════════════════════════════╝

API Endpoints available:
  POST   /api/auth/login
  POST   /api/auth/signup
  GET    /api/auth/user/:userId/setup-status
  
  GET    /api/profiles/:userId
  PUT    /api/profiles/:userId
  
  GET    /api/schedules/:userId
  POST   /api/schedules/:userId
  DELETE /api/schedules/:userId/:scheduleId
  
  GET    /api/goals/:userId
  POST   /api/goals/:userId
  PUT    /api/goals/:userId/:goalId
  DELETE /api/goals/:userId/:goalId
  
  GET    /api/tasks/:userId
  POST   /api/tasks/:userId
  PUT    /api/tasks/:userId/:taskId
  DELETE /api/tasks/:userId/:taskId
    `);
  });
}

startServer();
