'use client';

// Bắt đầu trình chiếu (35.19) từ màn Danh sách từ hoặc màn chấm bài: tạo lần chiếu rồi mở màn chiếu. Lỗi báo qua Toast của màn gọi.
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { createPresentationAction } from '@/app/(present)/trinh-chieu/actions';
import type { PresentSource } from '@/lib/queries/presentation';

export function usePresent(notify: (message: string) => void) {
  const router = useRouter();
  const [starting, startTransition] = useTransition();
  const start = (kind: PresentSource, sourceId: number) =>
    startTransition(async () => {
      const r = await createPresentationAction(kind, sourceId);
      if (!r.ok) return notify(r.message);
      router.push(`/trinh-chieu/${r.token}`);
    });
  return { start, starting };
}
