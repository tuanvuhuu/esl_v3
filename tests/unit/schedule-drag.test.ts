import { describe, expect, it } from 'vitest';
import { draggedStart, hhmm, isPastStart } from '@/lib/schedule-drag';
import { moveSlot } from '@/lib/slot-move';

describe('kéo buổi học trên lịch', () => {
  it('không dời buổi về thời điểm đã qua', () => {
    const now = new Date('2026-10-26T10:00:00+07:00');
    expect(isPastStart(new Date('2026-10-26T09:59:00+07:00'), now)).toBe(true);
    expect(isPastStart(new Date('2026-10-26T10:00:00+07:00'), now)).toBe(false);
    expect(isPastStart(new Date('2026-10-27T08:00:00+07:00'), now)).toBe(false);
  });

  // Khung 7 đến 21 giờ (14 giờ), cột cao 14 × 60 px: 1 px = 1 phút
  const px = 14 * 60;
  it('dời theo độ dời dọc, làm tròn 15 phút', () => {
    expect(draggedStart(18 * 60, 40, px, 14, 420, 1260, 90)).toBe(18 * 60 + 45); // 40 px ≈ 40 phút → 18:40 làm tròn 18:45
    expect(draggedStart(18 * 60, -100, px, 14, 420, 1260, 90)).toBe(16 * 60 + 15); // 100 px ≈ 100 phút → 16:20 làm tròn xuống bội 15 là 16:15
  });

  it('không kéo ra ngoài khung giờ hoặc quá cuối ngày', () => {
    expect(draggedStart(7 * 60, -500, px, 14, 420, 1260, 90)).toBe(420);
    expect(draggedStart(20 * 60, 500, px, 14, 420, 1260, 90)).toBe(1260 - 90);
  });

  it('giờ hiển thị', () => {
    expect(hhmm(18 * 60 + 5)).toBe('18:05');
  });
});

describe('chuyển ca học trong form lớp', () => {
  const base = () => new Map<string, string[]>([
    ['T2', ['08:00', '14:00']],
    ['T4', ['18:00']],
  ]);

  it('đổi thứ tự trong cùng ngày', () => {
    const out = moveSlot(base(), { code: 'T2', index: 0 }, { code: 'T2', index: 1 }, 4);
    expect(out?.get('T2')).toEqual(['14:00', '08:00']);
  });

  it('chuyển sang ngày khác khi ngày nguồn còn ca khác; ngày nguồn không được mất ca cuối', () => {
    const out = moveSlot(base(), { code: 'T2', index: 1 }, { code: 'T4', index: 0 }, 4);
    expect(out?.get('T2')).toEqual(['08:00']);
    expect(out?.get('T4')).toEqual(['14:00', '18:00']);
    expect(moveSlot(base(), { code: 'T4', index: 0 }, { code: 'T2', index: 0 }, 4)).toBeNull();
  });

  it('ngày nhận đầy thì không nhận', () => {
    expect(moveSlot(base(), { code: 'T2', index: 0 }, { code: 'T4', index: 0 }, 1)).toBeNull();
  });

  it('không đổi dữ liệu gốc', () => {
    const src = base();
    moveSlot(src, { code: 'T2', index: 0 }, { code: 'T2', index: 1 }, 4);
    expect(src.get('T2')).toEqual(['08:00', '14:00']);
  });
});
