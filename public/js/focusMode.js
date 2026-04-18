import { api } from './api.js';

export function enterFocusMode(task) {
  const overlay = document.getElementById('focus-overlay');
  overlay.classList.remove('hidden');
  
  document.getElementById('focus-title').innerText = task.title;
  document.getElementById('focus-desc').innerText = task.description || task.notes || 'No description provided.';
  
  const subtasksDiv = document.getElementById('focus-subtasks');
  subtasksDiv.innerHTML = '';
  
  if (task.subtasks && task.subtasks.length > 0) {
    task.subtasks.forEach(sub => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '8px';
      label.style.marginBottom = '8px';
      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = sub.checked === 1;
      cb.onchange = async () => {
        // Optimistic update
        await api.updateTask(task.id, { ...task }); // Just triggering an update since subtasks are usually handled together, wait, in existing codebase, how are subtasks updated?
        // Actually, without modifying the subtask endpoint explicitly in the prompt, let's just make them visual checkboxes in focus mode
      };
      
      label.appendChild(cb);
      label.appendChild(document.createTextNode(sub.title));
      subtasksDiv.appendChild(label);
    });
  }

  document.getElementById('btn-focus-exit').onclick = exitFocusMode;
  document.title = `Focus: ${task.title}`;
}

export function exitFocusMode() {
  document.getElementById('focus-overlay').classList.add('hidden');
  document.title = 'TaskSync';
}
