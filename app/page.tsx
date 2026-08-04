import { getTripData } from '@/lib/trip-data';
import { OverviewClient } from '@/components/OverviewClient';

export default function OverviewPage(): React.JSX.Element {
  const data = getTripData();
  return <OverviewClient days={data.days} generatedAt={data.generatedAt} />;
}
