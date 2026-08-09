import PrivacyPage from '../components/PrivacyPage';
import { useSharedNavProps } from '../lib/useSharedNavProps';

export default function PrivacyIsland() {
  return <PrivacyPage {...useSharedNavProps()} />;
}
