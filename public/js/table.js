import { api } from './api.js';
import { refreshData } from './app.js';
import { enterFocusMode } from './focusMode.js';
import { startPomodoroForTask } from './pomodoro.js';

function statusClass(status) {
  return status === 'DONE' ? 'done' : status === 'IN_PROGRESS' ? 'in-progress' : 'todo';
}

function deadlineClass(task) {
  if (!task.deadline || task.status === 'DONE') {
    return '';
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);
  const days = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
  if (days < 0) return 'row-overdue';
  if (days <= 2) return 'row-deadline-soon';
  return '';
}

function renderSubtaskProgress(task) {
  if (!task.subtasks) return '';
  let subtasks = [];
  try {
    subtasks = typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : task.subtasks;
  } catch(e) {}
  if (!subtasks || subtasks.length === 0) return '';
  
  const checked = subtasks.filter(s => s.checked).length;
  const total = subtasks.length;
  const pct = Math.round((checked / total) * 100);
  
  return `
    <div class="subtask-progress-container">
      <div class="subtask-text">${checked}/${total} subtasks</div>
      <div class="subtask-progress">
        <div class="subtask-progress-fill" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}

export function renderTable(tasks, handlers) {
  const tbody = document.querySelector('#task-table tbody');
  tbody.innerHTML = '';

  if (!tasks.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="9"><div class="empty-state">No tasks match the current filters.</div></td>';
    tbody.appendChild(row);
    return;
  }

  tasks.forEach((task) => {
    let tagsArray = [];
    if (Array.isArray(task.tags)) tagsArray = task.tags;
    else if (typeof task.tags === 'string') tagsArray = task.tags.split(',').map(t => t.trim()).filter(Boolean);

    const row = document.createElement('tr');
    row.dataset.id = task.id;
    row.className = deadlineClass(task);
    
    let recurBadge = '';
    if (task.recurrence && task.recurrence !== 'NONE') {
      recurBadge = `<span class="recur-badge">&#8635; ${task.recurrence.toLowerCase()}</span>`;
    }

    row.innerHTML = `
      <td><input type="checkbox" class="task-select" value="${task.id}"></td>
      <td class="col-title editable-title" title="Double click to quick-edit">
        <div style="display:flex; align-items:center; gap: 8px;">
          <strong class="task-title-text">${task.title}</strong>
          ${recurBadge}
        </div>
        <div class="energy-meter">${task.description || 'No description yet'}</div>
        ${renderSubtaskProgress(task)}
      </td>
      <td><span class="status-pill ${statusClass(task.status)}">${task.status.replace('_', ' ')}</span></td>
      <td>${Math.round(task.priority_score || 0)}</td>
      <td>${tagsArray.map((tag) => `<span class="chip">${tag}</span>`).join('')}</td>
      <td>${task.deadline || '-'}</td>
      <td>${task.scheduled_date || 'Unplanned'}</td>
      <td><span class="energy-meter">P${task.priority}   E${task.energy_level}</span></td>
      <td>
        <div class="action-row">
          <button class="link-btn" data-action="focus" title="Focus Mode">Focus</button>
          <button class="link-btn" data-action="pomodoro" title="Pomodoro Timer">Timer</button>
          <button class="link-btn" data-action="edit">Edit</button>
          <button class="link-btn" data-action="duplicate">Copy</button>
          <button class="link-btn" data-action="delete">Delete</button>
        </div>
      </td>
    `;
    
    // Quick Edit Logic
    const titleCell = row.querySelector('.editable-title');
    const titleText = row.querySelector('.task-title-text');
    titleCell.addEventListener('dblclick', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = task.title;
      input.className = 'quick-edit-input';
      input.style.width = '100%';
      input.style.padding = '4px';
      
      const finishEdit = async () => {
        const newVal = input.value.trim();
        if (newVal && newVal !== task.title) {
          titleText.innerText = newVal;
          try {
            await api.updateTask(task.id, { ...task, title: newVal });
            refreshData(); 
          } catch(e) {
            titleText.innerText = task.title;
          }
        } else {
          titleCell.replaceChild(titleText, input);
        }
      };
      
      input.addEventListener('blur', finishEdit);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          input.blur();
        } else if (e.key === 'Escape') {
          input.value = task.title;
          input.blur();
        }
      });
      
      titleCell.replaceChild(input, titleText);
      input.focus();
    });

    row.querySelector('[data-action="focus"]').addEventListener('click', () => enterFocusMode(task));
    row.querySelector('[data-action="pomodoro"]').addEventListener('click', () => startPomodoroForTask(task.id, task.title));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => handlers.onEdit(task));
    if(handlers.onDuplicate) row.querySelector('[data-action="duplicate"]').addEventListener('click', () => handlers.onDuplicate(task));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => handlers.onDelete(task));
    tbody.appendChild(row);
  });
}

export function getSelectedTaskIds() {
  return Array.from(document.querySelectorAll('.task-select:checked')).map((input) => Number(input.value));
}
