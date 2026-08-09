import TermsPage from '../components/TermsPage';
import { useSharedNavProps } from '../lib/useSharedNavProps';

export default function TermsIsland() {
  return <TermsPage {...useSharedNavProps()} />;
}
