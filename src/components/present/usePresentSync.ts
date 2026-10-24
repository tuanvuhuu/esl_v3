'use client';

// Đồng bộ trạng thái trình chiếu (35.19) giữa máy chiếu và điện thoại: đổi ngay trên máy mình rồi ghi lên máy chủ,
// và mỗi giây hỏi lại máy chủ để theo kịp bên kia. Không nhận trạng thái cũ hơn trạng thái đang có; trong lúc đang ghi
// thì bỏ qua kết quả hỏi lại cùng version (đó là trạng thái trước khi bấm).
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { stepPresentationAction, type PresentSnapshot } from '@/app/(present)/trinh-chieu/actions';
import { stepPresentation, type PresentStep } from '@/lib/presentation';

export const POLL_MS = 1000;

export function usePresentSync(token: string, initial: PresentSnapshot, total: number) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const latest = useRef(initial);
  const pending = useRef(0);
  const [offline, setOffline] = useState(false);

  function accept(next: PresentSnapshot, fromPoll: boolean) {
    if (next.version < latest.current.version) return;
    if (fromPoll && pending.current > 0 && next.version <= latest.current.version) return;
    // Kiểu chiếu đổi thì trang chiếu khác: lấy lại từ máy chủ
    if (next.mode !== latest.current.mode) router.refresh();
    latest.current = next;
    setState(next);
  }

  const poll = useEffectEvent(async () => {
    try {
      const res = await fetch(`/api/trinh-chieu/${token}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      accept((await res.json()) as PresentSnapshot, true);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  });

  useEffect(() => {
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(timer);
  }, []);

  function step(s: PresentStep) {
    const local = stepPresentation(latest.current, s, total);
    const optimistic = { ...latest.current, ...local };
    latest.current = optimistic;
    setState(optimistic);
    pending.current += 1;
    void stepPresentationAction(token, s).then((r) => {
      pending.current -= 1;
      if (r.ok) accept(r.state, false);
    });
  }

  return { state, step, offline, accept: (next: PresentSnapshot) => accept(next, false) };
}
