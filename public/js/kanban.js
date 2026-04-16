const STATUS_LABELS = {
  TODO:        'To Do',
  IN_PROGRESS: 'In Progress',
  DONE:        'Done'
};

function deadlineBadge(task) {
  if (!task.deadline || task.status === 'DONE') return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl    = new Date(task.deadline);
  dl.setHours(0, 0, 0, 0);
  const days  = Math.ceil((dl - today) / 86_400_000);
  if (days < 0)  return `<span class="kbadge kbadge-overdue">&#9888; Overdue</span>`;
  if (days === 0) return `<span class="kbadge kbadge-today">Due today</span>`;
  if (days <= 2)  return `<span class="kbadge kbadge-soon">Due in ${days}d</span>`;
  return `<span class="kbadge kbadge-ok">${task.deadline}</span>`;
}

function priorityBar(priority) {
  const filled = Math.max(1, Math.min(5, priority));
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="pbar-dot ${i < filled ? 'pbar-filled' : ''}"></span>`
  ).join('');
}

function tagChips(tags = []) {
  if (!tags.length) return '';
  return tags.slice(0, 3).map(t => `<span class="chip">${t}</span>`).join('') +
    (tags.length > 3 ? `<span class="chip">+${tags.length - 3}</span>` : '');
}

function buildCard(task, handlers) {
  const card = document.createElement('article');
  card.className = 'kanban-card';
  card.draggable  = true;
  card.dataset.id = task.id;

  card.innerHTML = `
    <div class="kcard-top">
      <h3 class="kcard-title">${task.title}</h3>
      <button class="kcard-edit icon-btn" title="Edit task">&#9998;</button>
    </div>
    ${task.description
      ? `<p class="kcard-desc">${task.description}</p>`
      : ''}
    <div class="kcard-tags">${tagChips(task.tags)}</div>
    <div class="kcard-footer">
      <div class="kcard-meta">
        <span class="pbar" title="Priority ${task.priority}">${priorityBar(task.priority)}</span>
        <span class="kcard-min">&#9200; ${task.estimated_minutes}m</span>
      </div>
      ${deadlineBadge(task)}
    </div>
    <select class="kcard-status-select" aria-label="Change status">
      ${Object.entries(STATUS_LABELS).map(([val, lbl]) =>
        `<option value="${val}" ${task.status === val ? 'selected' : ''}>${lbl}</option>`
      ).join('')}
    </select>
  `;

  card.querySelector('.kcard-edit').addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onEdit?.(task);
  });

  card.querySelector('.kcard-status-select').addEventListener('change', (e) => {
    handlers.onMove(task, e.target.value);
  });

  card.addEventListener('dragstart', (e) => {
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));

  return card;
}

function wireDropzone(column, status, tasks, handlers) {
  column.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    column.classList.add('drag-over');
  });
  column.addEventListener('dragleave', (e) => {
    if (!column.contains(e.relatedTarget)) column.classList.remove('drag-over');
  });
  column.addEventListener('drop', (e) => {
    e.preventDefault();
    column.classList.remove('drag-over');
    const id   = Number(e.dataTransfer.getData('text/plain'));
    const task = tasks.find(t => t.id === id);
    if (task && task.status !== status) handlers.onMove(task, status);
  });
}

export function renderKanban(tasks, handlers) {
  const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];

  statuses.forEach((status) => {
    const list  = document.querySelector(`[data-dropzone="${status}"]`);
    const count = document.querySelector(`[data-count="${status}"]`);
    if (!list) return;

    list.innerHTML = '';
    const filtered = tasks.filter(t => t.status === status);
    if (count) count.textContent = String(filtered.length);

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'kanban-empty';
      empty.textContent = 'No tasks here';
      list.appendChild(empty);
    } else {
      filtered.forEach(task => list.appendChild(buildCard(task, handlers)));
    }

    wireDropzone(list, status, tasks, handlers);
  });

  // Wire "+ Add task" buttons in each column
  document.querySelectorAll('.kanban-add-btn').forEach((btn) => {
    // remove old listeners by cloning
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener('click', () => {
      const status = fresh.dataset.add;
      handlers.onAdd?.(status);
    });
  });
}