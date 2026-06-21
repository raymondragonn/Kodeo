import Nav from './Nav';
import Footer from './Footer';
import StackPricing from './StackPricing';

export default function StackPricingPage({
  copy, motionSpeed = 1,
  onBack, onNavItemClick, onContact, onNavigate, onServiceClick, onAuthClick,
  onLogout, user, theme, onThemeToggle,
}) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--type)' }}>
      <Nav
        copy={copy}
        onLogoClick={onBack}
        onNavItemClick={onNavItemClick}
        onContact={onContact}
        onServiceClick={onServiceClick}
        onAuthClick={onAuthClick}
        onLogout={onLogout}
        user={user}
        theme={theme}
        onThemeToggle={onThemeToggle}
      />

      <StackPricing copy={copy} motionSpeed={motionSpeed} onServiceClick={onServiceClick} />

      <Footer copy={copy} motionSpeed={motionSpeed} onNavigate={onNavigate} />
    </div>
  );
}
