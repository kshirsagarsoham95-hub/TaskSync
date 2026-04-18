import { api } from './api.js';
import { showToast } from './toast.js';
import { openModal, closeModal } from './modal.js';

export function renderAdmin(overview, users) {
  const root = document.getElementById('admin-root');
  
  const statsHtml = `
    <article class="card stat-card">
      <div class="stat-icon">&#128101;</div>
      <h3>Total Users</h3>
      <div class="stat-value">${overview.totalUsers}</div>
    </article>
    <article class="card stat-card">
      <div class="stat-icon">&#128203;</div>
      <h3>Total Tasks</h3>
      <div class="stat-value">${overview.totalTasks}</div>
    </article>
    <article class="card stat-card">
      <div class="stat-icon">&#9881;</div>
      <h3>Open Tasks</h3>
      <div class="stat-value">${overview.openTasks}</div>
    </article>
    <article class="card stat-card">
      <div class="stat-icon">&#10003;</div>
      <h3>Done Tasks</h3>
      <div class="stat-value">${overview.doneTasks}</div>
    </article>
  `;

  let usersRows = users.map(u => `
    <tr>
      <td>${u.username}</td>
      <td>${u.display_name}</td>
      <td>${u.role}</td>
      <td>${new Date(u.created_at).toLocaleDateString()}</td>
      <td>
        <button class="ghost-btn btn-del-user" data-id="${u.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  const usersHtml = `
    <div class="card" style="grid-column: 1 / -1; margin-top: 20px;">
      <div class="section-heading" style="padding: 20px; border-bottom: 1px solid var(--line);">
        <h2>User Management</h2>
        <button id="btn-create-user" class="primary-btn">Create User</button>
      </div>
      <div class="table-wrapper">
        <table id="admin-users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Display Name</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${usersRows}</tbody>
        </table>
      </div>
    </div>
  `;

  root.innerHTML = statsHtml + usersHtml;

  document.getElementById('btn-create-user').onclick = showCreateUserModal;
  
  root.querySelectorAll('.btn-del-user').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete user?')) return;
      try {
        await api.adminDeleteUser(btn.dataset.id);
        showToast('User deleted', 'success');
        document.getElementById('nav-admin').click();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });
}

function showCreateUserModal() {
  const content = `
    <form id="create-user-form" class="task-form">
      <h2>Create User</h2>
      <div class="form-grid">
        <label class="full-width">
          <span>Username</span>
          <input type="text" name="username" required>
        </label>
        <label class="full-width">
          <span>Password</span>
          <input type="password" name="password" required minlength="6">
        </label>
        <label class="full-width">
          <span>Display Name</span>
          <input type="text" name="display_name">
        </label>
        <label class="full-width">
          <span>Role</span>
          <select name="role">
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
      </div>
      <div class="form-actions">
        <button type="button" class="ghost-btn" data-modal-close>Cancel</button>
        <button type="submit" class="primary-btn">Create User</button>
      </div>
    </form>
  `;
  
  openModal(content);
  
  document.getElementById('create-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    try {
      await api.adminCreateUser(payload);
      showToast('User created', 'success');
      closeModal();
      document.getElementById('nav-admin').click();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}
