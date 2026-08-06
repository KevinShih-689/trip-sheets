'use client';

import { Box, Flex } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { QBlock } from './QBlock';
import { SPLASH_WORLD } from '@/lib/constants';

const SESSION_KEY = 'trip-splash-shown';
const DURATION_MS = 1200;
const FADE_MS = 250;

/**
 * 虛擬載入 splash(spec §4.3):每 session 播一次、~1.2s、
 * prefers-reduced-motion 直接跳過。純品牌動畫,無實際請求。
 */
export function Splash(): React.JSX.Element | null {
  const [phase, setPhase] = useState<'show' | 'fade' | 'done'>('show');

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || sessionStorage.getItem(SESSION_KEY) === '1') {
      setPhase('done');
      return;
    }
    sessionStorage.setItem(SESSION_KEY, '1');
    const t1 = window.setTimeout(() => setPhase('fade'), DURATION_MS);
    const t2 = window.setTimeout(() => setPhase('done'), DURATION_MS + FADE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <Flex
      position="fixed"
      inset="0"
      zIndex={1000}
      direction="column"
      bg="pixel.pagebg"
      opacity={phase === 'fade' ? 0 : 1}
      transition={`opacity ${FADE_MS}ms ease-out`}
      aria-hidden="true"
    >
      <Flex flex="1" direction="column" align="center" justify="center">
        <Box position="relative">
          <div className="splash-coin pop">
            <span className="slit" />
          </div>
          <QBlock />
        </Box>
        <Box className="ldots" fontFamily="pixel" fontSize="11px" color="pixel.text" mt="40px">
          LOADING
        </Box>
        <div className="splash-pbar" style={{ marginTop: 18 }}>
          <div className="splash-pfill load" />
        </div>
        <Box fontFamily="pixel" fontSize="8px" color="pixel.faint" mt="18px">
          {SPLASH_WORLD}
        </Box>
      </Flex>
      <div className="splash-ground run" />
    </Flex>
  );
}
