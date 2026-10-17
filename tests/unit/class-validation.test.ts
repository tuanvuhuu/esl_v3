import { describe, expect, it } from 'vitest';
import { classCoreSchema, classCreateSchema, cancelReasonSchema, sessionFormSchema } from '@/lib/validation/class';
import { assignmentFormSchema, gradingRowSchema } from '@/lib/validation/assignment';
import { parentFormSchema, parentLinkSchema } from '@/lib/validation/parent';
import { teacherFormSchema } from '@/lib/validation/teacher';
import { fieldErrorsFrom } from '@/lib/validation/student';

const createOk = {
  name: 'IELTS-K20',
  course: 'IELTS Foundation',
  campusId: '1',
  teacherId: '1',
  assistantId: '2',
  foreignTeacherId: '3',
  room: 'P.201',
  fee: '12000000',
  capacity: '15',
  weekdays: ['T2', 'T4'],
  startTime: '18:30',
  endTime: '20:30',
  startDate: '2026-10-19',
  sessionsTotal: '24',
};

describe('lớp học', () => {
  it('chấp nhận dữ liệu tạo lớp hợp lệ và đổi chuỗi số sang số', () => {
    const v = classCreateSchema.parse(createOk);
    expect(v.teacherId).toBe(1);
    expect(v.fee).toBe(12_000_000);
    expect(v.sessionsTotal).toBe(24);
  });
  it('mỗi lớp phải thuộc đúng một cơ sở', () => {
    expect(classCreateSchema.parse(createOk).campusId).toBe(1);
    expect(classCreateSchema.safeParse({ ...createOk, campusId: '' }).success).toBe(false);
    expect(classCoreSchema.safeParse({ ...createOk, campusId: '0' }).success).toBe(false);
  });
  it('giáo viên chủ nhiệm bắt buộc; trợ giảng và giáo viên nước ngoài có thể để trống', () => {
    expect(classCreateSchema.safeParse({ ...createOk, teacherId: '' }).success).toBe(false);
    const r = classCreateSchema.safeParse({ ...createOk, assistantId: '', foreignTeacherId: '' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.assistantId).toBeNull();
      expect(r.data.foreignTeacherId).toBeNull();
    }
    const bad = classCreateSchema.safeParse({ ...createOk, assistantId: 'abc' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(fieldErrorsFrom(bad.error).assistantId).toBe('Trợ giảng không hợp lệ');
  });
  it('trình độ CEFR tùy chọn: nhận id số, chuỗi rỗng đổi thành null, chuỗi sai báo lỗi', () => {
    const withLevel = classCreateSchema.parse({ ...createOk, levelId: '2' });
    expect(withLevel.levelId).toBe(2);

    const withoutLevel = classCreateSchema.parse({ ...createOk, levelId: '' });
    expect(withoutLevel.levelId).toBeNull();

    const noneLevel = classCreateSchema.parse({ ...createOk, levelId: 'none' });
    expect(noneLevel.levelId).toBeNull();

    const badLevel = classCreateSchema.safeParse({ ...createOk, levelId: 'xyz' });
    expect(badLevel.success).toBe(false);
    if (!badLevel.success) expect(fieldErrorsFrom(badLevel.error).levelId).toBe('Trình độ không hợp lệ');
  });
  it('bắt buộc chọn ít nhất một ngày học', () => {
    const r = classCreateSchema.safeParse({ ...createOk, weekdays: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error).weekdays).toBe('Chọn ít nhất một ngày học');
  });
  it('giờ kết thúc phải sau giờ bắt đầu', () => {
    const r = classCreateSchema.safeParse({ ...createOk, endTime: '18:00' });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error).endTime).toBe('Giờ kết thúc phải sau giờ bắt đầu');
  });
  it('học phí phải là số nguyên không âm, không nhận số thập phân', () => {
    expect(classCoreSchema.safeParse({ ...createOk, fee: '12000.5' }).success).toBe(false);
    expect(classCoreSchema.safeParse({ ...createOk, fee: '-1' }).success).toBe(false);
  });
  it('số buổi từ 1 đến 200', () => {
    expect(classCreateSchema.safeParse({ ...createOk, sessionsTotal: '0' }).success).toBe(false);
    expect(classCreateSchema.safeParse({ ...createOk, sessionsTotal: '201' }).success).toBe(false);
  });
  it('buổi học: giờ kết thúc phải sau giờ bắt đầu, lý do huỷ ít nhất 3 ký tự', () => {
    expect(sessionFormSchema.safeParse({ date: '2026-10-19', startTime: '18:30', endTime: '18:00', teacherId: '1' }).success).toBe(false);
    expect(cancelReasonSchema.safeParse('ab').success).toBe(false);
    expect(cancelReasonSchema.safeParse('Giáo viên nghỉ').success).toBe(true);
  });
});

describe('giáo viên', () => {
  it('số điện thoại gồm 10 số bắt đầu bằng 0, bỏ khoảng trắng', () => {
    const v = teacherFormSchema.parse({ name: 'Cô Thu Hà', subject: 'IELTS', phone: '0901 000 101', years: '6', status: 'active', staffRole: 'teacher', campusIds: ['1'] });
    expect(v.phone).toBe('0901000101');
    expect(teacherFormSchema.safeParse({ name: 'Cô Thu Hà', subject: 'IELTS', phone: '1901000101', years: '6', status: 'active', staffRole: 'teacher', campusIds: ['1'] }).success).toBe(false);
  });
  it('giáo viên dạy ở một hoặc nhiều cơ sở, nhưng phải có ít nhất một', () => {
    const base = { name: 'Cô Thu Hà', subject: 'IELTS', phone: '0901000101', years: '6', status: 'active', staffRole: 'teacher' };
    expect(teacherFormSchema.parse({ ...base, campusIds: ['1'] }).campusIds).toEqual([1]);
    expect(teacherFormSchema.parse({ ...base, campusIds: ['1', '2'] }).campusIds).toEqual([1, 2]);
    expect(teacherFormSchema.safeParse({ ...base, campusIds: [] }).success).toBe(false);
  });
  it('vai trò nhân sự chỉ là giáo viên, giáo viên nước ngoài hoặc trợ giảng', () => {
    const base = { name: 'Ms. Emily Carter', subject: 'Speaking', phone: '0901000201', years: '8', status: 'active', campusIds: ['1'] };
    expect(teacherFormSchema.parse({ ...base, staffRole: 'foreign' }).staffRole).toBe('foreign');
    expect(teacherFormSchema.parse({ ...base, staffRole: 'assistant' }).staffRole).toBe('assistant');
    expect(teacherFormSchema.safeParse({ ...base, staffRole: 'manager' }).success).toBe(false);
  });
});

describe('phụ huynh', () => {
  it('email để trống được, nhập sai định dạng thì báo lỗi', () => {
    expect(parentFormSchema.parse({ fullName: 'Nguyễn Văn Hùng', phone: '0920000000', email: '' }).email).toBe('');
    expect(parentFormSchema.safeParse({ fullName: 'Nguyễn Văn Hùng', phone: '0920000000', email: 'abc' }).success).toBe(false);
  });
  it('liên kết với người có sẵn thì không cần nhập tên và SĐT', () => {
    expect(parentLinkSchema.safeParse({ parentId: '3', relation: 'mother' }).success).toBe(true);
  });
  it('liên kết với người mới thì bắt buộc tên và SĐT', () => {
    const r = parentLinkSchema.safeParse({ parentId: '', fullName: '', phone: '123', relation: 'father' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = fieldErrorsFrom(r.error);
      expect(errors.fullName).toBe('Họ và tên cần ít nhất 2 ký tự');
      expect(errors.phone).toBe('Số điện thoại gồm 10 số, bắt đầu bằng 0');
    }
  });
});

describe('bài tập và chấm điểm', () => {
  it('điểm tối đa từ 1 đến 100', () => {
    const base = { classId: '2', title: 'Writing Task 2', description: '', dueDate: '2026-10-20', dueTime: '20:00' };
    expect(assignmentFormSchema.safeParse({ ...base, maxScore: '0' }).success).toBe(false);
    expect(assignmentFormSchema.safeParse({ ...base, maxScore: '10' }).success).toBe(true);
  });
  it('đã chấm thì phải có điểm; chưa nộp thì không cần', () => {
    expect(gradingRowSchema.safeParse({ studentId: 1, status: 'graded', score: null, feedback: '' }).success).toBe(false);
    expect(gradingRowSchema.safeParse({ studentId: 1, status: 'graded', score: 8, feedback: '' }).success).toBe(true);
    expect(gradingRowSchema.safeParse({ studentId: 1, status: 'not_submitted', score: null, feedback: '' }).success).toBe(true);
  });
});
