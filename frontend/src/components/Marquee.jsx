import { useEffect, useState } from 'react';

const PHASES = [
  { label: 'Diagnóstico', color: 'var(--accent-yellow)' },
  { label: 'Diseño',      color: 'var(--accent-green)'  },
  { label: 'Desarrollo',  color: 'var(--accent-red)'    },
  { label: 'Despliegue',  color: 'var(--accent-blue)'   },
];

const CYCLE_MS = 2000;

export default function Marquee({ motionSpeed = 1 }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % PHASES.length);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, []);

  const active = PHASES[activeIndex].label;

  return (
    <div style={{
      borderTop: '1px solid var(--line)',
      borderBottom: '1px solid var(--line)',
      padding: '22px 0',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      fontFamily: 'var(--display)',
      fontSize: 'clamp(28px, 4vw, 44px)',
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        animation: `marquee ${40 / motionSpeed}s linear infinite`,
      }}>
        {Array.from({ length: 4 }).flatMap((_, rep) =>
          PHASES.map(({ label, color }) => (
            <span key={`${rep}-${label}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span
                style={{
                  color: active === label ? color : 'var(--type-soft)',
                  transition: 'color 0.3s ease',
                  cursor: 'default',
                }}
              >
                {label}
              </span>
              <span style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--type-soft)',
                margin: '0 28px',
                flexShrink: 0,
              }} />
            </span>
          ))
        )}
      </div>
    </div>
  );
}
