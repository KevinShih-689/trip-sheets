import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 預設 node(純函式);組件測試以檔頭 `@vitest-environment jsdom` 個別切換
    environment: 'node',
    include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts', 'components/**/*.test.tsx'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/parse-sheet.ts',
        'lib/parse-stores.ts',
        'lib/suggestions.ts',
        'lib/store-types.ts',
        'lib/haversine.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
  // tsconfig 的 jsx 是 preserve(交給 Next),測試環境需自行指定 runtime
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': new URL('.', import.meta.url).pathname.replace(/\/$/, '') },
  },
});
