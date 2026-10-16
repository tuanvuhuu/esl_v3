// Dữ liệu mẫu, lấy từ bản mẫu student-mockup.html và mở rộng theo schema mới.
// Chạy:
//   npm run db:seed        chỉ nạp khi các bảng còn trống (an toàn chạy lại)
//   npm run db:seed:reset  xoá toàn bộ dữ liệu app rồi nạp lại (chỉ dùng trên máy dev, D8)
import { count, sql } from 'drizzle-orm';
import { db, pool } from './client';
import {
  accountCampuses,
  accounts,
  assignmentSubmissions,
  assignments,
  attendance,
  auditLogs,
  campuses,
  centerSettings,
  classSessions,
  classes,
  learningEvents,
  parents,
  rolePermissions,
  studentParents,
  students,
  teacherCampuses,
  teachers,
  tuitionPayments,
} from './schema';
import { DEFAULT_GRANTS, PERMISSIONS, ROLE_CODES } from '../lib/permissions';
import { generateSessions } from '../lib/schedule';
import { normalizeSearch } from '../lib/text';

type Mark = 'present' | 'late' | 'absent';
type Gender = 'male' | 'female';

const RESET = process.argv.includes('--reset');

const NAMES: [string, Gender][] = [
  ['Nguyễn Minh Anh', 'female'], ['Trần Gia Bảo', 'male'], ['Lê Khánh Linh', 'female'], ['Phạm Đức Huy', 'male'],
  ['Hoàng Thu Trang', 'female'], ['Vũ Quang Minh', 'male'], ['Đặng Ngọc Diệp', 'female'], ['Bùi Tuấn Kiệt', 'male'],
  ['Đỗ Phương Thảo', 'female'], ['Ngô Hải Đăng', 'male'], ['Lý Bảo Châu', 'female'], ['Phan Thanh Tùng', 'male'],
  ['Võ Mai Phương', 'female'], ['Đinh Anh Khoa', 'male'], ['Trịnh Hà My', 'female'], ['Mai Gia Hân', 'female'],
  ['Lương Minh Triết', 'male'], ['Hồ Ngọc Hà', 'female'], ['Dương Nhật Nam', 'male'], ['Tô Bích Ngọc', 'female'],
  ['Cao Hoàng Long', 'male'], ['Chu Thảo Vy', 'female'], ['Hà Quốc Việt', 'male'], ['Kiều Yến Nhi', 'female'],
];

// 8 phụ huynh dùng chung cho nhiều học sinh (học sinh i thuộc phụ huynh i % 8)
const PARENT_SEED = [
  { fullName: 'Nguyễn Văn Hùng', email: 'hung.nguyen@example.com' },
  { fullName: 'Trần Thị Lan', email: 'lan.tran@example.com' },
  { fullName: 'Lê Thanh Sơn', email: 'son.le@example.com' },
  { fullName: 'Phạm Thu Hương', email: 'huong.pham@example.com' },
  { fullName: 'Võ Đình Tâm', email: 'tam.vo@example.com' },
  { fullName: 'Đặng Minh Châu', email: 'chau.dang@example.com' },
  { fullName: 'Bùi Thị Nga', email: 'nga.bui@example.com' },
  { fullName: 'Hoàng Văn Phúc', email: 'phuc.hoang@example.com' },
];

const NOTES = ['', '', 'Cần hỗ trợ thêm phần Speaking', 'Phụ huynh muốn đổi lịch sang tối T7', 'Học tích cực, điểm Listening tốt', 'Đã đăng ký gia hạn khoá sau', 'Hay đi trễ, cần nhắc nhở'];
const STATUS_POOL = ['active', 'active', 'active', 'trial', 'active', 'paused', 'active', 'active', 'finished', 'active', 'trial', 'active'] as const;

// staffRole: teacher (giáo viên chủ nhiệm), foreign (giáo viên nước ngoài), assistant (trợ giảng)
const TEACHER_SEED = [
  { name: 'Cô Thu Hà', subject: 'IELTS', phone: '0901 000 101', years: 6, status: 'active', avatarTone: 'mint', staffRole: 'teacher' },
  { name: 'Thầy Minh Đức', subject: 'IELTS', phone: '0901 000 102', years: 9, status: 'active', avatarTone: 'butter', staffRole: 'teacher' },
  { name: 'Cô Hải Yến', subject: 'TOEIC', phone: '0901 000 103', years: 4, status: 'active', avatarTone: 'lav', staffRole: 'teacher' },
  { name: 'Thầy Quốc Bảo', subject: 'Giao tiếp', phone: '0901 000 104', years: 5, status: 'leave', avatarTone: 'blush', staffRole: 'teacher' },
  { name: 'Cô Ngọc Ánh', subject: 'Thiếu nhi', phone: '0901 000 105', years: 7, status: 'active', avatarTone: 'mint', staffRole: 'teacher' },
  { name: 'Ms. Emily Carter', subject: 'Speaking', phone: '0901 000 201', years: 8, status: 'active', avatarTone: 'lav', staffRole: 'foreign' },
  { name: 'Mr. Daniel Brooks', subject: 'IELTS Writing', phone: '0901 000 202', years: 10, status: 'active', avatarTone: 'butter', staffRole: 'foreign' },
  { name: 'Cô Lan Anh', subject: 'Hỗ trợ lớp', phone: '0901 000 203', years: 2, status: 'active', avatarTone: 'mint', staffRole: 'assistant' },
  { name: 'Cô Mai Thảo', subject: 'Hỗ trợ lớp', phone: '0901 000 204', years: 1, status: 'active', avatarTone: 'blush', staffRole: 'assistant' },
] as const;

// weekdays: T2..T7, CN. Giờ theo định dạng HH:MM
// teacher: giáo viên chủ nhiệm; assistant: trợ giảng; foreign: giáo viên nước ngoài
const CLASS_SEED = [
  { name: 'IELTS-K12', course: 'IELTS Foundation 5.5', teacher: 'Cô Thu Hà', assistant: 'Cô Lan Anh', foreign: 'Ms. Emily Carter', weekdays: 'T2,T4,T6', startTime: '18:30', endTime: '20:30', sessionsTotal: 48, fee: 12_000_000, room: 'P.201', capacity: 20 },
  { name: 'IELTS-K14', course: 'IELTS Intensive 6.5', teacher: 'Thầy Minh Đức', assistant: 'Cô Mai Thảo', foreign: 'Mr. Daniel Brooks', weekdays: 'T3,T5,T7', startTime: '19:00', endTime: '21:00', sessionsTotal: 60, fee: 15_000_000, room: 'P.203', capacity: 18 },
  { name: 'TOEIC-T2', course: 'TOEIC 600+', teacher: 'Cô Hải Yến', assistant: 'Cô Lan Anh', foreign: 'Mr. Daniel Brooks', weekdays: 'T2,T4', startTime: '17:30', endTime: '19:00', sessionsTotal: 36, fee: 6_800_000, room: 'P.105', capacity: 22 },
  { name: 'GT-A1', course: 'Giao tiếp cơ bản', teacher: 'Thầy Quốc Bảo', assistant: 'Cô Mai Thảo', foreign: 'Ms. Emily Carter', weekdays: 'T7,CN', startTime: '09:00', endTime: '11:00', sessionsTotal: 24, fee: 4_500_000, room: 'P.110', capacity: 16 },
  { name: 'KIDS-S1', course: 'Starters (Thiếu nhi)', teacher: 'Cô Ngọc Ánh', assistant: 'Cô Lan Anh', foreign: 'Ms. Emily Carter', weekdays: 'T3,T5', startTime: '16:00', endTime: '17:30', sessionsTotal: 40, fee: 5_200_000, room: 'P.301', capacity: 14 },
  { name: 'KIDS-M1', course: 'Movers (Thiếu nhi)', teacher: 'Cô Ngọc Ánh', assistant: 'Cô Mai Thảo', foreign: 'Mr. Daniel Brooks', weekdays: 'T2,T4,T6', startTime: '17:00', endTime: '18:00', sessionsTotal: 40, fee: 5_600_000, room: 'P.302', capacity: 14 },
] as const;

const ACCOUNT_SEED = [
  { fullName: 'Quản trị viên', email: 'admin@esl-center.vn', role: 'admin', status: 'active', teacher: null },
  { fullName: 'Nguyễn Thu Trang', email: 'trang.giaovu@esl-center.vn', role: 'academic', status: 'active', teacher: null },
  { fullName: 'Trần Bảo Ngọc', email: 'ngoc.ketoan@esl-center.vn', role: 'accountant', status: 'active', teacher: null },
  { fullName: 'Cô Thu Hà', email: 'thu.ha@esl-center.vn', role: 'teacher', status: 'active', teacher: 'Cô Thu Hà' },
  { fullName: 'Thầy Quốc Bảo', email: 'quoc.bao@esl-center.vn', role: 'teacher', status: 'locked', teacher: 'Thầy Quốc Bảo' },
] as const;

const NOW = new Date('2026-10-13T12:00:00+07:00'); // mốc "hôm nay" của dữ liệu mẫu
const REFERENCE_DAY = Date.UTC(2026, 9, 12); // buổi học gần nhất trong điểm danh mẫu


const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function addDays(base: number, days: number): string {
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

// Điểm danh giả lập giống bản mẫu: mỗi học sinh vắng một mức khác nhau
function marksFor(seed: number, length: number): Mark[] {
  const band = seed % 4;
  return Array.from({ length }, (_, k) => {
    const x = (seed * 3 + k * 5) % 11;
    if (x < band) return 'absent';
    if (x === 4 || x === 9) return 'late';
    return 'present';
  });
}

// Các buổi học của một lớp, sinh bằng hàm dùng chung generateSessions (src/lib/schedule.ts)
function sessionsFor(cls: { id: number; teacherId: number; room: string; weekdays: string; startTime: string; endTime: string; sessionsTotal: number }, fromDate: string) {
  return generateSessions({ ...cls, fromDate }).map((s) => ({
    classId: cls.id,
    sessionNo: s.sessionNo,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    teacherId: cls.teacherId,
    room: cls.room,
    topic: `Bài ${s.sessionNo}`,
    status: (s.startsAt < NOW ? 'done' : 'planned') as 'done' | 'planned',
  }));
}

async function resetAppData() {
  await db.execute(sql`TRUNCATE TABLE
    account_campuses, audit_logs, learning_events, assignment_submissions, assignments, class_sessions,
    student_parents, parents, tuition_payments, attendance, students, classes, campuses,
    accounts, teachers, teacher_campuses, role_permissions, center_settings
    RESTART IDENTITY CASCADE`);
  console.log('Đã xoá dữ liệu cũ (--reset).');
}

async function main() {
  if (RESET) {
    if (process.env.NODE_ENV === 'production') throw new Error('Không chạy --reset khi NODE_ENV=production.');
    await resetAppData();
  }

  const [{ value: existing }] = await db.select({ value: count() }).from(students);
  const [{ value: existingTeachers }] = await db.select({ value: count() }).from(teachers);
  if (existing > 0 || existingTeachers > 0) {
    console.log('Bảng đã có dữ liệu, bỏ qua seed để không ghi trùng. Dùng db:seed:reset để nạp lại.');
    return;
  }

  await db.transaction(async (tx) => {
    // Cơ sở, giáo viên và lớp. Mọi lớp mẫu thuộc cơ sở chính.
    // Migration 0003 đã tạo sẵn "Cơ sở chính" trên DB mới, nên dùng upsert theo tên thay vì insert thường (E-065).
    const [mainCampus] = await tx
      .insert(campuses)
      .values({ name: 'Cơ sở chính', address: 'Số 1, đường mẫu, quận demo' })
      .onConflictDoUpdate({ target: campuses.name, set: { address: 'Số 1, đường mẫu, quận demo' } })
      .returning({ id: campuses.id });
    const insertedTeachers = await tx.insert(teachers).values(TEACHER_SEED.map((t) => ({ ...t }))).returning({ id: teachers.id, name: teachers.name });
    // Giáo viên mẫu đều dạy ở cơ sở chính
    await tx.insert(teacherCampuses).values(insertedTeachers.map((t) => ({ teacherId: t.id, campusId: mainCampus.id })));
    const teacherId = new Map(insertedTeachers.map((t) => [t.name, t.id]));

    const insertedClasses = await tx
      .insert(classes)
      .values(
        CLASS_SEED.map((c) => ({
          campusId: mainCampus.id,
          name: c.name,
          course: c.course,
          teacherId: teacherId.get(c.teacher)!,
          assistantId: teacherId.get(c.assistant)!,
          foreignTeacherId: teacherId.get(c.foreign)!,
          schedule: `${c.weekdays.replace(/,/g, ' · ')} · ${c.startTime}–${c.endTime}`,
          weekdays: c.weekdays,
          startTime: c.startTime,
          endTime: c.endTime,
          sessionsTotal: c.sessionsTotal,
          fee: c.fee,
          room: c.room,
          capacity: c.capacity,
        })),
      )
      .returning({ id: classes.id, name: classes.name, fee: classes.fee, sessionsTotal: classes.sessionsTotal, teacherId: classes.teacherId, room: classes.room, weekdays: classes.weekdays, startTime: classes.startTime, endTime: classes.endTime });
    const classByName = new Map(insertedClasses.map((c) => [c.name, c]));
    const classByIndex = CLASS_SEED.map((c) => classByName.get(c.name)!);

    // Buổi học: từ 01/09/2026 theo lịch tuần của từng lớp
    const sessionRows = insertedClasses.flatMap((c) => sessionsFor(c, '2026-09-01'));
    for (let i = 0; i < sessionRows.length; i += 200) {
      await tx.insert(classSessions).values(sessionRows.slice(i, i + 200));
    }

    // Phụ huynh
    const insertedParents = await tx
      .insert(parents)
      .values(PARENT_SEED.map((p, j) => ({ ...p, phone: '09' + String(20_000_000 + j * 4421).padStart(8, '0') })))
      .returning({ id: parents.id });

    // Học sinh, thu học phí, điểm danh, liên kết phụ huynh
    const studentIds: { id: number; classIndex: number; status: string; index: number }[] = [];
    for (let i = 0; i < NAMES.length; i++) {
      const [fullName, gender] = NAMES[i];
      const cls = classByIndex[i % classByIndex.length];
      const isKid = cls.name.startsWith('KIDS');
      const status = STATUS_POOL[i % STATUS_POOL.length];
      const trial = status === 'trial';
      const pattern = i % 4; // 0 đủ · 1 một phần · 2 đủ · 3 chưa đóng
      const paid = trial || pattern === 3 ? 0 : pattern === 1 ? Math.round((cls.fee * 0.5) / 1000) * 1000 : cls.fee;
      const done = trial ? 1 + (i % 2) : Math.min(cls.sessionsTotal, 6 + ((i * 7) % 30));
      const startDate = `2026-${pad((i % 9) + 1)}-${pad((i % 27) + 1)}`;

      const [student] = await tx
        .insert(students)
        .values({
          fullName,
          searchKey: normalizeSearch(fullName),
          gender,
          dob: `${isKid ? 2016 + (i % 3) : 1999 + (i % 9)}-${pad((i % 12) + 1)}-${pad((i % 27) + 1)}`,
          classId: cls.id,
          status,
          startDate,
          sessionsDone: done,
          note: NOTES[i % NOTES.length],
        })
        .returning({ id: students.id });
      studentIds.push({ id: student.id, classIndex: i % classByIndex.length, status, index: i });

      await tx.insert(studentParents).values({
        studentId: student.id,
        parentId: insertedParents[i % insertedParents.length].id,
        relation: i % 2 === 0 ? 'father' : 'mother',
        isPrimary: true,
      });

      if (paid > 0) {
        await tx.insert(tuitionPayments).values({ studentId: student.id, amount: paid, paidAt: new Date(`${startDate}T09:00:00+07:00`), note: 'Thu học phí (dữ liệu mẫu)' });
      }

      const marks = marksFor(i, trial ? 2 : 10);
      await tx.insert(attendance).values(
        marks.map((mark, k) => ({
          studentId: student.id,
          classId: cls.id,
          sessionDate: addDays(REFERENCE_DAY, -2 * (marks.length - 1 - k)),
          mark,
        })),
      );
    }

    // Bài tập: hai bài cho mỗi lớp, một bài đã quá hạn và một bài sắp hết hạn
    const assignmentRows = insertedClasses.flatMap((c) => [
      { classId: c.id, title: 'Bài tập tuần 3', description: 'Hoàn thành các bài trong giáo trình', dueAt: new Date('2026-09-28T23:59:00+07:00'), maxScore: 10 },
      { classId: c.id, title: 'Kiểm tra ngắn', description: 'Kiểm tra kiến thức đã học trong tháng', dueAt: new Date('2026-10-20T21:00:00+07:00'), maxScore: 20 },
    ]);
    const insertedAssignments = await tx.insert(assignments).values(assignmentRows).returning({ id: assignments.id, classId: assignments.classId, dueAt: assignments.dueAt, maxScore: assignments.maxScore });

    const submissionRows = [];
    for (const a of insertedAssignments) {
      const members = studentIds.filter((s) => s.status !== 'finished' && classByIndex[s.classIndex].id === a.classId);
      const overdue = a.dueAt < NOW;
      for (const s of members) {
        if (overdue) {
          if (s.index % 5 === 0) submissionRows.push({ assignmentId: a.id, studentId: s.id, status: 'not_submitted' as const, submittedAt: null, score: null, feedback: '' });
          else if (s.index % 7 === 0) submissionRows.push({ assignmentId: a.id, studentId: s.id, status: 'submitted' as const, submittedAt: new Date('2026-09-27T20:00:00+07:00'), score: null, feedback: '' });
          else submissionRows.push({ assignmentId: a.id, studentId: s.id, status: 'graded' as const, submittedAt: new Date('2026-09-26T19:00:00+07:00'), score: Math.round((a.maxScore * (5 + (s.index % 5))) / 10), feedback: s.index % 3 === 0 ? 'Cần luyện thêm phần viết' : '' });
        } else if (s.index % 2 === 0) {
          submissionRows.push({ assignmentId: a.id, studentId: s.id, status: 'submitted' as const, submittedAt: new Date('2026-10-10T20:00:00+07:00'), score: null, feedback: '' });
        } else {
          submissionRows.push({ assignmentId: a.id, studentId: s.id, status: 'not_submitted' as const, submittedAt: null, score: null, feedback: '' });
        }
      }
    }
    for (let i = 0; i < submissionRows.length; i += 200) {
      await tx.insert(assignmentSubmissions).values(submissionRows.slice(i, i + 200));
    }

    // Lịch sử học tập: một số sự kiện mẫu cho một số học sinh
    const eventRows = [];
    for (const s of studentIds) {
      if (s.index % 5 === 0) eventRows.push({ studentId: s.id, eventType: 'note' as const, title: 'Tiến bộ phát âm', detail: 'Phát âm âm cuối rõ hơn so với tháng trước.', occurredAt: new Date('2026-09-20T18:00:00+07:00') });
      if (s.index % 7 === 0) eventRows.push({ studentId: s.id, eventType: 'level_up' as const, title: 'Lên trình độ tiếp theo', detail: 'Đạt yêu cầu đầu vào của lớp cao hơn.', occurredAt: new Date('2026-10-02T18:00:00+07:00') });
      if (s.index % 9 === 0) eventRows.push({ studentId: s.id, eventType: 'exam' as const, title: 'Kiểm tra giữa khoá', detail: 'Điểm kiểm tra giữa khoá đạt mục tiêu.', occurredAt: new Date('2026-09-30T18:00:00+07:00') });
    }
    if (eventRows.length > 0) await tx.insert(learningEvents).values(eventRows);

    // Tài khoản, liên kết với giáo viên khi cần. Tài khoản không phải quản trị làm việc ở cơ sở chính (P32).
    const insertedAccounts = await tx.insert(accounts).values(
      ACCOUNT_SEED.map((a) => ({
        fullName: a.fullName,
        email: a.email,
        role: a.role,
        status: a.status,
        teacherId: a.teacher ? teacherId.get(a.teacher)! : null,
      })),
    ).returning({ id: accounts.id, role: accounts.role });
    const staffAccounts = insertedAccounts.filter((a) => a.role !== 'admin');
    if (staffAccounts.length > 0) {
      await tx.insert(accountCampuses).values(staffAccounts.map((a) => ({ accountId: a.id, campusId: mainCampus.id })));
    }

    // Ma trận quyền mặc định
    const permissionRows = ROLE_CODES.flatMap((role) =>
      PERMISSIONS.map((p) => ({ role, permission: p.key, granted: DEFAULT_GRANTS[role].includes(p.key) })),
    );
    await tx.insert(rolePermissions).values(permissionRows);

    // Cài đặt trung tâm
    await tx.insert(centerSettings).values({
      id: 1,
      centerName: 'ESL Center',
      address: 'Cơ sở chính · Số 1, đường mẫu, quận demo',
      hotline: '0900 000 000',
      email: 'hello@esl-center.vn',
      workingHours: '08:00 – 21:30, từ thứ Hai đến Chủ nhật',
      dueDay: 10,
      lateFeePercent: 5,
      currency: 'VND',
      notifySmsBeforeDue: true,
      notifyWeeklyReport: true,
      notifyAbsentAlert: true,
      notifyNewClass: false,
    });

    await tx.insert(auditLogs).values({ action: 'seed', entity: 'system', entityId: '', summary: 'Nạp dữ liệu mẫu ban đầu' });
  });

  const counts = {
    teachers: (await db.select({ value: count() }).from(teachers))[0].value,
    classes: (await db.select({ value: count() }).from(classes))[0].value,
    classSessions: (await db.select({ value: count() }).from(classSessions))[0].value,
    students: (await db.select({ value: count() }).from(students))[0].value,
    parents: (await db.select({ value: count() }).from(parents))[0].value,
    studentParents: (await db.select({ value: count() }).from(studentParents))[0].value,
    attendance: (await db.select({ value: count() }).from(attendance))[0].value,
    tuitionPayments: (await db.select({ value: count() }).from(tuitionPayments))[0].value,
    assignments: (await db.select({ value: count() }).from(assignments))[0].value,
    assignmentSubmissions: (await db.select({ value: count() }).from(assignmentSubmissions))[0].value,
    learningEvents: (await db.select({ value: count() }).from(learningEvents))[0].value,
    accounts: (await db.select({ value: count() }).from(accounts))[0].value,
    rolePermissions: (await db.select({ value: count() }).from(rolePermissions))[0].value,
  };
  console.log('Seed xong:', counts);
}

main()
  .catch((err) => {
    console.error('Seed lỗi:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
