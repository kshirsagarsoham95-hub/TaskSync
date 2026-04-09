-- TaskSync Database SQL Schema
-- Copy and paste this entire script into MySQL Workbench or MySQL Command Line
-- This will create all tables and the initial structure needed for TaskSync

-- Create Database
CREATE DATABASE IF NOT EXISTS tasksync_db;
USE tasksync_db;

-- Set character encoding to UTF-8
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================================
-- Users Table - Stores user authentication data
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- User Profiles Table - Stores user profile information
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    bio TEXT,
    timezone VARCHAR(50),
    work_start_time TIME,
    work_end_time TIME,
    energy_level VARCHAR(20),
    total_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Fixed Schedules Table - Stores weekly fixed schedules
-- ============================================================================
CREATE TABLE IF NOT EXISTS fixed_schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    activity_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_day_of_week (day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Goals Table - Stores user goals
-- ============================================================================
CREATE TABLE IF NOT EXISTS goals (
    goal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    target_date DATE,
    priority VARCHAR(20),
    goal_type VARCHAR(20) DEFAULT 'target',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Tasks Table - Stores user tasks
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20),
    category VARCHAR(50),
    duration INT,
    due_date DATE NOT NULL,
    reminder_time TIME,
    status VARCHAR(20) DEFAULT 'pending',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_days JSON,
    points_value INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Task Completions Table - Track daily task completion with points
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_completions (
    completion_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT NOT NULL,
    completion_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    points_earned INT DEFAULT 10,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_task_id (task_id),
    INDEX idx_completion_date (completion_date),
    UNIQUE KEY unique_task_date (user_id, task_id, completion_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Weekly Reports Table - Summary of weekly achievements
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    week_start_date DATE NOT NULL,
    total_tasks_completed INT DEFAULT 0,
    total_points_earned INT DEFAULT 0,
    streak_count INT DEFAULT 0,
    report_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_week_start (week_start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Demo Data (Optional - You can delete this if not needed)
-- ============================================================================

-- Insert demo user (username: demo, password: password123)
INSERT INTO users (username, password, email) VALUES 
('demo', 'password123', 'demo@tasksync.com');

-- Insert demo profile
INSERT INTO user_profiles (user_id, bio, timezone, work_start_time, work_end_time, energy_level) 
VALUES (1, 'Demo user for testing TaskSync', 'UTC', '09:00:00', '17:00:00', 'high');

-- Insert demo schedule (sample activities for each day)
INSERT INTO fixed_schedules (user_id, day_of_week, activity_name, start_time, end_time, category) VALUES
(1, 'Monday', 'Team Meeting', '09:00:00', '10:00:00', 'Work'),
(1, 'Monday', 'Focus Time', '10:00:00', '12:00:00', 'Work'),
(1, 'Monday', 'Lunch Break', '12:00:00', '13:00:00', 'Break'),
(1, 'Tuesday', 'Code Review', '09:00:00', '10:30:00', 'Work'),
(1, 'Tuesday', 'Development', '10:30:00', '12:30:00', 'Work'),
(1, 'Wednesday', 'Planning', '09:00:00', '11:00:00', 'Work'),
(1, 'Thursday', 'Testing', '10:00:00', '12:00:00', 'Work'),
(1, 'Friday', 'Team Standup', '09:00:00', '09:30:00', 'Work'),
(1, 'Friday', 'Project Wrap-up', '14:00:00', '16:00:00', 'Work');

-- Insert demo goals
INSERT INTO goals (user_id, title, description, target_date, priority, goal_type, status) VALUES
(1, 'Complete TaskSync Project', 'Finish the TaskSync application with all features', '2026-05-31', 'high', 'target', 'active'),
(1, 'Daily Morning Routine', 'Start every day with morning exercise', NULL, 'medium', 'regular', 'active'),
(1, 'Learn Advanced JavaScript', 'Master async/await, promises, and ES6+ features', '2026-06-30', 'medium', 'target', 'active');

-- Insert demo tasks (non-recurring)
INSERT INTO tasks (user_id, title, description, priority, category, duration, due_date, is_recurring, recurring_days, points_value, status) VALUES
(1, 'Setup Backend API', 'Create Node.js/Express backend for TaskSync', 'high', 'Development', 480, '2026-04-15', FALSE, NULL, 15, 'pending'),
(1, 'Connect to MySQL Database', 'Integrate MySQL database with backend', 'high', 'Development', 240, '2026-04-20', FALSE, NULL, 15, 'pending'),
(1, 'Test API Endpoints', 'Write tests for all API endpoints', 'medium', 'Testing', 300, '2026-04-25', FALSE, NULL, 10, 'pending'),
(1, 'Deploy Application', 'Deploy TaskSync to production server', 'high', 'Deployment', 180, '2026-05-01', FALSE, NULL, 20, 'pending');

-- Insert recurring demo task (Monday, Wednesday, Friday)
INSERT INTO tasks (user_id, title, description, priority, category, duration, due_date, is_recurring, recurring_days, points_value, status) VALUES
(1, 'Gym Session', 'One hour workout at gym', 'medium', 'Health', 60, '2026-04-08', TRUE, '["Monday", "Wednesday", "Friday"]', 10, 'pending');

-- ============================================================================
-- Verify the setup
-- ============================================================================
-- Show all tables created
SHOW TABLES;

-- Show sample data (optional)
-- SELECT * FROM users;
-- SELECT * FROM user_profiles;
-- SELECT * FROM fixed_schedules;
-- SELECT * FROM goals;
-- SELECT * FROM tasks;
-- SELECT * FROM task_completions;
-- SELECT * FROM weekly_reports;

-- ============================================================================
-- Setup Complete!
-- ============================================================================
-- You can now connect your Node.js application to this database
-- Connection details:
-- Host: localhost
-- Port: 3306
-- Database: tasksync_db
-- Username: root
-- Password: sohamsql32025
