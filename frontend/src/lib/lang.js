import { useSyncExternalStore } from 'react';

// Idioma de la app. Por defecto se autodetecta del navegador, pero el usuario
// puede fijar uno manualmente desde el navbar; la preferencia se guarda en
// localStorage y se propaga a toda la app vía un evento global.
const STORAGE_KEY = 'kodeo_lang';
const EVENT       = 'kodeo:langchange';

function detectBrowserLang() {
  const browserLang = navigator.language || navigator.languages?.[0] || 'es';
  return browserLang.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function getLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'es' || saved === 'en') return saved;
  return detectBrowserLang();
}

export function setLang(lang) {
  if (lang !== 'es' && lang !== 'en') return;
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new Event(EVENT));
}

export function toggleLang() {
  setLang(getLang() === 'es' ? 'en' : 'es');
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

// Hook reactivo: re-renderiza al cambiar el idioma (incluso desde otra pestaña).
export function useLang() {
  return useSyncExternalStore(subscribe, getLang, getLang);
}
