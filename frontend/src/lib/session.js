import { useSyncExternalStore } from 'react';

// Sesión del usuario. La lógica de validación viene tal cual de getStoredUser()
// en App.jsx: decodifica el payload del JWT y comprueba la expiración.
const EVENT = 'kodeo:sessionchange';

// useSyncExternalStore compara snapshots por identidad, así que devolver un
// objeto nuevo en cada lectura provocaría un bucle de renders. Cacheamos por
// la cadena cruda del token.
let cachedToken = null;
let cachedUser  = null;

function readUser() {
  const token = localStorage.getItem('token');
  const raw   = localStorage.getItem('user');
  if (!token || !raw) return null;

  const encodedPayload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
  if (!encodedPayload) throw new Error('Token inválido');
  const payload = JSON.parse(
    atob(encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '='))
  );
  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    clearSession();
    return null;
  }
  return JSON.parse(raw);
}

export function getUser() {
  try {
    const token = localStorage.getItem('token');
    if (token === cachedToken) return cachedUser;
    cachedToken = token;
    cachedUser  = readUser();
    return cachedUser;
  } catch {
    clearSession();
    cachedToken = null;
    cachedUser  = null;
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
  cachedToken = localStorage.getItem('token');
  cachedUser  = user;
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  cachedToken = null;
  cachedUser  = null;
  window.dispatchEvent(new Event(EVENT));
}

export function logout() {
  clearSession();
  window.location.replace('/');
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

// En build no hay sesión: el HTML se genera siempre en estado deslogueado.
const getServerUser = () => null;

export function useUser() {
  return useSyncExternalStore(subscribe, getUser, getServerUser);
}
