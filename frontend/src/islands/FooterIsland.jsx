import Footer from '../components/Footer';
import { useSharedNavProps } from '../lib/useSharedNavProps';

/** Footer suelto, para las páginas Astro que no montan un componente de página. */
export default function FooterIsland() {
  const p = useSharedNavProps();
  return <Footer copy={p.copy} motionSpeed={p.motionSpeed} onNavigate={p.onNavigate} />;
}
