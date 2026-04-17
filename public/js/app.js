import { api, setAuthUser } from './api.js';
import { initTheme, toggleTheme } from './theme.js';
import { showToast } from './toast.js';
import { initModal } from './modal.js';
import { renderTable, getSelectedTaskIds } from './table.js';
import { renderKanban } from './kanban.js';
import { renderGantt } from './gantt.js';
import { renderAnalytics } from './analytics.js';
import { openTaskForm } from './taskForm.js';
import { selectTemplate } from './templates.js';
import { generateRecurringTasks, rescheduleMissedTasks } from './scheduler.js';
import { exportTasksCsv, printDashboard } from './export.js';
import { renderAdmin } from './admin.js';
import { initGanttControls } from './gantt.js';

const AUTH_KEY = 'tasksync-user';

const state = {
  user: null,
  tasks: [],
  filters: { search: '', status: 'ALL', date: '', recurrence: 'ALL' },
  analytics: { weekly: [], heatmap: [], stats: {} },
  admin: { overview: null, users: [] },
  busy: false,
  currentView: 'table'
};

function setBusy(value) {
  state.busy = value;
  document.querySelectorAll('#app-shell button').forEach((button) => {
    if (button.id !== 'theme-toggle') {
      button.disabled = value && !button.closest('#modal-root');
    }
  });
}

function saveAuthUser(user) {
  state.user = user;
  setAuthUser(user);
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

function applyAuthUi() {
  if (!state.user) {
    window.location.href = '/login.html';
    return;
  }

  const navAdmin = document.getElementById('nav-admin');
  if (navAdmin) {
    navAdmin.hidden = state.user.role !== 'ADMIN';
  }

  const nameNode = document.getElementById('current-user-name');
  if (nameNode) {
    nameNode.textContent = state.user.display_name || state.user.username || 'User';
  }

  const roleNode = document.getElementById('current-user-role');
  if (roleNode) {
    roleNode.textContent = state.user.role || '';
  }

  const appShell = document.getElementById('app-shell');
  if (appShell) appShell.hidden = false;
}

function filteredTasks() {
  const search = state.filters.search.trim().toLowerCase();
  return state.tasks.filter((task) => {
    const haystack = [task.title, task.description, (task.tags || []).join(',')].join(' ').toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesStatus = state.filters.status === 'ALL' || task.status === state.filters.status;
    const matchesDate = !state.filters.date || task.scheduled_date === state.filters.date || task.deadline === state.filters.date;
    const matchesRecurrence = state.filters.recurrence === 'ALL' || task.recurrence === state.filters.recurrence;
    return matchesSearch && matchesStatus && matchesDate && matchesRecurrence;
  });
}

function renderAll() {
  const tasks = filteredTasks();
  renderTable(tasks, {
    onEdit: (task) => openEditor(task),
    onDelete: (task) => deleteTask(task)
  });
  renderKanban(tasks, {
  onMove: (task, status) => changeStatus(task.id, status),
  onEdit: (task) => openEditor(task),
  onAdd:  (status) => openEditor({ status })
});
  renderGantt(tasks);
  renderAnalytics(state.analytics.stats, state.analytics.weekly, state.analytics.heatmap);
  if (state.user?.role === 'ADMIN' && state.admin.overview) {
    renderAdmin(state.admin.overview, state.admin.users);
  }
}

async function refreshData() {
  const requests = [
    api.getTasks({}),
    api.getWeeklyAnalytics(),
    api.getHeatmapAnalytics(),
    api.getStatsAnalytics()
  ];

  if (state.user?.role === 'ADMIN') {
    requests.push(api.adminOverview(), api.adminUsers());
  }

  const results = await Promise.all(requests);
  state.tasks = results[0];
  state.analytics = { weekly: results[1], heatmap: results[2], stats: results[3] };

  if (state.user?.role === 'ADMIN') {
    state.admin = { overview: results[4], users: results[5] };
  } else {
    state.admin = { overview: null, users: [] };
  }

  renderAll();
}

async function runAction(work, successMessage) {
  if (state.busy) {
    return;
  }
  setBusy(true);
  try {
    const result = await work();
    if (successMessage) {
      showToast(successMessage, 'success');
    }
    await refreshData();
    return result;
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Something went wrong', 'error');
    throw error;
  } finally {
    setBusy(false);
  }
}

function openEditor(task = null) {
  openTaskForm({
    task,
    onSubmit: (payload) => runAction(
      () => task ? api.updateTask(task.id, payload) : api.createTask(payload),
      task ? 'Task updated' : 'Task created'
    )
  });
}

async function deleteTask(task) {
  if (!window.confirm(`Delete "${task.title}"?`)) {
    return;
  }
  await runAction(() => api.deleteTask(task.id), 'Task deleted');
}

async function changeStatus(taskId, status) {
  await runAction(() => api.updateStatus(taskId, status), `Moved task to ${status.replace('_', ' ')}`);
}

async function bulkMark(ids, status) {
  if (!ids.length) {
    showToast('Select at least one task first', 'error');
    return;
  }
  await runAction(
    () => Promise.all(ids.map((id) => status === 'DONE' ? api.completeTask(id) : api.incompleteTask(id))),
    `Updated ${ids.length} task${ids.length > 1 ? 's' : ''}`
  );
}

function switchView(name) {
  state.currentView = name;
  let targetSection = name;
  
  // If viewing daily/weekly/monthly in the same table layout
  if (['daily', 'weekly', 'monthly'].includes(name)) {
    targetSection = 'table';
    state.filters.recurrence = name.toUpperCase();
  } else {
    state.filters.recurrence = 'ALL';
  }

  document.querySelectorAll('.nav-btn').forEach((item) => item.classList.remove('active'));
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  
  const nav = document.getElementById(`nav-${name}`);
  if (nav) nav.classList.add('active');
  
  const view = document.getElementById(`view-${targetSection}`);
  if (view) view.classList.add('active');
  
  renderAll(); // Re-render table if filters changed
}

function initViewSwitching() {
  // Navigation now uses actual <a> tags, so we let the browser handle target="_blank".
  // Only intercept if they don't have target="_blank"
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      if (button.id === 'nav-admin' && state.user?.role !== 'ADMIN') return;
      if (button.target === '_blank') return; // Let browser open new tab
      
      e.preventDefault(); // Prevent full page reload for same-tab navigation
      const viewName = button.id.replace('nav-', '');
      // Update URL without reload
      window.history.pushState({}, '', `/?view=${viewName}`);
      switchView(viewName);
    });
  });
}

function initFilters() {
  document.getElementById('search-input').addEventListener('input', (event) => {
    state.filters.search = event.target.value;
    renderAll();
  });
  document.getElementById('status-filter').addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderAll();
  });
  document.getElementById('date-filter').addEventListener('change', (event) => {
    state.filters.date = event.target.value;
    renderAll();
  });
  document.getElementById('search-clear').addEventListener('click', () => {
    state.filters = { search: '', status: 'ALL', date: '' };
    document.getElementById('search-input').value = '';
    document.getElementById('status-filter').value = 'ALL';
    document.getElementById('date-filter').value = '';
    renderAll();
  });
}

function initActions() {
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('btn-logout').addEventListener('click', () => {
    saveAuthUser(null);
    window.location.href = '/login.html';
  });
  document.getElementById('btn-new-task').addEventListener('click', () => openEditor());
  document.getElementById('btn-mark-complete').addEventListener('click', () => bulkMark(getSelectedTaskIds(), 'DONE'));
  document.getElementById('btn-mark-incomplete').addEventListener('click', () => bulkMark(getSelectedTaskIds(), 'TODO'));
  document.getElementById('btn-export-csv').addEventListener('click', () => exportTasksCsv(filteredTasks()));
  document.getElementById('btn-export-pdf').addEventListener('click', printDashboard);
  document.getElementById('btn-generate-recurring').addEventListener('click', async () => {
    const result = await runAction(() => generateRecurringTasks(), null);
    showToast(`Generated ${result.created} recurring task${result.created === 1 ? '' : 's'}`, 'success');
  });
  document.getElementById('btn-reschedule').addEventListener('click', async () => {
    const result = await runAction(() => rescheduleMissedTasks([]), null);
    showToast(`Rescheduled ${result.rescheduled} task${result.rescheduled === 1 ? '' : 's'}`, 'success');
  });
  document.getElementById('btn-from-template').addEventListener('click', async () => {
    try {
      const templates = await api.getTemplates();
      const selected = selectTemplate(templates);
      if (!selected) {
        return;
      }
      await runAction(() => api.createFromTemplate(selected.id), 'Task created from template');
    } catch (error) {
      showToast(error.message || 'Could not load templates', 'error');
    }
  });
  document.getElementById('csv-file-input').addEventListener('change', async (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Please choose a CSV file.', 'error');
      return;
    }
    const result = await runAction(() => api.importCsv(file), null);
    const detail = result.errors?.length ? ` Imported ${result.imported}, skipped ${result.skipped}.` : ` Imported ${result.imported}.`;
    showToast(`CSV import complete.${detail}`, result.errors?.length ? 'error' : 'success');
    if (result.errors?.length) {
      window.alert(`Import finished with notes:\n\n${result.errors.join('\n')}`);
    }
  });
  document.getElementById('select-all').addEventListener('change', (event) => {
    document.querySelectorAll('.task-select').forEach((input) => {
      input.checked = event.target.checked;
    });
  });
  
  // Profile settings logic
  document.getElementById('btn-profile').addEventListener('click', () => {
    window.history.pushState({}, '', '/?view=profile');
    switchView('profile');
  });

  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      display_name: document.getElementById('profile-display-name').value,
      recommendation_setting: document.getElementById('profile-recommendation').checked
    };
    await runAction(() => api.updateSettings(payload), 'Profile updated');
  });
}


async function restoreAuth() {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) {
    return;
  }

  try {
    const user = JSON.parse(stored);
    saveAuthUser(user);
    const me = await api.me();
    saveAuthUser(me.user);
  } catch {
    saveAuthUser(null);
  }
}

async function boot() {
  initTheme();
  initModal();
  initViewSwitching();
  initFilters();
  initActions();
  initGanttControls(() => filteredTasks());

  // Restore user properly
  await restoreAuth();

  // 🚨 If not logged in → redirect immediately
  if (!state.user) {
    window.location.href = '/login.html';
    return;
  }

  applyAuthUi();

  // Populate profile form
  if (state.user) {
    const pName = document.getElementById('profile-display-name');
    const pRec = document.getElementById('profile-recommendation');
    if (pName) pName.value = state.user.display_name || '';
    if (pRec) pRec.checked = !!state.user.recommendation_setting;
  }

  // Handle URL query parameter view
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get('view') || 'table';
  switchView(requestedView);

  setBusy(true);
  try {
    await refreshData();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Failed to load TaskSync', 'error');
  } finally {
    setBusy(false);
  }
}

boot();
