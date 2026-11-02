'use client';

// Thông báo nổi góc phải dưới chuẩn .toast (ui.module.css của dự án 01. TSUKUBA) + hiệu ứng trượt mượt framer-motion.
import { CheckCircleFillIcon } from '@primer/octicons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useSyncExternalStore } from 'react';

type ToastState = { text: string; id: number } | null;

let state: ToastState = null;
let seq = 0;
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
  seq += 1;
  state = { text, id: seq };
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
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          role="status"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-[calc(96px+var(--safe-b))] right-4 z-[95] flex max-w-[min(26rem,calc(100vw-32px))] items-center gap-2.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] border-l-4 border-l-[var(--bgColor-success-emphasis)] bg-[var(--bgColor-default)] px-3.5 py-2.5 text-[13px] text-[var(--fgColor-default)] shadow-[0_8px_24px_rgba(0,0,0,0.14)] max-[767px]:inset-x-4 max-[767px]:mx-auto max-[767px]:w-fit min-[768px]:bottom-5"
        >
          <CheckCircleFillIcon size={16} className="shrink-0 text-[var(--fgColor-success)]" aria-hidden />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
