require('dotenv').config();
const mysql = require('mysql2/promise');

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'sohamsql32025',
  database: process.env.DB_NAME || 'tasksync_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database Connected Successfully!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database Connection Error:', error.message);
    return false;
  }
}

// Get connection from pool
async function getConnection() {
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Connection Error:', error);
    throw error;
  }
}

module.exports = {
  pool,
  getConnection,
  testConnection
};
