import ServicePage from '../components/ServicePage';
import { useSharedNavProps } from '../lib/useSharedNavProps';

/**
 * `code` ('01' | '02' | '03') llega desde la página Astro, que lo resuelve del
 * slug en build. El servicio se busca en el copy ya traducido, igual que hacía
 * ServicePageRoute en App.jsx.
 */
export default function ServiceIsland({ code }) {
  const props = useSharedNavProps();
  const service = props.copy.services.list.find((s) => s.code === code);
  if (!service) return null;

  return <ServicePage {...props} service={service} />;
}
