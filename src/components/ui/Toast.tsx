'use client';

// Thông báo nhanh sau khi lưu hoặc xoá (kiểu Toast có vạch nhấn bên trái của dự án 01. TSUKUBA).
// Giữ state ở mức module để khi router.refresh() làm dựng lại cây giao diện thì thông báo vẫn hiển thị (E-062).
import { CheckCircleIcon } from '@primer/octicons-react';
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
    <div
      role="status"
      className="fixed bottom-[calc(96px+var(--safe-b))] right-4 z-[95] flex max-w-[calc(100vw-32px)] items-center gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] border-l-4 border-l-[var(--bgColor-success-emphasis)] bg-[var(--bgColor-default)] px-4 py-2.5 text-sm font-semibold text-[var(--fgColor-default)] shadow-[var(--shadow-floating-medium,0_6px_18px_rgba(0,0,0,0.16))] max-[767px]:inset-x-4 max-[767px]:mx-auto max-[767px]:w-fit min-[768px]:bottom-5"
    >
      <CheckCircleIcon size={16} className="shrink-0 text-[var(--fgColor-success)]" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
