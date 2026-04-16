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
    const row = document.createElement('tr');
    row.dataset.id = task.id;
    row.className = deadlineClass(task);
    row.innerHTML = `
      <td><input type="checkbox" class="task-select" value="${task.id}"></td>
      <td>
        <strong>${task.title}</strong>
        <div class="energy-meter">${task.description || 'No description yet'}</div>
      </td>
      <td><span class="status-pill ${statusClass(task.status)}">${task.status.replace('_', ' ')}</span></td>
      <td>${Math.round(task.priority_score || 0)}</td>
      <td>${(task.tags || []).map((tag) => `<span class="chip">${tag}</span>`).join('')}</td>
      <td>${task.deadline || '—'}</td>
      <td>${task.scheduled_date || 'Unplanned'}</td>
      <td><span class="energy-meter">P${task.priority} • E${task.energy_level}</span></td>
      <td>
        <div class="action-row">
          <button class="link-btn" data-action="edit">Edit</button>
          <button class="link-btn" data-action="delete">Delete</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="edit"]').addEventListener('click', () => handlers.onEdit(task));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => handlers.onDelete(task));
    tbody.appendChild(row);
  });
}

export function getSelectedTaskIds() {
  return Array.from(document.querySelectorAll('.task-select:checked')).map((input) => Number(input.value));
}
