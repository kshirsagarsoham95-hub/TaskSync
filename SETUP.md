# TaskSync Web Application - Complete Setup & Usage Guide

## 📋 Project Structure

```
TaskSync-Web/
├── config/
│   └── database.js              # MySQL connection pool configuration
├── routes/
│   └── api/
│       ├── auth.js              # Authentication endpoints (login, signup, setup-status)
│       ├── profiles.js          # User profile management
│       ├── schedules.js         # Fixed weekly schedules
│       ├── goals.js             # User goals (target & regular)
│       ├── tasks.js             # Task management (including recurring tasks)
│       ├── completions.js       # Task completion tracking & points
│       └── reports.js           # Weekly reports & analytics
├── public/
│   ├── index.html               # Main SPA HTML
│   ├── app.js                   # Frontend application logic
│   ├── styles.css               # Dark theme CSS with animations
│   ├── kanban.fxml              # (Legacy - can be removed)
│   ├── kanban.css               # (Legacy - can be removed)
├── server.js                    # Express server entry point
├── database.sql                 # MySQL schema & demo data (v2.0)
├── .env                         # Environment variables (MySQL credentials)
├── .env.example                 # Example .env file
├── package.json                 # Node dependencies
└── README.md                    # Quick reference
```

### Directory to Delete (Unnecessary Files)
- `TaskSync-Web/index.html` - Duplicate at root (use public/index.html)
- `TaskSync-Web/app.js` - Duplicate at root (use public/app.js)
- `TaskSync-Web/styles.css` - Duplicate at root (use public/styles.css)
- `TaskSync-Web/node_modules/` - Install via `npm install`

## 🚀 Quick Start

### 1. Database Setup
```bash
# Copy database.sql and run in MySQL Workbench or CLI:
mysql -u root -p < database.sql
```

### 2. Environment Configuration
Create `.env` file:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tasksync_db
PORT=3000
```

### 3. Install & Run
```bash
npm install
npm start
# Server runs at http://localhost:3000
```

## ✨ Key Features

### 1. **Multi-Day Task Selection**
- Select multiple days (Mon-Sun) for recurring tasks
- Choose any day combination
- Task automatically appears on selected days
- Points awarded each day completed

### 2. **Dynamic Goal Setup**
- User prompted for number of goals (no minimum)
- Two goal types:
  - **Target-based**: With target date for completion
  - **Regular/Daily**: Ongoing habits (no duration needed)
- Simple goal card removal

### 3. **Task Requirements**
- Title (required)
- Due date (required) 
- Duration in minutes (required)
- Priority (High/Medium/Low) - affects points
- Category (Work/Personal/Health/Learning/Other)
- Optional repeat days for recurring tasks
- Auto-calculated points value (10 base + priority bonus)

### 4. **Daily Task Completion Tracker**
- Located in "Track Tasks" tab
- View today's tasks by date picker
- Mark tasks complete/incomplete
- See real-time points earned today
- Display task priority, duration, and point value
- Update total user points automatically

### 5. **Weekly Reports & Analytics**
- Located in "Reports" tab
- View week summary with:
  - Total completed tasks
  - Total points earned
  - Day streaks
- Detailed daily breakdown
- Filter by week
- Track progress over time

### 6. **Points System**
- Base points: 10 per task
- Priority boost:
  - High: +5 points (15 total)
  - Medium: base (10 total)
  - Low: -3 points (7 total)
- Accumulated in user profile
- Displayed on reports

## 📊 Database Tables (v2.0)

### `users`
- user_id, username, password, email
- Basic authentication

### `user_profiles`
- profile_id, user_id, bio, timezone, work hours, energy_level, **total_points**
- NEW: total_points tracks cumulative user points

### `goals`
- goal_id, user_id, title, description, target_date, priority
- NEW: goal_type (target | regular)
- No duration required for regular goals

### `tasks`
- task_id, user_id, title, description, priority, category, duration, due_date
- NEW: is_recurring (boolean), recurring_days (JSON array), points_value
- Stores multi-day/recurring task info

### `task_completions` (NEW TABLE)
- completion_id, user_id, task_id, completion_date, status, points_earned
- Tracks daily task completions with points
- Updates user total_points

### `weekly_reports` (NEW TABLE)
- report_id, user_id, week_start_date, total_tasks_completed, total_points_earned, streak_count
- Aggregated weekly statistics

## 🎯 Setup Flow

1. **Sign Up** - Username, Email (opt), Password
2. **Profile Setup** - Bio, Timezone, Work Hours
3. **Schedule Setup** - Fixed weekly activities (Mon-Sun tabs)
4. **Goals Setup** - User chooses number of goals
   - Enter goal name, description, type, priority
   - Target date only required for target-based goals
5. **Dashboard** - Create tasks & track progress

## 💾 Demo Account
```
Username: demo
Password: password123
```

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/user/:userId/setup-status` - Check setup progress

### Tasks
- `GET /api/tasks/:userId` - Get all tasks
- `POST /api/tasks/:userId` - Create task (with recurring_days)
- `PUT /api/tasks/:userId/:taskId` - Update task
- `DELETE /api/tasks/:userId/:taskId` - Delete task

### Completions (NEW)
- `GET /api/completions/:userId/:date` - Get completions for date
- `POST /api/completions/:userId/mark-complete` - Mark task done
- `POST /api/completions/:userId/mark-incomplete` - Undo completion

### Reports (NEW)
- `GET /api/reports/:userId/:weekStartDate` - Get weekly report
- `GET /api/reports/:userId/current-week/stats` - Current week stats

## 🎨 UI Highlights

### Dashboard
- Welcome message with username
- Stats cards (Total, In Progress, Completed tasks)
- Create task form with multi-day selector
- Task list with priority emoji & points display

### Tracking Page
- Date picker for any day
- Today's tasks with completion buttons
- Real-time points counter
- Total points from profile

### Reports Page
- Week selector
- Summary stats (3 cards)
- Detailed daily breakdown
- Tasks grouped by date with points

## ⚙️ Configuration

### Color Theme (CSS Variables)
```css
--primary-color: #10b981 (Emerald)
--error-color: #ef4444 (Red)
--success-color: #10b981 (Green)
--warning-color: #f59e0b (Amber)
```

### Database Connection
Edit in `config/database.js`:
```javascript
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
```

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
# Edit PORT in .env or kill process using port 3000
```

### Can't connect to database
- Verify MySQL is running
- Check .env credentials
- Run `database.sql` schema script
- Verify `tasksync_db` database exists

### Tasks not showing in tracker
- Confirm task due date matches selected date
- Check if task is recurring (verify selected days)
- Refresh browser page

## 📈 Next Steps for Enhancement

1. Email notifications for task reminders
2. Task collaboration / sharing
3. Mobile app version
4. Data export (PDF reports)
5. AI-powered task suggestions
6. Integration with calendar apps
7. Advanced analytics dashboard

## 📝 File Cleanup Recommendations

Remove from `TaskSync-Web/` root:
```bash
rm -f index.html        # Use public/index.html
rm -f app.js           # Use public/app.js  
rm -f styles.css       # Use public/styles.css
rm -f kanban.fxml      # Legacy JavaFX file
rm -f kanban.css       # Legacy JavaFX file
rm -rf node_modules    # Reinstall via npm
```

Keep organized:
```bash
# Keep these at root for reference
- server.js
- package.json
- .env
- .env.example
- database.sql
- README.md
- SETUP.md (this file)
```

---

**Version:** 2.0  
**Last Updated:** 2026-04-08  
**Status:** Production Ready
