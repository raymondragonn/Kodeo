import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoSvg from '../assets/logo_black_transparent.svg';
import { API_BASE_URL as API } from '../lib/api';

const STATUS_COPY = {
  succeeded: {
    title: '¡Pago confirmado!',
    message: 'Tu pago se procesó correctamente. En breve recibirás un correo con los detalles de tu pedido.',
    bg: 'rgba(99,196,77,.08)', border: 'rgba(99,196,77,.25)', accent: '#63C44D',
  },
  processing: {
    title: 'Pago en proceso',
    message: 'Estamos confirmando tu pago. Esto puede tardar unos minutos; te avisaremos por correo en cuanto se confirme.',
    bg: 'rgba(81,112,255,.08)', border: 'rgba(81,112,255,.25)', accent: 'var(--accent-blue)',
  },
  failed: {
    title: 'No se pudo confirmar el pago',
    message: 'Hubo un problema al procesar tu pago. Por favor intenta de nuevo o utiliza otro método de pago.',
    bg: 'rgba(224,80,80,.08)', border: 'rgba(224,80,80,.3)', accent: '#e05050',
  },
  default: {
    title: '¡Gracias por tu compra!',
    message: 'Estamos a la espera de la confirmación de tu pago. Si pagaste por OXXO o transferencia SPEI, recibirás un correo en cuanto se acredite.',
    bg: 'rgba(99,196,77,.08)', border: 'rgba(99,196,77,.25)', accent: '#63C44D',
  },
};

export default function PaymentConfirmedPage() {
  const navigate = useNavigate();
  const [info] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      paymentIntentId: params.get('payment_intent'),
      status: params.get('redirect_status'),
    };
  });

  const status = STATUS_COPY[info.status] ?? STATUS_COPY.default;

  // ── Respaldo: asegura que el pedido quede creado aunque el webhook de Stripe
  //    no haya llegado (o llegue tarde) al backend ──────────────────────────
  useEffect(() => {
    if (info.status !== 'succeeded' || !info.paymentIntentId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API}/confirm-payment.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paymentIntentId: info.paymentIntentId }),
    }).catch(() => { /* el webhook lo respaldará si esto falla */ });
  }, [info.status, info.paymentIntentId]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center',
        padding: '0 32px', borderBottom: '1px solid var(--line)', height: 64, flexShrink: 0,
      }}>
        <a
          href="/"
          onClick={e => { e.preventDefault(); navigate('/'); }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <img src={logoSvg} alt="Kodeo" style={{ height: 44, filter: 'var(--logo-filter)' }} />
        </a>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{
          width: '100%', maxWidth: 440,
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 22,
          background: status.bg, border: `1px solid ${status.border}`,
          borderRadius: 'var(--radius-lg)', padding: '48px 36px',
        }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 60, height: 60, borderRadius: '50%',
            background: 'var(--bg-2)', border: `1px solid ${status.border}`,
            color: status.accent, flexShrink: 0,
          }}>
            <CheckIcon />
          </span>

          <div>
            <h1 style={{
              fontFamily: 'var(--display)', fontSize: 26, letterSpacing: '-0.02em',
              color: 'var(--type)', margin: '0 0 10px',
            }}>
              {status.title}
            </h1>
            <p style={{ fontFamily: 'var(--body)', fontSize: 14, lineHeight: 1.7, color: 'var(--type-soft)', margin: 0 }}>
              {status.message}
            </p>
          </div>

          {info.paymentIntentId && (
            <p style={{
              fontFamily: 'monospace', fontSize: 12, color: 'var(--type-muted)',
              background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8,
              padding: '8px 14px', margin: 0, wordBreak: 'break-all',
            }}>
              ID: {info.paymentIntentId}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            <button onClick={() => navigate('/pedidos')} style={primaryBtnStyle}>Ir a panel</button>
            <button onClick={() => { window.location.href = 'https://kodeo.mx'; }} style={secondaryBtnStyle}>Ir a inicio</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

const primaryBtnStyle = {
  padding: '12px 22px',
  background: 'var(--type)', color: 'var(--bg)',
  border: 0, borderRadius: 'var(--radius-pill)',
  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
  cursor: 'pointer',
};

const secondaryBtnStyle = {
  padding: '12px 22px',
  background: 'transparent', color: 'var(--type)',
  border: '1px solid var(--line-2)', borderRadius: 'var(--radius-pill)',
  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
  cursor: 'pointer',
};
