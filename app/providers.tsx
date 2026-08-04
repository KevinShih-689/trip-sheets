'use client';

import { ChakraProvider } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { system } from '@/lib/theme';

export function Providers({ children }: { children: ReactNode }): React.JSX.Element {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
