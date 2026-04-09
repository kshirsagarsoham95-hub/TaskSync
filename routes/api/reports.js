const express = require('express');
const router = express.Router();
const { getConnection } = require('../../config/database');

// Get weekly report for a specific week
router.get('/:userId/:weekStartDate', async (req, res) => {
  try {
    const { userId, weekStartDate } = req.params;
    const connection = await getConnection();
    
    // Calculate week end date
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get completions for the week
    const [completions] = await connection.query(
      'SELECT tc.*, t.title, t.priority FROM task_completions tc JOIN tasks t ON tc.task_id = t.task_id WHERE tc.user_id = ? AND tc.completion_date BETWEEN ? AND ? ORDER BY tc.completion_date, tc.created_at',
      [userId, weekStartDate, endDateStr]
    );

    const totalCompleted = completions.length;
    const totalPoints = completions.reduce((sum, c) => sum + (c.points_earned || 0), 0);

    // Get goals for the user
    const [goals] = await connection.query(
      'SELECT * FROM goals WHERE user_id = ?',
      [userId]
    );

    // Generate auto-generated insights
    const insights = generateWeeklyInsights(completions, goals, weekStartDate, endDateStr);

    // Check if existing report exists
    const [existing] = await connection.query(
      'SELECT * FROM weekly_reports WHERE user_id = ? AND week_start_date = ?',
      [userId, weekStartDate]
    );

    let report;
    if (existing.length > 0) {
      report = existing[0];
      report.total_tasks_completed = totalCompleted;
      report.total_points_earned = totalPoints;
      report.report_data = JSON.stringify({
        completions,
        summary: { totalCompleted, totalPoints },
        insights,
        goalProgress: calculateGoalProgress(completions, goals)
      });
    } else {
      report = {
        user_id: userId,
        week_start_date: weekStartDate,
        total_tasks_completed: totalCompleted,
        total_points_earned: totalPoints,
        streak_count: 0,
        report_data: JSON.stringify({
          completions,
          summary: { totalCompleted, totalPoints },
          insights,
          goalProgress: calculateGoalProgress(completions, goals)
        })
      };
    }

    connection.release();
    res.json(report);
  } catch (error) {
    console.error('Get weekly report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all weekly reports for user
router.get('/:userId/all/reports', async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await getConnection();
    
    const [rows] = await connection.query(
      'SELECT * FROM weekly_reports WHERE user_id = ? ORDER BY week_start_date DESC',
      [userId]
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current week stats
router.get('/:userId/current-week/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    // Calculate current week start (Monday)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const connection = await getConnection();

    // Get total tasks for this week
    const [tasks] = await connection.query(
      'SELECT COUNT(*) as total FROM tasks WHERE user_id = ? AND (due_date >= ? OR is_recurring = TRUE)',
      [userId, weekStartStr]
    );

    // Get completed tasks for this week
    const [completed] = await connection.query(
      'SELECT COUNT(*) as completed, SUM(points_earned) as points FROM task_completions WHERE user_id = ? AND completion_date >= ?',
      [userId, weekStartStr]
    );

    // Get user points
    const [profile] = await connection.query(
      'SELECT total_points FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    connection.release();

    res.json({
      week_start: weekStartStr,
      total_tasks: tasks[0].total || 0,
      completed_tasks: completed[0].completed || 0,
      points_earned: completed[0].points || 0,
      total_points: profile.length > 0 ? profile[0].total_points : 0
    });
  } catch (error) {
    console.error('Get current week stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

function generateWeeklyInsights(completions, goals, weekStart, weekEnd) {
  const insights = [];
  const totalCompleted = completions.length;
  const totalPoints = completions.reduce((sum, c) => sum + (c.points_earned || 0), 0);

  // Basic stats
  if (totalCompleted === 0) {
    insights.push("📊 This week was quiet with no task completions. Consider setting some achievable goals!");
  } else if (totalCompleted < 5) {
    insights.push(`📈 You completed ${totalCompleted} tasks this week. Keep building momentum!`);
  } else if (totalCompleted < 15) {
    insights.push(`🚀 Great progress! ${totalCompleted} tasks completed shows good productivity.`);
  } else {
    insights.push(`⭐ Outstanding! ${totalCompleted} tasks completed - you're crushing your goals!`);
  }

  // Points analysis
  if (totalPoints > 0) {
    insights.push(`💎 You earned ${totalPoints} points this week through consistent task completion.`);
  }

  // Daily distribution analysis
  const dailyCount = {};
  completions.forEach(c => {
    const date = c.completion_date;
    dailyCount[date] = (dailyCount[date] || 0) + 1;
  });

  const activeDays = Object.keys(dailyCount).length;
  if (activeDays >= 5) {
    insights.push(`📅 You were active ${activeDays} out of 7 days - excellent consistency!`);
  } else if (activeDays >= 3) {
    insights.push(`📅 You completed tasks on ${activeDays} days. Try to spread your work more evenly.`);
  } else {
    insights.push(`📅 You were active only ${activeDays} days this week. Consider daily task completion for better results.`);
  }

  // Priority analysis
  const highPriorityCount = completions.filter(c => c.priority >= 4).length;
  if (highPriorityCount > totalCompleted * 0.6) {
    insights.push(`🎯 You focused on high-priority tasks (${highPriorityCount} out of ${totalCompleted}). Well done!`);
  }

  // Goal progress
  if (goals && goals.length > 0) {
    const targetGoals = goals.filter(g => g.goal_type === 'target');
    if (targetGoals.length > 0) {
      insights.push(`🎯 You have ${targetGoals.length} target goals to work towards. Keep pushing!`);
    }
  }

  return insights;
}

function calculateGoalProgress(completions, goals) {
  if (!goals || goals.length === 0) return [];

  return goals.map(goal => {
    // For this simple implementation, we'll just return goal info
    // In a real app, you'd track goal-specific progress
    return {
      id: goal.goal_id,
      title: goal.title,
      type: goal.goal_type,
      progress: 0, // Placeholder - would need more complex logic
      target: goal.goal_type === 'target' ? 'Complete by deadline' : 'Daily habit'
    };
  });
}

module.exports = router;
