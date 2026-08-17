import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { storesFileSchema } from './schema';
import type { StoresFile } from './types';

const DATA_PATH = join(process.cwd(), 'data', 'stores.json');
const SAMPLE_PATH = join(process.cwd(), 'data', 'stores.sample.json');

let cached: StoresFile | null = null;

/**
 * Build time 讀取 stores.json(CI 由 fetch-stores 產生)。
 * 本機無正式資料時 fallback 至 sample,行為比照 `trip-data.ts`。
 */
export function getStoresData(): StoresFile {
  if (cached) return cached;
  const path = existsSync(DATA_PATH) ? DATA_PATH : SAMPLE_PATH;
  if (path === SAMPLE_PATH) {
    console.warn(
      '[stores-data] data/stores.json 不存在,使用 sample 資料(pnpm fetch-stores 產生正式資料)',
    );
  }
  const raw: unknown = JSON.parse(readFileSync(path, 'utf-8'));
  cached = storesFileSchema.parse(raw);
  return cached;
}
