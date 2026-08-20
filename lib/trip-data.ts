import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tripDataSchema } from './schema';
import type { TripData } from './types';

const DATA_PATH = join(process.cwd(), 'data', 'trip-data.json');
const SAMPLE_PATH = join(process.cwd(), 'data', 'trip-data.sample.json');

let cached: TripData | null = null;

/**
 * Build time 讀取 trip-data.json(CI 由 fetch-sheet 產生)。
 * 本機無正式資料時 fallback 至 sample,並於 console 提示。
 */
export function getTripData(): TripData {
  if (cached) return cached;
  const path = existsSync(DATA_PATH) ? DATA_PATH : SAMPLE_PATH;
  if (path === SAMPLE_PATH) {
    console.warn(
      '[trip-data] data/trip-data.json 不存在,使用 sample 資料(pnpm fetch-sheet 產生正式資料)',
    );
  }
  const raw: unknown = JSON.parse(readFileSync(path, 'utf-8'));
  cached = tripDataSchema.parse(raw);
  return cached;
}
