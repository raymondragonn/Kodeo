import MethodologyPage from '../components/MethodologyPage';
import { useSharedNavProps } from '../lib/useSharedNavProps';

export default function MethodologyIsland() {
  return <MethodologyPage {...useSharedNavProps()} />;
}
