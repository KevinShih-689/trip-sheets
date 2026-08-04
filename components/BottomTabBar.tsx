'use client';

import { Flex } from '@chakra-ui/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TRIP_DATES } from '@/lib/constants';

interface TabDef {
  href: string;
  label: string;
  isDay: boolean;
}

const TABS: readonly TabDef[] = [
  { href: '/', label: '總覽', isDay: false },
  ...TRIP_DATES.map((d) => ({
    href: `/day/${d}`,
    label: String(Number(d.slice(8))),
    isDay: true,
  })),
  { href: '/backlog', label: '行前', isDay: false },
];

export function BottomTabBar(): React.JSX.Element {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(href);
  };

  return (
    <Flex
      as="nav"
      position="fixed"
      bottom="0"
      left="50%"
      transform="translateX(-50%)"
      w="100%"
      maxW="430px"
      align="stretch"
      borderTopWidth="1px"
      borderColor="mario.line"
      bg="#0D0F17"
      pb="env(safe-area-inset-bottom)"
      zIndex={100}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link key={tab.href} href={tab.href} style={{ flex: 1, color: 'inherit' }}>
            <Flex
              direction="column"
              align="center"
              justify="center"
              minH="var(--tabbar-h)"
              borderTopWidth="2px"
              borderTopColor={active ? 'mario.yellow' : 'transparent'}
              color={active ? 'mario.yellow' : 'mario.faint'}
              fontFamily={tab.isDay ? 'mono' : 'body'}
              fontSize={tab.isDay ? '15px' : '13px'}
              fontWeight="500"
            >
              {tab.label}
            </Flex>
          </Link>
        );
      })}
    </Flex>
  );
}
