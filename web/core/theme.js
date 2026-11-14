const KEY = 'rust-exchange-lab:theme';

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function currentTheme() {
  return document.documentElement.dataset.theme || (systemDark() ? 'dark' : 'light');
}

export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  return next;
}
