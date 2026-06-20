// Calcula fechas de entrega estimadas en días hábiles (sin contar fines de semana).
// Debe mantenerse alineado con backend/config.php (SERVICE_DEV_DAYS / addBusinessDays).

export function addBusinessDays(fromDate, days) {
  const date = new Date(fromDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay(); // 0 = domingo, 6 = sábado
    if (day !== 0 && day !== 6) added++;
  }
  return date;
}

export function parseDevDays(timeLabel) {
  const match = String(timeLabel).match(/\d+/);
  return match ? parseInt(match[0], 10) : 8;
}

export function estimatedDeliveryDate(timeLabel, fromDate = new Date()) {
  return addBusinessDays(fromDate, parseDevDays(timeLabel));
}

// Formatea un objeto Date como DD/MM/AAAA.
export function formatDateEs(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// Formatea una fecha/timestamp tal como viene de la BD (ej. "2026-07-01" o
// "2026-07-01 14:23:01") a DD/MM/AAAA sin pasar por Date() para evitar
// corrimientos de un día por zona horaria.
export function formatDMY(dbDate) {
  if (!dbDate) return '';
  const [y, m, d] = String(dbDate).slice(0, 10).split('-');
  if (!y || !m || !d) return dbDate;
  return `${d}/${m}/${y}`;
}
