'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  text: string;
  type: ToastType;
}

export type ToastCallback = (item: ToastItem) => void;

let currentToast: ToastItem | null = null;
let dismissTimer: ReturnType<typeof setTimeout> | undefined;
let nextId = 1;
let customHandler: ToastCallback | null = null;
const subscribers = new Set<() => void>();

function emit(): void {
  subscribers.forEach((fn) => fn());
}

function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

function getSnapshot(): ToastItem | null {
  return currentToast;
}

function getServerSnapshot(): ToastItem | null {
  return null;
}

export function configureToast(handler: ToastCallback | null): void {
  customHandler = handler;
}

function dispatchToast(text: string, type: ToastType = 'info', durationMs = 3200): void {
  const item: ToastItem = { id: nextId++, text, type };
  currentToast = item;
  emit();

  if (customHandler) {
    customHandler(item);
  }

  if (dismissTimer !== undefined) {
    clearTimeout(dismissTimer);
  }
  dismissTimer = setTimeout(() => {
    currentToast = null;
    dismissTimer = undefined;
    emit();
  }, durationMs);
}

export interface ToastFn {
  (text: string, type?: ToastType): void;
  success: (text: string) => void;
  error: (text: string) => void;
  warning: (text: string) => void;
  info: (text: string) => void;
}

export const toast: ToastFn = Object.assign(
  (text: string, type: ToastType = 'info') => dispatchToast(text, type),
  {
    success: (text: string) => dispatchToast(text, 'success'),
    error: (text: string) => dispatchToast(text, 'error'),
    warning: (text: string) => dispatchToast(text, 'warning'),
    info: (text: string) => dispatchToast(text, 'info'),
  },
);

export const NotifyHelper = {
  Success: (message: string) => toast.success(message),
  Error: (message: string) => toast.error(message),
  Warning: (message: string) => toast.warning(message),
  Info: (message: string) => toast.info(message),
};

export function useToast(durationMs = 3200) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const notify = useCallback(
    (text: string, type: ToastType = 'info') => dispatchToast(text, type, durationMs),
    [durationMs],
  );
  return {
    message: current?.text ?? null,
    item: current,
    notify,
  };
}
