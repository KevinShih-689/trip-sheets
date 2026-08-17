import { Box, Flex } from '@chakra-ui/react';
import { QBlock } from './QBlock';

interface Props {
  title: string;
  hint?: string;
}

/** 8-bit 問號方塊空狀態(純 CSS 原創繪製,無第三方版權素材) */
export function EmptyState({ title, hint }: Props): React.JSX.Element {
  const sheetsUrl = process.env.NEXT_PUBLIC_SHEETS_URL;
  return (
    <Flex direction="column" align="center" justify="center" flex="1" px="40px" py="60px">
      <QBlock />
      <Box fontFamily="pixel" fontSize="11px" color="pixel.yellow" mt="28px">
        NO DATA
      </Box>
      <Box fontSize="14px" fontWeight="500" mt="14px">
        {title}
      </Box>
      {hint && (
        <Box
          fontSize="12.5px"
          color="pixel.dim"
          mt="8px"
          textAlign="center"
          lineHeight="1.7"
          style={{ textWrap: 'pretty' }}
        >
          {hint}
        </Box>
      )}
      {sheetsUrl && (
        <Box mt="18px" fontSize="13px">
          <a href={sheetsUrl} target="_blank" rel="noreferrer">
            開啟 Google Sheets ↗
          </a>
        </Box>
      )}
    </Flex>
  );
}
