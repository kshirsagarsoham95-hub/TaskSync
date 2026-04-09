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
      ALTER TABLE user_profiles 
      ADD COLUMN total_points INT DEFAULT 0
    `);
    
    console.log('✅ total_points column added to user_profiles');
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('✅ total_points column already exists');
    } else {
      console.error('Error:', error.message);
    }
  }
  
  conn.end();
})();
