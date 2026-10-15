// Quy tắc quyền của học sinh (P28). Hàm thuần, có unit test. Dùng ở truy vấn và server action của khu học sinh.

// Học sinh chỉ thấy và làm bài của lớp đang học của mình
export function sameClass(studentClassId: number | null, assignmentClassId: number): boolean {
  return studentClassId !== null && studentClassId === assignmentClassId;
}

// Bài đã chấm xong thì học sinh không nộp lại được. Bài chưa nộp hoặc đã nộp thì còn sửa được.
export function studentMayResubmit(status: 'not_submitted' | 'submitted' | 'graded'): boolean {
  return status !== 'graded';
}
