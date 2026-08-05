import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Noto_Sans_TC, Press_Start_2P } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { AppNav } from '@/components/AppNav';
import { Splash } from '@/components/Splash';
import { SwRegister } from '@/components/SwRegister';
import { TRIP_EYEBROW, TRIP_TITLE } from '@/lib/constants';
import { dayCostSum } from '@/lib/format';
import { getTripData } from '@/lib/trip-data';
import './globals.css';

const notoSans = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
});
const pressStart = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pixel',
  display: 'swap',
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: `${TRIP_TITLE} | Trip Sheets`,
  description: `${TRIP_EYEBROW} 行程網站`,
  manifest: `${basePath}/manifest.json`,
  icons: { icon: `${basePath}/icons/icon-192.png`, apple: `${basePath}/icons/icon-192.png` },
};

export const viewport: Viewport = {
  themeColor: '#0B0D14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  const data = getTripData();
  const navDays = data.days.map((d) => ({
    date: d.date,
    dayNum: String(Number(d.date.slice(8))),
    area: d.mainArea,
  }));
  const totalYen = data.days.reduce((sum, d) => sum + dayCostSum(d.items.map((i) => i.estimatedCostJpy)), 0);

  return (
    <html lang="zh-Hant" className={`${notoSans.variable} ${plexMono.variable} ${pressStart.variable}`} suppressHydrationWarning>
      <body>
        <Providers>
          <Splash />
          <SwRegister />
          <div className="app-shell">
            <AppNav days={navDays} generatedAt={data.generatedAt} totalYen={totalYen} />
            <main className="app-main">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
