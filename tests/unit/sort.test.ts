import { describe, expect, it } from 'vitest';
import { compareValues, getRowSortValue, sortRows } from '@/lib/sort';

describe('compareValues', () => {
  it('sắp xếp số chuẩn xác', () => {
    expect(compareValues(10, 20, 'asc')).toBeLessThan(0);
    expect(compareValues(20, 10, 'asc')).toBeGreaterThan(0);
    expect(compareValues(15, 15, 'asc')).toBe(0);
    expect(compareValues(10, 20, 'desc')).toBeGreaterThan(0);
  });

  it('sắp xếp tiếng Việt có dấu chuẩn xác', () => {
    const names = ['Tuấn', 'An', 'Bình', 'Ánh', 'Cường'];
    names.sort((a, b) => compareValues(a, b, 'asc'));
    expect(names).toEqual(['An', 'Ánh', 'Bình', 'Cường', 'Tuấn']);
  });

  it('sắp xếp mã có số tự nhiên (HS-2 đứng trước HS-10)', () => {
    const codes = ['HS-10', 'HS-2', 'HS-1', 'HS-20'];
    codes.sort((a, b) => compareValues(a, b, 'asc'));
    expect(codes).toEqual(['HS-1', 'HS-2', 'HS-10', 'HS-20']);
  });

  it('xử lý null và undefined luôn đẩy về cuối khi asc', () => {
    expect(compareValues(null, 'test', 'asc')).toBeGreaterThan(0);
    expect(compareValues('test', null, 'asc')).toBeLessThan(0);
    expect(compareValues(undefined, 'test', 'asc')).toBeGreaterThan(0);
  });
});

describe('getRowSortValue và sortRows', () => {
  const data = [
    { id: 3, fullName: 'Trần Bình', fee: 5_000_000 },
    { id: 1, fullName: 'Nguyễn An', fee: 10_000_000 },
    { id: 2, fullName: 'Lê Cường', fee: 2_000_000 },
  ];

  it('sắp xếp theo trường họ tên (name mapping)', () => {
    expect(getRowSortValue(data[0], 'name')).toBe('Trần Bình');
    const sorted = sortRows(data, 'name', 'asc');
    expect(sorted.map((d) => d.fullName)).toEqual(['Lê Cường', 'Nguyễn An', 'Trần Bình']);
  });

  it('sắp xếp theo trường số (fee desc)', () => {
    const sorted = sortRows(data, 'fee', 'desc');
    expect(sorted.map((d) => d.fee)).toEqual([10_000_000, 5_000_000, 2_000_000]);
  });

  it('hỗ trợ custom extractor', () => {
    const sorted = sortRows(data, 'custom', 'asc', (r) => r.id);
    expect(sorted.map((d) => d.id)).toEqual([1, 2, 3]);
  });
});
