import StackPricingPage from '../components/StackPricingPage';
import { useSharedNavProps } from '../lib/useSharedNavProps';

export default function StackPricingIsland() {
  return <StackPricingPage {...useSharedNavProps()} />;
}
