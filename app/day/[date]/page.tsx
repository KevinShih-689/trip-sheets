import { notFound } from 'next/navigation';
import { DayView } from '@/components/DayView';
import { getStoresData } from '@/lib/stores-data';
import { getTripData } from '@/lib/trip-data';

export function generateStaticParams(): { date: string }[] {
  return getTripData().days.map((d) => ({ date: d.date }));
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<React.JSX.Element> {
  const { date } = await params;
  const data = getTripData();
  const day = data.days.find((d) => d.date === date);
  if (!day) notFound();

  const dayIndex = data.days.findIndex((d) => d.date === date) + 1;
  // 推薦店家資料於 build time 烙入頁面,執行期不再呼叫任何 API(spec §1)
  const { stores, areaCenters } = getStoresData();

  return (
    <DayView
      day={day}
      dayIndex={dayIndex}
      stores={stores}
      areaCenter={areaCenters[day.mainArea] ?? null}
    />
  );
}
