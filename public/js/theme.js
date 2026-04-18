const THEME_KEY = 'tasksync-theme';

export function initTheme() {
  const stored = localStorage.getItem(THEME_KEY) || 'dark';
  document.body.dataset.theme = stored === 'light' ? 'light' : 'dark';
  updateThemeButton();
}

export function toggleTheme() {
  const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
  document.body.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  updateThemeButton();
}

export function updateThemeButton() {
  const button = document.getElementById('theme-toggle');
  if (!button) {
    return;
  }
  button.textContent = document.body.dataset.theme === 'light' ? '☾ Dark' : '☀ Light';
}
