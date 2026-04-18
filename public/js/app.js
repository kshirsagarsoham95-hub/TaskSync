import { api, setAuthUser } from './api.js';
import { initTheme, toggleTheme } from './theme.js';
import { showToast } from './toast.js';
import { initModal } from './modal.js';
import { renderTable, getSelectedTaskIds } from './table.js';
import { renderKanban } from './kanban.js';
import { renderGantt, initGanttControls } from './gantt.js';
import { renderAnalytics } from './analytics.js';
import { openTaskForm } from './taskForm.js';
import { selectTemplate } from './templates.js';
import { generateRecurringTasks, rescheduleMissedTasks } from './scheduler.js';
import { exportTasksCsv, printDashboard } from './export.js';
import { renderAdmin } from './admin.js';
import { renderProfile } from './profile.js';
import { initAiPanel } from './ai.js';
import { initShortcuts } from './shortcuts.js';
import { initPomodoro } from './pomodoro.js';
import { initNotifications, checkDueToday } from './notifications.js';
import { checkOnboarding } from './onboarding.js';

const AUTH_KEY = 'tasksync-user';

export const state = {
  user: null,
  tasks: [],
  filters: { 
    search: '', status: 'ALL', date: '', recurrence: 'ALL',
    tags: [], minPriority: 1, maxPriority: 5, energyLevel: '',
    dateFrom: '', dateTo: '' 
  },
  analytics: { weekly: [], heatmap: [], stats: {} },
  admin: { overview: null, users: [] },
  busy: false,
  currentView: 'table',
  lastDeleted: null
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
  if (navAdmin) navAdmin.hidden = state.user.role !== 'ADMIN';

  const navProfile = document.getElementById('nav-profile');
  if (navProfile) navProfile.hidden = false;

  const nameNode = document.getElementById('current-user-name');
  if (nameNode) nameNode.textContent = state.user.display_name || state.user.username || 'User';

  const roleNode = document.getElementById('current-user-role');
  if (roleNode) roleNode.textContent = state.user.role || '';

  const appShell = document.getElementById('app-shell');
  if (appShell) appShell.hidden = false;
}

function filteredTasks() {
  const search = state.filters.search.trim().toLowerCase();
  return state.tasks.filter((task) => {
    let tagsStr = '';
    if (Array.isArray(task.tags)) tagsStr = task.tags.join(',');
    else if (typeof task.tags === 'string') tagsStr = task.tags;
    const haystack = [task.title, task.description, tagsStr].join(' ').toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesStatus = state.filters.status === 'ALL' || task.status === state.filters.status;
    const matchesDate = !state.filters.date || task.scheduled_date === state.filters.date || task.deadline === state.filters.date;
    const matchesRecurrence = state.filters.recurrence === 'ALL' || task.recurrence === state.filters.recurrence;
    
    // Advanced Filters
    const matchesTags = state.filters.tags.length === 0 || state.filters.tags.some(tag => (task.tags||'').includes(tag));
    const matchesPriority = task.priority >= state.filters.minPriority && task.priority <= state.filters.maxPriority;
    const matchesEnergy = !state.filters.energyLevel || task.energy_level === Number(state.filters.energyLevel);
    const matchesDateFrom = !state.filters.dateFrom || (task.scheduled_date && task.scheduled_date >= state.filters.dateFrom);
    const matchesDateTo = !state.filters.dateTo || (task.scheduled_date && task.scheduled_date <= state.filters.dateTo);

    return matchesSearch && matchesStatus && matchesDate && matchesRecurrence && matchesTags && matchesPriority && matchesEnergy && matchesDateFrom && matchesDateTo;
  });
}

function initTagFilterBar() {
  const bar = document.getElementById('tag-filter-bar');
  if (!bar) return;
  const allTags = new Set();
  state.tasks.forEach(t => {
    if (Array.isArray(t.tags)) {
      t.tags.forEach(tag => allTags.add(tag.trim()));
    } else if (typeof t.tags === 'string') {
      t.tags.split(',').forEach(tag => allTags.add(tag.trim()));
    }
  });
  bar.innerHTML = '';
  [...allTags].filter(Boolean).sort().forEach(tag => {
    const btn = document.createElement('button');
    btn.className = `tag-filter-chip ${state.filters.tags.includes(tag) ? 'active' : ''}`;
    btn.innerText = tag;
    btn.onclick = () => {
      if (state.filters.tags.includes(tag)) {
        state.filters.tags = state.filters.tags.filter(t => t !== tag);
      } else {
        state.filters.tags.push(tag);
      }
      btn.classList.toggle('active');
      renderAll();
    };
    bar.appendChild(btn);
  });
}

function renderAll() {
  const tasks = filteredTasks();
  initTagFilterBar();
  renderTable(tasks, {
    onEdit: (task) => openEditor(task),
    onDelete: (task) => deleteTask(task),
    onDuplicate: (task) => runAction(() => api.duplicateTask(task.id), 'Task duplicated')
  });
  renderKanban(tasks, {
    onMove: (task, status) => changeStatus(task.id, status),
    onEdit: (task) => openEditor(task),
    onAdd:  (status) => openEditor({ status }),
    onDuplicate: (task) => runAction(() => api.duplicateTask(task.id), 'Task duplicated')
  });
  renderGantt(tasks);
  renderAnalytics(state.analytics.stats, state.analytics.weekly, state.analytics.heatmap);
  
  if (state.user?.role === 'ADMIN' && state.admin.overview) {
    renderAdmin(state.admin.overview, state.admin.users);
  }
  if (state.currentView === 'settings' && state.user) {
    renderProfile(state.user, saveAuthUser);
  }
}

export async function refreshData() {
  const requests = [
    api.getTasks({}),
    api.getWeeklyAnalytics(),
    api.getHeatmapAnalytics(),
    api.getStatsAnalytics(),
    api.getPriorityDistribution()
  ];

  if (state.user?.role === 'ADMIN') {
    requests.push(api.adminOverview(), api.adminUsers());
  }

  const results = await Promise.all(requests);
  state.tasks = results[0];
  state.analytics = { weekly: results[1], heatmap: results[2], stats: results[3], priority: results[4] };

  if (state.user?.role === 'ADMIN') {
    state.admin = { overview: results[5], users: results[6] };
  } else {
    state.admin = { overview: null, users: [] };
  }

  checkDueToday(state.tasks);
  renderAll();
}

async function runAction(work, successMessage) {
  if (state.busy) return;
  setBusy(true);
  try {
    const result = await work();
    if (successMessage) showToast(successMessage, 'success');
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
  if (!window.confirm(`Delete "${task.title}"?`)) return;
  
  // Store for undo
  const fullTask = await api.getTask(task.id);
  state.lastDeleted = fullTask;

  await runAction(() => api.deleteTask(task.id), null);
  
  showToast('Task deleted', 'info', {
    undoLabel: 'Undo',
    undoCallback: async () => {
      if (!state.lastDeleted) return;
      const { subtasks, attachments, ...payload } = state.lastDeleted;
      delete payload.id;
      const restored = await api.createTask(payload);
      // Restore subtasks & attachments via API if those routes existed,
      // but without bulk subtask create we just restore the main task for now.
      await refreshData();
      showToast('Task restored', 'success');
      state.lastDeleted = null;
    }
  });
}

async function changeStatus(taskId, status) {
  await runAction(() => api.updateStatus(taskId, status), `Moved task to ${status.replace('_', ' ')}`);
}

async function bulkMark(ids, status) {
  if (!ids.length) { showToast('Select at least one task first', 'error'); return; }
  await runAction(
    () => Promise.all(ids.map((id) => status === 'DONE' ? api.completeTask(id) : api.incompleteTask(id))),
    `Updated ${ids.length} task${ids.length > 1 ? 's' : ''}`
  );
}

function switchView(name) {
  state.currentView = name;
  let targetSection = name;
  
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
  
  renderAll();
}

function initViewSwitching() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      if (button.id === 'nav-admin' && state.user?.role !== 'ADMIN') return;
      if (button.target === '_blank') return;
      e.preventDefault();
      const viewName = button.id.replace('nav-', '');
      window.history.pushState({}, '', `/?view=${viewName}`);
      if (viewName !== 'admin') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('hidden')) {
          sidebar.classList.add('hidden');
        }
      }
      switchView(viewName);
    });
  });
  
  document.getElementById('btn-go-password')?.addEventListener('click', () => {
    window.history.pushState({}, '', '/?view=password');
    switchView('password');
  });
  document.getElementById('btn-back-settings')?.addEventListener('click', () => {
    window.history.pushState({}, '', '/?view=settings');
    switchView('settings');
  });
  document.getElementById('btn-profile')?.addEventListener('click', () => {
    window.history.pushState({}, '', '/?view=settings');
    switchView('settings');
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function initFilters() {
  document.getElementById('search-input').addEventListener('input', debounce((event) => {
    state.filters.search = event.target.value;
    renderAll();
  }, 250));
  
  document.getElementById('status-filter').addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderAll();
  });
  
  document.getElementById('date-filter').addEventListener('change', (event) => {
    state.filters.date = event.target.value;
    renderAll();
  });
  
  document.getElementById('search-clear').addEventListener('click', () => {
    state.filters = { search: '', status: 'ALL', date: '', recurrence: 'ALL', tags: [], minPriority: 1, maxPriority: 5, energyLevel: '', dateFrom: '', dateTo: '' };
    document.getElementById('search-input').value = '';
    document.getElementById('status-filter').value = 'ALL';
    document.getElementById('date-filter').value = '';
    document.getElementById('filter-min-priority').value = '1';
    document.getElementById('filter-max-priority').value = '5';
    document.getElementById('filter-energy').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    renderAll();
  });

  document.getElementById('filter-min-priority').addEventListener('input', e => { state.filters.minPriority = Number(e.target.value); renderAll(); });
  document.getElementById('filter-max-priority').addEventListener('input', e => { state.filters.maxPriority = Number(e.target.value); renderAll(); });
  document.getElementById('filter-energy').addEventListener('change', e => { state.filters.energyLevel = e.target.value; renderAll(); });
  document.getElementById('filter-date-from').addEventListener('change', e => { state.filters.dateFrom = e.target.value; renderAll(); });
  document.getElementById('filter-date-to').addEventListener('change', e => { state.filters.dateTo = e.target.value; renderAll(); });
  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    document.getElementById('search-clear').click();
  });
}

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('btn-sidebar-toggle');
  const closeBtn = document.getElementById('btn-sidebar-close');
  
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('hidden');
    });
  }
  
  if (closeBtn && sidebar) {
    closeBtn.addEventListener('click', () => {
      sidebar.classList.add('hidden');
    });
  }

  // Close sidebar if clicked outside
  document.addEventListener('click', (e) => {
    if (sidebar && !sidebar.classList.contains('hidden') && 
        !sidebar.contains(e.target) && 
        e.target !== toggleBtn && 
        !toggleBtn.contains(e.target)) {
      sidebar.classList.add('hidden');
    }
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
  
  document.getElementById('btn-bulk-delete').addEventListener('click', async () => {
    const ids = getSelectedTaskIds();
    if (!ids.length) { showToast('Select at least one task', 'error'); return; }
    if (!confirm(`Delete ${ids.length} task(s)?`)) return;
    await runAction(() => api.bulkDelete(ids), `Deleted ${ids.length} task(s)`);
  });

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
      if (!selected) return;
      await runAction(() => api.createFromTemplate(selected.id), 'Task created from template');
    } catch (error) {
      showToast(error.message || 'Could not load templates', 'error');
    }
  });
  document.getElementById('csv-file-input').addEventListener('change', async (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { showToast('Please choose a CSV file.', 'error'); return; }
    const result = await runAction(() => api.importCsv(file), null);
    const detail = result.errors?.length ? ` Imported ${result.imported}, skipped ${result.skipped}.` : ` Imported ${result.imported}.`;
    showToast(`CSV import complete.${detail}`, result.errors?.length ? 'error' : 'success');
    if (result.errors?.length) window.alert(`Import finished with notes:\n\n${result.errors.join('\n')}`);
  });
  document.getElementById('select-all').addEventListener('change', (event) => {
    document.querySelectorAll('.task-select').forEach((input) => input.checked = event.target.checked);
  });
}

async function restoreAuth() {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return;
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
  
  initSidebar();
  initAiPanel();
  initPomodoro();
  initNotifications();
  initShortcuts({
    onNewTask: () => openEditor(),
    onSearch: () => document.getElementById('search-input').focus(),
    onCloseModal: () => document.querySelector('.modal-close')?.click(),
    onSwitchView: (view) => {
      document.getElementById('nav-' + view)?.click();
    },
    onHelp: () => alert('Shortcuts:\nN - New Task\n/ - Search\nEscape - Close\nK - Kanban\nT - Table\nG - Gantt\nA - Analytics')
  });

  await restoreAuth();

  if (!state.user) {
    window.location.href = '/login.html';
    return;
  }

  applyAuthUi();

  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get('view') || 'table';
  switchView(requestedView);

  setBusy(true);
  try {
    await refreshData();
    checkOnboarding();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Failed to load TaskSync', 'error');
  } finally {
    setBusy(false);
  }
}

boot();
