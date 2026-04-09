const mysql = require('mysql2/promise');

(async() => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sohamsql32025',
    database: 'tasksync_db'
  });
  
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS task_completions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        task_id INT NOT NULL,
        completion_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        points_earned INT DEFAULT 10,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_completion (user_id, task_id, completion_date),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
        INDEX idx_user_date (user_id, completion_date)
      )
    `);
    
    console.log('✅ task_completions table created successfully');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  conn.end();
})();
