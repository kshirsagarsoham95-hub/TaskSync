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
