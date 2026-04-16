function ensureAdminShell() {
  const root = document.getElementById('admin-root');
  if (!root) {
    return null;
  }

  if (!root.children.length) {
    root.innerHTML = `
      <article class="card stat-card">
        <h3>Total Users</h3>
        <div id="admin-total-users" class="stat-value">0</div>
        <p>Accounts with access to TaskSync</p>
      </article>
      <article class="card stat-card">
        <h3>Total Tasks</h3>
        <div id="admin-total-tasks" class="stat-value">0</div>
        <p id="admin-open-tasks">0 open tasks, 0 done tasks</p>
      </article>
      <article class="card chart-card">
        <h3>Status Breakdown</h3>
        <div id="admin-status-breakdown" class="empty-state">No status data yet.</div>
      </article>
      <article class="card chart-card">
        <h3>Users</h3>
        <div id="admin-user-list" class="empty-state">No users found.</div>
      </article>
    `;
  }

  return root;
}

export function renderAdmin(overview, users) {
  if (!ensureAdminShell()) {
    return;
  }
  document.getElementById('admin-total-users').textContent = overview.totalUsers ?? 0;
  document.getElementById('admin-total-tasks').textContent = overview.totalTasks ?? 0;
  document.getElementById('admin-open-tasks').textContent = `${overview.openTasks ?? 0} open tasks, ${overview.doneTasks ?? 0} done tasks`;

  const breakdownNode = document.getElementById('admin-status-breakdown');
  breakdownNode.classList.remove('empty-state');
  breakdownNode.innerHTML = (overview.statusBreakdown || []).map((item) => `
    <div class="admin-list-row">
      <strong>${item.status.replace('_', ' ')}</strong>
      <span>${item.count}</span>
    </div>
  `).join('') || '<div class="empty-state">No status data yet.</div>';

  const usersNode = document.getElementById('admin-user-list');
  usersNode.classList.remove('empty-state');
  usersNode.innerHTML = (users || []).map((user) => `
    <div class="admin-list-row">
      <div>
        <strong>${user.display_name}</strong>
        <div class="energy-meter">${user.username}</div>
      </div>
      <span class="chip">${user.role}</span>
    </div>
  `).join('') || '<div class="empty-state">No users found.</div>';
}
