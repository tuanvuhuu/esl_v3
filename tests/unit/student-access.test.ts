import { describe, expect, it } from 'vitest';
import { sameClass, studentMayResubmit } from '@/lib/student-access';

describe('quyền của học sinh', () => {
  it('chỉ mở được bài của lớp mình', () => {
    expect(sameClass(2, 2)).toBe(true);
    expect(sameClass(2, 3)).toBe(false);
    expect(sameClass(null, 2)).toBe(false);
  });

  it('nộp lại được khi chưa nộp hoặc đã nộp, không được khi đã chấm', () => {
    expect(studentMayResubmit('not_submitted')).toBe(true);
    expect(studentMayResubmit('submitted')).toBe(true);
    expect(studentMayResubmit('graded')).toBe(false);
  });
});
