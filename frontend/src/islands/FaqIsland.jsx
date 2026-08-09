import FaqPage from '../components/FaqPage';
import { useSharedNavProps } from '../lib/useSharedNavProps';

export default function FaqIsland() {
  return <FaqPage {...useSharedNavProps()} />;
}
