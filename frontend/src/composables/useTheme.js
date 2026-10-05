// Light or dark: data-theme on <html>, which base.css reads. It follows the system until you pick a theme with
// the header button; picking the system's own theme follows the system again. The pick is kept in localStorage
// (index.html applies it before the first paint) and other open tabs follow it.
import { ref } from 'vue';

const KEY = 'narrator.theme';
const system = matchMedia('(prefers-color-scheme: dark)');
const systemTheme = () => (system.matches ? 'dark' : 'light');
const picked = () => {
  const t = localStorage.getItem(KEY);
  return t === 'light' || t === 'dark' ? t : null;
};

const root = document.documentElement;
const theme = ref(root.dataset.theme === 'dark' || root.dataset.theme === 'light' ? root.dataset.theme : picked() || systemTheme());
root.dataset.theme = theme.value;

function apply(t) {
  theme.value = t;
  if (root.dataset.theme === t) return;
  root.classList.add('theme-switching');
  root.dataset.theme = t;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
}

system.addEventListener('change', () => {
  if (!picked()) apply(systemTheme());
});
window.addEventListener('storage', (e) => {
  if (e.key === KEY) apply(picked() || systemTheme());
});

function toggleTheme() {
  const next = theme.value === 'dark' ? 'light' : 'dark';
  if (next === systemTheme()) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, next);
  apply(next);
}

const api = { theme, toggleTheme };
export const useTheme = () => api;
