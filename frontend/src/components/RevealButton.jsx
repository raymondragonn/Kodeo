import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

/**
 * Botón CTA con "reveal" de oscurecimiento:
 *  - Al hover: la pantalla se oscurece poco a poco partiendo del botón hacia afuera
 *    (un spotlight radial que deja el botón resaltado en el centro).
 *  - Al click: termina de oscurecerse por completo (fade to black) y luego navega.
 *
 * onActivate se ejecuta al final del fade (tracking + navigate del componente padre).
 * Mantiene el mismo scale de hover que los demás CTA y respeta prefers-reduced-motion.
 */

const DARK     = 0.72;  // opacidad máxima del oscurecimiento en hover
const SPREAD   = 380;   // px del degradado, desde el botón hasta el oscurecimiento pleno
const MARGIN   = 40;    // px de halo claro extra alrededor del botón
const FADE_IN  = 150;   // ms: el oscurecimiento sube poco a poco, según el tiempo del cursor encima
const FADE_OUT = 220;   // ms: al salir desaparece rápido (evita la sensación de lentitud)
const CLOSE    = 520;   // ms del fade-to-black al hacer click

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function RevealButton({ children, onActivate, className, style, ...rest }) {
  const btnRef   = useRef(null);
  const timerRef = useRef(null);
  const [mode, setMode] = useState('idle');            // idle | hover | closing
  const [geo, setGeo]   = useState({ x: 0, y: 0, hole: 120 });

  // El overlay se monta con createPortal sobre document.body, que no existe
  // cuando el HTML se genera en build. Es decorativo y arranca invisible, así
  // que aparecer un tick más tarde no cambia nada.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Centro del botón (coords de viewport) + radio del "agujero" claro que lo envuelve
  const measure = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return { x: window.innerWidth / 2, y: window.innerHeight / 2, hole: 120 };
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      hole: Math.max(r.width, r.height) / 2 + MARGIN,
    };
  };

  const handleEnter = (e) => {
    e.currentTarget.style.transform = 'scale(1.04)';
    if (prefersReduced() || mode === 'closing') return;
    setGeo(measure());
    setMode('hover');
  };

  const handleLeave = (e) => {
    e.currentTarget.style.transform = 'scale(1)';
    if (mode === 'closing') return;
    setMode('idle');
  };

  const handleClick = () => {
    if (prefersReduced()) { onActivate?.(); return; }
    setGeo(measure());
    setMode('closing');
    timerRef.current = window.setTimeout(() => onActivate?.(), CLOSE);
  };

  const visible = mode !== 'idle';

  return (
    <>
      <button
        ref={btnRef}
        className={className}
        style={style}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </button>

      {mounted && createPortal(
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>
          {/* Spotlight: transparente sobre el botón, oscuro hacia afuera */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at ${geo.x}px ${geo.y}px, rgba(0,0,0,0) ${geo.hole}px, rgba(0,0,0,${DARK}) ${geo.hole + SPREAD}px)`,
            opacity: visible ? 1 : 0,
            // Entrada lenta y lineal (crece con el tiempo de hover); salida rápida
            transition: mode === 'hover'
              ? `opacity ${FADE_IN}ms linear`
              : `opacity ${FADE_OUT}ms ease`,
          }} />
          {/* Fade-to-black: solo al hacer click, cierra el agujero y cubre todo */}
          <div style={{
            position: 'absolute', inset: 0, background: '#000',
            opacity: mode === 'closing' ? 1 : 0,
            transition: `opacity ${CLOSE}ms ease`,
          }} />
        </div>,
        document.body,
      )}
    </>
  );
}
