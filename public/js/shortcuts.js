export function initShortcuts(handlers) {
  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
      if (e.key === 'Escape') {
        active.blur();
      }
      return; // don't trigger shortcuts inside inputs
    }

    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault();
        handlers.onNewTask?.();
        break;
      case '/':
        e.preventDefault();
        handlers.onSearch?.();
        break;
      case 'escape':
        handlers.onCloseModal?.();
        break;
      case 'k':
        handlers.onSwitchView?.('kanban');
        break;
      case 't':
        handlers.onSwitchView?.('table');
        break;
      case 'g':
        handlers.onSwitchView?.('gantt');
        break;
      case 'a':
        handlers.onSwitchView?.('analytics');
        break;
      case '?':
        handlers.onHelp?.();
        break;
    }
  });
}
