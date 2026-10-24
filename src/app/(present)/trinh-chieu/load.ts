// Đọc lần trình chiếu cho màn chiếu và màn điều khiển (35.19): phải đăng nhập bằng tài khoản nhân viên đã tạo lần chiếu.
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db/client';
import { presentSessions } from '@/db/schema';
import type { PresentSnapshot } from './actions';
import type { PresentMode, Slide } from '@/lib/presentation';
import { buildSlides, getOwnPresentation, type PresentSource } from '@/lib/queries/presentation';
import { getCurrentAccount } from '@/lib/session';

export async function loadPresentation(token: string, nextPath: string): Promise<{ title: string; slides: Slide[]; initial: PresentSnapshot; kind: PresentSource; sourceId: number }> {
  const account = await getCurrentAccount();
  if (!account) redirect(`/dang-nhap?next=${encodeURIComponent(nextPath)}`);
  if (account.role === 'student') redirect('/cua-toi');
  const row = await getOwnPresentation(token, account.id);
  if (!row) notFound();
  const kind = row.sourceKind as PresentSource;
  const mode = row.mode as PresentMode;
  const built = await buildSlides(kind, row.sourceId, mode, row.seed);
  if (!built || built.slides.length === 0) notFound();
  // Nguồn bị sửa sau khi bắt đầu chiếu (thêm, bớt từ): cập nhật tổng số trang cho bước chuyển trang trên máy chủ
  let slide = row.slide;
  if (built.slides.length !== row.total) {
    slide = Math.min(row.slide, built.slides.length - 1);
    await db.update(presentSessions).set({ total: built.slides.length, slide }).where(eq(presentSessions.id, row.id));
  }
  return { title: built.title, slides: built.slides, initial: { slide, revealed: row.revealed, version: row.version, mode }, kind, sourceId: row.sourceId };
}
