import { useState, useEffect, useCallback, useRef } from 'react';
import PortalLayout from './PortalLayout';
import RefreshButton from './RefreshButton';
import { API_BASE_URL } from '../lib/api';
import { useBreakpoint } from '../hooks/useBreakpoint';

// ── Utilidades ────────────────────────────────────────────────────────────────

function formatDate(iso, locale) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Badge de rol ──────────────────────────────────────────────────────────────

function RoleBadge({ role, U }) {
  const isAdmin = role === 'administrador';
  return (
    <span style={{
      fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase',
      color: isAdmin ? '#5170ff' : 'var(--type-muted)',
      border: `1px solid ${isAdmin ? '#5170ff44' : 'var(--line)'}`,
      background: isAdmin ? '#5170ff12' : 'transparent',
      borderRadius: 'var(--radius-pill)', padding: '3px 9px', whiteSpace: 'nowrap',
    }}>
      {isAdmin ? U.roleAdmin : U.roleClient}
    </span>
  );
}

// ── Avatar con inicial ────────────────────────────────────────────────────────

function Avatar({ name, role }) {
  const initial = (name || '?')[0].toUpperCase();
  const isAdmin = role === 'administrador';
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
      background: isAdmin ? '#5170ff20' : 'var(--bg-3)',
      border: `1px solid ${isAdmin ? '#5170ff44' : 'var(--line)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'var(--display)', fontSize: 14, color: isAdmin ? '#5170ff' : 'var(--type-muted)', letterSpacing: '-0.01em' }}>
        {initial}
      </span>
    </div>
  );
}

// ── Fila de usuario ───────────────────────────────────────────────────────────

function UserRow({ u, isMe, isSaving, isMobile, isLast, onToggleRole, onOpen, U, locale }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 14,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        padding: isMobile ? '14px 16px' : '13px 20px',
        background: hovered ? 'var(--bg-3)' : 'var(--bg-2)',
        borderBottom: isLast ? 'none' : '1px solid var(--line)',
        transition: 'background .15s',
        cursor: 'pointer',
      }}
    >
      <Avatar name={u.name || u.username} role={u.role} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--ui)', fontSize: 12, letterSpacing: '.05em', color: 'var(--type)', textTransform: 'uppercase' }}>
            {u.name || u.username}
          </span>
          <RoleBadge role={u.role} U={U} />
          {isMe && (
            <span style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--type-muted)', border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', padding: '2px 7px' }}>
              {U.you}
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--body)', fontSize: 12, color: 'var(--type-muted)', marginTop: 3, wordBreak: 'break-word', lineHeight: 1.5 }}>
          {u.email}
          <span style={{ margin: '0 5px', opacity: .35 }}>·</span>
          @{u.username}
          <span style={{ margin: '0 5px', opacity: .35 }}>·</span>
          {formatDate(u.created_at, locale)}
        </div>
      </div>

      {!isMe && (
        <button
          disabled={isSaving}
          onClick={(e) => { e.stopPropagation(); onToggleRole(u); }}
          style={{
            flexShrink: 0,
            background: 'none', border: '1px solid var(--line)',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            color: isSaving ? 'var(--type-muted)' : u.role === 'administrador' ? '#e05050' : '#5170ff',
            fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
            borderRadius: 'var(--radius-pill)', padding: '6px 14px',
            opacity: isSaving ? .5 : 1, transition: 'border-color .2s, color .2s',
            width: isMobile ? '100%' : 'auto',
          }}
          onMouseEnter={e => { if (!isSaving) e.currentTarget.style.borderColor = u.role === 'administrador' ? '#e0505055' : '#5170ff55'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}
        >
          {isSaving ? U.saving : u.role === 'administrador' ? U.revokeAdmin : U.makeAdmin}
        </button>
      )}
    </div>
  );
}

// ── Modal base ────────────────────────────────────────────────────────────────

function Modal({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '28px', maxWidth: 440, width: '100%' }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Modal: crear administrador ────────────────────────────────────────────────

function CreateAdminModal({ onClose, onCreated, U }) {
  const [form,    setForm]    = useState({ name: '', username: '', email: '', password: '' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const firstRef = useRef(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/users.php`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, role: 'administrador' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || U.createError);
      onCreated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
    padding: '10px 14px', color: 'var(--type)', fontFamily: 'var(--body)', fontSize: 13,
    outline: 'none', transition: 'border-color .2s',
  };

  const labelStyle = {
    fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase',
    color: 'var(--type-muted)', display: 'block', marginBottom: 6,
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: 'var(--ui)', fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', color: '#5170ff', margin: '0 0 6px' }}>
          {U.newUserTag}
        </p>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '-0.02em', color: 'var(--type)', margin: 0 }}>
          {U.createAdminTitle}
        </h2>
        <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: '8px 0 0', lineHeight: 1.5 }}>
          {U.createAdminDesc}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{U.nameLabel}</label>
          <input ref={firstRef} value={form.name} onChange={set('name')} placeholder={U.namePlaceholder} required style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = '#5170ff55'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--line)'} />
        </div>
        <div>
          <label style={labelStyle}>{U.usernameLabel}</label>
          <input value={form.username} onChange={set('username')} placeholder={U.usernamePlaceholder} required pattern="[a-z0-9_]{3,30}" style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = '#5170ff55'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--line)'} />
        </div>
        <div>
          <label style={labelStyle}>{U.emailLabel}</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder={U.emailPlaceholder} required style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = '#5170ff55'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--line)'} />
        </div>
        <div>
          <label style={labelStyle}>{U.passwordLabel}</label>
          <input type="password" value={form.password} onChange={set('password')} placeholder={U.passwordPlaceholder} required minLength={8} style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = '#5170ff55'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--line)'} />
        </div>

        {error && (
          <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: '#dc2626', background: '#dc262610', border: '1px solid #dc262630', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--type-muted)', fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', borderRadius: 'var(--radius-pill)', padding: '9px 18px' }}>
            {U.cancel}
          </button>
          <button type="submit" disabled={saving} style={{ background: saving ? 'var(--bg-3)' : '#5170ff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: saving ? 'var(--type-muted)' : '#fff', fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', borderRadius: 'var(--radius-pill)', padding: '9px 20px', transition: 'background .2s' }}>
            {saving ? U.creating : U.createAdminBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal: confirmar cambio de rol ────────────────────────────────────────────

function ConfirmModal({ confirm, saving, onConfirm, onClose, U }) {
  const isUpgrade = confirm.newRole === 'administrador';
  const [descBefore, descAfter] = (isUpgrade ? U.confirmMakeDesc : U.confirmRevokeDesc).split('{name}');
  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '-0.02em', color: 'var(--type)', margin: '0 0 10px' }}>
        {isUpgrade ? U.confirmMakeTitle : U.confirmRevokeTitle}
      </h2>
      <p style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--type-muted)', margin: '0 0 24px', lineHeight: 1.55 }}>
        {descBefore}<strong style={{ color: 'var(--type)' }}>{confirm.name}</strong>{descAfter}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--type-muted)', fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', borderRadius: 'var(--radius-pill)', padding: '9px 18px' }}>
          {U.cancel}
        </button>
        <button onClick={onConfirm} disabled={saving} style={{ background: isUpgrade ? '#5170ff' : '#dc2626', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: '#fff', fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', borderRadius: 'var(--radius-pill)', padding: '9px 18px', opacity: saving ? .6 : 1, transition: 'opacity .2s' }}>
          {saving ? U.saving : U.confirmBtn}
        </button>
      </div>
    </Modal>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UsersPage({ user, onNavigate, onLogout, copy, theme, onThemeToggle }) {
  const U = copy.portal.users;
  const { isMobile } = useBreakpoint();
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [saving,     setSaving]     = useState(null);
  const [confirm,    setConfirm]    = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter,     setFilter]     = useState('todos'); // 'todos' | 'administrador' | 'cliente'

  const token = localStorage.getItem('token');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE_URL}/users.php`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || U.loadError);
      setUsers(data.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, U.loadError]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeRole = async (userId, newRole) => {
    setSaving(userId);
    try {
      const res  = await fetch(`${API_BASE_URL}/users.php?id=${userId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || U.updateRoleError);
      setUsers(prev => prev.map(u => String(u.id) === String(userId) ? { ...u, role: newRole } : u));
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(null);
      setConfirm(null);
    }
  };

  const handleToggleRole = (u) => {
    const newRole = u.role === 'administrador' ? 'cliente' : 'administrador';
    setConfirm({ userId: u.id, name: u.name || u.username, newRole });
  };

  const handleCreated = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
    setShowCreate(false);
  };

  const admins  = users.filter(u => u.role === 'administrador');
  const clients = users.filter(u => u.role === 'cliente');

  const filteredUsers = filter === 'administrador' ? admins
                      : filter === 'cliente'        ? clients
                      : [...admins, ...clients];

  const FILTERS = [
    { key: 'todos',          label: U.filterAll,     count: users.length  },
    { key: 'administrador',  label: U.filterAdmins,  count: admins.length },
    { key: 'cliente',        label: U.filterClients, count: clients.length },
  ];

  return (
    <PortalLayout user={user} onNavigate={onNavigate} onLogout={onLogout} copy={copy} theme={theme} onThemeToggle={onThemeToggle}>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: isMobile ? '32px 16px 60px' : '44px 28px 80px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 26 : 34, letterSpacing: '-0.03em', color: 'var(--type)', margin: 0, lineHeight: 1.1 }}>
              {U.title}
            </h1>
            <p style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)', margin: '7px 0 0' }}>
              {U.subtitle}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, width: isMobile ? '100%' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <RefreshButton onClick={fetchUsers} loading={loading} />

            {/* Botón crear administrador */}
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: '#5170ff', border: 'none', cursor: 'pointer',
                color: '#fff', fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
                borderRadius: 'var(--radius-pill)', padding: '10px 20px',
                transition: 'opacity .2s', flexShrink: 0,
                width: isMobile ? '100%' : 'auto',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {U.createAdminBtn}
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: U.kpiTotal,   value: users.length  },
            { label: U.kpiAdmins,  value: admins.length },
            { label: U.kpiClients, value: clients.length },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--type-muted)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 30, letterSpacing: '-0.03em', color: 'var(--type)', lineHeight: 1 }}>{loading ? '—' : value}</div>
            </div>
          ))}
        </div>

        {/* ── Panel de tabla ── */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

          {/* Toolbar: filtros */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', alignContent: 'stretch' }}>
            {/* Filtros */}
            <div style={{ display: 'flex', gap: 3, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: isMobile ? 'var(--radius-lg)' : 'var(--radius-pill)', padding: 3, width: isMobile ? '100%' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
                    padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: 0, cursor: 'pointer',
                    background: filter === f.key ? 'var(--type)' : 'transparent',
                    color:      filter === f.key ? 'var(--bg)'   : 'var(--type-muted)',
                    transition: 'background .2s, color .2s',
                    display: 'flex', alignItems: 'center', gap: 6,
                    justifyContent: 'center',
                    flex: isMobile ? '1 1 calc(50% - 3px)' : '0 0 auto',
                    minWidth: isMobile ? 'calc(50% - 3px)' : 'auto',
                  }}
                >
                  {f.label}
                  {!loading && (
                    <span style={{ fontFamily: 'var(--ui)', fontSize: 9, opacity: filter === f.key ? .7 : .5 }}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          {loading && (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-2)', fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)' }}>
              {U.loading}
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-2)', fontFamily: 'var(--body)', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          {!loading && !error && filteredUsers.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-2)', fontFamily: 'var(--body)', fontSize: 13, color: 'var(--type-muted)' }}>
              {U.emptyCategory}
            </div>
          )}

          {!loading && !error && filteredUsers.map((u, i) => (
            <UserRow
              key={u.id}
              u={u}
              isMe={String(u.id) === String(user?.id)}
              isSaving={String(saving) === String(u.id)}
              isMobile={isMobile}
              isLast={i === filteredUsers.length - 1}
              onToggleRole={handleToggleRole}
              onOpen={() => onNavigate(`/usuarios/${u.id}`)}
              U={U}
              locale={copy.portal.locale}
            />
          ))}
        </div>
      </main>

      {/* Modales */}
      {showCreate && (
        <CreateAdminModal onClose={() => setShowCreate(false)} onCreated={handleCreated} U={U} />
      )}

      {confirm && (
        <ConfirmModal
          confirm={confirm}
          saving={saving !== null}
          onConfirm={() => changeRole(confirm.userId, confirm.newRole)}
          onClose={() => setConfirm(null)}
          U={U}
        />
      )}
    </PortalLayout>
  );
}
