import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

/**
 * 定稿色彩 tokens(spec §4.4,Claude Design Trip UI v3)。
 * 四個瑪利歐代表色僅作強調;底色為地下關卡深藍夜色調。
 */
const config = defineConfig({
  globalCss: {
    'html, body': {
      bg: 'mario.pagebg',
      color: 'mario.text',
      fontFamily: 'body',
    },
  },
  theme: {
    tokens: {
      colors: {
        mario: {
          pagebg: { value: '#0B0D14' },
          bg: { value: '#12141D' },
          surface: { value: '#1A1D28' },
          surface2: { value: '#202433' },
          line: { value: 'rgba(235,240,255,0.09)' },
          text: { value: '#EDEFF7' },
          dim: { value: '#A7ACBD' },
          faint: { value: '#6D7284' },
          red: { value: '#E52521' },
          redT: { value: '#F2635F' },
          blue: { value: '#049CD8' },
          blueT: { value: '#4FC0EC' },
          yellow: { value: '#FBD000' },
          green: { value: '#43B047' },
          greenT: { value: '#6FCE73' },
        },
      },
      fonts: {
        body: { value: 'var(--font-noto), sans-serif' },
        mono: { value: 'var(--font-plex), monospace' },
        pixel: { value: 'var(--font-pixel), monospace' },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
