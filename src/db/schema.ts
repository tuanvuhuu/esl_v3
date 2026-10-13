// Schema PostgreSQL cho ESL Center. Nguồn chuẩn của cấu trúc dữ liệu.
// Quy ước:
// - Tiền lưu bằng số nguyên VND (không dùng số thực).
// - Mã học sinh hiển thị "HS-0001" được tạo từ id (serial), không lưu thêm.
// - Mỗi thay đổi cấu trúc: sửa file này, chạy `npm run db:generate -- --name=<mô_tả>`, kiểm tra SQL, rồi commit.
// - Không sửa migration đã áp dụng (xem CLAUDE.md mục 4).
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

// ---------- Enum ----------

export const studentStatusEnum = pgEnum('student_status', ['active', 'trial', 'paused', 'finished']);
export const genderEnum = pgEnum('gender', ['male', 'female']);
export const attendanceMarkEnum = pgEnum('attendance_mark', ['present', 'late', 'absent']);
export const teacherStatusEnum = pgEnum('teacher_status', ['active', 'leave']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'locked']);
export const roleEnum = pgEnum('role', ['admin', 'academic', 'teacher', 'accountant']);
export const parentRelationEnum = pgEnum('parent_relation', ['father', 'mother', 'guardian', 'other']);
export const sessionStatusEnum = pgEnum('session_status', ['planned', 'done', 'cancelled']);
export const submissionStatusEnum = pgEnum('submission_status', ['not_submitted', 'submitted', 'graded']);
export const learningEventEnum = pgEnum('learning_event', ['note', 'level_up', 'class_change', 'status_change', 'exam']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// ---------- Giáo viên, lớp, học sinh ----------

export const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  subject: varchar('subject', { length: 80 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull().default(''),
  years: integer('years').notNull().default(0),
  status: teacherStatusEnum('status').notNull().default('active'),
  avatarTone: varchar('avatar_tone', { length: 20 }).notNull().default('mint'),
  ...timestamps,
});

export const classes = pgTable(
  'classes',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 40 }).notNull(),
    course: varchar('course', { length: 120 }).notNull(),
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'restrict' }),
    // Hiển thị dạng chữ, ví dụ "T2 · T4 · T6 · 18:30–20:30"
    schedule: varchar('schedule', { length: 120 }).notNull().default(''),
    // Lịch tuần để sinh buổi học: "T2,T4,T6" và giờ "18:30", "20:30"
    weekdays: varchar('weekdays', { length: 20 }).notNull().default(''),
    startTime: varchar('start_time', { length: 5 }).notNull().default(''),
    endTime: varchar('end_time', { length: 5 }).notNull().default(''),
    sessionsTotal: integer('sessions_total').notNull(),
    fee: integer('fee').notNull(),
    room: varchar('room', { length: 40 }).notNull().default(''),
    capacity: integer('capacity').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('classes_name_key').on(t.name), index('classes_teacher_idx').on(t.teacherId)],
);

export const students = pgTable(
  'students',
  {
    id: serial('id').primaryKey(),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    // Tên đã bỏ dấu, chữ thường, để tìm kiếm không dấu (lib/text.ts normalizeSearch). Cập nhật cùng lúc với full_name.
    searchKey: varchar('search_key', { length: 160 }).notNull().default(''),
    gender: genderEnum('gender').notNull(),
    dob: date('dob').notNull(),
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    status: studentStatusEnum('status').notNull().default('trial'),
    startDate: date('start_date').notNull(),
    sessionsDone: integer('sessions_done').notNull().default(0),
    note: text('note').notNull().default(''),
    ...timestamps,
  },
  (t) => [
    index('students_class_idx').on(t.classId),
    index('students_status_idx').on(t.status),
    index('students_search_key_idx').on(t.searchKey),
  ],
);

// ---------- Phụ huynh (P11) ----------

export const parents = pgTable(
  'parents',
  {
    id: serial('id').primaryKey(),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 160 }).notNull().default(''),
    note: text('note').notNull().default(''),
    ...timestamps,
  },
  (t) => [index('parents_phone_idx').on(t.phone)],
);

// Một học sinh có thể có nhiều phụ huynh, một phụ huynh có thể có nhiều con
export const studentParents = pgTable(
  'student_parents',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    parentId: integer('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    relation: parentRelationEnum('relation').notNull().default('other'),
    isPrimary: boolean('is_primary').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('student_parents_pair_key').on(t.studentId, t.parentId)],
);

// ---------- Lịch học (P12) ----------

// Mỗi buổi học cụ thể, sinh từ lịch tuần của lớp
export const classSessions = pgTable(
  'class_sessions',
  {
    id: serial('id').primaryKey(),
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    sessionNo: integer('session_no').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'restrict' }),
    room: varchar('room', { length: 40 }).notNull().default(''),
    topic: varchar('topic', { length: 160 }).notNull().default(''),
    status: sessionStatusEnum('status').notNull().default('planned'),
    cancelReason: varchar('cancel_reason', { length: 200 }).notNull().default(''),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('class_sessions_class_start_key').on(t.classId, t.startsAt),
    index('class_sessions_class_no_idx').on(t.classId, t.sessionNo),
  ],
);

// ---------- Điểm danh và học phí ----------

// Mỗi học sinh một dòng cho mỗi ngày học đã điểm danh
export const attendance = pgTable(
  'attendance',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    sessionDate: date('session_date').notNull(),
    mark: attendanceMarkEnum('mark').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('attendance_student_date_key').on(t.studentId, t.sessionDate)],
);

// Sổ thu học phí. Số đã đóng của học sinh = tổng các khoản thu.
export const tuitionPayments = pgTable(
  'tuition_payments',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
    note: varchar('note', { length: 200 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('tuition_payments_student_idx').on(t.studentId)],
);

// ---------- Bài tập (P13) ----------

export const assignments = pgTable(
  'assignments',
  {
    id: serial('id').primaryKey(),
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description').notNull().default(''),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    maxScore: integer('max_score').notNull().default(10),
    ...timestamps,
  },
  (t) => [index('assignments_class_idx').on(t.classId)],
);

export const assignmentSubmissions = pgTable(
  'assignment_submissions',
  {
    id: serial('id').primaryKey(),
    assignmentId: integer('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    status: submissionStatusEnum('status').notNull().default('not_submitted'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    score: integer('score'),
    feedback: text('feedback').notNull().default(''),
    ...timestamps,
  },
  (t) => [uniqueIndex('assignment_submissions_pair_key').on(t.assignmentId, t.studentId)],
);

// ---------- Lịch sử học tập (P14) ----------

// Sự kiện do người dùng ghi: ghi chú, thăng cấp, thi, đổi trạng thái, đổi lớp
export const learningEvents = pgTable(
  'learning_events',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    eventType: learningEventEnum('event_type').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    detail: text('detail').notNull().default(''),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdByAccountId: integer('created_by_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('learning_events_student_idx').on(t.studentId, t.occurredAt)],
);

// ---------- Người dùng, phân quyền, nhật ký (P10) ----------

export const accounts = pgTable(
  'accounts',
  {
    id: serial('id').primaryKey(),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    email: varchar('email', { length: 160 }).notNull(),
    role: roleEnum('role').notNull(),
    status: accountStatusEnum('status').notNull().default('active'),
    teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
    // scrypt: "scrypt$<salt hex>$<hash hex>". Null khi tài khoản chưa đặt mật khẩu.
    passwordHash: varchar('password_hash', { length: 255 }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('accounts_email_key').on(t.email)],
);

// Quyền theo vai trò, do quản trị chỉnh trong màn Tài khoản & quyền
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: serial('id').primaryKey(),
    role: roleEnum('role').notNull(),
    permission: varchar('permission', { length: 60 }).notNull(),
    granted: boolean('granted').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('role_permissions_key').on(t.role, t.permission)],
);

// Nhật ký hoạt động: ai đã làm gì, lúc nào
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    accountId: integer('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 60 }).notNull(),
    entity: varchar('entity', { length: 40 }).notNull(),
    entityId: varchar('entity_id', { length: 60 }).notNull().default(''),
    summary: text('summary').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_logs_created_idx').on(t.createdAt)],
);

// ---------- Cài đặt trung tâm ----------

// Chỉ có một dòng, id = 1
export const centerSettings = pgTable('center_settings', {
  id: integer('id').primaryKey().default(1),
  centerName: varchar('center_name', { length: 120 }).notNull(),
  address: varchar('address', { length: 200 }).notNull().default(''),
  hotline: varchar('hotline', { length: 20 }).notNull().default(''),
  email: varchar('email', { length: 160 }).notNull().default(''),
  workingHours: varchar('working_hours', { length: 200 }).notNull().default(''),
  dueDay: integer('due_day').notNull().default(10),
  lateFeePercent: integer('late_fee_percent').notNull().default(5),
  currency: varchar('currency', { length: 10 }).notNull().default('VND'),
  notifySmsBeforeDue: boolean('notify_sms_before_due').notNull().default(true),
  notifyWeeklyReport: boolean('notify_weekly_report').notNull().default(true),
  notifyAbsentAlert: boolean('notify_absent_alert').notNull().default(true),
  notifyNewClass: boolean('notify_new_class').notNull().default(false),
  ...timestamps,
});

export type Student = typeof students.$inferSelect;
export type ClassRow = typeof classes.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Parent = typeof parents.$inferSelect;
export type ClassSession = typeof classSessions.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
