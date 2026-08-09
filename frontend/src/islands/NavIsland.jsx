import Nav from '../components/Nav';
import { useSharedNavProps } from '../lib/useSharedNavProps';

/** Nav suelto, para las páginas Astro que no montan un componente de página. */
export default function NavIsland() {
  const p = useSharedNavProps();
  return (
    <Nav
      copy={p.copy}
      user={p.user}
      theme={p.theme}
      onThemeToggle={p.onThemeToggle}
      onLogoClick={p.onLogoClick}
      onNavItemClick={p.onNavItemClick}
      onContact={p.onContact}
      onServiceClick={p.onServiceClick}
      onAuthClick={p.onAuthClick}
      onLogout={p.onLogout}
    />
  );
}
