import { inputStyle } from '../data/projectFormFields';

export default function FormField({ field, value, onChange }) {
  const labelEl = (
    <label style={{
      fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em',
      textTransform: 'uppercase', color: 'var(--type-soft)',
      display: 'block', marginBottom: field.type === 'radio' ? 12 : 8,
    }}>
      {field.label}
      {field.required && <span style={{ color: '#e05050', marginLeft: 4 }}>*</span>}
    </label>
  );

  if (field.type === 'text') {
    return (
      <div>
        {labelEl}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--line-2)'}
          onBlur={e => e.target.style.borderColor = 'var(--line)'}
        />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        {labelEl}
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          onFocus={e => e.target.style.borderColor = 'var(--line-2)'}
          onBlur={e => e.target.style.borderColor = 'var(--line)'}
        />
      </div>
    );
  }

  if (field.type === 'link-list') {
    const links = Array.isArray(value) && value.length > 0 ? value : [''];

    function update(idx, val) {
      const next = [...links];
      next[idx] = val;
      onChange(next);
    }
    function add() { onChange([...links, '']); }
    function remove(idx) {
      const next = links.filter((_, i) => i !== idx);
      onChange(next.length > 0 ? next : ['']);
    }

    return (
      <div>
        {labelEl}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map((link, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="url"
                value={link}
                onChange={e => update(idx, e.target.value)}
                placeholder={field.placeholder}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => e.target.style.borderColor = 'var(--line-2)'}
                onBlur={e => e.target.style.borderColor = 'var(--line)'}
              />
              {links.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  aria-label="Quitar enlace"
                  style={{
                    width: 32, height: 32, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: '1px solid var(--line)', borderRadius: '50%',
                    color: 'var(--type-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={add}
          style={{
            marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
            color: 'var(--type-soft)',
          }}
        >
          + Agregar otro enlace
        </button>
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div>
        {labelEl}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {field.options.map(opt => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                style={{
                  padding: '9px 18px',
                  background: selected ? 'var(--type)' : 'transparent',
                  color: selected ? 'var(--bg)' : 'var(--type-soft)',
                  border: selected ? '1px solid var(--type)' : '1px solid var(--line)',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--body)', fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                  letterSpacing: 0, textTransform: 'none',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
