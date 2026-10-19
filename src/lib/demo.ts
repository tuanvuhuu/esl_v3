// Dữ liệu học thử: cơ sở, giáo viên, lớp, học sinh và một bài đủ các dạng câu (P35).
// Tách riêng ở "Cơ sở học thử" để không lẫn vào lớp thật. Chỉ chạy trên server.
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  accounts,
  assignmentItemOptions,
  assignmentItemPairs,
  assignmentItems,
  assignments,
  assignmentSubmissions,
  campuses,
  classes,
  students,
  teacherCampuses,
  teachers,
} from '@/db/schema';
import { DEMO_CAMPUS_NAME, DEMO_CLASS_NAME, DEMO_STUDENT_EMAIL } from './demo-account';

const DEMO_TEACHER_NAME = 'Giáo viên học thử';
const DEMO_ASSIGNMENT_TITLE = 'Học thử: Animals & Colors';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Bài mẫu: mỗi dạng câu một câu, chấm tự động được trừ câu nói và câu viết
async function insertDemoItems(tx: Tx, assignmentId: number): Promise<void> {
  const item = async (position: number, values: Omit<typeof assignmentItems.$inferInsert, 'assignmentId' | 'position'>) => {
    const [row] = await tx.insert(assignmentItems).values({ assignmentId, position, ...values }).returning({ id: assignmentItems.id });
    return row.id;
  };

  const pic = await item(1, { skill: 'listening', itemType: 'picture_choice', prompt: 'Which one is a puppy?', promptVi: 'Chạm vào chú cún con', points: 1 });
  await tx.insert(assignmentItemOptions).values([
    { itemId: pic, position: 1, label: '🐶 Puppy', isCorrect: true },
    { itemId: pic, position: 2, label: '🐱 Kitten' },
    { itemId: pic, position: 3, label: '🐰 Bunny' },
    { itemId: pic, position: 4, label: '🐦 Bird' },
  ]);

  const match = await item(2, { skill: 'reading', itemType: 'match', prompt: 'Match the words', promptVi: 'Ghép từ tiếng Anh với nghĩa tiếng Việt', points: 2 });
  await tx.insert(assignmentItemPairs).values([
    { itemId: match, position: 1, leftLabel: 'Red', rightLabel: 'Màu đỏ' },
    { itemId: match, position: 2, leftLabel: 'Blue', rightLabel: 'Màu xanh dương' },
    { itemId: match, position: 3, leftLabel: 'Yellow', rightLabel: 'Màu vàng' },
    { itemId: match, position: 4, leftLabel: 'Green', rightLabel: 'Màu xanh lá' },
  ]);

  await item(3, { skill: 'writing', itemType: 'order', prompt: 'Put the words in order', promptVi: 'Sắp xếp các từ thành câu đúng', referenceText: 'I have a red ball', points: 2 });
  await item(4, { skill: 'writing', itemType: 'gap_fill', prompt: 'The sky is _____.', promptVi: 'Điền từ còn thiếu', referenceText: 'blue', points: 1 });

  const choice = await item(5, { skill: 'reading', itemType: 'choice', prompt: 'How many legs does a cat have?', promptVi: 'Con mèo có mấy chân?', points: 1 });
  await tx.insert(assignmentItemOptions).values([
    { itemId: choice, position: 1, label: 'Two' },
    { itemId: choice, position: 2, label: 'Four', isCorrect: true },
    { itemId: choice, position: 3, label: 'Six' },
  ]);

  await item(6, { skill: 'speaking', itemType: 'speak_repeat', prompt: 'Listen and repeat', promptVi: 'Nghe rồi nói lại', referenceText: 'Hello, my name is Tom.', maxSeconds: 10, points: 1 });
  await item(7, { skill: 'speaking', itemType: 'speak_read', prompt: 'Read aloud', promptVi: 'Đọc to câu sau', referenceText: 'The cat is on the mat.', maxSeconds: 15, points: 1 });
  await item(8, { skill: 'writing', itemType: 'text', prompt: 'What is your favourite colour?', promptVi: 'Con thích màu gì? Viết một câu tiếng Anh.', points: 1 });
}

// Tạo dữ liệu học thử nếu chưa có, xoá bài làm cũ để mỗi lần vào đều làm từ đầu.
// Trả về tài khoản học sinh và bài để mở ngay.
export async function prepareDemoStudent(): Promise<{ accountId: number; assignmentId: number }> {
  return db.transaction(async (tx) => {
    await tx.insert(campuses).values({ name: DEMO_CAMPUS_NAME, address: 'Dữ liệu học thử' }).onConflictDoNothing({ target: campuses.name });
    const [campus] = await tx.select({ id: campuses.id }).from(campuses).where(eq(campuses.name, DEMO_CAMPUS_NAME)).limit(1);

    let [teacher] = await tx.select({ id: teachers.id }).from(teachers).where(eq(teachers.name, DEMO_TEACHER_NAME)).limit(1);
    if (!teacher) {
      [teacher] = await tx.insert(teachers).values({ name: DEMO_TEACHER_NAME, subject: 'Học thử' }).returning({ id: teachers.id });
      await tx.insert(teacherCampuses).values({ teacherId: teacher.id, campusId: campus.id }).onConflictDoNothing();
    }

    await tx
      .insert(classes)
      .values({ campusId: campus.id, name: DEMO_CLASS_NAME, course: 'Học thử', teacherId: teacher.id, sessionsTotal: 1, fee: 0, capacity: 999 })
      .onConflictDoNothing({ target: [classes.campusId, classes.name] });
    const [klass] = await tx.select({ id: classes.id }).from(classes).where(and(eq(classes.campusId, campus.id), eq(classes.name, DEMO_CLASS_NAME))).limit(1);

    let [account] = await tx.select({ id: accounts.id, studentId: accounts.studentId }).from(accounts).where(eq(accounts.email, DEMO_STUDENT_EMAIL)).limit(1);
    if (!account || account.studentId === null) {
      const today = new Date().toISOString().slice(0, 10);
      const [student] = await tx
        .insert(students)
        .values({ fullName: 'Bé học thử', searchKey: 'be hoc thu', gender: 'female', dob: '2018-01-01', classId: klass.id, status: 'trial', startDate: today, note: 'Tài khoản học thử, dữ liệu tự làm mới' })
        .returning({ id: students.id });
      if (account) {
        await tx.update(accounts).set({ studentId: student.id, status: 'active', updatedAt: new Date() }).where(eq(accounts.id, account.id));
        account = { id: account.id, studentId: student.id };
      } else {
        // Không có mật khẩu: không đăng nhập bằng form được, chỉ vào qua nút học thử
        [account] = await tx
          .insert(accounts)
          .values({ fullName: 'Bé học thử', email: DEMO_STUDENT_EMAIL, role: 'student', status: 'active', studentId: student.id, passwordHash: null })
          .returning({ id: accounts.id, studentId: accounts.studentId });
      }
    }
    const studentId = account.studentId as number;

    let [assignment] = await tx.select({ id: assignments.id }).from(assignments).where(and(eq(assignments.classId, klass.id), eq(assignments.title, DEMO_ASSIGNMENT_TITLE))).limit(1);
    if (!assignment) {
      const due = new Date(Date.now() + 3650 * 86_400_000);
      [assignment] = await tx
        .insert(assignments)
        .values({ classId: klass.id, title: DEMO_ASSIGNMENT_TITLE, description: 'Bài học thử đủ các dạng câu: chọn tranh, ghép đôi, sắp xếp, điền từ, trắc nghiệm, nói và viết.', dueAt: due, maxScore: 10 })
        .returning({ id: assignments.id });
      await insertDemoItems(tx, assignment.id);
    }

    // Làm mới: bỏ mọi bài làm cũ của học sinh học thử (điểm từng câu xoá theo khoá ngoại)
    const demoAssignmentIds = (await tx.select({ id: assignments.id }).from(assignments).where(eq(assignments.classId, klass.id))).map((r) => r.id);
    if (demoAssignmentIds.length > 0) {
      await tx.delete(assignmentSubmissions).where(and(eq(assignmentSubmissions.studentId, studentId), inArray(assignmentSubmissions.assignmentId, demoAssignmentIds)));
    }

    return { accountId: account.id, assignmentId: assignment.id };
  });
}
