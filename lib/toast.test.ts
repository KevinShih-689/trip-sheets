import { describe, expect, it } from 'vitest';
import { MAX_TOASTS, dismissToast, pushToast, type Toast } from './toast';

function toast(id: number, message = `訊息 ${id}`): Toast {
  return { id, message };
}

describe('pushToast', () => {
  it('appends to the end so the newest reads last', () => {
    const list = pushToast([toast(1)], toast(2));
    expect(list.map((t) => t.id)).toEqual([1, 2]);
  });

  it('drops the oldest once the cap is reached', () => {
    const full = [toast(1), toast(2), toast(3)];
    expect(pushToast(full, toast(4)).map((t) => t.id)).toEqual([2, 3, 4]);
  });

  it('keeps dropping the oldest, never growing past the cap', () => {
    let list: readonly Toast[] = [];
    for (let i = 1; i <= 10; i += 1) list = pushToast(list, toast(i));
    expect(list).toHaveLength(MAX_TOASTS);
    expect(list.map((t) => t.id)).toEqual([8, 9, 10]);
  });

  it('keeps duplicate messages as separate toasts — repeat taps stay visible', () => {
    const list = pushToast([toast(1, '餐廳 · 難波 5km 內')], toast(2, '餐廳 · 難波 5km 內'));
    expect(list).toHaveLength(2);
  });

  it('does not mutate the input list', () => {
    const original = [toast(1), toast(2), toast(3)];
    const copy = [...original];
    pushToast(original, toast(4));
    expect(original).toEqual(copy);
  });
});

describe('dismissToast', () => {
  it('removes only the matching id', () => {
    const list = dismissToast([toast(1), toast(2), toast(3)], 2);
    expect(list.map((t) => t.id)).toEqual([1, 3]);
  });

  it('is a no-op for an id that already went away', () => {
    const list = [toast(1)];
    expect(dismissToast(list, 99)).toEqual(list);
  });

  it('does not mutate the input list', () => {
    const original = [toast(1), toast(2)];
    const copy = [...original];
    dismissToast(original, 1);
    expect(original).toEqual(copy);
  });
});
