/**
 * @vitest-environment jsdom
 *
 * 日頁面的互動測試(spec §4):Tab 切換與重置、定錨與基準錨、目前位置模式、
 * 類型選擇器、行程定錨。搜尋本身的正確性由 lib/suggestions.test.ts 覆蓋,
 * 地圖 src 的組裝由 lib/map-anchor.test.ts 覆蓋 —— 這裡只驗「現在定錨在哪」。
 */
import { ChakraProvider } from '@chakra-ui/react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DayView } from './DayView';
import { GEO_FAILURE_NOTICE } from './useSuggestions';
import { system } from '@/lib/theme';
import type { Store, TripDay } from '@/lib/types';

const NAMBA = { lat: 34.6659, lng: 135.5016 };

const DAY: TripDay = {
  date: '2026-12-14',
  weekdayZh: '一',
  mainArea: '難波',
  accommodation: 'Hotel X',
  highlight: '早點出發',
  items: [
    {
      timeSlot: '09:00',
      category: '景點',
      name: '道頓堀',
      area: '難波',
      transport: '步行',
      openingHours: '',
      estimatedCostJpy: 0,
      reservationStatus: null,
      link: null,
      note: '',
    },
    {
      timeSlot: '12:00',
      category: '餐廳',
      name: '黑門市場',
      area: '日本橋',
      transport: '步行',
      openingHours: '',
      estimatedCostJpy: 2000,
      reservationStatus: null,
      link: null,
      note: '',
    },
  ],
};

function store(overrides: Partial<Store> = {}): Store {
  return {
    name: '近的餐廳',
    note: '要排隊',
    address: '大阪市中央区難波1-1-1',
    lat: 34.6669,
    lng: 135.5016,
    types: ['restaurant'],
    mapsUri: 'https://maps.google.com/?cid=1',
    ...overrides,
  };
}

function renderDay(stores: Store[] = [store()], areaCenter = NAMBA, day: TripDay = DAY): void {
  render(
    <ChakraProvider value={system}>
      <DayView day={day} dayIndex={1} stores={stores} areaCenter={areaCenter} />
    </ChakraProvider>,
  );
}

/** 等搜尋 skeleton 結束(SEARCH_SKELETON_MS 之後) */
async function settle(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByTestId('store-list-skeleton')).not.toBeTruthy();
  });
}

/** 目前定錨的目標:地圖 iframe 的 src 是唯一對外可觀察的證據 */
function expectAnchoredTo(query: string): void {
  const src = screen.getByTitle(/^地圖:/).getAttribute('src') ?? '';
  expect(src).toContain(encodeURIComponent(query));
}

function expectNothingExpanded(): void {
  expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(0);
}

beforeEach(() => {
  window.history.replaceState(null, '', '/day/2026-12-14/');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Tab 切換(spec §4.1)', () => {
  it('預設停在行程 Tab,顯示行程內容', () => {
    renderDay();
    expect(screen.getByRole('tab', { name: '行程' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('道頓堀')).toBeTruthy();
  });

  it('切到推薦後將 tab 寫進 URL query', async () => {
    const user = userEvent.setup();
    renderDay();

    await user.click(screen.getByRole('tab', { name: '推薦' }));

    expect(new URLSearchParams(window.location.search).get('tab')).toBe('suggestions');
    expect(screen.getByRole('tab', { name: '推薦' }).getAttribute('aria-selected')).toBe('true');
  });

  it('切回行程時移除 query,不留下殘值', async () => {
    const user = userEvent.setup();
    renderDay();

    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await user.click(screen.getByRole('tab', { name: '行程' }));

    expect(new URLSearchParams(window.location.search).get('tab')).toBeNull();
    expect(screen.getByText('道頓堀')).toBeTruthy();
  });

  it('帶 ?tab=suggestions 進入頁面時直接落在推薦 Tab(重整/分享保留狀態)', async () => {
    window.history.replaceState(null, '', '/day/2026-12-14/?tab=suggestions');
    renderDay();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '推薦' }).getAttribute('aria-selected')).toBe('true');
    });
  });
});

describe('進入推薦 Tab 時全量重置(spec §4.1)', () => {
  it('離開再回來時類型回餐廳、無選取、地圖回區域基準錨', async () => {
    const user = userEvent.setup();
    renderDay([store(), store({ name: '咖啡店', types: ['cafe'], mapsUri: 'https://x/2' })]);

    // 先把狀態弄髒:換類型 + 選一家店
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await user.click(screen.getByRole('button', { name: /店家類型:餐廳/ }));
    await user.click(screen.getByRole('menuitem', { name: '咖啡甜點' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /咖啡店/ }));
    expectAnchoredTo('咖啡店 大阪市中央区難波1-1-1');

    await user.click(screen.getByRole('tab', { name: '行程' }));
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    expect(screen.getByRole('button', { name: /店家類型:餐廳/ })).toBeTruthy();
    expect(screen.getByText('近的餐廳')).toBeTruthy();
    expect(screen.queryByText('咖啡店')).toBeNull();
    expectNothingExpanded();
    expectAnchoredTo('難波 日本');
  });

  it('目前位置模式在回到推薦 Tab 時退回關閉', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: ((onSuccess: PositionCallback) => {
          onSuccess({ coords: { latitude: 34.6669, longitude: 135.5016 } } as GeolocationPosition);
        }) as Geolocation['getCurrentPosition'],
      },
      onLine: true,
    });
    renderDay();

    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /目前位置模式:關閉/ }));
    await settle();
    expect(
      screen.getByRole('button', { name: /目前位置模式:開啟/ }).getAttribute('aria-pressed'),
    ).toBe('true');

    await user.click(screen.getByRole('tab', { name: '行程' }));
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    expect(
      screen.getByRole('button', { name: /目前位置模式:關閉/ }).getAttribute('aria-pressed'),
    ).toBe('false');
    expectAnchoredTo('難波 日本');
  });
});

describe('推薦列表與定錨(spec §4.2–4.4)', () => {
  it('每次搜尋先顯示 skeleton,結束後列出店名與距離', async () => {
    const user = userEvent.setup();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));

    expect(screen.getByTestId('store-list-skeleton')).toBeTruthy();

    await settle();
    expect(screen.getByText('近的餐廳')).toBeTruthy();
    expect(screen.getByText('0.1km')).toBeTruthy();
  });

  it('搜尋完成後不自動定錨任何店家,地圖停在區域基準錨', async () => {
    const user = userEvent.setup();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    expectNothingExpanded();
    expectAnchoredTo('難波 日本');
  });

  it('點列表項展開詳細資訊並定錨該店', async () => {
    const user = userEvent.setup();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /近的餐廳/ }));

    const link = screen.getByRole('link', { name: /在 Google Maps 開啟/ });
    expect(link.getAttribute('href')).toBe('https://maps.google.com/?cid=1');
    expect(screen.getByText('要排隊')).toBeTruthy();
    expectAnchoredTo('近的餐廳 大阪市中央区難波1-1-1');
  });

  it('再點一次同一列取消選取:收合並回到基準錨', async () => {
    const user = userEvent.setup();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    const row = screen.getByRole('button', { name: /近的餐廳/ });
    await user.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('true');

    await user.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expectAnchoredTo('難波 日本');
  });

  it('點另一列時換選取:同一時刻只展開一項,定錨跟著換', async () => {
    const user = userEvent.setup();
    renderDay([store(), store({ name: '遠的餐廳', lat: 34.6759, mapsUri: 'https://x/2' })]);
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /近的餐廳/ }));
    await user.click(screen.getByRole('button', { name: /遠的餐廳/ }));

    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /遠的餐廳/ }).getAttribute('aria-expanded')).toBe(
      'true',
    );
    expectAnchoredTo('遠的餐廳 大阪市中央区難波1-1-1');
  });

  it('切換類型後以新類型重新搜尋,並清除先前的選取', async () => {
    const user = userEvent.setup();
    renderDay([store(), store({ name: '咖啡店', types: ['cafe'], mapsUri: 'https://x/2' })]);
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /近的餐廳/ }));
    expectAnchoredTo('近的餐廳 大阪市中央区難波1-1-1');

    await user.click(screen.getByRole('button', { name: /店家類型:餐廳/ }));
    await user.click(screen.getByRole('menuitem', { name: '咖啡甜點' }));
    await settle();

    expect(screen.getByText('咖啡店')).toBeTruthy();
    expect(screen.queryByText('近的餐廳')).toBeNull();
    expectNothingExpanded();
    expectAnchoredTo('難波 日本');
  });

  it('範圍內沒有店家時顯示 EmptyState(不自動擴大半徑)', async () => {
    const user = userEvent.setup();
    renderDay([store({ name: '京都的店', lat: 35.0116, lng: 135.7681 })]);
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    expect(screen.getByText('此範圍內沒有符合的店家')).toBeTruthy();
    expect(screen.queryByText('京都的店')).toBeNull();
  });

  it('當日沒有活動區域且未開定位時,地圖顯示引導開啟定位的佔位', async () => {
    const user = userEvent.setup();
    renderDay([store()], NAMBA, { ...DAY, mainArea: '' });
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    expect(screen.getByText('[ 尚未設定活動區域,可開啟目前位置 ]')).toBeTruthy();
  });
});

describe('目前位置模式(spec §4.2 / §4.5)', () => {
  function stubGeolocation(impl: Partial<Geolocation>): void {
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { getCurrentPosition: vi.fn(), ...impl },
      onLine: true,
    });
  }

  it('取得位置成功後以裝置位置搜尋,基準錨改為裝置位置', async () => {
    const user = userEvent.setup();
    stubGeolocation({
      getCurrentPosition: ((onSuccess: PositionCallback) => {
        onSuccess({ coords: { latitude: 34.6669, longitude: 135.5016 } } as GeolocationPosition);
      }) as Geolocation['getCurrentPosition'],
    });
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /目前位置模式:關閉/ }));
    await settle();

    expect(
      screen.getByRole('button', { name: /目前位置模式:開啟/ }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByText('近的餐廳')).toBeTruthy();
    expectNothingExpanded();
    expectAnchoredTo('34.6669,135.5016');
  });

  it('關閉目前位置模式後基準錨回到當日區域', async () => {
    const user = userEvent.setup();
    stubGeolocation({
      getCurrentPosition: ((onSuccess: PositionCallback) => {
        onSuccess({ coords: { latitude: 34.6669, longitude: 135.5016 } } as GeolocationPosition);
      }) as Geolocation['getCurrentPosition'],
    });
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /目前位置模式:關閉/ }));
    await settle();
    await user.click(screen.getByRole('button', { name: /目前位置模式:開啟/ }));
    await settle();

    expectAnchoredTo('難波 日本');
  });

  it('拒絕權限時提示並自動退回區域中心,按鈕可再點擊重試', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn(
      (_onSuccess: PositionCallback, onError?: PositionErrorCallback) => {
        onError?.({ code: 1, message: 'denied' } as GeolocationPositionError);
      },
    );
    stubGeolocation({
      getCurrentPosition: getCurrentPosition as Geolocation['getCurrentPosition'],
    });
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /目前位置模式:關閉/ }));

    expect(await screen.findByText(GEO_FAILURE_NOTICE)).toBeTruthy();
    await settle();

    // 退回關閉狀態,且仍以區域中心 5km 的結果呈現
    const toggle = screen.getByRole('button', { name: /目前位置模式:關閉/ });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('近的餐廳')).toBeTruthy();
    expectAnchoredTo('難波 日本');

    // 可重試
    await user.click(toggle);
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('裝置不支援定位時同樣退回區域中心', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', { ...window.navigator, geolocation: undefined, onLine: true });
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /目前位置模式:關閉/ }));

    expect(await screen.findByText(GEO_FAILURE_NOTICE)).toBeTruthy();
  });
});

describe('類型選擇器(spec §4.5)', () => {
  it('行程 Tab 不顯示 Avatar 與定位按鈕,切到推薦才出現', async () => {
    const user = userEvent.setup();
    renderDay();

    expect(screen.queryByRole('button', { name: /店家類型/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /目前位置模式/ })).toBeNull();

    await user.click(screen.getByRole('tab', { name: '推薦' }));

    expect(screen.getByRole('button', { name: /店家類型/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /目前位置模式/ })).toBeTruthy();
  });

  it('選單固定列出全部五類,順序不隨目前類型改變', async () => {
    const user = userEvent.setup();
    renderDay([store(), store({ name: '咖啡店', types: ['cafe'], mapsUri: 'https://x/2' })]);
    await user.click(screen.getByRole('tab', { name: '推薦' }));

    const order = ['餐廳', '咖啡甜點', '購物', '景點', '其他'];

    await user.click(screen.getByRole('button', { name: /店家類型:餐廳/ }));
    expect(
      within(screen.getByRole('menu'))
        .getAllByRole('menuitem')
        .map((item) => item.getAttribute('aria-label')),
    ).toEqual(order);

    // 換一個類型後再開,順序與筆數都不變
    await user.click(screen.getByRole('menuitem', { name: '咖啡甜點' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /店家類型:咖啡甜點/ }));
    expect(
      within(screen.getByRole('menu'))
        .getAllByRole('menuitem')
        .map((item) => item.getAttribute('aria-label')),
    ).toEqual(order);
  });

  it('目前類型在選單中以 aria-current 標示', async () => {
    const user = userEvent.setup();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await user.click(screen.getByRole('button', { name: /店家類型:餐廳/ }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: '餐廳' }).getAttribute('aria-current')).toBe(
      'true',
    );
    expect(
      within(menu).getByRole('menuitem', { name: '購物' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('點選目前類型只收合選單,不重新搜尋', async () => {
    const user = userEvent.setup();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /店家類型:餐廳/ }));
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: '餐廳' }));

    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByTestId('store-list-skeleton')).toBeNull();
  });
});

describe('行程定錨(spec §4.6)', () => {
  it('預設全部收合,地圖停在當日區域基準錨', () => {
    renderDay();

    expectNothingExpanded();
    expectAnchoredTo('難波 日本');
  });

  it('點行程列展開詳細並定錨該行程(用該筆自己的區域)', async () => {
    const user = userEvent.setup();
    renderDay();

    await user.click(screen.getByRole('button', { name: /黑門市場/ }));

    expect(screen.getByRole('button', { name: /黑門市場/ }).getAttribute('aria-expanded')).toBe(
      'true',
    );
    expectAnchoredTo('黑門市場 日本橋');
  });

  it('再點一次同一列取消選取:收合並回到區域基準錨', async () => {
    const user = userEvent.setup();
    renderDay();

    const row = screen.getByRole('button', { name: /道頓堀/ });
    await user.click(row);
    expectAnchoredTo('道頓堀 難波');

    await user.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expectAnchoredTo('難波 日本');
  });

  it('一次只展開一筆,定錨跟著換', async () => {
    const user = userEvent.setup();
    renderDay();

    await user.click(screen.getByRole('button', { name: /道頓堀/ }));
    await user.click(screen.getByRole('button', { name: /黑門市場/ }));

    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(1);
    expectAnchoredTo('黑門市場 日本橋');
  });

  it('切回行程 Tab 時選取已清空(面板卸載即重置)', async () => {
    const user = userEvent.setup();
    renderDay();

    await user.click(screen.getByRole('button', { name: /道頓堀/ }));
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();
    await user.click(screen.getByRole('tab', { name: '行程' }));

    expectNothingExpanded();
    expectAnchoredTo('難波 日本');
  });
});

describe('搜尋條件提示 toast', () => {
  function stubGeoSuccess(): void {
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: ((onSuccess: PositionCallback) => {
          onSuccess({ coords: { latitude: 34.6669, longitude: 135.5016 } } as GeolocationPosition);
        }) as Geolocation['getCurrentPosition'],
      },
      onLine: true,
    });
  }

  it('進入推薦 Tab 不提示 —— 使用者沒有改變任何條件', async () => {
    const user = userEvent.setup();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('切換類型後提示新的類型與範圍', async () => {
    const user = userEvent.setup();
    renderDay([store(), store({ name: '咖啡店', types: ['cafe'], mapsUri: 'https://x/2' })]);
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /店家類型:餐廳/ }));
    await user.click(screen.getByRole('menuitem', { name: '咖啡甜點' }));

    expect(await screen.findByText('咖啡甜點 · 難波 5km 內')).toBeTruthy();
  });

  it('開啟目前位置模式後提示改以裝置位置、半徑收窄', async () => {
    const user = userEvent.setup();
    stubGeoSuccess();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /目前位置模式:關閉/ }));

    expect(await screen.findByText('餐廳 · 目前位置 3km 內')).toBeTruthy();
  });

  it('定位失敗只出現一則 —— 不再補一則「已改用區域中心」', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: ((_ok: PositionCallback, onError?: PositionErrorCallback) => {
          onError?.({ code: 1, message: 'denied' } as GeolocationPositionError);
        }) as Geolocation['getCurrentPosition'],
      },
      onLine: true,
    });
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /目前位置模式:關閉/ }));

    expect(await screen.findByText(GEO_FAILURE_NOTICE)).toBeTruthy();
    expect(within(screen.getByRole('status')).getAllByRole('button')).toHaveLength(1);
  });

  it('最多同時三則,第四則把最舊的擠掉', async () => {
    const user = userEvent.setup();
    stubGeoSuccess();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    // 每次切換位置模式都產生一則,連按四次
    for (let i = 0; i < 4; i += 1) {
      await user.click(screen.getByRole('button', { name: /目前位置模式/ }));
    }

    const stack = screen.getByRole('status');
    expect(within(stack).getAllByRole('button')).toHaveLength(3);
  });

  it('相同條件連按不去重,兩次操作出現兩則', async () => {
    const user = userEvent.setup();
    stubGeoSuccess();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /目前位置模式:關閉/ }));
    await user.click(screen.getByRole('button', { name: /目前位置模式:開啟/ }));

    expect(within(screen.getByRole('status')).getAllByRole('button')).toHaveLength(2);
  });

  it('點關閉鈕只移除該則,其餘留著', async () => {
    const user = userEvent.setup();
    stubGeoSuccess();
    renderDay();
    await user.click(screen.getByRole('tab', { name: '推薦' }));
    await settle();

    await user.click(screen.getByRole('button', { name: /目前位置模式:關閉/ }));
    await user.click(screen.getByRole('button', { name: /目前位置模式:開啟/ }));
    const stack = screen.getByRole('status');
    expect(within(stack).getAllByRole('button')).toHaveLength(2);

    await user.click(within(stack).getAllByRole('button')[0] as HTMLElement);
    expect(within(screen.getByRole('status')).getAllByRole('button')).toHaveLength(1);
  });
});
