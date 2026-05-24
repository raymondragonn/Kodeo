import { useState, useEffect, useRef } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost/backend';

const MSI_OPTIONS = [
  { value: 0,  label: 'Pago de contado' },
  { value: 3,  label: '3 meses sin intereses' },
  { value: 6,  label: '6 meses sin intereses' },
  { value: 9,  label: '9 meses sin intereses' },
  { value: 12, label: '12 meses sin intereses' },
  { value: 18, label: '18 meses sin intereses' },
  { value: 24, label: '24 meses sin intereses' },
];

export default function Checkout({ amount = 150000, currency = 'MXN' }) {
  const [method, setMethod]         = useState('card');
  const [installments, setInstallments] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null); // { type: 'success'|'error'|'info', html }
  const [stripeReady, setStripeReady] = useState(false);

  const stripeRef    = useRef(null);
  const cardRef      = useRef(null);
  const cardMountRef = useRef(null);

  const displayAmount = (amount / 100).toLocaleString('es-MX', {
    style: 'currency', currency,
  });

  // ── Cargar Stripe.js ──────────────────────────────────────────────────────
  useEffect(() => {
    const initStripe = async () => {
      if (stripeRef.current) return;

      // Esperar a que stripe-js cargue desde el script tag en index.html
      const waitForStripe = () =>
        new Promise((resolve) => {
          if (window.Stripe) { resolve(); return; }
          const script = document.querySelector('script[src*="js.stripe.com"]');
          if (script) {
            script.addEventListener('load', resolve, { once: true });
          } else {
            resolve();
          }
        });

      await waitForStripe();
      if (!window.Stripe) return;

      try {
        const res  = await fetch(`${BACKEND_URL}/create-payment-intent.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, installments: 0 }),
        });
        const data = await res.json();
        if (data.error || !data.publishableKey) return;

        stripeRef.current = window.Stripe(data.publishableKey);
        setStripeReady(true);
      } catch {
        // Stripe no disponible; se mostrará al intentar pagar
      }
    };

    initStripe();
  }, [amount]);

  // ── Montar / desmontar card element según método activo ───────────────────
  useEffect(() => {
    if (!stripeReady || method !== 'card') return;
    if (cardRef.current) return; // ya montado

    const elements = stripeRef.current.elements();
    cardRef.current = elements.create('card', {
      style: {
        base: {
          color: '#f0f0f0',
          fontFamily: 'inherit',
          fontSize: '16px',
          '::placeholder': { color: '#666' },
        },
        invalid: { color: '#e74c3c' },
      },
    });
    cardRef.current.mount(cardMountRef.current);

    return () => {
      cardRef.current?.destroy();
      cardRef.current = null;
    };
  }, [stripeReady, method]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearResult = () => setResult(null);

  const postBackend = async (endpoint, body) => {
    const res  = await fetch(`${BACKEND_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCard = async (e) => {
    e.preventDefault();
    if (!stripeRef.current || !cardRef.current) {
      setResult({ type: 'error', msg: 'Stripe no está listo. Recarga la página.' });
      return;
    }
    setLoading(true);
    clearResult();
    try {
      const { clientSecret } = await postBackend('create-payment-intent.php', {
        amount, installments,
      });
      const { paymentIntent, error } = await stripeRef.current.confirmCardPayment(
        clientSecret,
        { payment_method: { card: cardRef.current } },
      );
      if (error) throw new Error(error.message);
      if (paymentIntent.status === 'succeeded') {
        const plan = installments > 0 ? `${installments} meses sin intereses` : 'pago de contado';
        setResult({
          type: 'success',
          title: '¡Pago exitoso!',
          lines: [
            `Monto: ${displayAmount}`,
            `Plan: ${plan}`,
            `ID: ${paymentIntent.id}`,
          ],
        });
      }
    } catch (err) {
      setResult({ type: 'error', title: 'Error al procesar', lines: [err.message] });
    } finally {
      setLoading(false);
    }
  };

  const handleOxxo = async (e) => {
    e.preventDefault();
    const name  = e.target.name.value.trim();
    const email = e.target.email.value.trim();
    if (!name || !email) { setResult({ type: 'error', title: 'Completa todos los campos.' }); return; }
    setLoading(true);
    clearResult();
    try {
      const data = await postBackend('create-oxxo.php', { amount, name, email });
      setResult({
        type: 'info',
        title: 'Voucher OXXO generado',
        lines: [
          `Monto: ${displayAmount}`,
          'Vigencia: 3 días — paga antes de que expire.',
        ],
        link: data.voucherUrl ? { href: data.voucherUrl, label: 'Ver e imprimir voucher →' } : null,
        id: data.paymentIntentId,
      });
    } catch (err) {
      setResult({ type: 'error', title: 'Error al generar voucher', lines: [err.message] });
    } finally {
      setLoading(false);
    }
  };

  const handleSpei = async (e) => {
    e.preventDefault();
    const name  = e.target.name.value.trim();
    const email = e.target.email.value.trim();
    if (!name || !email) { setResult({ type: 'error', title: 'Completa todos los campos.' }); return; }
    setLoading(true);
    clearResult();
    try {
      const data = await postBackend('create-spei.php', { amount, name, email });
      const bd   = data.bankDetails;
      setResult({
        type: 'info',
        title: 'Datos para transferencia SPEI',
        lines: [
          `Monto: ${displayAmount}`,
          bd ? `Banco: ${bd.bankName}` : null,
        ].filter(Boolean),
        clabe: bd?.clabe,
        note: 'La confirmación puede tardar algunos minutos.',
        id: data.paymentIntentId,
      });
    } catch (err) {
      setResult({ type: 'error', title: 'Error al generar CLABE', lines: [err.message] });
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <h2 style={s.title}>Completa tu pago</h2>
        <p style={s.amount}>{displayAmount}</p>

        {/* Tabs */}
        <div style={s.tabs}>
          {['card', 'oxxo', 'spei'].map((m) => (
            <button
              key={m}
              style={{ ...s.tab, ...(method === m ? s.tabActive : {}) }}
              onClick={() => { setMethod(m); clearResult(); }}
            >
              {m === 'card' ? 'Tarjeta' : m.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── TARJETA ── */}
        {method === 'card' && (
          <form onSubmit={handleCard} style={s.form}>
            <Field label="Número de tarjeta">
              <div ref={cardMountRef} style={s.stripeBox} />
            </Field>
            <Field label="Meses sin intereses">
              <select
                style={s.input}
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
              >
                {MSI_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <Hint>Disponible en tarjetas de crédito mexicanas participantes.</Hint>
            </Field>
            <PayButton loading={loading} label="Pagar ahora" />
          </form>
        )}

        {/* ── OXXO ── */}
        {method === 'oxxo' && (
          <form onSubmit={handleOxxo} style={s.form}>
            <Field label="Nombre completo">
              <input name="name" type="text" placeholder="Juan Pérez García" style={s.input} required />
            </Field>
            <Field label="Correo electrónico">
              <input name="email" type="email" placeholder="juan@correo.com" style={s.input} required />
              <Hint>Recibirás el voucher en este correo.</Hint>
            </Field>
            <PayButton loading={loading} label="Generar voucher OXXO" />
          </form>
        )}

        {/* ── SPEI ── */}
        {method === 'spei' && (
          <form onSubmit={handleSpei} style={s.form}>
            <Field label="Nombre completo">
              <input name="name" type="text" placeholder="Juan Pérez García" style={s.input} required />
            </Field>
            <Field label="Correo electrónico">
              <input name="email" type="email" placeholder="juan@correo.com" style={s.input} required />
              <Hint>Recibirás los datos de transferencia en este correo.</Hint>
            </Field>
            <PayButton loading={loading} label="Obtener CLABE SPEI" />
          </form>
        )}

        {/* Resultado */}
        {result && <ResultBox result={result} />}
      </div>

      <p style={s.footer}>
        Pagos procesados por <strong>Stripe</strong> — tus datos están protegidos.
      </p>
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

function Hint({ children }) {
  return <p style={s.hint}>{children}</p>;
}

function PayButton({ loading, label }) {
  return (
    <button type="submit" disabled={loading} style={s.btn}>
      {loading ? <span style={s.spinner} /> : null}
      {loading ? 'Procesando...' : label}
    </button>
  );
}

function ResultBox({ result }) {
  const colorMap = {
    success: { bg: 'rgba(46,204,113,.1)', border: 'rgba(46,204,113,.3)', title: '#2ecc71' },
    error:   { bg: 'rgba(231,76,60,.1)',  border: 'rgba(231,76,60,.3)',  title: '#e74c3c' },
    info:    { bg: 'rgba(108,92,231,.1)', border: 'rgba(108,92,231,.3)', title: '#f0f0f0' },
  };
  const c = colorMap[result.type];

  return (
    <div style={{ ...s.result, background: c.bg, borderColor: c.border }}>
      {result.title && <p style={{ ...s.resultTitle, color: c.title }}>{result.title}</p>}
      {result.lines?.map((l, i) => <p key={i}>{l}</p>)}
      {result.clabe && (
        <>
          <p style={{ marginTop: 8 }}><strong>CLABE:</strong></p>
          <p style={s.clabe}>{result.clabe}</p>
        </>
      )}
      {result.link && (
        <a href={result.link.href} target="_blank" rel="noopener noreferrer" style={s.link}>
          {result.link.label}
        </a>
      )}
      {result.note && <p style={s.note}>{result.note}</p>}
      {result.id   && <p style={s.note}>ID: {result.id}</p>}
    </div>
  );
}

// ── Estilos inline (sin dependencias externas) ─────────────────────────────
const s = {
  wrapper:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '2rem 1rem' },
  card:       { width: '100%', maxWidth: 480, background: 'var(--surface, #141414)', border: '1px solid var(--border, #2a2a2a)', borderRadius: 12, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  title:      { fontSize: '1.25rem', fontWeight: 700, margin: 0 },
  amount:     { fontSize: '2rem', fontWeight: 700, letterSpacing: '-1px', margin: 0 },
  tabs:       { display: 'flex', gap: 8, borderBottom: '1px solid var(--border, #2a2a2a)', paddingBottom: 0 },
  tab:        { background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-muted, #888)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.5rem 1rem', marginBottom: -1, transition: '.2s' },
  tabActive:  { borderBottomColor: 'var(--accent, #6c5ce7)', color: 'var(--text, #f0f0f0)', fontWeight: 600 },
  form:       { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  field:      { display: 'flex', flexDirection: 'column', gap: 4 },
  label:      { fontSize: '0.85rem', color: 'var(--text-muted, #888)', fontWeight: 500 },
  input:      { background: 'var(--bg, #0a0a0a)', border: '1px solid var(--border, #2a2a2a)', borderRadius: 8, color: 'var(--text, #f0f0f0)', fontSize: '1rem', padding: '0.75rem 1rem', width: '100%' },
  stripeBox:  { background: 'var(--bg, #0a0a0a)', border: '1px solid var(--border, #2a2a2a)', borderRadius: 8, padding: '0.75rem 1rem' },
  hint:       { color: 'var(--text-muted, #888)', fontSize: '0.78rem', margin: 0 },
  btn:        { alignItems: 'center', background: 'var(--accent, #6c5ce7)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', fontSize: '1rem', fontWeight: 600, gap: 8, justifyContent: 'center', padding: '0.9rem', width: '100%' },
  spinner:    { animation: 'spin .8s linear infinite', border: '2px solid rgba(255,255,255,.3)', borderRadius: '50%', borderTopColor: '#fff', display: 'inline-block', height: 16, width: 16 },
  result:     { borderRadius: 8, border: '1px solid', fontSize: '0.9rem', lineHeight: 1.6, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 4 },
  resultTitle:{ fontWeight: 700, margin: 0 },
  clabe:      { background: 'var(--bg, #0a0a0a)', borderRadius: 6, fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: 1, padding: '0.5rem 0.75rem' },
  link:       { color: 'var(--accent, #6c5ce7)', textDecoration: 'none', marginTop: 4 },
  note:       { color: 'var(--text-muted, #888)', fontSize: '0.8rem', margin: 0 },
  footer:     { color: 'var(--text-muted, #888)', fontSize: '0.8rem', textAlign: 'center' },
};
