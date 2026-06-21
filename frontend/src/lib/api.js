// URL base del backend PHP.
// Desarrollo: frontend/.env → VITE_BACKEND_URL=http://localhost:8000
// Producción: frontend/.env.production → VITE_BACKEND_URL=https://api.kodeo.mx (usado por `npm run build`)
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';
