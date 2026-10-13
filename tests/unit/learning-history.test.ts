import { describe, expect, it } from 'vitest';
import { filterHistory, mergeHistory, type HistoryItem } from '@/lib/learning-history';

const base = { studentId: 1, studentName: 'Nguyễn Minh Anh', classId: 2, className: 'IELTS-K14', amount: null };

const items: HistoryItem[] = [
  { ...base, id: 'att-1', kind: 'absent', at: '2026-10-06T10:30:00.000Z', title: 'Vắng buổi 10', detail: '' },
  { ...base, id: 'pay-1', kind: 'payment', at: '2026-10-07T02:00:00.000Z', title: 'Thu 4.000.000 ₫', detail: 'Tiền mặt' },
  { ...base, id: 'evt-1', kind: 'level_up', at: '2026-10-07T02:00:00.000Z', title: 'Lên Band 6.0', detail: '' },
  { ...base, id: 'grd-1', kind: 'graded', at: '2026-10-01T09:00:00.000Z', title: 'Writing Task 1', detail: '8/10' },
  { ...base, id: 'evt-2', kind: 'class_change', at: '2026-09-20T09:00:00.000Z', title: 'Chuyển từ IELTS-K12 sang IELTS-K14', detail: '', classId: 3, className: 'IELTS-K12' },
  { ...base, id: 'evt-3', kind: 'note', at: '2026-10-09T09:00:00.000Z', title: 'Ghi chú mới nhất', detail: '' },
];

describe('mergeHistory', () => {
  it('sắp xếp mới nhất trước', () => {
    const sorted = mergeHistory(items);
    expect(sorted[0].id).toBe('evt-3');
    expect(sorted[sorted.length - 1].id).toBe('evt-2');
  });
  it('trùng thời điểm thì thứ tự ổn định theo id', () => {
    const sorted = mergeHistory(items.filter((i) => i.at.startsWith('2026-10-07')));
    expect(sorted.map((i) => i.id)).toEqual(['pay-1', 'evt-1']);
  });
  it('không đổi mảng gốc', () => {
    const copy = [...items];
    mergeHistory(items);
    expect(items).toEqual(copy);
  });
});

describe('filterHistory', () => {
  it('lọc theo loại', () => {
    expect(filterHistory(items, { kind: 'payment' }).map((i) => i.id)).toEqual(['pay-1']);
  });
  it('lọc theo lớp', () => {
    expect(filterHistory(items, { classId: 3 }).map((i) => i.id)).toEqual(['evt-2']);
  });
  it('không lọc khi để rỗng', () => {
    expect(filterHistory(items, { kind: '', classId: null })).toHaveLength(items.length);
  });
});
