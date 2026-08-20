import { describe, expect, it } from 'vitest';
import { MAX_TOASTS, markExiting, pushToast, removeToast, type Toast } from './toast';

function toast(id: number, message = `訊息 ${id}`, exiting = false): Toast {
  return { id, message, exiting };
}

describe('pushToast', () => {
  it('appends to the end so the newest reads last', () => {
    const { list, evicted } = pushToast([toast(1)], toast(2));
    expect(list.map((t) => t.id)).toEqual([1, 2]);
    expect(evicted).toBeNull();
  });

  it('marks the oldest as exiting once the cap is reached, rather than dropping it', () => {
    const full = [toast(1), toast(2), toast(3)];
    const { list, evicted } = pushToast(full, toast(4));

    expect(evicted).toBe(1);
    // 仍在 DOM 供退場動畫播放
    expect(list.map((t) => t.id)).toEqual([1, 2, 3, 4]);
    expect(list.find((t) => t.id === 1)?.exiting).toBe(true);
  });

  it('does not count exiting toasts toward the cap', () => {
    const withExiting = [toast(1, '訊息 1', true), toast(2), toast(3)];
    const { list, evicted } = pushToast(withExiting, toast(4));

    // 存活的是 2、3、4 共三則,剛好等於上限,不需再擠掉任何一則
    expect(evicted).toBeNull();
    expect(list.filter((t) => !t.exiting)).toHaveLength(MAX_TOASTS);
  });

  it('keeps duplicate messages as separate toasts — repeat taps stay visible', () => {
    const message = '餐廳 · 難波 5km 內';
    const { list } = pushToast([toast(1, message)], toast(2, message));
    expect(list).toHaveLength(2);
  });

  it('does not mutate the input list', () => {
    const original = [toast(1), toast(2), toast(3)];
    const copy = structuredClone(original);
    pushToast(original, toast(4));
    expect(original).toEqual(copy);
  });
});

describe('markExiting', () => {
  it('flags only the matching toast', () => {
    const list = markExiting([toast(1), toast(2)], 2);
    expect(list.map((t) => t.exiting)).toEqual([false, true]);
  });

  it('does not mutate the input list', () => {
    const original = [toast(1)];
    const copy = structuredClone(original);
    markExiting(original, 1);
    expect(original).toEqual(copy);
  });
});

describe('removeToast', () => {
  it('removes only the matching id', () => {
    const list = removeToast([toast(1), toast(2), toast(3)], 2);
    expect(list.map((t) => t.id)).toEqual([1, 3]);
  });

  it('is a no-op for an id that already went away', () => {
    const list = [toast(1)];
    expect(removeToast(list, 99)).toEqual(list);
  });
});
