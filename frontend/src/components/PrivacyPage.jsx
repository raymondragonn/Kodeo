import Nav from './Nav';
import Footer from './Footer';
import { useBreakpoint } from '../hooks/useBreakpoint';

const Section = ({ title, children, isMobile }) => (
  <div style={{ marginBottom: 44 }}>
    <h2 style={{
      fontFamily: 'var(--display)',
      fontSize: isMobile ? 'clamp(18px, 5vw, 24px)' : 'clamp(20px, 2.5vw, 28px)',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      marginBottom: 14,
      color: 'var(--type)',
    }}>
      {title}
    </h2>
    <div style={{
      fontFamily: 'var(--body)',
      fontSize: 15,
      lineHeight: 1.75,
      color: 'var(--type-soft)',
    }}>
      {children}
    </div>
  </div>
);

export default function PrivacyPage({ copy, motionSpeed = 1, onBack, onNavItemClick, onContact, onNavigate, onServiceClick, onAuthClick }) {
  const p = copy.legal.privacy;
  const { isMobile } = useBreakpoint();

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--type)' }}>
      <Nav
        copy={copy}
        onLogoClick={onBack}
        onNavItemClick={onNavItemClick}
        onContact={onContact}
        onServiceClick={onServiceClick}
        onAuthClick={onAuthClick}
      />

      <main style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: isMobile ? '48px 20px 80px' : '80px 36px 120px',
      }}>
        <div style={{
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginBottom: 24,
        }}>
          {p.eyebrow}
        </div>

        <h1 style={{
          fontFamily: 'var(--display)',
          fontWeight: 400,
          fontSize: isMobile ? 'clamp(38px, 11vw, 70px)' : 'clamp(42px, 7vw, 80px)',
          lineHeight: 0.95,
          letterSpacing: '-0.04em',
          margin: '0 0 48px',
          paddingBottom: '0.1em',
        }}>
          {p.title}
        </h1>

        <p style={{
          fontFamily: 'var(--body)',
          fontSize: 15,
          lineHeight: 1.75,
          color: 'var(--type-soft)',
          marginBottom: 48,
          borderBottom: '1px solid var(--line)',
          paddingBottom: 36,
        }}>
          {p.intro}
        </p>

        {p.sections.map((s) => (
          <Section key={s.title} title={s.title} isMobile={isMobile}>
            {s.body}
          </Section>
        ))}

        <p style={{
          fontFamily: 'var(--ui)',
          fontSize: 11,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--type-soft)',
          marginTop: 56,
          borderTop: '1px solid var(--line)',
          paddingTop: 28,
        }}>
          {p.updated}
        </p>
      </main>

      <Footer copy={copy} motionSpeed={motionSpeed} hideTalk onNavigate={onNavigate} />
    </div>
  );
}
