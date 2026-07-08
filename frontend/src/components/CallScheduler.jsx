import { useEffect, useRef } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';

// Envuelve el embed de Cal.com y el listener de 'bookingSuccessfulV2'. Cada
// instancia necesita su propio namespace — reutilizar uno ya montado en otra
// vista apila listeners duplicados sobre el mismo embed global y dispara
// varias llamadas al confirmar una sola reserva.
export default function CallScheduler({
  namespace, calLink, metadata, attendee, theme, onBookingSuccess, style,
}) {
  const latestCallback = useRef(onBookingSuccess);
  useEffect(() => { latestCallback.current = onBookingSuccess; }, [onBookingSuccess]);

  useEffect(() => {
    let cal;
    let cancelled = false;

    const handleBookingSuccessful = (e) => {
      const { uid, startTime } = e.detail?.data || {};
      latestCallback.current?.({ uid, startTime });
    };

    (async () => {
      const api = await getCalApi({ namespace });
      if (cancelled) return;
      cal = api;
      cal('on', { action: 'bookingSuccessfulV2', callback: handleBookingSuccessful });
    })();

    return () => {
      cancelled = true;
      cal?.('off', { action: 'bookingSuccessfulV2', callback: handleBookingSuccessful });
    };
  }, [namespace]);

  const params = new URLSearchParams();
  Object.entries(metadata || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(`metadata[${key}]`, value);
  });
  const query = params.toString();
  const calLinkWithParams = query ? `${calLink}?${query}` : calLink;

  return (
    <div style={{
      border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', minHeight: 600, ...style,
    }}>
      <Cal
        namespace={namespace}
        calLink={calLinkWithParams}
        config={{
          name: attendee?.name,
          email: attendee?.email,
          theme: theme === 'dark' ? 'dark' : 'light',
        }}
        style={{ width: '100%', height: '100%', minHeight: 600 }}
      />
    </div>
  );
}
