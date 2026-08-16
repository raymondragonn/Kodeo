// Iconos SVG mínimos — reemplazan los símbolos tipográficos que se usaban como texto.
const PATHS = {
  arrowRight:   'M4 12h16M14 6l6 6-6 6',
  arrowLeft:    'M20 12H4M10 6l-6 6 6 6',
  arrowUp:      'M12 20V4M6 10l6-6 6 6',
  arrowDown:    'M12 4v16M6 14l6 6 6-6',
  arrowUpRight: 'M7 17 17 7M9 7h8v8',
  chevronLeft:  'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown:  'M5 9l7 7 7-7',
  close:        'M6 6l12 12M18 6L6 18',
  check:        'M4 12l5 6L20 6',
};

export default function Icon({ name, size = 16, style }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
