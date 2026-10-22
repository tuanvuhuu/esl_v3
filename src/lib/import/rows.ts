// Đọc từng dòng của file nhập dữ liệu thành dữ liệu đã chuẩn hoá. Hàm thuần, không đụng DB, có unit test.
// Chỉ kiểm định dạng ở đây. Ô nào bắt buộc khi tạo mới, bản ghi nào đã có, kiểm ở bước lập kế hoạch (plan.ts).
import { parseStudentCode } from '@/lib/student-code';
import { isRealIsoDate } from '@/lib/validation/student';
import { WEEKDAY_CODES } from '@/lib/validation/class';
import type { ImportColumnKey } from './columns';

// Giá trị một ô sau khi đọc từ Excel: chuỗi, số, ngày hoặc trống
export type CellValue = string | number | boolean | Date | null;
export type RawRow = { rowNumber: number; cells: Partial<Record<ImportColumnKey, CellValue>> };

export type Gender = 'male' | 'female';
export type StudentStatus = 'active' | 'trial' | 'paused' | 'finished';
export type Relation = 'father' | 'mother' | 'guardian' | 'other';

export type StaffInput = { name: string; phone: string };

export type ParsedRow = {
  rowNumber: number;
  campus: { name: string; address: string };
  klass: {
    name: string;
    course: string;
    weekdays: string; // "T2,T4,T6" theo thứ tự trong tuần, hoặc '' nếu bỏ trống
    startTime: string;
    endTime: string;
    startDate: string; // YYYY-MM-DD hoặc ''
    sessionsTotal: number | null;
    fee: number | null;
    room: string;
    capacity: number | null;
  };
  teacher: StaffInput | null;
  assistant: StaffInput | null;
  foreign: StaffInput | null;
  student: {
    id: number | null; // từ cột Mã HS
    fullName: string;
    gender: Gender | null;
    dob: string;
    status: StudentStatus | null;
    startDate: string;
    note: string;
  } | null;
  parent: { fullName: string; phone: string; email: string; relation: Relation | null } | null;
  errors: string[];
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const pad = (n: number) => String(n).padStart(2, '0');

// Chữ trong ô, đã bỏ khoảng trắng hai đầu. Ngày đổi về dd/mm/yyyy để các bước sau đọc như chữ.
export function cellText(value: CellValue | undefined): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return `${pad(value.getUTCDate())}/${pad(value.getUTCMonth() + 1)}/${value.getUTCFullYear()}`;
  return String(value).trim();
}

// Số điện thoại: bỏ khoảng trắng, dấu chấm, gạch; +84 đổi thành 0; ô số mất số 0 đầu thì thêm lại.
// Trả về '' nếu trống, null nếu sai dạng.
export function parsePhone(value: CellValue | undefined): string | null {
  let text = typeof value === 'number' ? String(Math.trunc(value)) : cellText(value);
  text = text.replace(/[\s.\-()]/g, '');
  if (text === '') return '';
  if (text.startsWith('+84')) text = `0${text.slice(3)}`;
  else if (text.startsWith('84') && text.length === 11) text = `0${text.slice(2)}`;
  if (/^\d{9}$/.test(text)) text = `0${text}`;
  return /^0\d{9}$/.test(text) ? text : null;
}

// Ngày: ô ngày của Excel, số ngày kiểu Excel, dd/mm/yyyy hoặc yyyy-mm-dd. Trả về YYYY-MM-DD, '' nếu trống, null nếu sai.
export function parseDate(value: CellValue | undefined): string | null {
  if (value === null || value === undefined || value === '') return '';
  let iso: string;
  if (value instanceof Date) {
    iso = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 1) return null;
    iso = new Date(EXCEL_EPOCH + Math.floor(value) * 86_400_000).toISOString().slice(0, 10);
  } else {
    const text = String(value).trim();
    if (text === '') return '';
    const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
    const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
    if (dmy) iso = `${dmy[3]}-${pad(Number(dmy[2]))}-${pad(Number(dmy[1]))}`;
    else if (ymd) iso = `${ymd[1]}-${pad(Number(ymd[2]))}-${pad(Number(ymd[3]))}`;
    else return null;
  }
  return isRealIsoDate(iso) ? iso : null;
}

// Giờ: "18:30", "18h30", "18:30:00", ô giờ của Excel hoặc phần ngày dạng số. Trả về HH:MM, '' nếu trống, null nếu sai.
export function parseTime(value: CellValue | undefined): string | null {
  if (value === null || value === undefined || value === '') return '';
  let h: number;
  let m: number;
  if (value instanceof Date) {
    h = value.getUTCHours();
    m = value.getUTCMinutes();
  } else if (typeof value === 'number') {
    if (value < 0 || value >= 1) return null;
    const minutes = Math.round(value * 24 * 60);
    h = Math.floor(minutes / 60);
    m = minutes % 60;
  } else {
    const match = /^(\d{1,2})\s*[:hH]\s*(\d{2})?(?::\d{2})?$/.exec(String(value).trim());
    if (!match) return String(value).trim() === '' ? '' : null;
    h = Number(match[1]);
    m = Number(match[2] ?? 0);
  }
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}

// Số nguyên không âm: chấp nhận "12.000.000", "12,000,000", "12 000 000". Trả về null nếu trống, NaN nếu sai.
export function parseWhole(value: CellValue | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? value : Number.NaN;
  const text = cellText(value).replace(/[\s.,_]/g, '');
  if (text === '') return null;
  return /^\d+$/.test(text) ? Number(text) : Number.NaN;
}

// Ngày học trong tuần: "T2,T4,T6", "T2 T4 T6", "Thứ 2, Thứ 4", "CN". Trả về chuỗi theo thứ tự tuần, '' nếu trống, null nếu sai.
export function parseWeekdayList(value: CellValue | undefined): string | null {
  const text = cellText(value).toUpperCase();
  if (text === '') return '';
  const parts = text.split(/[,;/\s]+/).filter(Boolean);
  const codes = new Set<string>();
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i].normalize('NFD').replace(/[̀-ͯ]/g, '');
    // "THU 2" tách thành hai phần
    if (part === 'THU' && parts[i + 1]) part = `T${parts[++i]}`;
    else if (/^THU\d$/.test(part)) part = `T${part.slice(3)}`;
    else if (part === 'CHUNHAT' || part === 'CHU') {
      if (part === 'CHU' && parts[i + 1]?.normalize('NFD').replace(/[̀-ͯ]/g, '') === 'NHAT') i++;
      part = 'CN';
    }
    if (!(WEEKDAY_CODES as readonly string[]).includes(part)) return null;
    codes.add(part);
  }
  return WEEKDAY_CODES.filter((c) => codes.has(c)).join(',');
}

function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function parseGender(value: CellValue | undefined): Gender | '' | null {
  const t = plain(cellText(value));
  if (t === '') return '';
  if (['nam', 'male', 'm', 'trai'].includes(t)) return 'male';
  if (['nu', 'female', 'f', 'gai'].includes(t)) return 'female';
  return null;
}

export function parseStatus(value: CellValue | undefined): StudentStatus | '' | null {
  const t = plain(cellText(value));
  if (t === '') return '';
  const map: Record<string, StudentStatus> = { 'dang hoc': 'active', active: 'active', 'hoc thu': 'trial', trial: 'trial', 'bao luu': 'paused', paused: 'paused', 'da nghi': 'finished', 'nghi hoc': 'finished', finished: 'finished' };
  return map[t] ?? null;
}

export function parseRelation(value: CellValue | undefined): Relation | '' | null {
  const t = plain(cellText(value));
  if (t === '') return '';
  const map: Record<string, Relation> = { bo: 'father', cha: 'father', ba: 'father', father: 'father', me: 'mother', ma: 'mother', mother: 'mother', 'nguoi giam ho': 'guardian', 'giam ho': 'guardian', guardian: 'guardian', khac: 'other', other: 'other' };
  return map[t] ?? null;
}

function staff(row: RawRow, nameKey: ImportColumnKey, phoneKey: ImportColumnKey, label: string, errors: string[]): StaffInput | null {
  const name = cellText(row.cells[nameKey]);
  const phone = parsePhone(row.cells[phoneKey]);
  if (phone === null) errors.push(`SĐT ${label} phải gồm 10 số, bắt đầu bằng 0.`);
  if (name === '' && !phone) return null;
  return { name, phone: phone ?? '' };
}

// Dòng trống hoàn toàn thì bỏ qua (trả về null)
export function parseRow(row: RawRow): ParsedRow | null {
  const c = row.cells;
  if (Object.values(c).every((v) => cellText(v) === '')) return null;
  const errors: string[] = [];

  const campusName = cellText(c.campusName);
  if (campusName === '') errors.push('Thiếu tên cơ sở.');
  if (campusName.length > 120) errors.push('Tên cơ sở tối đa 120 ký tự.');
  const className = cellText(c.className);
  if (className === '') errors.push('Thiếu mã lớp.');
  else if (className.length < 2 || className.length > 40) errors.push('Mã lớp từ 2 đến 40 ký tự.');

  const weekdays = parseWeekdayList(c.weekdays);
  if (weekdays === null) errors.push('Ngày học không hợp lệ. Ghi dạng T2,T4,T6 (CN là Chủ nhật).');
  const startTime = parseTime(c.startTime);
  if (startTime === null) errors.push('Giờ bắt đầu phải theo dạng HH:MM.');
  const endTime = parseTime(c.endTime);
  if (endTime === null) errors.push('Giờ kết thúc phải theo dạng HH:MM.');
  if (startTime && endTime && endTime <= startTime) errors.push('Giờ kết thúc phải sau giờ bắt đầu.');
  const classStart = parseDate(c.classStartDate);
  if (classStart === null) errors.push('Ngày khai giảng không hợp lệ. Ghi dạng dd/mm/yyyy.');
  const sessionsTotal = parseWhole(c.sessionsTotal);
  if (Number.isNaN(sessionsTotal) || (sessionsTotal !== null && (sessionsTotal < 1 || sessionsTotal > 200))) errors.push('Số buổi là số nguyên từ 1 đến 200.');
  const fee = parseWhole(c.fee);
  if (Number.isNaN(fee) || (fee !== null && fee > 1_000_000_000)) errors.push('Học phí là số nguyên VND, không âm.');
  const capacity = parseWhole(c.capacity);
  if (Number.isNaN(capacity) || (capacity !== null && (capacity < 1 || capacity > 100))) errors.push('Sĩ số tối đa là số nguyên từ 1 đến 100.');

  const teacher = staff(row, 'teacherName', 'teacherPhone', 'GV chủ nhiệm', errors);
  const assistant = staff(row, 'assistantName', 'assistantPhone', 'trợ giảng', errors);
  const foreign = staff(row, 'foreignName', 'foreignPhone', 'GV nước ngoài', errors);

  let student: ParsedRow['student'] = null;
  const codeText = cellText(c.studentCode);
  const studentName = cellText(c.studentName);
  if (codeText !== '' || studentName !== '') {
    const id = codeText === '' ? null : parseStudentCode(codeText);
    if (codeText !== '' && id === null) errors.push(`Mã học sinh "${codeText}" không đúng dạng HS-00001.`);
    if (studentName !== '' && (studentName.length < 2 || studentName.length > 120)) errors.push('Họ tên học sinh từ 2 đến 120 ký tự.');
    const gender = parseGender(c.gender);
    if (gender === null) errors.push('Giới tính ghi Nam hoặc Nữ.');
    const dob = parseDate(c.dob);
    if (dob === null) errors.push('Ngày sinh không hợp lệ. Ghi dạng dd/mm/yyyy.');
    const status = parseStatus(c.status);
    if (status === null) errors.push('Trạng thái ghi Đang học, Học thử, Bảo lưu hoặc Đã nghỉ.');
    const startDate = parseDate(c.studentStartDate);
    if (startDate === null) errors.push('Ngày bắt đầu học không hợp lệ. Ghi dạng dd/mm/yyyy.');
    const note = cellText(c.studentNote);
    if (note.length > 1000) errors.push('Ghi chú học sinh tối đa 1000 ký tự.');
    student = { id, fullName: studentName, gender: gender || null, dob: dob ?? '', status: status || null, startDate: startDate ?? '', note };
  }

  let parent: ParsedRow['parent'] = null;
  const parentName = cellText(c.parentName);
  const parentPhoneRaw = parsePhone(c.parentPhone);
  const parentEmail = cellText(c.parentEmail);
  const relation = parseRelation(c.relation);
  if (parentName !== '' || parentPhoneRaw !== '' || parentEmail !== '') {
    if (parentPhoneRaw === null) errors.push('SĐT phụ huynh phải gồm 10 số, bắt đầu bằng 0.');
    else if (parentPhoneRaw === '') errors.push('Thiếu SĐT phụ huynh.');
    if (parentEmail !== '' && !EMAIL.test(parentEmail)) errors.push('Email phụ huynh không đúng định dạng.');
    if (relation === null) errors.push('Quan hệ ghi Bố, Mẹ, Người giám hộ hoặc Khác.');
    if (!student) errors.push('Phụ huynh phải đi cùng một học sinh trên cùng dòng.');
    parent = { fullName: parentName, phone: parentPhoneRaw ?? '', email: parentEmail, relation: relation || null };
  }

  return {
    rowNumber: row.rowNumber,
    campus: { name: campusName, address: cellText(c.campusAddress) },
    klass: {
      name: className,
      course: cellText(c.course),
      weekdays: weekdays ?? '',
      startTime: startTime ?? '',
      endTime: endTime ?? '',
      startDate: classStart ?? '',
      sessionsTotal: Number.isNaN(sessionsTotal) ? null : sessionsTotal,
      fee: Number.isNaN(fee) ? null : fee,
      room: cellText(c.room),
      capacity: Number.isNaN(capacity) ? null : capacity,
    },
    teacher,
    assistant,
    foreign,
    student,
    parent,
    errors,
  };
}
