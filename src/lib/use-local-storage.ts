'use client';

import { useCallback, useSyncExternalStore } from 'react';

const LOCAL_EVENT = 'esl-local-storage';

// Đọc và ghi một khoá localStorage, đồng bộ giữa các thành phần trong cùng trang.
// Giá trị ban đầu trên server và khi chưa đọc được là fallback, nên không lệch khi hydrate.
export function useLocalStorage(key: string, fallback: string): [string, (value: string) => void] {
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener('storage', notify);
    window.addEventListener(LOCAL_EVENT, notify);
    return () => {
      window.removeEventListener('storage', notify);
      window.removeEventListener(LOCAL_EVENT, notify);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        // Trình duyệt chặn localStorage: giá trị chỉ còn trong phiên hiện tại
      }
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    [key],
  );

  return [value, setValue];
}
