// Dữ liệu học thử: cơ sở, giáo viên, lớp, học sinh và bộ bài mẫu đủ các dạng câu (P35, dữ liệu ở demo-lessons.ts).
// Tách riêng ở "Cơ sở học thử" để không lẫn vào lớp thật. Chỉ chạy trên server.
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
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
  parentConsents,
  students,
  teacherCampuses,
  teachers,
} from '@/db/schema';
import { CONSENT_TERMS_VERSION } from './consent';
import { DEMO_CAMPUS_NAME, DEMO_CLASS_NAME, DEMO_STUDENT_EMAIL } from './demo-account';
import { DEMO_LESSONS, type DemoLesson } from './demo-lessons';

const DEMO_TEACHER_NAME = 'Giáo viên học thử';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Dấu nhận biết nội dung bài: đổi câu trong demo-lessons.ts thì dấu đổi, bài được dựng lại
type SignatureRow = { itemType: string; prompt: string; referenceText: string; options: number; pairs: number };
const signatureOf = (rows: SignatureRow[]) => rows.map((r) => `${r.itemType}:${r.prompt}:${r.referenceText}:${r.options}:${r.pairs}`).join('|');

function lessonSignature(lesson: DemoLesson): string {
  return signatureOf(
    lesson.items.map((i) => ({ itemType: i.itemType, prompt: i.prompt, referenceText: i.referenceText ?? '', options: (i.options ?? []).length, pairs: (i.pairs ?? []).length })),
  );
}

// Dấu của bài đang lưu, đọc từ các câu trong CSDL
async function storedSignature(tx: Tx, assignmentId: number): Promise<string> {
  const items = await tx
    .select({ id: assignmentItems.id, itemType: assignmentItems.itemType, prompt: assignmentItems.prompt, referenceText: assignmentItems.referenceText })
    .from(assignmentItems)
    .where(eq(assignmentItems.assignmentId, assignmentId))
    .orderBy(asc(assignmentItems.position));
  const ids = items.map((i) => i.id);
  const opts = ids.length > 0 ? await tx.select({ itemId: assignmentItemOptions.itemId }).from(assignmentItemOptions).where(inArray(assignmentItemOptions.itemId, ids)) : [];
  const pairs = ids.length > 0 ? await tx.select({ itemId: assignmentItemPairs.itemId }).from(assignmentItemPairs).where(inArray(assignmentItemPairs.itemId, ids)) : [];
  return signatureOf(
    items.map((i) => ({ ...i, options: opts.filter((o) => o.itemId === i.id).length, pairs: pairs.filter((p) => p.itemId === i.id).length })),
  );
}

// Ghi các câu của một bài trong ba truy vấn. Đáp án đúng nằm đầu danh sách trong dữ liệu,
// nên xoay vị trí theo số thứ tự câu để đáp án đúng không luôn là A.
async function insertLessonItems(tx: Tx, assignmentId: number, lesson: DemoLesson): Promise<void> {
  const rows = await tx
    .insert(assignmentItems)
    .values(
      lesson.items.map((item, index) => ({
        assignmentId,
        position: index + 1,
        skill: item.skill,
        itemType: item.itemType,
        prompt: item.prompt,
        promptVi: item.promptVi,
        passage: item.passage ?? '',
        referenceText: item.referenceText ?? '',
        maxSeconds: item.maxSeconds ?? 10,
        points: item.points,
        sourceLicense: 'Bài mẫu ESL Center',
      })),
    )
    .returning({ id: assignmentItems.id, position: assignmentItems.position });
  const idAt = new Map(rows.map((r) => [r.position, r.id]));

  const options = lesson.items.flatMap((item, index) => {
    const list = item.options ?? [];
    return list.map((o, oi) => ({ itemId: idAt.get(index + 1)!, position: ((oi + index) % list.length) + 1, label: o.label, isCorrect: o.isCorrect ?? false }));
  });
  if (options.length > 0) await tx.insert(assignmentItemOptions).values(options);

  const pairs = lesson.items.flatMap((item, index) =>
    (item.pairs ?? []).map((p, pi) => ({ itemId: idAt.get(index + 1)!, position: pi + 1, leftLabel: p.left, rightLabel: p.right })),
  );
  if (pairs.length > 0) await tx.insert(assignmentItemPairs).values(pairs);
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

    // Đồng bộ bộ bài mẫu: thêm bài còn thiếu, dựng lại bài có nội dung đổi, bỏ bài không còn trong danh sách.
    // Hạn nộp tăng dần theo thứ tự để danh sách bài của học sinh đúng thứ tự.
    const existing = await tx.select({ id: assignments.id, title: assignments.title }).from(assignments).where(eq(assignments.classId, klass.id));
    const wanted = new Set(DEMO_LESSONS.map((l) => l.title));
    const stale = existing.filter((a) => !wanted.has(a.title)).map((a) => a.id);
    if (stale.length > 0) await tx.delete(assignments).where(inArray(assignments.id, stale));

    const ids: number[] = [];
    for (const [li, lesson] of DEMO_LESSONS.entries()) {
      const due = new Date(Date.UTC(2099, 0, 1 + li));
      // Điểm tối đa của bài bằng tổng điểm các câu, như khi giáo viên lưu câu hỏi
      const maxScore = lesson.items.reduce((sum, i) => sum + i.points, 0);
      const found = existing.find((a) => a.title === lesson.title);
      let id: number;
      if (found) {
        id = found.id;
        await tx.update(assignments).set({ description: lesson.description, dueAt: due, maxScore, updatedAt: new Date() }).where(eq(assignments.id, id));
        if ((await storedSignature(tx, id)) !== lessonSignature(lesson)) {
          await tx.delete(assignmentItems).where(eq(assignmentItems.assignmentId, id));
          await insertLessonItems(tx, id, lesson);
        }
      } else {
        [{ id }] = await tx.insert(assignments).values({ classId: klass.id, title: lesson.title, description: lesson.description, dueAt: due, maxScore }).returning({ id: assignments.id });
        await insertLessonItems(tx, id, lesson);
      }
      ids.push(id);
    }

    // Làm mới: bỏ mọi bài làm cũ của học sinh học thử (điểm từng câu xoá theo khoá ngoại)
    await tx.delete(assignmentSubmissions).where(and(eq(assignmentSubmissions.studentId, studentId), inArray(assignmentSubmissions.assignmentId, ids)));

    // Tài khoản học thử không phải trẻ thật: có sẵn đồng ý ghi âm để thử được bài nói (P35.12)
    const [consent] = await tx
      .select({ id: parentConsents.id })
      .from(parentConsents)
      .where(and(eq(parentConsents.studentId, studentId), eq(parentConsents.purpose, 'voice_teacher_review'), eq(parentConsents.granted, true), isNull(parentConsents.withdrawnAt)))
      .limit(1);
    if (!consent) {
      await tx.insert(parentConsents).values({ studentId, purpose: 'voice_teacher_review', granted: true, channel: 'demo', termsVersion: CONSENT_TERMS_VERSION, note: 'Tài khoản học thử', childAgreedAt: new Date() });
    }

    return { accountId: account.id, assignmentId: ids[0] };
  });
}
