'use client';

// Thông báo nổi góc phải dưới dùng Banner chính gốc của @primer/react v38.
import { Banner } from '@primer/react';
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
      className="fixed bottom-[calc(96px+var(--safe-b))] right-4 z-[95] max-w-[calc(100vw-32px)] shadow-[var(--shadow-floating-medium,0_6px_18px_rgba(0,0,0,0.16))] max-[767px]:inset-x-4 max-[767px]:mx-auto max-[767px]:w-fit min-[768px]:bottom-5"
    >
      <Banner title="Thông báo" hideTitle variant="success" layout="compact" description={message} />
    </div>
  );
}
