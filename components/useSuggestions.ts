'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AREA_RADIUS_KM,
  GEOLOCATION_TIMEOUT_MS,
  GEO_RADIUS_KM,
  SEARCH_SKELETON_MS,
} from '@/lib/constants';
import { DEFAULT_STORE_TYPE, type StoreTypeKey } from '@/lib/store-types';
import { selectSuggestions, type SuggestedStore } from '@/lib/suggestions';
import type { LatLng, Store } from '@/lib/types';

export const GEO_FAILURE_NOTICE = '無法取得位置,改用區域中心';

/** 提示訊息的顯示時間(ms);短暫出現後自動消失,不需使用者關閉 */
const NOTICE_MS = 4000;

export interface UseSuggestions {
  readonly type: StoreTypeKey;
  readonly setType: (type: StoreTypeKey) => void;
  /** true = 以裝置目前位置搜尋(spec §4.2 的 searchMode) */
  readonly searchMode: boolean;
  readonly toggleSearchMode: () => void;
  readonly loading: boolean;
  readonly notice: string | null;
  readonly results: readonly SuggestedStore[];
  /**
   * 目前選取(= 定錨 + 展開)的結果索引;-1 = 未選取,地圖停在基準錨。
   * 選取與展開是同一件事,不存在「已定錨但收合」的中間態。
   */
  readonly selectedIndex: number;
  readonly select: (index: number) => void;
  readonly radiusKm: number;
  /** 搜尋中心;當日無區域中心且未開啟目前位置模式時為 null */
  readonly center: LatLng | null;
  /** 目前位置模式開啟且已取得座標時的裝置位置,供基準錨使用 */
  readonly deviceCenter: LatLng | null;
  /** 回到預設狀態(餐廳 × 區域中心 × 未選取);每次進入推薦 Tab 時呼叫 */
  readonly reset: () => void;
}

/**
 * 推薦店家的搜尋狀態機。
 *
 * 過濾本身是同步的本地運算,skeleton 由 `SEARCH_SKELETON_MS` 的計時器製造 —
 * spec §4.2 要求每次搜尋都有 loading 回饋,否則結果瞬間替換會看不出發生了什麼。
 */
export function useSuggestions(
  stores: readonly Store[],
  areaCenter: LatLng | null,
): UseSuggestions {
  const [type, setTypeState] = useState<StoreTypeKey>(DEFAULT_STORE_TYPE);
  const [searchMode, setSearchMode] = useState(false);
  const [deviceCenter, setDeviceCenter] = useState<LatLng | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  // 每次搜尋觸發時 +1,驅動 skeleton 與選取重置
  const [searchToken, setSearchToken] = useState(0);

  const center = searchMode ? deviceCenter : areaCenter;
  const radiusKm = searchMode ? GEO_RADIUS_KM : AREA_RADIUS_KM;

  const results = useMemo(
    () => (center ? selectSuggestions(stores, { center, radiusKm, type }) : []),
    [stores, center, radiusKm, type],
  );

  useEffect(() => {
    setLoading(true);
    // 選取是以索引表示的,新結果一出爐舊索引就指向別家店 —— 因此在搜尋起點
    // 就清掉選取,地圖同時回到基準錨(spec §4.2:完成後不自動定錨任何店家)
    setSelectedIndex(-1);
    const timer = setTimeout(() => {
      setLoading(false);
    }, SEARCH_SKELETON_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [searchToken]);

  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, NOTICE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  const setType = useCallback((next: StoreTypeKey): void => {
    setTypeState(next);
    setSearchToken((n) => n + 1);
  }, []);

  const toggleSearchMode = useCallback((): void => {
    // 關閉:直接退回區域中心,不需要權限
    if (searchMode) {
      setSearchMode(false);
      setSearchToken((n) => n + 1);
      return;
    }

    const failToAreaCenter = (): void => {
      setSearchMode(false);
      setNotice(GEO_FAILURE_NOTICE);
      setSearchToken((n) => n + 1);
    };

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      failToAreaCenter();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setSearchMode(true);
        setNotice(null);
        setSearchToken((n) => n + 1);
      },
      failToAreaCenter,
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 60_000 },
    );
  }, [searchMode]);

  const select = useCallback((index: number): void => {
    // 點擊 = 選取(定錨 + 展開),再點同一筆 = 取消選取(收合 + 回基準錨)
    setSelectedIndex((current) => (current === index ? -1 : index));
  }, []);

  const reset = useCallback((): void => {
    setTypeState(DEFAULT_STORE_TYPE);
    setSearchMode(false);
    setNotice(null);
    // searchToken 前進即重播 skeleton 並清除選取
    setSearchToken((n) => n + 1);
  }, []);

  return {
    type,
    setType,
    searchMode,
    toggleSearchMode,
    loading,
    notice,
    results,
    selectedIndex,
    select,
    radiusKm,
    center,
    deviceCenter: searchMode ? deviceCenter : null,
    reset,
  };
}
