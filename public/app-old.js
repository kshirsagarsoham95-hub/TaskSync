// ========================
// APPLICATION STATE
// ========================

let currentUser = null;
let users = loadUsers();
let currentDay = 0;
let scheduleEntries = {};
let goalEntries = [];

// ========================
// INITIALIZATION
// ========================

document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    document.getElementById('taskDate').valueAsDate = new Date();
    
    // Event listeners for login
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('signupBtn').addEventListener('click', handleSignup);
    
    // Event listeners for profile setup
    document.getElementById('profileSetupBtn').addEventListener('click', handleProfileSetup);
    document.getElementById('scheduleSetupBtn').addEventListener('click', handleScheduleSetup);
    document.getElementById('completeSetupBtn').addEventListener('click', handleCompleteSetup);
    
    // Event listeners for add activity button
    document.getElementById('addActivityBtn').addEventListener('click', addScheduleEntry);
    document.getElementById('addGoalBtn').addEventListener('click', addGoalEntry);
    
    // Event listeners for schedule tabs
    document.querySelectorAll('.tab-btn').forEach((btn, index) => {
        btn.addEventListener('click', function() {
            switchDay(index);
        });
    });
    
    // Event listener for task creation
    document.getElementById('createTaskBtn').addEventListener('click', handleCreateTask);
    
    // Initialize schedule tabs
    renderScheduleTabs();
    renderScheduleContent(0);
    
    // Add initial goal entries
    addGoalEntry();
    addGoalEntry();
    addGoalEntry();
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        switchToDashboard();
    }
});

// ========================
// LOCAL STORAGE
// ========================

function loadUsers() {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : [];
}

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function saveCurrentUser() {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

function clearCurrentUser() {
    localStorage.removeItem('currentUser');
}

// ========================
// AUTHENTICATION
// ========================

function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    // Validation
    if (!username) {
        showError(errorDiv, '❌ Username is required');
        return;
    }
    
    if (!password) {
        showError(errorDiv, '❌ Password is required');
        return;
    }
    
    // Find user
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        showError(errorDiv, '❌ Invalid username or password');
        document.getElementById('loginPassword').value = '';
        return;
    }
    
    // Log in user
    currentUser = user;
    saveCurrentUser();
    
    // Check if profile is complete
    if (user.profileComplete) {
        // Go to dashboard
        switchToDashboard();
    } else {
        // Go to profile setup
        switchToProfileSetup();
    }
    
    // Clear form
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

function handleSignup() {
    const firstName = document.getElementById('signupFirstName').value.trim();
    const lastName = document.getElementById('signupLastName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
    const errorDiv = document.getElementById('signupError');
    
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    // Validation
    if (!firstName) {
        showError(errorDiv, '❌ First name is required');
        return;
    }
    
    if (!lastName) {
        showError(errorDiv, '❌ Last name is required');
        return;
    }
    
    if (!email || !email.includes('@')) {
        showError(errorDiv, '❌ Valid email is required');
        return;
    }
    
    if (!username || username.length < 3) {
        showError(errorDiv, '❌ Username must be at least 3 characters');
        return;
    }
    
    if (!password || password.length < 8) {
        showError(errorDiv, '❌ Password must be at least 8 characters');
        return;
    }
    
    if (password !== confirmPassword) {
        showError(errorDiv, '❌ Passwords do not match');
        document.getElementById('signupConfirmPassword').value = '';
        return;
    }
    
    // Check if username already exists
    if (users.find(u => u.username === username)) {
        showError(errorDiv, '❌ Username already exists');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now(),
        firstName,
        lastName,
        email,
        username,
        password, // In production, hash this!
        profileComplete: false,
        createdAt: new Date().toISOString(),
        profile: {},
        schedule: {},
        goals: [],
        tasks: []
    };
    
    users.push(newUser);
    saveUsers();
    
    // Log in new user
    currentUser = newUser;
    saveCurrentUser();
    
    // Clear form
    document.getElementById('signupFirstName').value = '';
    document.getElementById('signupLastName').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupUsername').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('signupConfirmPassword').value = '';
    
    // Go to profile setup
    switchToProfileSetup();
}

// ========================
// PROFILE SETUP
// ========================

function handleProfileSetup() {
    const bio = document.getElementById('profileBio').value.trim();
    const timezone = document.getElementById('profileTimezone').value;
    const workStart = parseInt(document.getElementById('profileWorkStart').value);
    const workEnd = parseInt(document.getElementById('profileWorkEnd').value);
    const energy = parseInt(document.getElementById('profileEnergy').value);
    const errorDiv = document.getElementById('profileSetupError');
    
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    // Validation
    if (workStart >= workEnd) {
        showError(errorDiv, '❌ Work end hour must be after start hour');
        return;
    }
    
    // Save profile
    currentUser.profile = {
        bio,
        timezone,
        workStart,
        workEnd,
        energy
    };
    
    // Save to localStorage
    saveCurrentUser();
    users = users.map(u => u.id === currentUser.id ? currentUser : u);
    saveUsers();
    
    // Go to schedule setup
    switchToScheduleSetup();
}

// ========================
// SCHEDULE SETUP
// ========================

function renderScheduleTabs() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const container = document.querySelector('.schedule-tabs');
    
    container.innerHTML = '';
    days.forEach((day, index) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
        btn.textContent = day;
        btn.setAttribute('data-day', index);
        btn.addEventListener('click', () => switchDay(index));
        container.appendChild(btn);
    });
}

function switchDay(index) {
    currentDay = index;
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });
    renderScheduleContent(index);
}

function renderScheduleContent(dayIndex) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const container = document.getElementById('scheduleContent');
    
    if (!scheduleEntries[dayIndex]) {
        scheduleEntries[dayIndex] = [];
    }
    
    container.innerHTML = `<h3>${days[dayIndex]}</h3><div id="entriesList"></div>`;
    const entriesList = document.getElementById('entriesList');
    
    scheduleEntries[dayIndex].forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'schedule-entry';
        entryDiv.innerHTML = `
            <input type="text" placeholder="Activity name" value="${entry.name || ''}" class="entry-name" data-day="${dayIndex}" data-index="${index}">
            <input type="number" min="0" max="23" value="${entry.startTime || 9}" class="entry-start" data-day="${dayIndex}" data-index="${index}">
            <span>to</span>
            <input type="number" min="0" max="23" value="${entry.endTime || 17}" class="entry-end" data-day="${dayIndex}" data-index="${index}">
            <select class="entry-category" data-day="${dayIndex}" data-index="${index}">
                <option value="Work" ${entry.category === 'Work' ? 'selected' : ''}>Work</option>
                <option value="Personal" ${entry.category === 'Personal' ? 'selected' : ''}>Personal</option>
                <option value="Health" ${entry.category === 'Health' ? 'selected' : ''}>Health</option>
                <option value="Other" ${entry.category === 'Other' ? 'selected' : ''}>Other</option>
            </select>
            <button onclick="removeScheduleEntry(${dayIndex}, ${index})">×</button>
        `;
        entriesList.appendChild(entryDiv);
    });
    
    // Add listeners to update entries
    document.querySelectorAll('.entry-name, .entry-start, .entry-end, .entry-category').forEach(el => {
        el.addEventListener('change', function() {
            const day = parseInt(this.getAttribute('data-day'));
            const idx = parseInt(this.getAttribute('data-index'));
            const names = document.querySelectorAll(`.entry-name[data-day="${day}"]`);
            const starts = document.querySelectorAll(`.entry-start[data-day="${day}"]`);
            const ends = document.querySelectorAll(`.entry-end[data-day="${day}"]`);
            const cats = document.querySelectorAll(`.entry-category[data-day="${day}"]`);
            
            scheduleEntries[day][idx] = {
                name: names[idx].value,
                startTime: parseInt(starts[idx].value),
                endTime: parseInt(ends[idx].value),
                category: cats[idx].value
            };
        });
    });
}

function addScheduleEntry() {
    if (!scheduleEntries[currentDay]) {
        scheduleEntries[currentDay] = [];
    }
    
    scheduleEntries[currentDay].push({
        name: '',
        startTime: 9,
        endTime: 17,
        category: 'Work'
    });
    
    renderScheduleContent(currentDay);
}

function removeScheduleEntry(day, index) {
    scheduleEntries[day].splice(index, 1);
    renderScheduleContent(day);
}

function handleScheduleSetup() {
    // Check if at least one activity is added
    const hasActivity = Object.values(scheduleEntries).some(day => 
        day.some(entry => entry.name && entry.name.trim() !== '')
    );
    
    if (!hasActivity) {
        showError(document.getElementById('scheduleSetupError'), 
            '❌ Please add at least one activity');
        return;
    }
    
    // Save schedule
    currentUser.schedule = scheduleEntries;
    saveCurrentUser();
    users = users.map(u => u.id === currentUser.id ? currentUser : u);
    saveUsers();
    
    // Go to goals setup
    switchToGoalsSetup();
}

// ========================
// GOALS SETUP
// ========================

function addGoalEntry() {
    const container = document.getElementById('goalsContainer');
    const index = goalEntries.length;
    
    const goalDiv = document.createElement('div');
    goalDiv.className = 'goal-entry';
    goalDiv.id = `goal-${index}`;
    goalDiv.innerHTML = `
        <div class="form-group">
            <label>Goal Title</label>
            <input type="text" placeholder="What do you want to achieve?" class="form-input goal-title" data-index="${index}">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea placeholder="Add more details..." class="form-input goal-description" rows="2" data-index="${index}"></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Target Date</label>
                <input type="date" class="form-input goal-date" data-index="${index}">
            </div>
            <div class="form-group">
                <label>Priority</label>
                <select class="form-input goal-priority" data-index="${index}">
                    <option value="3">Medium</option>
                    <option value="1">Low</option>
                    <option value="4">High</option>
                    <option value="5">Critical</option>
                </select>
            </div>
        </div>
        <button onclick="removeGoalEntry(${index})" class="btn btn-secondary">Remove Goal</button>
    `;
    
    container.appendChild(goalDiv);
    goalEntries.push({});
    
    // Set default date to 1 month from now
    const dateInput = goalDiv.querySelector('.goal-date');
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    dateInput.valueAsDate = date;
}

function removeGoalEntry(index) {
    const goalDiv = document.getElementById(`goal-${index}`);
    if (goalDiv) {
        goalDiv.remove();
    }
}

function handleCompleteSetup() {
    const goals = [];
    const titleInputs = document.querySelectorAll('.goal-title');
    
    // Collect all goals with titles
    titleInputs.forEach((input, index) => {
        const title = input.value.trim();
        if (title) {
            const desc = document.querySelectorAll('.goal-description')[index].value.trim();
            const date = document.querySelectorAll('.goal-date')[index].value;
            const priority = parseInt(document.querySelectorAll('.goal-priority')[index].value);
            
            goals.push({
                title,
                description: desc,
                targetDate: date,
                priority,
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            });
        }
    });
    
    if (goals.length === 0) {
        showError(document.getElementById('goalsSetupError'), 
            '❌ Please add at least one goal');
        return;
    }
    
    // Check dates are in future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let goal of goals) {
        if (goal.targetDate) {
            const goalDate = new Date(goal.targetDate);
            if (goalDate < today) {
                showError(document.getElementById('goalsSetupError'), 
                    '❌ Target dates must be in the future');
                return;
            }
        }
    }
    
    // Save goals
    currentUser.goals = goals;
    currentUser.profileComplete = true;
    
    saveCurrentUser();
    users = users.map(u => u.id === currentUser.id ? currentUser : u);
    saveUsers();
    
    // Go to dashboard
    switchToDashboard();
}

// ========================
// TASK MANAGEMENT
// ========================

function handleCreateTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const date = document.getElementById('taskDate').value;
    const duration = parseInt(document.getElementById('taskDuration').value);
    const priority = parseInt(document.getElementById('taskPriority').value);
    const category = document.getElementById('taskCategory').value;
    
    if (!title) {
        alert('❌ Task title is required');
        return;
    }
    
    if (!date) {
        alert('❌ Please select a date');
        return;
    }
    
    const task = {
        id: Date.now(),
        title,
        description,
        date,
        duration,
        priority,
        category,
        status: 'PENDING',
        createdAt: new Date().toISOString()
    };
    
    if (!currentUser.tasks) {
        currentUser.tasks = [];
    }
    
    currentUser.tasks.push(task);
    saveCurrentUser();
    users = users.map(u => u.id === currentUser.id ? currentUser : u);
    saveUsers();
    
    // Clear form
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskDate').valueAsDate = new Date();
    document.getElementById('taskDuration').value = '60';
    document.getElementById('taskPriority').value = '3';
    document.getElementById('taskCategory').value = 'Work';
    
    // Refresh tasks display
    displayTasks();
    
    alert('✅ Task created successfully!');
}

function displayTasks() {
    const container = document.getElementById('tasksList');
    
    if (!currentUser.tasks || currentUser.tasks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No tasks yet. Create your first task above!</p>';
        return;
    }
    
    container.innerHTML = '';
    
    currentUser.tasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';
        
        const priorityEmoji = task.priority === 5 ? '🔴' : task.priority === 3 ? '🟡' : '🟢';
        const date = new Date(task.date).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        
        taskDiv.innerHTML = `
            <div class="task-item-header">
                <div class="task-title">${priorityEmoji} ${task.title}</div>
                <div class="task-date">${date}</div>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                <span class="task-tag">⏱️ ${task.duration} min</span>
                <span class="task-tag">${task.category}</span>
                <span class="task-tag">Status: ${task.status}</span>
            </div>
        `;
        
        container.appendChild(taskDiv);
    });
}

// ========================
// PAGE NAVIGATION
// ========================

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    window.scrollTo(0, 0);
}

function switchToLogin(e) {
    if (e) e.preventDefault();
    showPage('loginPage');
}

function switchToSignup(e) {
    if (e) e.preventDefault();
    showPage('signupPage');
}

function switchToProfileSetup() {
    showPage('profileSetupPage');
}

function switchToScheduleSetup() {
    currentDay = 0;
    scheduleEntries = {};
    renderScheduleTabs();
    renderScheduleContent(0);
    showPage('scheduleSetupPage');
}

function switchToGoalsSetup() {
    document.getElementById('goalsContainer').innerHTML = '';
    goalEntries = [];
    addGoalEntry();
    addGoalEntry();
    addGoalEntry();
    showPage('goalsSetupPage');
}

function switchToDashboard() {
    if (!currentUser) {
        switchToLogin();
        return;
    }
    
    document.getElementById('dashboardUsername').textContent = currentUser.firstName;
    displayTasks();
    showPage('dashboardPage');
}

function switchToProfile() {
    if (!currentUser) {
        switchToLogin();
        return;
    }
    
    const profile = currentUser.profile || {};
    document.getElementById('profileUsername').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileBioDisplay').textContent = profile.bio || 'Not provided';
    document.getElementById('profileWorkHours').textContent = 
        `${profile.workStart || 9}:00 AM - ${profile.workEnd || 17}:00 PM`;
    document.getElementById('profileTimezoneDisplay').textContent = profile.timezone || 'UTC';
    
    showPage('profilePage');
}

function switchToSchedule() {
    if (!currentUser) {
        switchToLogin();
        return;
    }
    
    displaySchedule();
    showPage('schedulePage');
}

function displaySchedule() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const container = document.getElementById('scheduleDisplay');
    
    container.innerHTML = '';
    
    const schedule = currentUser.schedule || {};
    
    days.forEach((day, index) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-schedule';
        dayDiv.innerHTML = `<h3>${day}</h3>`;
        
        const activities = schedule[index] || [];
        
        if (activities.length === 0) {
            dayDiv.innerHTML += '<p style="color: var(--text-secondary);">No activities scheduled</p>';
        } else {
            activities.forEach(activity => {
                if (activity.name) {
                    dayDiv.innerHTML += `
                        <div class="activity-item">
                            <div class="activity-time">${activity.startTime}:00 - ${activity.endTime}:00</div>
                            <div class="activity-name">${activity.name}</div>
                            <div class="activity-category">${activity.category}</div>
                        </div>
                    `;
                }
            });
        }
        
        container.appendChild(dayDiv);
    });
}

function switchToGoals() {
    if (!currentUser) {
        switchToLogin();
        return;
    }
    
    displayGoals();
    showPage('goalsPage');
}

function displayGoals() {
    const container = document.getElementById('goalsDisplay');
    const goals = currentUser.goals || [];
    
    container.innerHTML = '';
    
    if (goals.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center; padding: 40px;">No goals yet. Set your goals to stay motivated!</p>';
        return;
    }
    
    goals.forEach(goal => {
        const goalDiv = document.createElement('div');
        goalDiv.className = 'goal-card';
        
        const targetDate = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        }) : 'No deadline';
        
        const priorityLabel = {
            1: 'Low',
            2: 'Medium',
            3: 'Medium',
            4: 'High',
            5: 'Critical'
        }[goal.priority] || 'Medium';
        
        goalDiv.innerHTML = `
            <h3>${goal.title}</h3>
            <p class="goal-description">${goal.description || 'No description'}</p>
            <div class="goal-meta">
                <span class="goal-date">📅 ${targetDate}</span>
                <span class="goal-priority">${priorityLabel}</span>
            </div>
        `;
        
        container.appendChild(goalDiv);
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        clearCurrentUser();
        switchToLogin();
    }
}

// ========================
// UTILITY FUNCTIONS
// ========================

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
}
