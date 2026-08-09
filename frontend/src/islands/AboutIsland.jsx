import AboutPage from '../components/AboutPage';
import { useSharedNavProps } from '../lib/useSharedNavProps';

export default function AboutIsland() {
  return <AboutPage {...useSharedNavProps()} />;
}
