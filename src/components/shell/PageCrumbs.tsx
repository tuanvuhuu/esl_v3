'use client';

// Đường dẫn "Đào tạo / Học sinh" của trang đang mở, hiện trên thanh trên cùng (không nằm trong nội dung trang).
// Trang khai báo qua <PageCrumbs crumbs={...} />. Khi rời trang, đường dẫn được xoá.
import { useEffect, useSyncExternalStore } from 'react';

let current: string[] | null = null;
const listeners = new Set<() => void>();

function setCurrent(next: string[] | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

function getServerSnapshot() {
  return null;
}

// Đường dẫn hiện tại, dùng ở thanh trên cùng. Máy chủ không có đường dẫn nên hiện khi trình duyệt đã tải xong.
export function useCrumbs(): string[] | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const SEP = '\u0001';

// Khai báo đường dẫn của trang. Không hiển thị gì tại chỗ.
export function PageCrumbs({ crumbs }: { crumbs: string[] }) {
  const key = crumbs.join(SEP);
  useEffect(() => {
    setCurrent(key.split(SEP));
    return () => setCurrent(null);
  }, [key]);
  return null;
}
