'use client';

// Thông báo ngắn sau khi lưu hoặc xoá. Tự tắt sau vài giây. Dùng hook useToast trong component cha.
import { useCallback, useEffect, useState } from 'react';

export function useToast(durationMs = 3200) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), durationMs);
    return () => window.clearTimeout(t);
  }, [message, durationMs]);

  const notify = useCallback((text: string) => setMessage(text), []);
  return { message, notify };
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-[calc(96px+var(--safe-b))] z-[95] mx-auto w-fit max-w-[calc(100%-32px)] rounded-full border border-line bg-surface px-4 py-2.5 text-center text-base font-semibold text-ink shadow-lift min-[768px]:bottom-6">
      {message}
    </div>
  );
}
