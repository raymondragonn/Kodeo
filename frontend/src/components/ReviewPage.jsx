import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import logoSvg from '../assets/logo_black_transparent.svg?url';
import { API_BASE_URL as API } from '../lib/api';

const STAR_VALUES = [1, 2, 3, 4, 5];
const EXPECTATIVAS_VALUES = ['supero', 'cumplio', 'parcial', 'no_cumplio'];

const choiceBtn = selected => ({
  padding: '10px 16px',
  borderRadius: 'var(--radius-pill)',
  border: `1px solid ${selected ? 'var(--type)' : 'var(--line)'}`,
  background: selected ? 'var(--type)' : 'transparent',
  color: selected ? 'var(--bg)' : 'var(--type-soft)',
  fontFamily: 'var(--body)', fontSize: 13, cursor: 'pointer',
});

const scaleLabelStyle = {
  fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase',
  color: 'var(--type-soft)', display: 'block', lineHeight: 1.6, marginBottom: 6,
};

// Todos los campos son obligatorios salvo los inputs de autoría (autorNombre/autorRol).
function RequiredMark() {
  return <span style={{ color: '#e05050' }} aria-hidden="true"> *</span>;
}

function Star({ value, filled, onClick, onMouseEnter, onMouseLeave, size = 34 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}
      aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'var(--accent-yellow, #FFDE59)' : 'none'} stroke={filled ? 'var(--accent-yellow, #FFDE59)' : 'var(--type-soft)'} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M12 2.5l2.9 6.24 6.6.72-4.9 4.6 1.3 6.6L12 17.6l-5.9 3.06 1.3-6.6-4.9-4.6 6.6-.72L12 2.5z" />
      </svg>
    </button>
  );
}

function StarGroup({ label, value, onChange, size }) {
  const [hover, setHover] = useState(0);
  return (
    <div>
      <label style={scaleLabelStyle}>{label}<RequiredMark /></label>
      <div style={{ display: 'flex', gap: 2, marginLeft: -4 }}>
        {STAR_VALUES.map(v => (
          <Star
            key={v}
            value={v}
            size={size}
            filled={v <= (hover || value)}
            onClick={() => onChange(v)}
            onMouseEnter={() => setHover(v)}
            onMouseLeave={() => setHover(0)}
          />
        ))}
      </div>
    </div>
  );
}

function NumberScale({ label, value, onChange }) {
  return (
    <div>
      <label style={scaleLabelStyle}>{label}<RequiredMark /></label>
      <div style={{ display: 'flex', gap: 8 }}>
        {STAR_VALUES.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            style={{ ...choiceBtn(value === v), width: 40, textAlign: 'center' }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewPage({ copy, onNavigate }) {
  const { token } = useParams();
  const P = copy.review;

  const [loading, setLoading]   = useState(!!token);
  const [notFound, setNotFound] = useState(!token);
  const [projectName, setProjectName] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [rating, setRating]                       = useState(0);
  const [ratingComunicacion, setRatingComunicacion] = useState(0);
  const [ratingDiseno, setRatingDiseno]             = useState(0);
  const [ratingVelocidad, setRatingVelocidad]       = useState(0);
  const [feedback, setFeedback]     = useState('');
  const [expectativas, setExpectativas] = useState('');
  const [mejoras, setMejoras]       = useState('');
  const [puedePublicar, setPuedePublicar] = useState(null);
  const [autorNombre, setAutorNombre] = useState('');
  const [autorRol, setAutorRol]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${API}/reviews.php?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) { setNotFound(true); return; }
        setProjectName(data.project_name ?? '');
        setAlreadySubmitted(!!data.already_submitted);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (rating < 1 || ratingComunicacion < 1 || ratingDiseno < 1 || ratingVelocidad < 1) {
      setError(P.ratingRequired);
      return;
    }
    if (!feedback.trim()) { setError(P.feedbackRequired); return; }
    if (!expectativas) { setError(P.expectativasRequired); return; }
    if (puedePublicar === null) { setError(P.publicarRequired); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/reviews.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token, rating, feedback,
          rating_comunicacion: ratingComunicacion,
          rating_diseno: ratingDiseno,
          rating_velocidad: ratingVelocidad,
          expectativas, mejoras,
          puede_publicar: puedePublicar,
          autor_nombre: puedePublicar ? autorNombre : '',
          autor_rol:    puedePublicar ? autorRol : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? P.error); return; }
      setSuccess(true);
    } catch {
      setError(P.error);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--bg-2)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--body)',
    fontSize: 14,
    color: 'var(--type)',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  };

  const labelStyle = {
    fontFamily: 'var(--ui)',
    fontSize: 10,
    letterSpacing: '.18em',
    textTransform: 'uppercase',
    color: 'var(--type-soft)',
    display: 'block',
    lineHeight: 1.6,
    marginBottom: 6,
  };

  const showThanks = success || alreadySubmitted;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 32px', borderBottom: '1px solid var(--line)', height: 64,
      }}>
        <a
          href="/"
          onClick={e => { e.preventDefault(); onNavigate?.('/'); }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <img src={logoSvg} alt="Kodeo" style={{ height: 44, filter: 'var(--logo-filter)' }} />
        </a>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{
          width: '100%', maxWidth: 460,
          background: 'var(--bg-2)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)', padding: '40px 36px',
        }}>
          <p style={{
            fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em',
            textTransform: 'uppercase', color: 'var(--type-muted)', margin: '0 0 12px',
          }}>
            {P.eyebrow}
          </p>

          {loading ? (
            <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: 0 }}>…</p>
          ) : notFound ? (
            <>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: '-0.03em', color: 'var(--type)', margin: '0 0 12px', lineHeight: 1.1 }}>
                {P.invalidTitle}
              </h1>
              <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: 0, lineHeight: 1.5 }}>
                {P.invalidBody}
              </p>
            </>
          ) : showThanks ? (
            <>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: '-0.03em', color: 'var(--type)', margin: '0 0 12px', lineHeight: 1.1 }}>
                {success ? P.thanksTitle : P.alreadySubmittedTitle}
              </h1>
              <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: '0 0 24px', lineHeight: 1.5 }}>
                {success ? P.thanksBody : P.alreadySubmittedBody}
              </p>
              <button
                type="button"
                onClick={() => onNavigate?.('/')}
                style={{
                  background: 'var(--type)', color: 'var(--bg)', border: 0,
                  padding: '13px 18px', borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                  textTransform: 'uppercase', cursor: 'pointer', width: '100%',
                }}
              >
                {P.backHome}
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: '-0.03em', color: 'var(--type)', margin: '0 0 6px', lineHeight: 1.1 }}>
                {P.title}
              </h1>
              <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-soft)', margin: '0 0 6px', lineHeight: 1.5 }}>
                {P.subtitle}
              </p>
              {projectName && (
                <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type)', margin: '0 0 28px', fontWeight: 600 }}>
                  {projectName}
                </p>
              )}

              {error && (
                <div style={{
                  background: 'rgba(224,80,80,0.08)', border: '1px solid rgba(224,80,80,0.3)',
                  borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16,
                  fontFamily: 'var(--body)', fontSize: 13, color: '#e05050',
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <StarGroup label={P.ratingLabel} value={rating} onChange={setRating} />

                <div>
                  <label style={labelStyle}>{P.feedbackLabel}<RequiredMark /></label>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder={P.feedbackPlaceholder}
                    rows={4}
                    maxLength={1000}
                    style={fieldStyle}
                  />
                </div>

                <NumberScale label={P.comunicacionLabel} value={ratingComunicacion} onChange={setRatingComunicacion} />
                <NumberScale label={P.disenoLabel} value={ratingDiseno} onChange={setRatingDiseno} />
                <NumberScale label={P.velocidadLabel} value={ratingVelocidad} onChange={setRatingVelocidad} />

                <div>
                  <label style={labelStyle}>{P.expectativasLabel}<RequiredMark /></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {EXPECTATIVAS_VALUES.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setExpectativas(v)}
                        style={choiceBtn(expectativas === v)}
                      >
                        {P.expectativasOptions[v]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{P.mejorasLabel}</label>
                  <textarea
                    value={mejoras}
                    onChange={e => setMejoras(e.target.value)}
                    placeholder={P.mejorasPlaceholder}
                    rows={3}
                    maxLength={1000}
                    style={fieldStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{P.publicarLabel}<RequiredMark /></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setPuedePublicar(true)} style={choiceBtn(puedePublicar === true)}>
                      {P.publicarSi}
                    </button>
                    <button type="button" onClick={() => setPuedePublicar(false)} style={choiceBtn(puedePublicar === false)}>
                      {P.publicarNo}
                    </button>
                  </div>
                </div>

                {/* Solo si autoriza publicar: con qué nombre aparecer. Sin esto
                    la reseña se publica sin autor. */}
                {puedePublicar === true && (
                  <div>
                    <label style={labelStyle}>{P.autorLabel}</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={autorNombre}
                        onChange={(e) => setAutorNombre(e.target.value)}
                        placeholder={P.autorNombrePlaceholder}
                        maxLength={120}
                        style={{ ...fieldStyle, flex: '1 1 180px' }}
                      />
                      <input
                        type="text"
                        value={autorRol}
                        onChange={(e) => setAutorRol(e.target.value)}
                        placeholder={P.autorRolPlaceholder}
                        maxLength={120}
                        style={{ ...fieldStyle, flex: '1 1 180px' }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'var(--type)', color: 'var(--bg)', border: 0,
                    padding: '13px 18px', borderRadius: 'var(--radius-pill)',
                    fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em',
                    textTransform: 'uppercase', cursor: submitting ? 'not-allowed' : 'pointer',
                    width: '100%', opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? P.submitting : `${P.submit} →`}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
