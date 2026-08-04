import { Box, Flex } from '@chakra-ui/react';
import { QBlock } from './QBlock';

interface Props {
  title: string;
  hint?: string;
}

/** 瑪利歐問號方塊空狀態(spec §4.3;純 CSS,無版權素材) */
export function EmptyState({ title, hint }: Props): React.JSX.Element {
  const sheetsUrl = process.env.NEXT_PUBLIC_SHEETS_URL;
  return (
    <Flex direction="column" align="center" justify="center" flex="1" px="40px" py="60px">
      <QBlock />
      <Box fontFamily="pixel" fontSize="11px" color="mario.yellow" mt="28px">
        NO DATA
      </Box>
      <Box fontSize="14px" fontWeight="500" mt="14px">
        {title}
      </Box>
      {hint && (
        <Box fontSize="12.5px" color="mario.dim" mt="8px" textAlign="center" lineHeight="1.7" style={{ textWrap: 'pretty' }}>
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
