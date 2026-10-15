import { describe, expect, it } from 'vitest';
import { classLabel, resolveCampusScope, scopeLabel, withCampusNames, type CampusOption } from '@/lib/campus';

describe('resolveCampusScope: cơ sở đang xem lấy từ cookie', () => {
  const ids = [3, 7];

  it('"all" nghĩa là tất cả cơ sở', () => {
    expect(resolveCampusScope('all', ids)).toBeNull();
  });

  it('id hợp lệ trong danh sách thì dùng đúng cơ sở đó', () => {
    expect(resolveCampusScope('7', ids)).toBe(7);
  });

  it('cookie trống, sai, hoặc cơ sở đã xoá thì lấy cơ sở đầu tiên', () => {
    expect(resolveCampusScope(undefined, ids)).toBe(3);
    expect(resolveCampusScope('', ids)).toBe(3);
    expect(resolveCampusScope('abc', ids)).toBe(3);
    expect(resolveCampusScope('7.5', ids)).toBe(3);
    expect(resolveCampusScope('99', ids)).toBe(3);
  });

  it('không có cơ sở nào thì trả về null (tất cả)', () => {
    expect(resolveCampusScope('5', [])).toBeNull();
    expect(resolveCampusScope(undefined, [])).toBeNull();
  });
});

describe('nhãn cơ sở và lớp', () => {
  const campuses: CampusOption[] = [
    { id: 1, name: 'Cơ sở chính', address: '' },
    { id: 2, name: 'Cơ sở Quận 3', address: '' },
  ];

  it('scopeLabel: tất cả thì ghi "Tất cả cơ sở", một cơ sở thì ghi tên cơ sở', () => {
    expect(scopeLabel(null, campuses)).toBe('Tất cả cơ sở');
    expect(scopeLabel(2, campuses)).toBe('Cơ sở Quận 3');
    expect(scopeLabel(9, campuses)).toBe('Tất cả cơ sở');
  });

  it('classLabel: khi xem tất cả thì kèm tên cơ sở để phân biệt lớp trùng tên', () => {
    expect(classLabel('IELTS-K15', 'Cơ sở chính', false)).toBe('IELTS-K15');
    expect(classLabel('IELTS-K15', 'Cơ sở chính', true)).toBe('IELTS-K15 · Cơ sở chính');
  });

  it('withCampusNames: không đổi danh sách khi xem một cơ sở, đổi tên khi xem tất cả', () => {
    const classes = [{ id: 1, name: 'A1', campusName: 'Cơ sở chính' }];
    expect(withCampusNames(classes, false)).toEqual(classes);
    expect(withCampusNames(classes, true)).toEqual([{ id: 1, name: 'A1 · Cơ sở chính', campusName: 'Cơ sở chính' }]);
  });
});
