import { useMemo, useState } from 'react';

// Calendario de agenda propio (reemplaza el embed de Cal.com en /agendar).
// Layout estilo cal.com: mes navegable a la izquierda, horarios del día a la
// derecha (apilado en mobile). La disponibilidad es fija — L-V 9:00–18:00 y
// sábados 10:00–14:00, slots de 30 min — y la cita se confirma por WhatsApp,
// así que no consulta ningún backend.

const SLOT_MINUTES = 30;
const MAX_WEEKS_AHEAD = 8;          // ventana máxima de agenda
const MIN_LEAD_MS = 2 * 60 * 60 * 1000; // hoy: solo horarios con 2h de anticipación

// Rangos de disponibilidad por día de la semana (0 = domingo)
function hoursForDay(weekday) {
  if (weekday === 0) return null;                  // domingo — cerrado
  if (weekday === 6) return { start: 10, end: 14 }; // sábado
  return { start: 9, end: 18 };                     // lunes a viernes
}

function isSameDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function slotsForDate(date) {
  const range = hoursForDay(date.getDay());
  if (!range) return [];
  const now = new Date();
  const slots = [];
  for (let h = range.start; h < range.end; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const slot = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
      if (slot.getTime() - now.getTime() < MIN_LEAD_MS) continue;
      slots.push(slot);
    }
  }
  return slots;
}

function dayIsSelectable(date, maxDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today || date > maxDate) return false;
  if (!hoursForDay(date.getDay())) return false;
  // Hoy solo cuenta si aún quedan horarios con anticipación suficiente
  return isSameDay(date, new Date()) ? slotsForDate(date).length > 0 : true;
}

export default function BookingCalendar({
  locale = 'es-MX', accent = 'var(--accent-green)', copy, isMobile,
  selectedSlot, onSelectSlot,
}) {
  const today = new Date();
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + MAX_WEEKS_AHEAD * 7);
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState(
    selectedSlot ? new Date(selectedSlot) : null
  );

  const monthFmt   = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }), [locale]);
  const weekdayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
  const dayFmt     = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }), [locale]);
  const timeFmt    = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true }), [locale]);

  // Encabezados lun→dom (la cuadrícula arranca en lunes)
  const weekdayLabels = useMemo(() => {
    const base = new Date(2026, 5, 1); // 1 jun 2026 = lunes
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return weekdayFmt.format(d).replace('.', '');
    });
  }, [weekdayFmt]);

  // Celdas del mes visible (null = hueco antes del día 1)
  const cells = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const leading = (first.getDay() + 6) % 7; // lunes = 0
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)
      ),
    ];
  }, [viewMonth]);

  const canGoPrev = viewMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1) <= maxDate;
  const changeMonth = (delta) =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));

  const slots = useMemo(() => (selectedDay ? slotsForDate(selectedDay) : []), [selectedDay]);

  const handleDayClick = (date) => {
    setSelectedDay(date);
    onSelectSlot?.(null); // al cambiar de día se descarta la hora previa
  };

  const navBtn = (enabled) => ({
    width: 34, height: 34, borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--line)', background: 'transparent',
    color: enabled ? 'var(--type)' : 'var(--type-muted)',
    cursor: enabled ? 'pointer' : 'default',
    fontFamily: 'var(--ui)', fontSize: 14, lineHeight: 1,
    opacity: enabled ? 1 : 0.4,
  });

  return (
    <div style={{
      border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.4fr) minmax(0, 1fr)',
    }}>
      {/* ─── Panel del mes ─────────────────────────────── */}
      <div style={{ padding: isMobile ? '22px 18px' : '30px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{
            fontFamily: 'var(--display)', fontSize: isMobile ? 20 : 24,
            letterSpacing: '-0.02em', textTransform: 'capitalize',
          }}>
            {monthFmt.format(viewMonth)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button aria-label="Mes anterior" disabled={!canGoPrev} onClick={() => changeMonth(-1)} style={navBtn(canGoPrev)}>←</button>
            <button aria-label="Mes siguiente" disabled={!canGoNext} onClick={() => changeMonth(1)} style={navBtn(canGoNext)}>→</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {weekdayLabels.map((w) => (
            <div key={w} style={{
              textAlign: 'center', fontFamily: 'var(--ui)', fontSize: 10,
              letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--type-muted)',
              padding: '6px 0',
            }}>
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((date, i) => {
            if (!date) return <div key={`gap-${i}`} />;
            const selectable = dayIsSelectable(date, maxDate);
            const isSelected = isSameDay(date, selectedDay);
            const isToday    = isSameDay(date, today);
            return (
              <button
                key={date.getTime()}
                disabled={!selectable}
                onClick={() => handleDayClick(date)}
                style={{
                  aspectRatio: '1', minHeight: 38,
                  borderRadius: 'var(--radius-sm)',
                  border: isSelected ? `1px solid ${accent}` : '1px solid transparent',
                  background: isSelected ? 'var(--type)' : selectable ? 'var(--bg-2)' : 'transparent',
                  color: isSelected ? 'var(--bg)' : selectable ? 'var(--type)' : 'var(--type-muted)',
                  fontFamily: 'var(--ui)', fontSize: 13,
                  cursor: selectable ? 'pointer' : 'default',
                  opacity: selectable || isSelected ? 1 : 0.35,
                  position: 'relative',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => { if (selectable && !isSelected) e.currentTarget.style.background = 'var(--line)'; }}
                onMouseLeave={(e) => { if (selectable && !isSelected) e.currentTarget.style.background = 'var(--bg-2)'; }}
              >
                {date.getDate()}
                {isToday && (
                  <span style={{
                    position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)',
                    width: 4, height: 4, borderRadius: '50%',
                    background: isSelected ? 'var(--bg)' : accent,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        <p style={{
          fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em',
          textTransform: 'uppercase', color: 'var(--type-muted)', margin: '20px 0 0',
        }}>
          {copy.timezone}
        </p>
      </div>

      {/* ─── Panel de horarios ─────────────────────────── */}
      <div style={{
        borderLeft: isMobile ? 'none' : '1px solid var(--line)',
        borderTop: isMobile ? '1px solid var(--line)' : 'none',
        padding: isMobile ? '22px 18px' : '30px 26px',
        display: 'flex', flexDirection: 'column',
        maxHeight: isMobile ? 'none' : 460,
      }}>
        {selectedDay ? (
          <>
            <div style={{
              fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.16em',
              textTransform: 'uppercase', color: 'var(--type-soft)', marginBottom: 16,
            }}>
              {dayFmt.format(selectedDay)}
            </div>
            {slots.length === 0 ? (
              <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: 0 }}>
                {copy.noSlots}
              </p>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                overflowY: 'auto', paddingRight: 4, flex: 1,
              }}>
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.getTime() === slot.getTime();
                  return (
                    <button
                      key={slot.getTime()}
                      onClick={() => onSelectSlot?.(slot)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? `1px solid ${accent}` : '1px solid var(--line)',
                        background: isSelected ? 'var(--type)' : 'transparent',
                        color: isSelected ? 'var(--bg)' : 'var(--type)',
                        fontFamily: 'var(--ui)', fontSize: 12, letterSpacing: '.08em',
                        cursor: 'pointer', textAlign: 'center',
                        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = accent; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--line)'; }}
                    >
                      {timeFmt.format(slot)}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: isMobile ? 120 : 0,
          }}>
            <p style={{
              fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)',
              textAlign: 'center', maxWidth: 220, lineHeight: 1.6, margin: 0,
            }}>
              {copy.pickDay}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { SLOT_MINUTES };
