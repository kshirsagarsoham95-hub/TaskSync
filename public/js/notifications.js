const firedIds = new Set();

export function initNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

export function checkDueToday(tasks) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  const today = new Date().toISOString().slice(0, 10);
  
  tasks.forEach(task => {
    if (task.status !== 'DONE' && task.deadline && task.deadline <= today) {
      if (!firedIds.has(task.id)) {
        firedIds.add(task.id);
        const title = task.deadline < today ? 'Overdue Task!' : 'Task Due Today';
        new Notification(title, {
          body: task.title,
          icon: '/icon-192.png'
        });
      }
    }
  });
}

export class NotificationSystem {
  constructor() {
    this.badge = document.getElementById('notification-badge');
    this.btn = document.getElementById('btn-notifications');
    this.dropdown = document.getElementById('notification-dropdown');
    this.list = document.getElementById('notification-list');
    this.btnMarkAll = document.getElementById('btn-mark-all-read');

    this.notifications = [];
    this.pollInterval = null;

    if (this.btn) {
      this.btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });
      document.addEventListener('click', (e) => {
        if (this.dropdown && !this.dropdown.contains(e.target) && !this.btn.contains(e.target)) {
          this.dropdown.style.display = 'none';
        }
      });
    }

    if (this.btnMarkAll) {
      this.btnMarkAll.addEventListener('click', () => this.markAllAsRead());
    }
  }

  async init() {
    const token = localStorage.getItem('token');
    if (!token) return;

    await this.fetchNotifications();
    this.startPolling();
  }

  startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.fetchNotifications(), 30000); // 30s
  }

  stopPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  async fetchNotifications() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      
      this.notifications = await res.json();
      this.render();
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }

  async markAsRead(id) {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      this.notifications = this.notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n);
      this.render();
    } catch (e) {
      console.error(e);
    }
  }

  async markAllAsRead() {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      this.notifications = this.notifications.map(n => ({ ...n, is_read: 1 }));
      this.render();
    } catch (e) {
      console.error(e);
    }
  }

  toggleDropdown() {
    if (this.dropdown.style.display === 'none') {
      this.dropdown.style.display = 'block';
      this.fetchNotifications(); // Refresh when opening
    } else {
      this.dropdown.style.display = 'none';
    }
  }

  render() {
    if (!this.list) return;
    
    const unreadCount = this.notifications.filter(n => !n.is_read).length;
    if (unreadCount > 0) {
      this.badge.textContent = unreadCount;
      this.badge.style.display = 'block';
    } else {
      this.badge.style.display = 'none';
    }

    if (this.notifications.length === 0) {
      this.list.innerHTML = `<div style="text-align: center; color: var(--muted); padding: 10px;">No notifications</div>`;
      return;
    }

    this.list.innerHTML = this.notifications.map(n => `
      <div class="notification-item ${n.is_read ? 'read' : 'unread'}" style="padding: 10px; border-radius: 6px; background: ${n.is_read ? 'transparent' : 'var(--bg-elevated)'}; cursor: pointer; display: flex; align-items: flex-start; gap: 8px;">
        <div style="flex: 1;" onclick="window.notificationSystem.markAsRead(${n.id})">
          <div style="font-weight: ${n.is_read ? 'normal' : 'bold'}; color: var(--text);">${n.message}</div>
          <div style="font-size: 0.75rem; color: var(--muted); margin-top: 4px;">${new Date(n.created_at).toLocaleString()}</div>
        </div>
        ${!n.is_read ? `<div style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary); margin-top: 6px;"></div>` : ''}
      </div>
    `).join('');
  }
}

// Initialize
window.notificationSystem = new NotificationSystem();
if (localStorage.getItem('token')) {
  window.notificationSystem.init();
}
