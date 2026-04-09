# TaskSync - Web Edition

A modern, user-friendly task management and scheduling application with multi-day task support, points-based gamification, and weekly analytics. Built with Node.js, Express, MySQL, and vanilla JavaScript.

## 🚀 New Features (v2.0)

### Core Task Management Enhancements
- **Multi-Day Task Selection**: Select multiple days (Mon-Sun) for a single task
- **Dynamic Goal Cards Setup**: Create any number of goals (no minimum limit) with user-prompted count
- **Task Due Dates & Duration**: Required fields for better scheduling
- **Two Goal Types**:
  - **Target Goals**: Have deadline and duration (for objectives)
  - **Regular Goals**: No duration option, recurring daily habits

### Gamification System
- **Points System**: Earn points for completing tasks
  - Base: 10 points per task
  - Priority Bonus: +5 for high priority, -3 for low priority
- **Running Total**: Track cumulative points on user profile
- **Leaderboard Ready**: Points stored per user for future leaderboards

### Daily Task Tracking
- **Task Completion Page**: Mark tasks complete on daily basis
- **Calendar View**: Select any date to track tasks
- **Daily Statistics**: See today's points, completed tasks, total tasks
- **Real-time Updates**: Points immediately add to user total

### Weekly Analytics & Reports
- **Weekly Report Page**: View complete week's statistics
- **Daily Breakdown**: See which tasks completed each day
- **Weekly Summary**: Total points earned, tasks completed, daily average
- **Performance Tracking**: Identify patterns and trends

## 📁 Project Structure

```
TaskSync-Web/
├── server.js                    # Express server entry point
├── package.json                 # Node.js dependencies
├── .env                         # Database credentials
├── database.sql                 # MySQL schema v2.0
├── README.md                    # This file
├── SETUP.md                     # Detailed setup guide
│
├── routes/
│   └── api/
│       ├── auth.js              # Authentication routes
│       ├── users.js             # User profile routes
│       ├── goals.js             # Goals management (with goal_type)
│       ├── tasks.js             # Tasks routes (with multi-day support)
│       ├── schedule.js          # Fixed schedule routes
│       ├── completions.js       # Task completion tracking (NEW)
│       └── reports.js           # Weekly reports & analytics (NEW)
│
├── public/
│   ├── index.html               # Main SPA with all pages
│   ├── app.js                   # Frontend application logic
│   └── styles.css               # Dark theme styling (enhanced)
│
└── target/                      # Maven compiled output
    └── classes/                 # Compiled resources
```

## 🎯 User Flow & Features

### 1. Authentication & Setup
- Create account or login with credentials
- Complete profile setup (bio, timezone, work hours)
- Set up fixed weekly schedule
- **NEW**: Dynamic goal setup with user-selected count and type

### 2. Task Management
- Create tasks with priority, category, duration
- **NEW**: Select multiple days for recurring tasks (Mon-Sun checkboxes)
- **NEW**: Set points value for tasks (auto-calculated by priority)
- Set due dates and reminders
- View task categorized by day

### 3. Daily Task Tracking
- **NEW**: Go to "Task Tracking" page
- Select any date with calendar picker
- View tasks for that day (including recurring tasks)
- Click completion button to earn points
- See daily stats: points earned, tasks completed

### 4. Weekly Analytics
- **NEW**: Go to "Weekly Reports" page
- Auto-loads current week (Monday-Sunday)
- View daily breakdown with points earned per day
- See total weekly points and completion rate
- Track progress patterns

### 5. Dashboard Home
- Welcome message with points total
- Quick stats: tasks, in-progress, completed, total points
- Task creation form with multi-day selector
- Access all pages via navigation buttons

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v14+
- MySQL 8.0+
- npm or yarn

### Installation & Setup

**See [SETUP.md](SETUP.md) for detailed setup instructions**

Quick version:
```bash
# 1. Install dependencies
npm install

# 2. Create .env file with database credentials
echo "DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tasksync_db" > .env

# 3. Create database and run schema
mysql -u root -p -e "CREATE DATABASE tasksync_db;"
mysql -u root -p tasksync_db < database.sql

# 4. Start server
npm start

# 5. Open browser
# http://localhost:3000
```

## 👤 Demo Account

**Test Login:**
- Username: `demo`
- Password: `password123`

## 📊 Database Schema (v2.0)

### Tables Overview
1. **users** - User accounts and authentication
2. **user_profiles** - Profile info + **NEW: total_points**
3. **goals** - Goals with **NEW: goal_type (target|regular)**
4. **tasks** - Tasks with **NEW: is_recurring, recurring_days, points_value**
5. **schedule** - Fixed weekly schedule
6. **task_completions** - **NEW**: Daily task completions and points earned
7. **weekly_reports** - **NEW**: Aggregated weekly statistics

### Key Database Changes
- `tasks.due_date` - Now required (NOT NULL)
- `tasks.recurring_days` - JSON array of selected days (Mon-Sun)
- `goals.goal_type` - 'target' or 'regular'
- `user_profiles.total_points` - Running total of earned points
- NEW `task_completions` table - Track completion_date, points_earned per user/task
- NEW `weekly_reports` table - Weekly aggregated stats with detailed report_data

## 🔌 API Endpoints

### Task Completions (NEW)
- `POST /api/completions/:userId/mark-complete` - Mark task complete and earn points
- `POST /api/completions/:userId/mark-incomplete` - Undo completion and recalculate
- `GET /api/completions/:userId/date/:date` - Get completions for specific date
- `GET /api/completions/:userId/range/:startDate/:endDate` - Get completions in date range

### Weekly Reports (NEW)
- `GET /api/reports/:userId/week/:weekStart` - Get full week report
- `GET /api/reports/:userId/current-week` - Get current week data
- `GET /api/reports/:userId/summary/:startDate/:endDate` - Summary statistics

### Existing Endpoints (Enhanced)
- `POST /api/tasks` - Create task with recurring_days array
- `POST /api/goals` - Create goal with goal_type
- All other existing endpoints continue to work as before

## 🎨 UI/UX Features

- **Dark Theme**: Modern dark background with green accent (#10b981)
- **Responsive Design**: Desktop, tablet, and mobile optimized
- **Smooth Animations**: Page transitions and interactions
- **Multi-Page SPA**: Seamless navigation between features
- **Real-time Stats**: Live updating points and completion counts
- **Calendar Picker**: Easy date selection for tracking
- **Visual Feedback**: Clear indication of task completion status

## 📝 New Pages

### Task Tracking Page
- Calendar date picker (default today's date)
- Task list for selected date (includes recurring tasks)
- Completion button for each task
- Live stats: points earned today, tasks completed, total tasks

### Weekly Reports Page
- Week selector (navigate through weeks)
- Weekly summary cards: total points, completed tasks, average per day
- Daily breakdown section showing each day's data
- Detailed list of completed tasks with points per day

## 🎯 Features Completed

✅ User authentication (signup/login)
✅ Profile setup with customization
✅ Fixed schedule configuration
✅ Goals management with two types (target/regular)
✅ Task creation with multi-day selection
✅ Dark theme styling with animations
✅ Responsive design (desktop/mobile)
✅ **NEW**: MySQL database integration
✅ **NEW**: Multi-day task support (recurring_days)
✅ **NEW**: Dynamic goal card creation (no limits)
✅ **NEW**: Task completion tracking system
✅ **NEW**: Points-based gamification
✅ **NEW**: Weekly analytics & reports
✅ **NEW**: Daily task tracking page
✅ **NEW**: Real-time statistics dashboard

## 🚧 Future Enhancements

- Email notifications for task reminders
- Task categories with custom icons
- User leaderboards and rankings
- Social sharing of achievements
- Mobile app version (React Native)
- Advanced charts and analytics
- Integration with calendar apps
- Collaborative team goals
- AI-powered task recommendations
- Automated task scheduling

## 🔐 Security Note

**Current Implementation:**
- Passwords stored in MySQL (production-ready with proper security)
- Session-based authentication
- SQL injection protected (using parameterized queries)
- CORS configured for security

**Production Recommendations:**
- Use HTTPS/SSL encryption
- Implement JWT tokens with expiration
- Add rate limiting on authentication endpoints
- Enable password hashing (bcrypt)
- Implement two-factor authentication
- Regular security audits and dependency updates

## 📋 Troubleshooting

### Database Connection Error
- Ensure MySQL is running
- Check .env file has correct credentials
- Verify database exists: `tasksync_db`
- Run `database.sql` to create schema

### Points Not Updating
- Verify task has `points_value` > 0
- Check `task_completions` table is created
- Ensure user is logged in with correct userId
- Check browser console for API errors

### Multi-Day Tasks Not Working
- Verify checkboxes are selected when creating task
- Check `recurring_days` JSON in database
- Ensure task due_date is set

### Weekly Reports Empty
- Verify tasks are completed for that week
- Check `task_completions` table has entries
- Confirm date format is correct (YYYY-MM-DD)

## 🤝 Support & Documentation

- **Setup Guide**: See [SETUP.md](SETUP.md) for detailed instructions
- **API Documentation**: Check comments in `routes/api/*.js` files
- **Frontend Code**: Comments in `public/app.js` explain logic flow
- **Database Schema**: Comments in `database.sql` explain each table

---

**TaskSync v2.0 - Master your tasks, earn your points, achieve your goals! 🎯✨**
