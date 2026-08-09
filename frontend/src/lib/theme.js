import { useSyncExternalStore } from 'react';

// Tema de la app. Antes vivía en un useState de App.jsx y bajaba por props;
// entre islas de Astro cada árbol React es independiente, así que se comparte
// por el mismo mecanismo que lang.js.
//
// El tema se aplica al <html> antes del primer pintado en public/boot.js —
// aquí solo se lee y se escribe.
const STORAGE_KEY = 'theme';
const EVENT       = 'kodeo:themechange';

export function getTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return;
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(EVENT));
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

// En build no hay preferencia que leer; 'dark' es el tema por defecto del sitio.
const getServerTheme = () => 'dark';

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, getServerTheme);
}
