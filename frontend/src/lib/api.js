// URL base del backend PHP.
// Desarrollo: frontend/.env → VITE_BACKEND_URL=http://localhost:8000
// Producción: frontend/.env.production → VITE_BACKEND_URL=https://api.kodeo.mx
// En productivo no permitimos fallback silencioso a localhost.
const backendUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

if (!backendUrl) {
  throw new Error('Missing VITE_BACKEND_URL for production build');
}

export const API_BASE_URL = backendUrl;
