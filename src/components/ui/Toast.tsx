'use client';

// Thông báo ngắn sau khi lưu hoặc xoá. Tự tắt sau vài giây. Dùng hook useToast trong component cha.
// Trạng thái giữ ở mức module, không ở state của component: khi trang làm mới sau khi lưu làm dựng lại cây giao diện,
// thông báo vẫn còn hiện (E-062).
import { useCallback, useSyncExternalStore } from 'react';

type ToastState = { text: string } | null;

let state: ToastState = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ToastState {
  return state;
}

function getServerSnapshot(): ToastState {
  return null;
}

function show(text: string, durationMs: number) {
  state = { text };
  emit();
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(() => {
    state = null;
    timer = undefined;
    emit();
  }, durationMs);
}

export function useToast(durationMs = 3200) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const notify = useCallback((text: string) => show(text, durationMs), [durationMs]);
  return { message: current?.text ?? null, notify };
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-[calc(96px+var(--safe-b))] z-[95] mx-auto w-fit max-w-[calc(100%-32px)] rounded-full border border-line bg-surface px-4 py-2.5 text-center text-base font-semibold text-ink shadow-lift min-[768px]:bottom-6">
      {message}
    </div>
  );
}
