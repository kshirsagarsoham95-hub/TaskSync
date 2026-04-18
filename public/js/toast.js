export function showToast(message, tone = 'default', options = {}) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast${tone !== 'default' ? ' ' + tone : ''}`;
  
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  let hideTimeout;

  if (options.undoCallback) {
    const btn = document.createElement('button');
    btn.className = 'ghost-btn';
    btn.style.marginLeft = '12px';
    btn.style.padding = '2px 8px';
    btn.textContent = options.undoLabel || 'Undo';
    btn.onclick = () => {
      options.undoCallback();
      hideToast();
    };
    toast.appendChild(btn);
  }

  container.appendChild(toast);

  // trigger enter transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  const hideToast = () => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  };

  hideTimeout = setTimeout(hideToast, options.duration || 4000);
}