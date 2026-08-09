import StackPage from '../components/StackPage';
import { useSharedNavProps } from '../lib/useSharedNavProps';

export default function StackIsland() {
  return <StackPage {...useSharedNavProps()} />;
}
