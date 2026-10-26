// Lập kế hoạch nhập dữ liệu và ghi vào DB. Chỉ chạy trên server.
// Thứ tự: cơ sở → giáo viên, trợ giảng, giáo viên nước ngoài → lớp → học sinh → phụ huynh và liên kết.
// Bản ghi nhận ra theo khoá: cơ sở theo tên; lớp theo cơ sở và mã lớp; giáo viên và phụ huynh theo số điện thoại
// (giáo viên không có số thì theo họ tên); học sinh theo mã HS, không có mã thì theo họ tên và ngày sinh.
// Đã có thì cập nhật các ô có giá trị (ô trống giữ nguyên), chưa có thì thêm. Không xoá bản ghi nào.
import { and, eq, min, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { campuses, classes, classSessions, learningEvents, parents, studentParents, students, teacherCampuses, teachers } from '@/db/schema';
import { describeSchedule, generateSessions } from '@/lib/schedule';
import { studentCode } from '@/lib/student-code';
import { normalizeSearch } from '@/lib/text';
import { todayIsoVN } from '@/lib/validation/student';
import { vnDateKey } from '@/lib/datetime';
import { STAFF_ROLE_LABELS, type StaffRole } from '@/lib/validation/teacher';
import { parseRow, type Gender, type ParsedRow, type RawRow, type Relation, type StaffInput, type StudentStatus } from './rows';

type Db = typeof db;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Q = Db | Tx;

export type EntityKind = 'campus' | 'teacher' | 'class' | 'student' | 'parent' | 'link';
export type Action = 'create' | 'update' | 'same';

export const ENTITY_LABELS: Record<EntityKind, string> = {
  campus: 'Cơ sở',
  teacher: 'Giáo viên',
  class: 'Lớp',
  student: 'Học sinh',
  parent: 'Phụ huynh',
  link: 'Liên kết phụ huynh',
};

export type RowAction = { kind: EntityKind; label: string; action: Action };
export type RowResult = {
  rowNumber: number;
  campus: string;
  className: string;
  student: string;
  actions: RowAction[];
  notes: string[];
  errors: string[];
};
export type ImportSummary = Record<EntityKind, Record<Action, number>>;

// ---------- Kế hoạch nội bộ ----------

type CampusPlan = { key: string; id: number | null; name: string; address: string; addressGiven: boolean; set: { address?: string }; firstRow: number };
type StaffPlan = {
  key: string;
  id: number | null;
  role: StaffRole;
  name: string;
  phone: string;
  set: { name?: string; phone?: string };
  campusKeys: Set<string>;
  existingCampusIds: Set<number>;
  firstRow: number;
};
type ClassValues = {
  course: string;
  room: string;
  fee: number | null;
  capacity: number | null;
  weekdays: string;
  startTime: string;
  endTime: string;
  startDate: string;
  sessionsTotal: number | null;
};
type ClassPlan = {
  key: string;
  id: number | null;
  campusKey: string;
  name: string;
  given: ClassValues; // giá trị ghi trong file ở dòng đầu tiên, để so với các dòng sau
  values: ClassValues; // giá trị sau khi nhập
  teacherKey: string | null;
  assistantKey: string | null;
  foreignKey: string | null;
  existing: { teacherId: number; assistantId: number | null; foreignTeacherId: number | null; room: string } | null;
  changed: boolean;
  firstRow: number;
  firstDate: string; // ngày buổi đầu của lớp (YYYY-MM-DD), '' nếu chưa có buổi: học sinh mới bắt đầu học từ ngày này nếu lớp chưa khai giảng
};
type StudentValues = { fullName: string; gender: Gender; dob: string | null; status: StudentStatus; startDate: string; note: string };
type StudentPlan = {
  id: number | null;
  // Mã HS có trong file nhưng chưa có trong hệ thống: học sinh mới được tạo với đúng id (mã) này
  forcedId: number | null;
  classKey: string;
  values: StudentValues;
  set: Partial<StudentValues>;
  classChange: { from: string; to: string } | null;
  rowNumber: number;
};
type ParentPlan = { key: string; id: number | null; fullName: string; email: string; set: { fullName?: string; email?: string }; firstRow: number };
type LinkPlan = { student: StudentPlan; parentKey: string; relation: Relation; isPrimary: boolean; existingId: number | null; action: Action };

export type ImportPlan = {
  rows: RowResult[];
  summary: ImportSummary;
  errorCount: number;
  campuses: CampusPlan[];
  staff: StaffPlan[];
  classes: ClassPlan[];
  students: StudentPlan[];
  parents: ParentPlan[];
  links: LinkPlan[];
};

const SLOT_LABELS: Record<StaffRole, string> = { teacher: 'GV chủ nhiệm', assistant: 'trợ giảng', foreign: 'GV nước ngoài' };
const DEFAULT_SUBJECT: Record<StaffRole, string> = { teacher: 'Tiếng Anh', assistant: 'Hỗ trợ lớp', foreign: 'Tiếng Anh' };
const DEFAULT_TONE: Record<StaffRole, string> = { teacher: 'mint', assistant: 'butter', foreign: 'lav' };

const key = (text: string) => normalizeSearch(text);
const digits = (phone: string) => phone.replace(/\D/g, '');

function actionOf(id: number | null, changed: boolean): Action {
  if (id === null) return 'create';
  return changed ? 'update' : 'same';
}

// Dữ liệu hiện có, đọc một lần. Trung tâm có vài nghìn bản ghi nên đọc hết vào bộ nhớ là đủ nhanh.
async function loadSnapshot(q: Q) {
  const [campusRows, teacherRows, linkRows, classRows, studentRows, parentRows, spRows, firstRows] = await Promise.all([
    q.select({ id: campuses.id, name: campuses.name, address: campuses.address }).from(campuses),
    q.select({ id: teachers.id, name: teachers.name, phone: teachers.phone, role: teachers.staffRole }).from(teachers),
    q.select({ teacherId: teacherCampuses.teacherId, campusId: teacherCampuses.campusId }).from(teacherCampuses),
    q
      .select({
        id: classes.id,
        campusId: classes.campusId,
        name: classes.name,
        course: classes.course,
        room: classes.room,
        fee: classes.fee,
        capacity: classes.capacity,
        teacherId: classes.teacherId,
        assistantId: classes.assistantId,
        foreignTeacherId: classes.foreignTeacherId,
        weekdays: classes.weekdays,
        startTime: classes.startTime,
        endTime: classes.endTime,
        sessionsTotal: classes.sessionsTotal,
      })
      .from(classes),
    q
      .select({
        id: students.id,
        fullName: students.fullName,
        gender: students.gender,
        dob: students.dob,
        status: students.status,
        startDate: students.startDate,
        note: students.note,
        classId: students.classId,
      })
      .from(students),
    q.select({ id: parents.id, fullName: parents.fullName, phone: parents.phone, email: parents.email }).from(parents),
    q.select({ id: studentParents.id, studentId: studentParents.studentId, parentId: studentParents.parentId, relation: studentParents.relation, isPrimary: studentParents.isPrimary }).from(studentParents),
    q.select({ classId: classSessions.classId, first: min(classSessions.startsAt) }).from(classSessions).groupBy(classSessions.classId),
  ]);
  const teacherCampusIds = new Map<number, Set<number>>();
  for (const l of linkRows) {
    if (!teacherCampusIds.has(l.teacherId)) teacherCampusIds.set(l.teacherId, new Set());
    teacherCampusIds.get(l.teacherId)!.add(l.campusId);
  }
  const studentsByNameDob = new Map<string, typeof studentRows>();
  for (const s of studentRows) {
    const k = `${key(s.fullName)}|${s.dob}`;
    if (!studentsByNameDob.has(k)) studentsByNameDob.set(k, []);
    studentsByNameDob.get(k)!.push(s);
  }
  return {
    campusByKey: new Map(campusRows.map((c) => [key(c.name), c])),
    teachers: teacherRows,
    teacherCampusIds,
    classByCampusName: new Map(classRows.map((c) => [`${c.campusId}|${key(c.name)}`, c])),
    classById: new Map(classRows.map((c) => [c.id, c])),
    studentById: new Map(studentRows.map((s) => [s.id, s])),
    studentsByNameDob,
    parentByPhone: new Map(parentRows.map((p) => [digits(p.phone), p])),
    links: spRows,
    firstSessionDate: new Map(firstRows.map((r) => [r.classId, r.first ? vnDateKey(new Date(r.first)) : ''])),
  };
}

// Học sinh mới không ghi ngày bắt đầu: lớp chưa khai giảng thì bắt đầu từ buổi đầu của lớp, lớp đã học thì từ hôm nay
function startDateFor(c: ClassPlan): string {
  const today = todayIsoVN();
  return c.firstDate && c.firstDate > today ? c.firstDate : today;
}

// Đọc toàn bộ file thành kế hoạch. Không ghi gì vào DB.
// allowedCampusIds: cơ sở tài khoản được làm việc (null = mọi cơ sở). Dòng thuộc cơ sở khác hoặc tạo cơ sở mới thì báo lỗi (P32).
export async function planImport(rawRows: RawRow[], q: Q = db, allowedCampusIds: number[] | null = null): Promise<ImportPlan> {
  const inScope = (campusId: number) => allowedCampusIds === null || allowedCampusIds.includes(campusId);
  const snap = await loadSnapshot(q);
  const campusPlans = new Map<string, CampusPlan>();
  const staffPlans = new Map<string, StaffPlan>();
  const staffByTeacherId = new Map<number, StaffPlan>();
  const classPlans = new Map<string, ClassPlan>();
  const studentPlans: StudentPlan[] = [];
  const studentSeen = new Map<string, number>(); // khoá học sinh → dòng đầu tiên
  const forcedIds = new Map<number, number>(); // mã HS tạo mới trong file → dòng đầu tiên
  const parentPlans = new Map<string, ParentPlan>();
  const linkPlans: LinkPlan[] = [];
  const linkSeen = new Set<string>();
  const primaryPlanned = new Set<StudentPlan>();
  const rows: RowResult[] = [];

  for (const raw of rawRows) {
    const parsed = parseRow(raw);
    if (!parsed) continue;
    const result: RowResult = {
      rowNumber: parsed.rowNumber,
      campus: parsed.campus.name,
      className: parsed.klass.name,
      student: parsed.student?.fullName || (parsed.student?.id ? studentCode(parsed.student.id) : ''),
      actions: [],
      notes: [...parsed.notes],
      errors: [...parsed.errors],
    };
    rows.push(result);
    if (result.errors.length > 0) continue;

    const campus = planCampus(parsed, result);
    if (result.errors.length > 0) continue;
    const classPlan = planClass(parsed, campus, result);
    if (!classPlan || result.errors.length > 0) continue;
    const studentPlan = planStudent(parsed, classPlan, result);
    if (studentPlan && parsed.parent && result.errors.length === 0) planParent(parsed, studentPlan, result);
  }

  function planCampus(row: ParsedRow, result: RowResult): CampusPlan {
    const k = key(row.campus.name);
    const existingPlan = campusPlans.get(k);
    const address = row.campus.address;
    if (existingPlan) {
      if (address !== '' && existingPlan.addressGiven && address !== existingPlan.address) {
        result.errors.push(`Địa chỉ cơ sở ${row.campus.name} khác với dòng ${existingPlan.firstRow}.`);
      } else if (address !== '' && !existingPlan.addressGiven) {
        existingPlan.addressGiven = true;
        existingPlan.address = address;
        if (existingPlan.id !== null) existingPlan.set.address = address;
      }
      return existingPlan;
    }
    const found = snap.campusByKey.get(k);
    if (found && !inScope(found.id)) result.errors.push(`Bạn không làm việc ở ${found.name}, không nhập được vào cơ sở này.`);
    if (!found && allowedCampusIds !== null) result.errors.push(`Chưa có cơ sở ${row.campus.name}. Chỉ quản trị làm việc ở mọi cơ sở mới thêm được cơ sở mới.`);
    const plan: CampusPlan = {
      key: k,
      id: found?.id ?? null,
      name: found?.name ?? row.campus.name,
      address: address !== '' ? address : (found?.address ?? ''),
      addressGiven: address !== '',
      set: found && address !== '' && address !== found.address ? { address } : {},
      firstRow: row.rowNumber,
    };
    campusPlans.set(k, plan);
    result.actions.push({ kind: 'campus', label: plan.name, action: actionOf(plan.id, Object.keys(plan.set).length > 0) });
    return plan;
  }

  // Giáo viên ở một vị trí của lớp. Trả về khoá kế hoạch, hoặc null nếu có lỗi (đã ghi vào result).
  function planStaff(input: StaffInput, role: StaffRole, campus: CampusPlan, row: ParsedRow, result: RowResult): string | null {
    const slot = SLOT_LABELS[role];
    let found: (typeof snap.teachers)[number] | undefined;
    if (input.phone) {
      found = snap.teachers.find((t) => digits(t.phone) === input.phone);
    } else {
      const same = snap.teachers.filter((t) => key(t.name) === key(input.name));
      if (same.length > 1) {
        result.errors.push(`Có ${same.length} người tên ${input.name}. Ghi thêm SĐT ${slot} để chọn đúng người.`);
        return null;
      }
      found = same[0];
    }

    let plan = found ? staffByTeacherId.get(found.id) : staffPlans.get(input.phone ? `p:${input.phone}` : `n:${key(input.name)}`);
    if (!plan && !found) plan = input.phone ? undefined : [...staffPlans.values()].find((p) => p.id === null && key(p.name) === key(input.name));

    if (plan) {
      if (plan.role !== role) {
        result.errors.push(`${plan.name} đã ghi là ${SLOT_LABELS[plan.role]} ở dòng ${plan.firstRow}, không xếp vào vị trí ${slot} được.`);
        return null;
      }
      if (input.name !== '' && key(input.name) !== key(plan.name)) {
        result.errors.push(`SĐT ${input.phone} của ${slot} ghi tên ${input.name}, khác với ${plan.name} ở dòng ${plan.firstRow}.`);
        return null;
      }
      plan.campusKeys.add(campus.key);
      return plan.key;
    }

    if (found) {
      if (found.role !== role) {
        result.errors.push(`${found.name} đang là ${STAFF_ROLE_LABELS[found.role]}, không xếp vào vị trí ${slot} được.`);
        return null;
      }
      const set: StaffPlan['set'] = {};
      if (input.name !== '' && input.name !== found.name) set.name = input.name;
      const teachesInScope = [...(snap.teacherCampusIds.get(found.id) ?? [])].some(inScope);
      if (input.phone && digits(found.phone) !== input.phone) {
        if (snap.teachers.some((t) => t.id !== found!.id && digits(t.phone) === input.phone)) {
          result.errors.push(`SĐT ${input.phone} đã thuộc một giáo viên khác.`);
          return null;
        }
        set.phone = input.phone;
      }
      if (Object.keys(set).length > 0 && !teachesInScope) {
        result.errors.push(`${found.name} chỉ dạy ở cơ sở khác, bạn không sửa được họ tên hoặc SĐT của người này.`);
        return null;
      }
      plan = {
        key: `t:${found.id}`,
        id: found.id,
        role,
        name: set.name ?? found.name,
        phone: set.phone ?? found.phone,
        set,
        campusKeys: new Set([campus.key]),
        existingCampusIds: snap.teacherCampusIds.get(found.id) ?? new Set(),
        firstRow: row.rowNumber,
      };
      staffByTeacherId.set(found.id, plan);
    } else {
      if (input.name.length < 2) {
        result.errors.push(`Không tìm thấy ${slot} có SĐT ${input.phone}. Ghi họ tên để thêm người mới.`);
        return null;
      }
      plan = {
        key: input.phone ? `p:${input.phone}` : `n:${key(input.name)}`,
        id: null,
        role,
        name: input.name,
        phone: input.phone,
        set: {},
        campusKeys: new Set([campus.key]),
        existingCampusIds: new Set(),
        firstRow: row.rowNumber,
      };
    }
    staffPlans.set(plan.key, plan);
    const linkMissing = campus.id === null || !plan.existingCampusIds.has(campus.id);
    result.actions.push({ kind: 'teacher', label: `${plan.name} (${slot})`, action: actionOf(plan.id, Object.keys(plan.set).length > 0 || linkMissing) });
    return plan.key;
  }

  function planClass(row: ParsedRow, campus: CampusPlan, result: RowResult): ClassPlan | null {
    const k = `${campus.key}|${key(row.klass.name)}`;
    const given: ClassValues = {
      course: row.klass.course,
      room: row.klass.room,
      fee: row.klass.fee,
      capacity: row.klass.capacity,
      weekdays: row.klass.weekdays,
      startTime: row.klass.startTime,
      endTime: row.klass.endTime,
      startDate: row.klass.startDate,
      sessionsTotal: row.klass.sessionsTotal,
    };
    const teacherKey = row.teacher ? planStaff(row.teacher, 'teacher', campus, row, result) : null;
    const assistantKey = row.assistant ? planStaff(row.assistant, 'assistant', campus, row, result) : null;
    const foreignKey = row.foreign ? planStaff(row.foreign, 'foreign', campus, row, result) : null;
    if (result.errors.length > 0) return null;

    const existingPlan = classPlans.get(k);
    if (existingPlan) {
      // Lớp đã ghi ở dòng trước: các ô có giá trị phải khớp
      const differs: string[] = [];
      const labels: Record<keyof ClassValues, string> = {
        course: 'khoá học', room: 'phòng', fee: 'học phí', capacity: 'sĩ số', weekdays: 'ngày học', startTime: 'giờ bắt đầu', endTime: 'giờ kết thúc', startDate: 'ngày khai giảng', sessionsTotal: 'số buổi',
      };
      for (const f of Object.keys(labels) as (keyof ClassValues)[]) {
        const now = given[f];
        const first = existingPlan.given[f];
        if (now === '' || now === null) continue;
        if (first === '' || first === null) existingPlan.given[f] = now as never;
        else if (now !== first) differs.push(labels[f]);
      }
      if (teacherKey && existingPlan.teacherKey && teacherKey !== existingPlan.teacherKey) differs.push('GV chủ nhiệm');
      if (assistantKey && existingPlan.assistantKey && assistantKey !== existingPlan.assistantKey) differs.push('trợ giảng');
      if (foreignKey && existingPlan.foreignKey && foreignKey !== existingPlan.foreignKey) differs.push('GV nước ngoài');
      if (differs.length > 0) {
        result.errors.push(`Lớp ${row.klass.name} ghi ${differs.join(', ')} khác với dòng ${existingPlan.firstRow}.`);
        return null;
      }
      existingPlan.teacherKey ??= teacherKey;
      existingPlan.assistantKey ??= assistantKey;
      existingPlan.foreignKey ??= foreignKey;
      return existingPlan;
    }

    const found = campus.id === null ? undefined : snap.classByCampusName.get(`${campus.id}|${key(row.klass.name)}`);
    if (!found) {
      const missing: string[] = [];
      if (given.course.length < 2) missing.push('khoá học');
      if (!given.weekdays) missing.push('ngày học');
      if (!given.startTime) missing.push('giờ bắt đầu');
      if (!given.endTime) missing.push('giờ kết thúc');
      if (!given.startDate) missing.push('ngày khai giảng');
      if (given.sessionsTotal === null) missing.push('số buổi');
      if (given.fee === null) missing.push('học phí');
      if (given.capacity === null) missing.push('sĩ số tối đa');
      if (!teacherKey) missing.push('GV chủ nhiệm');
      if (missing.length > 0) {
        result.errors.push(`Lớp ${row.klass.name} chưa có, cần ghi đủ để tạo lớp mới: ${missing.join(', ')}.`);
        return null;
      }
      try {
        generateSessions({ weekdays: given.weekdays, startTime: given.startTime, endTime: given.endTime, sessionsTotal: given.sessionsTotal!, fromDate: given.startDate });
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : 'Lịch học không hợp lệ.');
        return null;
      }
    }

    const values: ClassValues = found
      ? {
          course: given.course || found.course,
          room: given.room || found.room,
          fee: given.fee ?? found.fee,
          capacity: given.capacity ?? found.capacity,
          weekdays: found.weekdays,
          startTime: found.startTime,
          endTime: found.endTime,
          startDate: '',
          sessionsTotal: found.sessionsTotal,
        }
      : { ...given };
    const plan: ClassPlan = {
      key: k,
      id: found?.id ?? null,
      campusKey: campus.key,
      name: found?.name ?? row.klass.name,
      given: { ...given },
      values,
      teacherKey,
      assistantKey,
      foreignKey,
      existing: found ? { teacherId: found.teacherId, assistantId: found.assistantId, foreignTeacherId: found.foreignTeacherId, room: found.room } : null,
      changed: false,
      firstRow: row.rowNumber,
      firstDate: found
        ? (snap.firstSessionDate.get(found.id) ?? '')
        : generateSessions({ weekdays: given.weekdays, startTime: given.startTime, endTime: given.endTime, sessionsTotal: 1, fromDate: given.startDate })[0].date,
    };
    if (found) {
      const staffChanged = (k2: string | null, current: number | null) => k2 !== null && staffPlanOf(k2).id !== current;
      plan.changed =
        values.course !== found.course ||
        values.room !== found.room ||
        values.fee !== found.fee ||
        values.capacity !== found.capacity ||
        staffChanged(teacherKey, found.teacherId) ||
        staffChanged(assistantKey, found.assistantId) ||
        staffChanged(foreignKey, found.foreignTeacherId);
      if (given.weekdays || given.startTime || given.endTime || given.startDate || given.sessionsTotal !== null) {
        result.notes.push(`Lớp ${found.name} đã có: lịch tuần, ngày khai giảng và số buổi trong file không được dùng.`);
      }
    }
    classPlans.set(k, plan);
    result.actions.push({ kind: 'class', label: plan.name, action: actionOf(plan.id, plan.changed) });
    return plan;
  }

  function staffPlanOf(k: string): StaffPlan {
    return staffPlans.get(k)!;
  }

  function planStudent(row: ParsedRow, classPlan: ClassPlan, result: RowResult): StudentPlan | null {
    const s = row.student;
    if (!s) return null;
    let found: ReturnType<typeof snap.studentById.get>;
    let forcedId: number | null = null;
    if (s.id !== null) {
      found = snap.studentById.get(s.id);
      if (!found) {
        // Mã chưa có trong hệ thống (ví dụ file từ phần mềm cũ): tạo học sinh mới với đúng mã này
        const firstRow = forcedIds.get(s.id);
        if (firstRow !== undefined) {
          result.errors.push(`Mã ${studentCode(s.id)} đã có ở dòng ${firstRow}.`);
          return null;
        }
        forcedId = s.id;
      } else {
        const ownCampus = snap.classById.get(found.classId)?.campusId;
        if (ownCampus !== undefined && !inScope(ownCampus)) {
          result.errors.push(`Học sinh ${studentCode(s.id)} học ở cơ sở bạn không làm việc.`);
          return null;
        }
      }
    } else if (s.fullName && s.dob) {
      // Chỉ so với học sinh ở cơ sở trong phạm vi, để không lộ học sinh của cơ sở khác
      const same = (snap.studentsByNameDob.get(`${key(s.fullName)}|${s.dob}`) ?? []).filter((x) => inScope(snap.classById.get(x.classId)?.campusId ?? -1));
      if (same.length > 1) {
        result.errors.push(`Có ${same.length} học sinh tên ${s.fullName} sinh cùng ngày. Ghi Mã HS để chọn đúng.`);
        return null;
      }
      found = same[0];
    } else if (s.fullName && classPlan.id !== null) {
      // Không có mã và ngày sinh: tìm học sinh cùng tên trong chính lớp này
      const same = [...snap.studentById.values()].filter((x) => x.classId === classPlan.id && key(x.fullName) === key(s.fullName));
      if (same.length > 1) {
        result.errors.push(`Lớp có ${same.length} học sinh tên ${s.fullName}. Ghi Mã HS hoặc ngày sinh để chọn đúng.`);
        return null;
      }
      found = same[0];
    }

    const seenKey = found ? `id:${found.id}` : `new:${key(s.fullName)}|${s.dob}`;
    const seenRow = studentSeen.get(seenKey);
    if (seenRow !== undefined) {
      result.errors.push(`Học sinh ${s.fullName || studentCode(s.id!)} đã có ở dòng ${seenRow}.`);
      return null;
    }

    if (!found) {
      const missing: string[] = [];
      if (s.fullName.length < 2) missing.push('họ tên');
      if (!s.gender) missing.push('giới tính');
      if (missing.length > 0) {
        result.errors.push(`Học sinh mới cần ghi ${missing.join(', ')}.`);
        return null;
      }
      if (s.dob && s.dob > todayIsoVN()) {
        result.errors.push('Ngày sinh không thể ở tương lai.');
        return null;
      }
    }

    const values: StudentValues = found
      ? {
          fullName: s.fullName || found.fullName,
          gender: s.gender ?? found.gender,
          dob: s.dob || found.dob,
          status: s.status ?? found.status,
          startDate: s.startDate || found.startDate,
          note: s.note || found.note,
        }
      : { fullName: s.fullName, gender: s.gender!, dob: s.dob || null, status: s.status ?? 'active', startDate: s.startDate || startDateFor(classPlan), note: s.note };
    const set: Partial<StudentValues> = {};
    if (found) {
      for (const f of Object.keys(values) as (keyof StudentValues)[]) {
        if (values[f] !== found[f]) (set as Record<string, string | null>)[f] = values[f];
      }
    }
    const classChanged = found !== undefined && (classPlan.id === null || classPlan.id !== found.classId);
    const plan: StudentPlan = {
      id: found?.id ?? null,
      forcedId,
      classKey: classPlan.key,
      values,
      set,
      classChange: classChanged ? { from: snap.classById.get(found!.classId)?.name ?? '', to: classPlan.name } : null,
      rowNumber: row.rowNumber,
    };
    studentSeen.set(seenKey, row.rowNumber);
    if (forcedId !== null) {
      forcedIds.set(forcedId, row.rowNumber);
      result.notes.push(`Mã ${studentCode(forcedId)} chưa có trong hệ thống: tạo học sinh mới với mã này.`);
    }
    studentPlans.push(plan);
    const label = found ? `${values.fullName} (${studentCode(found.id)})` : forcedId !== null ? `${values.fullName} (${studentCode(forcedId)})` : values.fullName;
    result.student = values.fullName;
    result.actions.push({ kind: 'student', label, action: actionOf(plan.id, Object.keys(set).length > 0 || classChanged) });
    if (plan.classChange) result.notes.push(`Chuyển lớp ${plan.classChange.from} → ${plan.classChange.to}, ghi vào lịch sử học tập.`);
    return plan;
  }

  function planParent(row: ParsedRow, studentPlan: StudentPlan, result: RowResult) {
    const p = row.parent!;
    let plan = parentPlans.get(p.phone);
    if (plan) {
      if (p.fullName !== '' && key(p.fullName) !== key(plan.fullName)) {
        result.errors.push(`SĐT phụ huynh ${p.phone} ghi tên ${p.fullName}, khác với ${plan.fullName} ở dòng ${plan.firstRow}.`);
        return;
      }
    } else {
      const found = snap.parentByPhone.get(p.phone);
      if (!found && p.fullName.length < 2) {
        result.errors.push(`Phụ huynh có SĐT ${p.phone} chưa có. Ghi họ tên để thêm mới.`);
        return;
      }
      const set: ParentPlan['set'] = {};
      if (found && p.fullName !== '' && p.fullName !== found.fullName) set.fullName = p.fullName;
      if (found && p.email !== '' && p.email !== found.email) set.email = p.email;
      plan = {
        key: p.phone,
        id: found?.id ?? null,
        fullName: set.fullName ?? found?.fullName ?? p.fullName,
        email: set.email ?? found?.email ?? p.email,
        set,
        firstRow: row.rowNumber,
      };
      parentPlans.set(p.phone, plan);
      result.actions.push({ kind: 'parent', label: `${plan.fullName} · ${p.phone}`, action: actionOf(plan.id, Object.keys(set).length > 0) });
    }

    const pairKey = `${studentPlan.rowNumber}|${p.phone}`;
    if (linkSeen.has(pairKey)) return;
    linkSeen.add(pairKey);
    const existing = studentPlan.id !== null && plan.id !== null ? snap.links.find((l) => l.studentId === studentPlan.id && l.parentId === plan!.id) : undefined;
    const hasPrimary = primaryPlanned.has(studentPlan) || (studentPlan.id !== null && snap.links.some((l) => l.studentId === studentPlan.id && l.isPrimary));
    const relation = p.relation ?? existing?.relation ?? 'other';
    const isPrimary = existing ? existing.isPrimary : !hasPrimary;
    if (isPrimary) primaryPlanned.add(studentPlan);
    const action: Action = existing ? (relation !== existing.relation ? 'update' : 'same') : 'create';
    linkPlans.push({ student: studentPlan, parentKey: plan.key, relation, isPrimary, existingId: existing?.id ?? null, action });
    result.actions.push({ kind: 'link', label: `${plan.fullName} là ${relationLabel(relation)} của ${studentPlan.values.fullName}`, action });
  }

  const summary = emptySummary();
  for (const c of campusPlans.values()) summary.campus[actionOf(c.id, Object.keys(c.set).length > 0)]++;
  for (const s of staffPlans.values()) {
    const linkMissing = [...s.campusKeys].some((ck) => {
      const cid = campusPlans.get(ck)?.id ?? null;
      return cid === null || !s.existingCampusIds.has(cid);
    });
    summary.teacher[actionOf(s.id, Object.keys(s.set).length > 0 || linkMissing)]++;
  }
  for (const c of classPlans.values()) summary.class[actionOf(c.id, c.changed)]++;
  for (const s of studentPlans) summary.student[actionOf(s.id, Object.keys(s.set).length > 0 || s.classChange !== null)]++;
  for (const p of parentPlans.values()) summary.parent[actionOf(p.id, Object.keys(p.set).length > 0)]++;
  for (const l of linkPlans) summary.link[l.action]++;

  return {
    rows,
    summary,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
    campuses: [...campusPlans.values()],
    staff: [...staffPlans.values()],
    classes: [...classPlans.values()],
    students: studentPlans,
    parents: [...parentPlans.values()],
    links: linkPlans,
  };
}

function relationLabel(r: Relation): string {
  return { father: 'bố', mother: 'mẹ', guardian: 'người giám hộ', other: 'người thân' }[r];
}

function emptySummary(): ImportSummary {
  const zero = () => ({ create: 0, update: 0, same: 0 });
  return { campus: zero(), teacher: zero(), class: zero(), student: zero(), parent: zero(), link: zero() };
}

// Ghi kế hoạch vào DB theo đúng thứ tự, trong transaction của người gọi. Kế hoạch phải không có lỗi.
export async function applyImport(plan: ImportPlan, tx: Tx): Promise<void> {
  if (plan.errorCount > 0) throw new Error('Kế hoạch nhập còn lỗi, không ghi.');
  const now = new Date();

  // 1. Cơ sở
  const campusId = new Map<string, number>();
  for (const c of plan.campuses) {
    if (c.id === null) {
      const [created] = await tx.insert(campuses).values({ name: c.name, address: c.address }).returning({ id: campuses.id });
      campusId.set(c.key, created.id);
    } else {
      if (c.set.address !== undefined) await tx.update(campuses).set({ address: c.set.address, updatedAt: now }).where(eq(campuses.id, c.id));
      campusId.set(c.key, c.id);
    }
  }

  // 2. Giáo viên, trợ giảng, giáo viên nước ngoài, và cơ sở họ dạy
  const teacherId = new Map<string, number>();
  for (const s of plan.staff) {
    let id = s.id;
    if (id === null) {
      const [created] = await tx
        .insert(teachers)
        .values({ name: s.name, phone: s.phone, subject: DEFAULT_SUBJECT[s.role], staffRole: s.role, status: 'active', avatarTone: DEFAULT_TONE[s.role] })
        .returning({ id: teachers.id });
      id = created.id;
    } else if (Object.keys(s.set).length > 0) {
      await tx.update(teachers).set({ ...s.set, updatedAt: now }).where(eq(teachers.id, id));
    }
    teacherId.set(s.key, id);
    for (const ck of s.campusKeys) {
      const cid = campusId.get(ck)!;
      if (!s.existingCampusIds.has(cid)) await tx.insert(teacherCampuses).values({ teacherId: id, campusId: cid }).onConflictDoNothing();
    }
  }

  // 3. Lớp. Lớp mới sinh đủ buổi học; lớp đã có đổi giáo viên chủ nhiệm hoặc phòng thì cập nhật các buổi chưa học.
  const classId = new Map<string, number>();
  for (const c of plan.classes) {
    const staffId = (k: string | null) => (k === null ? null : teacherId.get(k)!);
    if (c.id === null) {
      const v = c.values;
      const mainTeacher = staffId(c.teacherKey)!;
      const generated = generateSessions({ weekdays: v.weekdays, startTime: v.startTime, endTime: v.endTime, sessionsTotal: v.sessionsTotal!, fromDate: v.startDate });
      const [created] = await tx
        .insert(classes)
        .values({
          campusId: campusId.get(c.campusKey)!,
          name: c.name,
          course: v.course,
          teacherId: mainTeacher,
          assistantId: staffId(c.assistantKey),
          foreignTeacherId: staffId(c.foreignKey),
          schedule: describeSchedule(v.weekdays, v.startTime, v.endTime),
          weekdays: v.weekdays,
          startTime: v.startTime,
          endTime: v.endTime,
          sessionsTotal: v.sessionsTotal!,
          fee: v.fee!,
          room: v.room,
          capacity: v.capacity!,
        })
        .returning({ id: classes.id });
      await tx.insert(classSessions).values(
        generated.map((s) => ({ classId: created.id, sessionNo: s.sessionNo, startsAt: s.startsAt, endsAt: s.endsAt, teacherId: mainTeacher, room: v.room })),
      );
      classId.set(c.key, created.id);
    } else {
      classId.set(c.key, c.id);
      if (!c.changed || !c.existing) continue;
      const mainTeacher = staffId(c.teacherKey) ?? c.existing.teacherId;
      await tx
        .update(classes)
        .set({
          course: c.values.course,
          room: c.values.room,
          fee: c.values.fee!,
          capacity: c.values.capacity!,
          teacherId: mainTeacher,
          assistantId: c.assistantKey === null ? c.existing.assistantId : staffId(c.assistantKey),
          foreignTeacherId: c.foreignKey === null ? c.existing.foreignTeacherId : staffId(c.foreignKey),
          updatedAt: now,
        })
        .where(eq(classes.id, c.id));
      if (mainTeacher !== c.existing.teacherId || c.values.room !== c.existing.room) {
        await tx
          .update(classSessions)
          .set({ teacherId: mainTeacher, room: c.values.room, updatedAt: now })
          .where(and(eq(classSessions.classId, c.id), eq(classSessions.status, 'planned')));
      }
    }
  }

  // 4. Học sinh. Chuyển lớp thì ghi sự kiện vào lịch sử học tập.
  const studentId = new Map<StudentPlan, number>();
  for (const s of plan.students) {
    const cid = classId.get(s.classKey)!;
    if (s.id === null) {
      const [created] = await tx
        .insert(students)
        .values({ ...(s.forcedId !== null ? { id: s.forcedId } : {}), ...s.values, searchKey: normalizeSearch(s.values.fullName), classId: cid })
        .returning({ id: students.id });
      studentId.set(s, created.id);
      continue;
    }
    studentId.set(s, s.id);
    if (Object.keys(s.set).length > 0 || s.classChange) {
      await tx
        .update(students)
        .set({ ...s.set, ...(s.set.fullName ? { searchKey: normalizeSearch(s.set.fullName) } : {}), classId: cid, updatedAt: now })
        .where(eq(students.id, s.id));
    }
    if (s.classChange) {
      await tx.insert(learningEvents).values({ studentId: s.id, eventType: 'class_change', title: `Chuyển từ ${s.classChange.from} sang ${s.classChange.to}`, detail: 'Nhập từ file Excel' });
    }
  }

  // Học sinh có mã cố định đã ghi id tay: đặt lại bộ đếm để học sinh tạo sau này không trùng mã
  if (plan.students.some((s) => s.forcedId !== null)) {
    await tx.execute(sql`select setval(pg_get_serial_sequence('students', 'id'), (select max(id) from students))`);
  }

  // 5. Phụ huynh, rồi liên kết với học sinh
  const parentId = new Map<string, number>();
  for (const p of plan.parents) {
    if (p.id === null) {
      const [created] = await tx.insert(parents).values({ fullName: p.fullName, phone: p.key, email: p.email }).returning({ id: parents.id });
      parentId.set(p.key, created.id);
    } else {
      if (Object.keys(p.set).length > 0) await tx.update(parents).set({ ...p.set, updatedAt: now }).where(eq(parents.id, p.id));
      parentId.set(p.key, p.id);
    }
  }
  for (const l of plan.links) {
    if (l.existingId !== null) {
      if (l.action === 'update') await tx.update(studentParents).set({ relation: l.relation, updatedAt: now }).where(eq(studentParents.id, l.existingId));
      continue;
    }
    await tx
      .insert(studentParents)
      .values({ studentId: studentId.get(l.student)!, parentId: parentId.get(l.parentKey)!, relation: l.relation, isPrimary: l.isPrimary })
      .onConflictDoNothing();
  }
}
