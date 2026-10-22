// Schema PostgreSQL cho ESL Center. Nguồn chuẩn của cấu trúc dữ liệu.
// Quy ước:
// - Tiền lưu bằng số nguyên VND (không dùng số thực).
// - Mã học sinh hiển thị "HS-0001" được tạo từ id (serial), không lưu thêm.
// - Mỗi thay đổi cấu trúc: sửa file này, chạy `npm run db:generate -- --name=<mô_tả>`, kiểm tra SQL, rồi commit.
// - Không sửa migration đã áp dụng (xem CLAUDE.md mục 4).
import {
  bigint,
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
// Vai trò nhân sự giảng dạy: giáo viên (chủ nhiệm), giáo viên nước ngoài, trợ giảng
export const staffRoleEnum = pgEnum('staff_role', ['teacher', 'foreign', 'assistant']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'locked']);
// Vai trò học sinh (P28) dùng cho tài khoản học sinh đăng nhập làm bài. Không có quyền quản lý.
export const roleEnum = pgEnum('role', ['admin', 'academic', 'teacher', 'accountant', 'student']);
export const parentRelationEnum = pgEnum('parent_relation', ['father', 'mother', 'guardian', 'other']);
export const sessionStatusEnum = pgEnum('session_status', ['planned', 'done', 'cancelled']);
export const submissionStatusEnum = pgEnum('submission_status', ['not_submitted', 'submitted', 'graded']);
export const learningEventEnum = pgEnum('learning_event', ['note', 'level_up', 'class_change', 'status_change', 'exam']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// ---------- Cơ sở (1 cơ sở - nhiều lớp) ----------

// Mỗi lớp thuộc đúng một cơ sở. Học sinh, buổi học, điểm danh, bài tập, học phí đi theo lớp.
export const campuses = pgTable(
  'campuses',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    address: varchar('address', { length: 200 }).notNull().default(''),
    ...timestamps,
  },
  (t) => [uniqueIndex('campuses_name_key').on(t.name)],
);

// ---------- Giáo viên, lớp, học sinh ----------

export const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  subject: varchar('subject', { length: 80 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull().default(''),
  years: integer('years').notNull().default(0),
  status: teacherStatusEnum('status').notNull().default('active'),
  avatarTone: varchar('avatar_tone', { length: 20 }).notNull().default('mint'),
  // Mỗi vị trí của lớp chỉ nhận đúng vai trò: chủ nhiệm là teacher, giáo viên nước ngoài là foreign, trợ giảng là assistant
  staffRole: staffRoleEnum('staff_role').notNull().default('teacher'),
  ...timestamps,
});

// Giáo viên dạy ở một hoặc nhiều cơ sở (nhiều - nhiều). Mỗi cặp chỉ có một dòng.
export const teacherCampuses = pgTable(
  'teacher_campuses',
  {
    id: serial('id').primaryKey(),
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    campusId: integer('campus_id')
      .notNull()
      .references(() => campuses.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('teacher_campuses_pair_key').on(t.teacherId, t.campusId), index('teacher_campuses_campus_idx').on(t.campusId)],
);

export const classes = pgTable(
  'classes',
  {
    id: serial('id').primaryKey(),
    campusId: integer('campus_id')
      .notNull()
      .references(() => campuses.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 40 }).notNull(),
    course: varchar('course', { length: 120 }).notNull(),
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'restrict' }),
    // Trợ giảng và giáo viên nước ngoài, mỗi lớp một người. Lớp cũ có thể còn trống; form lớp bắt buộc chọn.
    assistantId: integer('assistant_id').references(() => teachers.id, { onDelete: 'restrict' }),
    foreignTeacherId: integer('foreign_teacher_id').references(() => teachers.id, { onDelete: 'restrict' }),
    // Trình độ mục tiêu của lớp (P27), không bắt buộc
    levelId: integer('level_id').references(() => courseLevels.id, { onDelete: 'set null' }),
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
  // Tên lớp duy nhất trong từng cơ sở (cột đầu của chỉ mục cũng phục vụ lọc theo cơ sở)
  (t) => [
    uniqueIndex('classes_campus_name_key').on(t.campusId, t.name),
    index('classes_teacher_idx').on(t.teacherId),
    index('classes_assistant_idx').on(t.assistantId),
    index('classes_foreign_idx').on(t.foreignTeacherId),
  ],
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
    // Trình độ hiện tại (P27). Để trống là chưa xếp.
    levelId: integer('level_id').references(() => courseLevels.id, { onDelete: 'set null' }),
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
    // Bài tập có thể gắn một bài giảng (P25). Xoá bài giảng đang gắn thì bị chặn ở ứng dụng.
    lessonId: integer('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('assignments_class_idx').on(t.classId), index('assignments_lesson_idx').on(t.lessonId)],
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
    // Người chấm lần đầu. Chấm chéo phải do người khác, nên cần biết ai đã chấm (P23)
    gradedByAccountId: integer('graded_by_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('assignment_submissions_pair_key').on(t.assignmentId, t.studentId)],
);

// ---------- Câu hỏi trong bài tập (P22) ----------

// Bốn kỹ năng cố định (docs/NGHIEN-CUU-GIANG-DAY.md). Loại câu: trắc nghiệm (tự chấm), trả lời viết (chấm tay), nộp tệp (chấm tay).
export const skillEnum = pgEnum('skill', ['listening', 'speaking', 'reading', 'writing']);
export const itemTypeEnum = pgEnum('item_type', [
  'choice',
  'text',
  'file',
  'picture_choice',
  'match',
  'order',
  'gap_fill',
  'speak_repeat',
  'speak_read',
  'speak_picture',
]);

// Tệp tải lên: âm thanh của đề, tệp bài nộp, tài liệu. Nội dung nằm trên Supabase Storage hoặc lưu trữ Google Drive (P34.25).
export const uploadedFiles = pgTable(
  'uploaded_files',
  {
    id: serial('id').primaryKey(),
    storageKey: varchar('storage_key', { length: 64 }).notNull(),
    originalName: varchar('original_name', { length: 200 }).notNull(),
    mimeType: varchar('mime_type', { length: 120 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedByAccountId: integer('uploaded_by_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    storageLocation: varchar('storage_location', { length: 20 }).notNull().default('supabase'),
    driveFileId: varchar('drive_file_id', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uploaded_files_key').on(t.storageKey)],
);

// Câu hỏi bên trong một bài tập. Xoá bài thì xoá câu hỏi. Hỗ trợ các dạng câu P35 (tranh, âm thanh mẫu, ghi âm).
export const assignmentItems = pgTable(
  'assignment_items',
  {
    id: serial('id').primaryKey(),
    assignmentId: integer('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    skill: skillEnum('skill').notNull(),
    itemType: itemTypeEnum('item_type').notNull(),
    prompt: text('prompt').notNull().default(''),
    promptVi: text('prompt_vi').notNull().default(''),
    passage: text('passage').notNull().default(''),
    points: integer('points').notNull().default(1),
    audioFileId: integer('audio_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    imageFileId: integer('image_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    modelAudioFileId: integer('model_audio_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    referenceText: text('reference_text').notNull().default(''),
    maxSeconds: integer('max_seconds').notNull().default(10),
    sourceLicense: varchar('source_license', { length: 300 }).notNull().default(''),
    // Câu chép từ ngân hàng (P24). Xoá câu trong ngân hàng thì bài vẫn giữ nội dung đã chép.
    bankQuestionId: integer('bank_question_id').references(() => questions.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('assignment_items_assignment_idx').on(t.assignmentId, t.position), index('assignment_items_bank_idx').on(t.bankQuestionId)],
);

// Đáp án của câu trắc nghiệm / chọn tranh. Có thể kèm ảnh hoặc âm thanh riêng của từng đáp án.
export const assignmentItemOptions = pgTable(
  'assignment_item_options',
  {
    id: serial('id').primaryKey(),
    itemId: integer('item_id')
      .notNull()
      .references(() => assignmentItems.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    label: varchar('label', { length: 300 }).notNull(),
    imageFileId: integer('image_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    audioFileId: integer('audio_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    isCorrect: boolean('is_correct').notNull().default(false),
  },
  (t) => [index('assignment_item_options_item_idx').on(t.itemId)],
);

// Các cặp ghép đôi cho câu hỏi dạng match (P35)
export const assignmentItemPairs = pgTable(
  'assignment_item_pairs',
  {
    id: serial('id').primaryKey(),
    itemId: integer('item_id')
      .notNull()
      .references(() => assignmentItems.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    leftLabel: varchar('left_label', { length: 300 }).notNull(),
    leftImageFileId: integer('left_image_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    rightLabel: varchar('right_label', { length: 300 }).notNull(),
    rightImageFileId: integer('right_image_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
  },
  (t) => [index('assignment_item_pairs_item_idx').on(t.itemId)],
);

export const materialKindEnum = pgEnum('material_kind', ['link', 'file']);

// Bài làm của một học sinh cho một câu: đáp án đã chọn, chữ, tệp, điểm và nhận xét
export const submissionItemScores = pgTable(
  'submission_item_scores',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .notNull()
      .references(() => assignmentSubmissions.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => assignmentItems.id, { onDelete: 'cascade' }),
    selectedOptionId: integer('selected_option_id').references(() => assignmentItemOptions.id, { onDelete: 'set null' }),
    answerText: text('answer_text').notNull().default(''),
    fileId: integer('file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    points: integer('points'),
    comment: text('comment').notNull().default(''),
    ...timestamps,
  },
  (t) => [uniqueIndex('submission_item_scores_pair_key').on(t.submissionId, t.itemId)],
);

// Tiêu chí chấm của câu viết và nộp tệp (P23). Điểm câu bằng tổng điểm các tiêu chí.
export const assignmentItemCriteria = pgTable(
  'assignment_item_criteria',
  {
    id: serial('id').primaryKey(),
    itemId: integer('item_id')
      .notNull()
      .references(() => assignmentItems.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    maxPoints: integer('max_points').notNull(),
    ...timestamps,
  },
  (t) => [index('assignment_item_criteria_item_idx').on(t.itemId, t.position)],
);

// Điểm từng tiêu chí trong một bài làm
export const submissionCriterionScores = pgTable(
  'submission_criterion_scores',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .notNull()
      .references(() => assignmentSubmissions.id, { onDelete: 'cascade' }),
    criterionId: integer('criterion_id')
      .notNull()
      .references(() => assignmentItemCriteria.id, { onDelete: 'cascade' }),
    points: integer('points'),
    comment: text('comment').notNull().default(''),
    ...timestamps,
  },
  (t) => [uniqueIndex('submission_criterion_scores_pair_key').on(t.submissionId, t.criterionId)],
);

// Chấm chéo: giáo viên khác chấm lại một câu để kiểm tra độ nhất quán. Không thay đổi điểm chính thức.
export const submissionSecondMarks = pgTable(
  'submission_second_marks',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .notNull()
      .references(() => assignmentSubmissions.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => assignmentItems.id, { onDelete: 'cascade' }),
    graderAccountId: integer('grader_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    points: integer('points').notNull(),
    comment: text('comment').notNull().default(''),
    ...timestamps,
  },
  (t) => [uniqueIndex('submission_second_marks_pair_key').on(t.submissionId, t.itemId)],
);

// ---------- Trình độ và ngưỡng lên lớp (P27) ----------

// Trình độ A1–C2 mặc định, tên sửa được trong Cài đặt. Mã trình độ là duy nhất.
export const courseLevels = pgTable(
  'course_levels',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 10 }).notNull(),
    name: varchar('name', { length: 80 }).notNull(),
    sort: integer('sort').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('course_levels_code_key').on(t.code)],
);

// Ngưỡng để lên trình độ kế tiếp, theo từng kỹ năng (phần trăm). Dòng thuộc trình độ hiện tại.
export const levelThresholds = pgTable(
  'level_thresholds',
  {
    id: serial('id').primaryKey(),
    levelId: integer('level_id')
      .notNull()
      .references(() => courseLevels.id, { onDelete: 'cascade' }),
    skill: skillEnum('skill').notNull(),
    minPercent: integer('min_percent').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('level_thresholds_pair_key').on(t.levelId, t.skill)],
);

// ---------- Bài giảng và tài liệu (P25) ----------

// Bài giảng dùng chung cho một hoặc nhiều cơ sở (PLAN D7). Bài tập có thể trỏ về một bài giảng.
export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 160 }).notNull(),
  // Mục tiêu viết theo dạng "học sinh làm được gì"
  objectives: text('objectives').notNull().default(''),
  content: text('content').notNull().default(''),
  createdByAccountId: integer('created_by_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  ...timestamps,
});

// Bài giảng thuộc những cơ sở nào (nhiều - nhiều). Form bắt buộc chọn ít nhất một cơ sở.
export const lessonCampuses = pgTable(
  'lesson_campuses',
  {
    id: serial('id').primaryKey(),
    lessonId: integer('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    campusId: integer('campus_id')
      .notNull()
      .references(() => campuses.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('lesson_campuses_pair_key').on(t.lessonId, t.campusId), index('lesson_campuses_campus_idx').on(t.campusId)],
);

// Tài liệu của bài giảng: liên kết (link) hoặc tệp tải lên (file)
export const lessonMaterials = pgTable(
  'lesson_materials',
  {
    id: serial('id').primaryKey(),
    lessonId: integer('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    kind: materialKindEnum('kind').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    url: varchar('url', { length: 500 }).notNull().default(''),
    fileId: integer('file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('lesson_materials_lesson_idx').on(t.lessonId, t.position)],
);

// ---------- Kho từ cho Soạn nhanh (P36.4) ----------

// Từ dùng chung toàn trung tâm: nạp sẵn bộ từ khởi đầu (src/lib/vocab-starter.ts) và từ A1, A2 của CEFR-J Wordlist 1.5
// (Tono Laboratory, ĐH Ngoại ngữ Tokyo; dùng thương mại miễn phí, phải ghi nguồn). Giáo viên thêm từ thì chờ người có quyền Cài đặt duyệt.
// Một từ có thể nằm ở hai chủ đề với hai nghĩa (chicken: con gà, thịt gà), nên khoá là (từ, chủ đề).
export const vocabItems = pgTable(
  'vocab_items',
  {
    id: serial('id').primaryKey(),
    headword: varchar('headword', { length: 60 }).notNull(),
    pos: varchar('pos', { length: 30 }).notNull().default(''),
    level: varchar('level', { length: 10 }).notNull(), // mã trình độ: Pre-A1, A1, A2...
    topic: varchar('topic', { length: 60 }).notNull().default(''), // khoá chủ đề (Animals...) hoặc tên chủ đề CEFR-J; rỗng là chưa xếp
    meaningVi: varchar('meaning_vi', { length: 120 }).notNull().default(''),
    emoji: varchar('emoji', { length: 16 }).notNull().default(''),
    imageFileId: integer('image_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    audioFileId: integer('audio_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    source: varchar('source', { length: 20 }).notNull(), // starter | cefrj | teacher
    approved: boolean('approved').notNull().default(true),
    exampleSentence: text('example_sentence').notNull().default(''),
    createdByAccountId: integer('created_by_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('vocab_items_word_topic_key').on(t.headword, t.topic), index('vocab_items_level_idx').on(t.level), index('vocab_items_topic_idx').on(t.topic)],
);

// ---------- Ngân hàng câu hỏi (P24) ----------

// Câu hỏi dùng chung toàn trung tâm. Thêm vào bài thì chép nội dung, nên sửa ngân hàng không đổi bài đã giao.
export const questions = pgTable(
  'questions',
  {
    id: serial('id').primaryKey(),
    skill: skillEnum('skill').notNull(),
    itemType: itemTypeEnum('item_type').notNull(),
    prompt: text('prompt').notNull().default(''),
    promptVi: text('prompt_vi').notNull().default(''),
    passage: text('passage').notNull().default(''),
    points: integer('points').notNull().default(1),
    audioFileId: integer('audio_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    imageFileId: integer('image_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    modelAudioFileId: integer('model_audio_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    referenceText: text('reference_text').notNull().default(''),
    maxSeconds: integer('max_seconds').notNull().default(10),
    sourceLicense: varchar('source_license', { length: 300 }).notNull().default(''),
    // Trình độ (mã: Pre-A1, A1...) và chủ đề để lọc ngân hàng (P36.6). Rỗng là chưa xếp.
    level: varchar('level', { length: 10 }).notNull().default(''),
    topic: varchar('topic', { length: 60 }).notNull().default(''),
    createdByAccountId: integer('created_by_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('questions_skill_idx').on(t.skill), index('questions_level_topic_idx').on(t.level, t.topic)],
);

// Đáp án của câu trong ngân hàng (trắc nghiệm / chọn tranh)
export const questionOptions = pgTable(
  'question_options',
  {
    id: serial('id').primaryKey(),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    label: varchar('label', { length: 300 }).notNull(),
    imageFileId: integer('image_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    audioFileId: integer('audio_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    isCorrect: boolean('is_correct').notNull().default(false),
  },
  (t) => [index('question_options_question_idx').on(t.questionId)],
);

// Các cặp ghép đôi cho câu hỏi dạng match trong ngân hàng
export const questionPairs = pgTable(
  'question_pairs',
  {
    id: serial('id').primaryKey(),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    leftLabel: varchar('left_label', { length: 300 }).notNull(),
    leftImageFileId: integer('left_image_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
    rightLabel: varchar('right_label', { length: 300 }).notNull(),
    rightImageFileId: integer('right_image_file_id').references(() => uploadedFiles.id, { onDelete: 'set null' }),
  },
  (t) => [index('question_pairs_question_idx').on(t.questionId)],
);

// Tiêu chí chấm của câu trong ngân hàng (viết, nộp tệp)
export const questionCriteria = pgTable(
  'question_criteria',
  {
    id: serial('id').primaryKey(),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    maxPoints: integer('max_points').notNull(),
  },
  (t) => [index('question_criteria_question_idx').on(t.questionId, t.position)],
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
    // Tài khoản học sinh gắn với hồ sơ học sinh (P28). Mỗi học sinh tối đa một tài khoản.
    studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }),
    // scrypt: "scrypt$<salt hex>$<hash hex>". Null khi tài khoản chưa đặt mật khẩu.
    passwordHash: varchar('password_hash', { length: 255 }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('accounts_email_key').on(t.email), uniqueIndex('accounts_student_key').on(t.studentId)],
);

// Cơ sở mà tài khoản được làm việc (P32). Quản trị không cần dòng nào: luôn thấy mọi cơ sở.
// Tài khoản khác chỉ đọc và ghi dữ liệu của các cơ sở có trong bảng này.
export const accountCampuses = pgTable(
  'account_campuses',
  {
    id: serial('id').primaryKey(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    campusId: integer('campus_id')
      .notNull()
      .references(() => campuses.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('account_campuses_pair_key').on(t.accountId, t.campusId), index('account_campuses_campus_idx').on(t.campusId)],
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
export type Campus = typeof campuses.$inferSelect;
// ---------- Đồng ý của phụ huynh (P35.12) ----------

// Mục đích cần đồng ý riêng: ghi âm để giáo viên chấm; gửi giọng nói ra dịch vụ chấm tự động (giai đoạn G)
export const consentPurposeEnum = pgEnum('consent_purpose', ['voice_teacher_review', 'voice_auto_scoring']);

// Mỗi lần phụ huynh đồng ý hoặc từ chối là một dòng; không xoá dòng khi rút lại, chỉ ghi thời điểm rút (bằng chứng đồng ý,
// Luật 91/2025/QH15 Điều 9). Trạng thái hiện tại là dòng mới nhất của mỗi mục đích.
export const parentConsents = pgTable(
  'parent_consents',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    purpose: consentPurposeEnum('purpose').notNull(),
    granted: boolean('granted').notNull(), // false là phụ huynh bấm không đồng ý
    parentId: integer('parent_id').references(() => parents.id, { onDelete: 'set null' }),
    channel: varchar('channel', { length: 20 }).notNull(), // telegram | staff | demo
    termsVersion: varchar('terms_version', { length: 20 }).notNull(), // phiên bản nội dung đã hiện cho phụ huynh
    note: text('note').notNull().default(''), // nhân viên ghi nhận: đã có giấy đồng ý, gọi điện...
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    childAgreedAt: timestamp('child_agreed_at', { withTimezone: true }), // trẻ từ 7 tuổi tự bấm đồng ý trong khu học sinh
    recordedByAccountId: integer('recorded_by_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('parent_consents_student_idx').on(t.studentId, t.purpose)],
);

// ---------- Telegram (P34) ----------

export const telegramDirectionEnum = pgEnum('telegram_direction', ['in', 'out']);

// Một chat Telegram gắn với một phụ huynh hoặc một tài khoản nhân viên. chat_id là id chat do Telegram cấp.
export const telegramChats = pgTable(
  'telegram_chats',
  {
    id: serial('id').primaryKey(),
    chatId: bigint('chat_id', { mode: 'number' }).notNull(),
    parentId: integer('parent_id').references(() => parents.id, { onDelete: 'cascade' }),
    accountId: integer('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
    displayName: varchar('display_name', { length: 160 }).notNull().default(''),
    active: boolean('active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('telegram_chats_chat_key').on(t.chatId), index('telegram_chats_parent_idx').on(t.parentId), index('telegram_chats_account_idx').on(t.accountId)],
);

// Mã kết nối dùng một lần: người dùng gửi /start <mã> cho bot để gắn chat với phụ huynh hoặc tài khoản
export const telegramLinkCodes = pgTable(
  'telegram_link_codes',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 40 }).notNull(),
    parentId: integer('parent_id').references(() => parents.id, { onDelete: 'cascade' }),
    accountId: integer('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
    createdByAccountId: integer('created_by_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('telegram_link_codes_code_key').on(t.code)],
);

// Tin nhắn qua bot: phụ huynh gửi vào (in) và trung tâm gửi ra (out). delivered = false khi chưa gửi được (chưa có token, lỗi mạng).
export const telegramMessages = pgTable(
  'telegram_messages',
  {
    id: serial('id').primaryKey(),
    chatId: bigint('chat_id', { mode: 'number' }).notNull(),
    parentId: integer('parent_id').references(() => parents.id, { onDelete: 'cascade' }),
    accountId: integer('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
    direction: telegramDirectionEnum('direction').notNull(),
    kind: varchar('kind', { length: 20 }).notNull().default('text'),
    text: text('text').notNull(),
    sentByAccountId: integer('sent_by_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    delivered: boolean('delivered').notNull().default(true),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('telegram_messages_parent_idx').on(t.parentId, t.createdAt), index('telegram_messages_chat_idx').on(t.chatId, t.createdAt)],
);

export type Teacher = typeof teachers.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Parent = typeof parents.$inferSelect;
export type ClassSession = typeof classSessions.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
