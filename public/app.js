// ==========================================
// TaskSync Web Application with MySQL Backend
// API-based state management
// ==========================================

const API_BASE = '/api';
let currentUser = null;
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let currentScheduleDay = 0;
let currentGoalsToCreate = [];
let scheduleEntriesByDay = {};
let editTaskId = null;
let currentTasks = [];

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkLoginStatus();
});

function setupEventListeners() {
    // Authentication
    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    document.getElementById('signupBtn')?.addEventListener('click', handleSignup);
    
    // Profile Setup
    document.getElementById('profileSetupBtn')?.addEventListener('click', handleProfileSetup);
    
    // Schedule Setup
    document.getElementById('addActivityBtn')?.addEventListener('click', addScheduleEntry);
    document.getElementById('scheduleSetupBtn')?.addEventListener('click', handleScheduleSetup);
    document.querySelectorAll('.tab-btn')?.forEach(btn => {
        btn.addEventListener('click', switchScheduleTab);
    });
    
    // Goals Setup
    document.getElementById('addGoalBtn')?.addEventListener('click', addGoalEntry);
    document.getElementById('completeSetupBtn')?.addEventListener('click', handleCompleteSetup);
    
    // Dashboard
    document.getElementById('createTaskBtn')?.addEventListener('click', handleCreateTask);
    document.getElementById('cancelTaskEditBtn')?.addEventListener('click', cancelTaskEdit);
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function initializeScheduleEntries() {
    scheduleEntriesByDay = {};
    days.forEach((_, index) => {
        scheduleEntriesByDay[index] = [];
    });
}

function saveCurrentScheduleDay() {
    const entries = [];
    document.querySelectorAll('#scheduleContent .schedule-entry').forEach(entry => {
        const [activityInput, startInput, endInput, categorySelect] = entry.querySelectorAll('input, select');
        const activityName = activityInput.value.trim();
        const startTime = startInput.value;
        const endTime = endInput.value;
        const category = categorySelect.value;

        if (activityName && startTime && endTime) {
            entries.push({
                activity_name: activityName,
                start_time: startTime,
                end_time: endTime,
                category
            });
        }
    });
    scheduleEntriesByDay[currentScheduleDay] = entries;
}

function loadScheduleDay(dayIndex) {
    saveCurrentScheduleDay();
    currentScheduleDay = dayIndex;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.day) === dayIndex);
    });

    const content = document.getElementById('scheduleContent');
    content.innerHTML = '';

    const heading = document.createElement('h3');
    heading.textContent = `Schedule for ${days[dayIndex]}`;
    heading.style.color = 'var(--primary-color)';
    heading.style.marginBottom = '15px';
    content.appendChild(heading);

    const entries = scheduleEntriesByDay[dayIndex] || [];
    if (entries.length === 0) {
        addScheduleEntry();
    } else {
        entries.forEach(item => addScheduleEntry(item));
    }
}

function addScheduleEntry(entry = null) {
    const content = document.getElementById('scheduleContent');
    const data = entry || {
        activity_name: '',
        start_time: '09:00',
        end_time: '10:00',
        category: 'Work'
    };

    const row = document.createElement('div');
    row.className = 'schedule-entry';
    row.innerHTML = `
        <input type="text" placeholder="Activity name" class="form-input" value="${escapeHtml(data.activity_name)}">
        <input type="time" class="form-input" value="${data.start_time}">
        <input type="time" class="form-input" value="${data.end_time}">
        <select class="form-input">
            <option value="Work"${data.category === 'Work' ? ' selected' : ''}>Work</option>
            <option value="Break"${data.category === 'Break' ? ' selected' : ''}>Break</option>
            <option value="Personal"${data.category === 'Personal' ? ' selected' : ''}>Personal</option>
            <option value="Learning"${data.category === 'Learning' ? ' selected' : ''}>Learning</option>
            <option value="Other"${data.category === 'Other' ? ' selected' : ''}>Other</option>
        </select>
        <button type="button" onclick="removeScheduleEntry(this)">✕ Remove</button>
    `;
    content.appendChild(row);
}

function switchScheduleTab(e) {
    const selectedDay = parseInt(e.target.dataset.day);
    if (!isNaN(selectedDay)) {
        loadScheduleDay(selectedDay);
    }
}

async function handleScheduleSetup() {
    const errorDiv = document.getElementById('scheduleSetupError');
    saveCurrentScheduleDay();

    const allEntries = [];
    days.forEach((dayName, dayIndex) => {
        (scheduleEntriesByDay[dayIndex] || []).forEach(entry => {
            if (entry.activity_name && entry.start_time && entry.end_time) {
                allEntries.push({
                    ...entry,
                    day_of_week: dayName
                });
            }
        });
    });

    if (allEntries.length === 0) {
        showError(errorDiv, 'Please add at least one schedule item');
        return;
    }

    try {
        for (let entry of allEntries) {
            const response = await fetch(`${API_BASE}/schedules/${currentUser.userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_of_week: entry.day_of_week,
                    activity_name: entry.activity_name,
                    start_time: `${entry.start_time}:00`,
                    end_time: `${entry.end_time}:00`,
                    category: entry.category
                })
            });

            if (!response.ok) {
                showError(errorDiv, 'Failed to save schedule. Please try again.');
                return;
            }
        }

        switchToGoalsSetup();
    } catch (error) {
        console.error('Schedule setup error:', error);
        showError(errorDiv, 'Connection error');
    }
}

// ==========================================
// GOALS SETUP
// ==========================================

async function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (!username || !password) {
        showError(errorDiv, 'Username and password required');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(errorDiv, data.error || 'Login failed');
            return;
        }

        currentUser = {
            userId: data.userId,
            username: data.username
        };

        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Check if setup is complete
        checkSetupStatus();
    } catch (error) {
        console.error('Login error:', error);
        showError(errorDiv, 'Connection error. Make sure the server is running.');
    }
}

async function handleSignup() {
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const errorDiv = document.getElementById('signupError');

    if (!username || !password) {
        showError(errorDiv, 'Username and password required');
        return;
    }

    if (password !== confirmPassword) {
        showError(errorDiv, 'Passwords do not match');
        return;
    }

    if (password.length < 3) {
        showError(errorDiv, 'Password must be at least 3 characters');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                email: email || null,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(errorDiv, data.error || 'Signup failed');
            return;
        }

        currentUser = {
            userId: data.userId,
            username: username
        };

        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Go to profile setup
        switchToProfileSetup();
    } catch (error) {
        console.error('Signup error:', error);
        showError(errorDiv, 'Connection error. Make sure the server is running.');
    }
}

function checkLoginStatus() {
    // Always start with login page - no auto-login
    switchToLogin({ preventDefault: () => {} });
}

async function checkSetupStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/user/${currentUser.userId}/setup-status`);
        const status = await response.json();

        if (!status.setupComplete) {
            // Redirect to appropriate setup step
            if (!status.profileComplete) {
                switchToProfileSetup();
            } else if (!status.scheduleComplete) {
                switchToScheduleSetup();
            } else {
                switchToGoalsSetup();
            }
        } else {
            switchToDashboard();
        }
    } catch (error) {
        console.error('Setup status error:', error);
        console.log('⚠️ Server not responding. Check if it\'s running.');
    }
}

// ==========================================
// PROFILE SETUP
// ==========================================

function switchToProfileSetup() {
    switchPage('profileSetupPage');
}

async function handleProfileSetup() {
    const bio = document.getElementById('profileBio').value;
    const timezone = document.getElementById('profileTimezone').value;
    const workStart = document.getElementById('profileWorkStart').value;
    const workEnd = document.getElementById('profileWorkEnd').value;
    const errorDiv = document.getElementById('profileSetupError');

    try {
        const response = await fetch(`${API_BASE}/profiles/${currentUser.userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bio: bio || null,
                timezone,
                work_start_time: workStart,
                work_end_time: workEnd,
                energy_level: 'medium'
            })
        });

        if (!response.ok) {
            showError(errorDiv, 'Failed to save profile');
            return;
        }

        switchToScheduleSetup();
    } catch (error) {
        console.error('Profile setup error:', error);
        showError(errorDiv, 'Connection error');
    }
}

// ==========================================
// SCHEDULE SETUP
// ==========================================

function switchToScheduleSetup() {
    switchPage('scheduleSetupPage');
    currentScheduleDay = 0;
    initializeScheduleEntries();
    loadScheduleDay(currentScheduleDay);
}

function renderScheduleTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.day) === currentScheduleDay);
    });
}

// ==========================================
// GOALS SETUP
// ==========================================

function switchToGoalsSetup() {
    switchPage('goalsSetupPage');
    
    // Ask user for number of goals
    const numGoals = prompt('How many goals do you want to set? (E.g. 3)', '3');
    if (!numGoals || isNaN(numGoals) || parseInt(numGoals) < 1) {
        alert('Please enter a valid number');
        return;
    }
    
    currentGoalsToCreate = [];
    const container = document.getElementById('goalsContainer');
    container.innerHTML = '';
    
    const count = parseInt(numGoals);
    for (let i = 0; i < count; i++) {
        addGoalEntry();
    }
}

function addGoalEntry() {
    const container = document.getElementById('goalsContainer');
    const goalEntry = document.createElement('div');
    goalEntry.className = 'goal-entry';
    goalEntry.innerHTML = `
        <div class="form-group">
            <label>Goal Title</label>
            <input type="text" placeholder="Enter your goal" class="form-input goal-title">
        </div>
        <div class="form-group">
            <label>Description (Optional)</label>
            <textarea placeholder="More details about this goal..." class="form-input goal-description" rows="2"></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Goal Type</label>
                <select class="form-input goal-type">
                    <option value="target">Target-based</option>
                    <option value="regular">Regular / Daily</option>
                </select>
            </div>
            <div class="form-group">
                <label>Priority</label>
                <select class="form-input goal-priority">
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Target Date (for target-based only)</label>
                <input type="date" class="form-input goal-date">
            </div>
        </div>
        <button type="button" class="btn btn-secondary" onclick="removeGoalEntry(this)">✕ Remove Goal</button>
    `;
    container.appendChild(goalEntry);
}

function removeGoalEntry(btn) {
    btn.closest('.goal-entry').remove();
}

async function handleCompleteSetup() {
    const errorDiv = document.getElementById('goalsSetupError');
    const goalEntries = document.querySelectorAll('.goal-entry');

    if (goalEntries.length === 0) {
        showError(errorDiv, 'Please add at least one goal');
        return;
    }

    try {
        let savedCount = 0;
        for (let entry of goalEntries) {
            const title = entry.querySelector('.goal-title').value;
            const description = entry.querySelector('.goal-description').value;
            const date = entry.querySelector('.goal-date').value;
            const priority = entry.querySelector('.goal-priority').value;
            const goalType = entry.querySelector('.goal-type').value;

            if (!title) continue;

            const response = await fetch(`${API_BASE}/goals/${currentUser.userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description: description || null,
                    target_date: date || null,
                    priority,
                    goal_type: goalType
                })
            });

            if (response.ok) {
                savedCount++;
            }
        }

        if (savedCount < 1) {
            showError(errorDiv, 'Failed to save goals');
            return;
        }

        switchToDashboard();
    } catch (error) {
        console.error('Complete setup error:', error);
        showError(errorDiv, 'Connection error');
    }
}

// ==========================================
// DASHBOARD
// ==========================================

function switchToDashboard() {
    switchPage('dashboardPage');
    const username = currentUser.username || 'User';
    document.getElementById('dashboardUsername').textContent = username;
    resetTaskForm();
    loadTasks();
}

function resetTaskForm() {
    editTaskId = null;
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskDate').value = '';
    document.getElementById('taskDuration').value = '60';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskCategory').value = 'Work';
    document.getElementById('taskStatus').value = 'pending';
    document.getElementById('createTaskBtn').textContent = '✅ Create Task';
    document.getElementById('cancelTaskEditBtn').style.display = 'none';
}

function cancelTaskEdit() {
    resetTaskForm();
}

function populateTaskForm(task) {
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskDate').value = task.due_date || '';
    document.getElementById('taskDuration').value = task.duration || '60';
    document.getElementById('taskPriority').value = task.priority || 'medium';
    document.getElementById('taskCategory').value = task.category || 'Work';
    document.getElementById('taskStatus').value = task.status || 'pending';
    editTaskId = task.task_id;
    document.getElementById('createTaskBtn').textContent = '✏️ Update Task';
    document.getElementById('cancelTaskEditBtn').style.display = 'inline-block';
}

async function handleCreateTask() {
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const date = document.getElementById('taskDate').value;
    const duration = document.getElementById('taskDuration').value;
    const priority = document.getElementById('taskPriority').value;
    const category = document.getElementById('taskCategory').value;
    const status = document.getElementById('taskStatus').value;

    if (!title || !date || !duration) {
        alert('Please fill in title, due date, and duration');
        return;
    }

    // Get selected days for multi-day tasks
    const selectedDays = [];
    document.querySelectorAll('input[name="taskDays"]:checked').forEach(checkbox => {
        selectedDays.push(checkbox.value);
    });

    const payload = {
        title,
        description: description || null,
        priority,
        category,
        duration: parseInt(duration, 10) || 0,
        due_date: date,
        status,
        recurring_days: selectedDays.length > 0 ? selectedDays : null,
        points_value: 10 + (priority === 'high' ? 5 : priority === 'low' ? -3 : 0)
    };

    try {
        const endpoint = editTaskId ? `${API_BASE}/tasks/${currentUser.userId}/${editTaskId}` : `${API_BASE}/tasks/${currentUser.userId}`;
        const method = editTaskId ? 'PUT' : 'POST';
        const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            resetTaskForm();
            loadTasks();
        } else {
            alert(editTaskId ? 'Failed to update task' : 'Failed to create task');
        }
    } catch (error) {
        console.error('Create/update task error:', error);
        alert('Connection error');
    }
}

async function editTask(taskId) {
    const task = currentTasks.find(t => t.task_id === taskId);
    if (!task) {
        return;
    }
    populateTaskForm(task);
}

async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/tasks/${currentUser.userId}/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadTasks();
        } else {
            alert('Failed to delete task');
        }
    } catch (error) {
        console.error('Delete task error:', error);
        alert('Connection error');
    }
}

async function markTaskCompleted(taskId) {
    try {
        // Update task status to completed
        const task = currentTasks.find(t => t.task_id === taskId);
        if (!task) return;

        const response = await fetch(`${API_BASE}/tasks/${currentUser.userId}/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...task, status: 'completed' })
        });

        if (response.ok) {
            // Also record completion for today if it's a daily/scheduled task
            const today = new Date().toISOString().split('T')[0];
            await fetch(`${API_BASE}/completions/${currentUser.userId}/mark-complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: taskId, completion_date: today })
            });
            loadTasks();
        } else {
            alert('Failed to mark task as completed');
        }
    } catch (error) {
        console.error('Mark task completed error:', error);
        alert('Connection error');
    }
}

async function markTaskIncomplete(taskId) {
    try {
        // Update task status back to pending
        const task = currentTasks.find(t => t.task_id === taskId);
        if (!task) return;

        const response = await fetch(`${API_BASE}/tasks/${currentUser.userId}/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...task, status: 'pending' })
        });

        if (response.ok) {
            loadTasks();
        } else {
            alert('Failed to mark task as incomplete');
        }
    } catch (error) {
        console.error('Mark task incomplete error:', error);
        alert('Connection error');
    }
}

async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks/${currentUser.userId}`);
        const tasks = await response.json();
        currentTasks = tasks;

        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '';

        if (tasks.length === 0) {
            tasksList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No tasks yet. Create one above!</p>';
            document.getElementById('totalTasks').textContent = '0';
            document.getElementById('inProgressTasks').textContent = '0';
            document.getElementById('completedTasks').textContent = '0';
            return;
        }

        let totalTasks = tasks.length;
        let inProgress = tasks.filter(t => t.status === 'in-progress').length;
        let completed = tasks.filter(t => t.status === 'completed').length;

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('inProgressTasks').textContent = inProgress;
        document.getElementById('completedTasks').textContent = completed;

        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
            taskItem.innerHTML = `
                <div class="task-item-header">
                    <div>
                        <div class="task-title">${priorityEmoji} ${escapeHtml(task.title)}</div>
                        <div class="task-date">${escapeHtml(task.category)} • ${task.due_date || 'No date'}</div>
                    </div>
                    <span style="color: var(--text-secondary); font-size: 12px;">${escapeHtml(task.status)}</span>
                </div>
                <div class="task-description">${escapeHtml(task.description || 'No description')}</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 12px;">
                    ⏱️ ${task.duration} mins
                </div>
                <div class="task-actions">
                    ${task.status !== 'completed' ? `<button class="btn btn-success btn-small" onclick="markTaskCompleted(${task.task_id})">✅ Complete</button>` : `<button class="btn btn-secondary btn-small" onclick="markTaskIncomplete(${task.task_id})">↩️ Undo</button>`}
                    <button class="btn btn-secondary btn-small" onclick="editTask(${task.task_id})">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="deleteTask(${task.task_id})">Delete</button>
                </div>
            `;
            tasksList.appendChild(taskItem);
        });
    } catch (error) {
        console.error('Load tasks error:', error);
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '<p style="color: var(--error-color);">Error loading tasks</p>';
    }
}

// ==========================================
// PROFILE/SCHEDULE/GOALS VIEWS
// ==========================================

async function switchToProfile() {
    switchPage('profilePage');
    
    try {
        const response = await fetch(`${API_BASE}/profiles/${currentUser.userId}`);
        const profile = await response.json();

        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileEmail').textContent = profile.email || 'No email';
        document.getElementById('profileBioDisplay').textContent = profile.bio || 'No bio';
        document.getElementById('profileWorkHours').textContent = 
            `${profile.work_start_time} - ${profile.work_end_time}`;
        document.getElementById('profileTimezoneDisplay').textContent = profile.timezone || 'UTC';
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

async function switchToSchedule() {
    switchPage('schedulePage');
    
    try {
        const response = await fetch(`${API_BASE}/schedules/${currentUser.userId}`);
        const schedules = await response.json();

        const display = document.getElementById('scheduleDisplay');
        display.innerHTML = '';

        if (schedules.length === 0) {
            display.innerHTML = '<p style="color: var(--text-secondary);">No schedule set yet</p>';
            return;
        }

        const groupedByDay = {};
        schedules.forEach(s => {
            if (!groupedByDay[s.day_of_week]) {
                groupedByDay[s.day_of_week] = [];
            }
            groupedByDay[s.day_of_week].push(s);
        });

        Object.entries(groupedByDay).forEach(([day, activities]) => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-schedule';
            dayDiv.innerHTML = `<h3>${day}</h3>`;
            
            activities.forEach(activity => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-name">${escapeHtml(activity.activity_name)}</div>
                    <div class="activity-time">${escapeHtml(activity.start_time)} - ${escapeHtml(activity.end_time)}</div>
                    <div class="activity-category">${escapeHtml(activity.category)}</div>
                `;
                dayDiv.appendChild(item);
            });
            
            display.appendChild(dayDiv);
        });
    } catch (error) {
        console.error('Load schedule error:', error);
    }
}

async function switchToGoals() {
    switchPage('goalsPage');
    
    try {
        const response = await fetch(`${API_BASE}/goals/${currentUser.userId}`);
        const goals = await response.json();

        const display = document.getElementById('goalsDisplay');
        display.innerHTML = '';

        if (goals.length === 0) {
            display.innerHTML = '<p style="color: var(--text-secondary);">No goals set yet</p>';
            return;
        }

        goals.forEach(goal => {
            const goalDiv = document.createElement('div');
            goalDiv.className = 'goal-card';
            goalDiv.style.marginBottom = '15px';
            
            const priorityColor = goal.priority === 'high' ? '#ef4444' : 
                                goal.priority === 'medium' ? '#f59e0b' : '#10b981';
            
            goalDiv.innerHTML = `
                <div style="padding: 20px; background: rgba(30,42,64,0.5); border-radius: 8px; border-left: 4px solid ${priorityColor};">
                    <div style="font-weight: bold; font-size: 16px; color: var(--text-primary);">
                        ${goal.title}
                    </div>
                    <div style="color: var(--text-secondary); font-size: 13px; margin: 8px 0;">
                        ${goal.description || 'No description'}
                    </div>
                    <div style="display: flex; gap: 15px; font-size: 12px; color: var(--text-secondary);">
                        <span>📅 ${goal.target_date || 'No deadline'}</span>
                        <span>⭐ ${goal.priority}</span>
                        <span>
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${goal.status === 'active' ? '#10b981' : '#94a3b8'};"></span>
                            ${goal.status}
                        </span>
                    </div>
                </div>
            `;
            
            display.appendChild(goalDiv);
        });
    } catch (error) {
        console.error('Load goals error:', error);
    }
}

// ==========================================
// NAVIGATION & UTILITIES
// ==========================================

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function switchToLogin(e) {
    e.preventDefault();
    switchPage('loginPage');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

function switchToSignup(e) {
    e.preventDefault();
    switchPage('signupPage');
    document.getElementById('signupUsername').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('signupConfirmPassword').value = '';
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    switchToLogin({ preventDefault: () => {} });
}

function showError(errorDiv, message) {
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 4000);
}

// ==========================================
// TASK TRACKING & COMPLETION
// ==========================================

function switchToTracking() {
    switchPage('trackingPage');
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trackingDate').value = today;
    loadTodaysTasks();
}

function loadTodaysTasks() {
    const date = document.getElementById('trackingDate').value;
    loadTasksForDate(date);
}

async function loadTasksForDate(date) {
    try {
        // Load all tasks first
        const tasksResponse = await fetch(`${API_BASE}/tasks/${currentUser.userId}`);
        const tasks = await tasksResponse.json();

        // Load completions for this date
        const completionsResponse = await fetch(`${API_BASE}/completions/${currentUser.userId}/${date}`);
        const completions = await completionsResponse.json();

        const completedTaskIds = new Set(completions.map(c => c.task_id));
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

        // Filter tasks for this date
        const tasksForDate = tasks.filter(task => {
            // Check if due date matches
            if (task.due_date === date) return true;
            
            // Check if recurring and includes this day
            if (task.is_recurring && task.recurring_days) {
                const days = JSON.parse(task.recurring_days);
                return days.includes(dayName);
            }
            return false;
        });

        const container = document.getElementById('todayTasksList');
        const completedContainer = document.getElementById('completedTasksList');
        const completedSummary = document.getElementById('completedTasksSummary');
        
        container.innerHTML = '';
        completedContainer.innerHTML = '';

        if (tasksForDate.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No tasks for this day</p>';
            completedSummary.style.display = 'none';
            document.getElementById('pointsToday').textContent = '0';
            document.getElementById('completedToday').textContent = '0';
            return;
        }

        let pointsToday = 0;
        let completedCount = 0;
        const pendingTasks = [];
        const completedTasks = [];

        tasksForDate.forEach(task => {
            const isCompleted = completedTaskIds.has(task.task_id);
            if (isCompleted) {
                pointsToday += task.points_value || 10;
                completedCount++;
                completedTasks.push(task);
            } else {
                pendingTasks.push(task);
            }
        });

        // Render pending tasks
        if (pendingTasks.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">All tasks completed! 🎉</p>';
        } else {
            pendingTasks.forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-completion';
                const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';

                taskDiv.innerHTML = `
                    <div class="task-completion-info">
                        <div class="task-completion-title">${priorityEmoji} ${escapeHtml(task.title)}</div>
                        <div class="task-completion-meta">${escapeHtml(task.category)} • ⏱️ ${task.duration} mins • 🎁 ${task.points_value || 10} pts</div>
                    </div>
                    <div class="task-completion-actions">
                        <button class="task-completion-btn" onclick="markTaskCompletion(${task.task_id}, '${date}')">Complete</button>
                    </div>
                `;
                container.appendChild(taskDiv);
            });
        }

        // Render completed tasks summary
        if (completedTasks.length > 0) {
            completedSummary.style.display = 'block';
            completedTasks.forEach(task => {
                const completion = completions.find(c => c.task_id === task.task_id);
                const completionTime = completion ? new Date(completion.completion_date).toLocaleTimeString() : '';
                
                const taskDiv = document.createElement('div');
                taskDiv.className = 'completed-task-item';
                const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';

                taskDiv.innerHTML = `
                    <span class="task-name">${priorityEmoji} ${escapeHtml(task.title)}</span>
                    <span class="task-points">+${task.points_value || 10} pts</span>
                    ${completionTime ? `<span class="completion-time">✓ ${completionTime}</span>` : ''}
                `;
                completedContainer.appendChild(taskDiv);
            });
        } else {
            completedSummary.style.display = 'none';
        }

        document.getElementById('pointsToday').textContent = pointsToday;
        document.getElementById('completedToday').textContent = completedCount;

        // Load total points
        const profileResp = await fetch(`${API_BASE}/profiles/${currentUser.userId}`);
        const profile = await profileResp.json();
        document.getElementById('totalPoints').textContent = profile.total_points || 0;

    } catch (error) {
        console.error('Load tasks error:', error);
    }
}

async function markTaskCompletion(taskId, date) {
    try {
        const response = await fetch(`${API_BASE}/completions/${currentUser.userId}/mark-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, completion_date: date })
        });

        if (response.ok) {
            loadTasksForDate(date);
            // Also refresh dashboard if we're on it
            if (document.getElementById('dashboardPage').style.display !== 'none') {
                loadTasks();
            }
        }
    } catch (error) {
        console.error('Mark completion error:', error);
    }
}

async function unmarkTaskCompletion(taskId, date) {
    try {
        const response = await fetch(`${API_BASE}/completions/${currentUser.userId}/mark-incomplete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, completion_date: date })
        });

        if (response.ok) {
            loadTasksForDate(date);
            // Also refresh dashboard if we're on it
            if (document.getElementById('dashboardPage').style.display !== 'none') {
                loadTasks();
            }
        }
    } catch (error) {
        console.error('Unmark completion error:', error);
    }
}

// ==========================================
// WEEKLY REPORTS
// ==========================================

function switchToReports() {
    switchPage('reportsPage');
    
    // Set report week to current week start
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    document.getElementById('reportWeek').value = weekStartStr;
    loadWeeklyReport();
}

async function loadWeeklyReport() {
    try {
        const weekStart = document.getElementById('reportWeek').value;
        
        const response = await fetch(`${API_BASE}/reports/${currentUser.userId}/${weekStart}`);
        const report = await response.json();

        // Get current week stats
        const statsResp = await fetch(`${API_BASE}/reports/${currentUser.userId}/current-week/stats`);
        const stats = await statsResp.json();

        document.getElementById('weekCompletedTasks').textContent = stats.completed_tasks || 0;
        document.getElementById('weekPointsEarned').textContent = stats.points_earned || 0;
        document.getElementById('weekStreak').textContent = '0';

        // Display detailed report
        const detailsDiv = document.getElementById('weeklyReportDetails');
        detailsDiv.innerHTML = '';

        const reportData = typeof report.report_data === 'string' 
            ? JSON.parse(report.report_data) 
            : report.report_data;

        // Display auto-generated insights
        if (reportData.insights && reportData.insights.length > 0) {
            const insightsDiv = document.createElement('div');
            insightsDiv.className = 'insights-section';
            insightsDiv.innerHTML = `
                <div class="insights-title">🤖 AI-Generated Insights</div>
                ${reportData.insights.map(insight => `<div class="insight-item">${insight}</div>`).join('')}
            `;
            detailsDiv.appendChild(insightsDiv);
        }

        if (!reportData || !reportData.completions || reportData.completions.length === 0) {
            const noDataDiv = document.createElement('div');
            noDataDiv.style.cssText = 'text-align: center; color: var(--text-secondary); padding: 40px;';
            noDataDiv.textContent = 'No completions this week yet. Start completing tasks to see your progress!';
            detailsDiv.appendChild(noDataDiv);
        } else {
            // Group by date
            const groupedByDate = {};
            reportData.completions.forEach(completion => {
                if (!groupedByDate[completion.completion_date]) {
                    groupedByDate[completion.completion_date] = [];
                }
                groupedByDate[completion.completion_date].push(completion);
            });

            Object.entries(groupedByDate).sort().forEach(([date, completions]) => {
                const dayDiv = document.createElement('div');
                dayDiv.className = 'report-day';
                const dateObj = new Date(date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                
                dayDiv.innerHTML = `<div class="report-day-header">${dayName} (${completions.length} tasks)</div>`;
                
                completions.forEach(completion => {
                    const taskDiv = document.createElement('div');
                    taskDiv.className = `report-day-task`;
                    taskDiv.innerHTML = `✅ ${escapeHtml(completion.title)} - ${completion.points_earned} pts`;
                    dayDiv.appendChild(taskDiv);
                });
                
                detailsDiv.appendChild(dayDiv);
            });
        }

        // Render goal progress chart
        renderGoalProgressChart(reportData.goalProgress || []);

    } catch (error) {
        console.error('Load report error:', error);
    }
}

function renderGoalProgressChart(goalProgress) {
    const chartDiv = document.getElementById('goalProgressChart');
    
    if (!goalProgress || goalProgress.length === 0) {
        chartDiv.innerHTML = `
            <div class="chart-placeholder">
                <p>No goals set yet. Create some goals to see your progress visualization!</p>
            </div>
        `;
        return;
    }

    // Create progress bars for each goal
    const progressHTML = goalProgress.map(goal => {
        // For demo purposes, generate random progress (0-100%)
        // In a real app, this would be calculated based on actual progress
        const progress = Math.floor(Math.random() * 101);
        
        return `
            <div class="goal-progress-bar">
                <div class="goal-title">${escapeHtml(goal.title)}</div>
                <div class="goal-percentage">${progress}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }).join('');

    chartDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="color: var(--primary-color); margin-bottom: 15px;">🎯 Goal Completion Progress</h3>
            <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 20px;">
                Track your progress towards completing your goals this week
            </p>
        </div>
        ${progressHTML}
    `;
}
