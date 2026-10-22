// Validate form lớp học và buổi học. Dùng ở server action.
import { z } from 'zod';
import { isRealIsoDate } from './student';

export const WEEKDAY_CODES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
export const WEEKDAY_CODE_LABELS: Record<(typeof WEEKDAY_CODES)[number], string> = {
  T2: 'Thứ 2',
  T3: 'Thứ 3',
  T4: 'Thứ 4',
  T5: 'Thứ 5',
  T6: 'Thứ 6',
  T7: 'Thứ 7',
  CN: 'Chủ nhật',
};

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Trợ giảng và giáo viên nước ngoài không bắt buộc: ô trống là lớp chưa có người ở vị trí đó
const optionalStaffId = (label: string) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
    z.number({ error: `${label} không hợp lệ` }).int(`${label} không hợp lệ`).positive(`${label} không hợp lệ`).nullable(),
  );

// Ô chung: có thể sửa sau khi tạo lớp. Mỗi lớp thuộc đúng một cơ sở.
export const classCoreSchema = z.object({
  campusId: z.coerce.number({ error: 'Vui lòng chọn cơ sở' }).int('Cơ sở không hợp lệ').positive('Vui lòng chọn cơ sở'),
  name: z
    .string({ error: 'Vui lòng nhập mã lớp' })
    .trim()
    .min(2, 'Mã lớp cần ít nhất 2 ký tự')
    .max(40, 'Mã lớp tối đa 40 ký tự'),
  course: z
    .string({ error: 'Vui lòng nhập tên khoá học' })
    .trim()
    .min(2, 'Vui lòng nhập tên khoá học')
    .max(120, 'Tên khoá học tối đa 120 ký tự'),
  // Giáo viên chủ nhiệm bắt buộc. Trợ giảng và giáo viên nước ngoài có thể để trống.
  teacherId: z.coerce.number({ error: 'Vui lòng chọn giáo viên chủ nhiệm' }).int('Giáo viên không hợp lệ').positive('Vui lòng chọn giáo viên chủ nhiệm'),
  assistantId: optionalStaffId('Trợ giảng'),
  foreignTeacherId: optionalStaffId('Giáo viên nước ngoài'),
  // Trình độ CEFR của lớp (A1-C2), tùy chọn
  levelId: z.preprocess(
    (v) => (v === '' || v === undefined || v === null || v === 'none' ? null : Number(v)),
    z.number({ error: 'Trình độ không hợp lệ' }).int('Trình độ không hợp lệ').positive('Trình độ không hợp lệ').nullable().optional(),
  ),
  room: z.string().trim().max(40, 'Phòng tối đa 40 ký tự').default(''),
  fee: z.coerce
    .number({ error: 'Học phí phải là số' })
    .int('Học phí phải là số nguyên VND')
    .min(0, 'Học phí không âm')
    .max(1_000_000_000, 'Học phí quá lớn'),
  capacity: z.coerce
    .number({ error: 'Sĩ số phải là số' })
    .int('Sĩ số phải là số nguyên')
    .min(1, 'Sĩ số ít nhất là 1')
    .max(100, 'Sĩ số tối đa 100'),
});

// Giờ học của từng ngày trong form: { T3: { start: '18:00', end: '19:30' }, T7: {...} }
export type DayTimesInput = Partial<Record<WeekdayCode, { start: string; end: string }>>;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];
export type DayTimeValue = { code: WeekdayCode; start: string; end: string };

// Kiểm giờ của từng ngày học. Ngày không có giờ riêng dùng giờ chung (fallback), nếu có.
// Lỗi trả theo tên ô: start_T3, end_T3. Hàm thuần, dùng cho form tạo và sửa lớp.
export function checkDayTimes(
  codes: readonly WeekdayCode[],
  raw: DayTimesInput,
  fallback?: { start?: string; end?: string },
): { list: DayTimeValue[]; errors: Record<string, string> } {
  const list: DayTimeValue[] = [];
  const errors: Record<string, string> = {};
  for (const code of WEEKDAY_CODES.filter((c) => codes.includes(c))) {
    const own = raw[code];
    const start = own?.start ?? fallback?.start ?? '';
    const end = own?.end ?? fallback?.end ?? '';
    const startKey = own ? `start_${code}` : 'startTime';
    const endKey = own ? `end_${code}` : 'endTime';
    if (!TIME.test(start)) errors[startKey] ??= start ? 'Giờ theo dạng HH:MM' : 'Vui lòng chọn giờ bắt đầu';
    if (!TIME.test(end)) errors[endKey] ??= end ? 'Giờ theo dạng HH:MM' : 'Vui lòng chọn giờ kết thúc';
    else if (TIME.test(start) && end <= start) errors[endKey] ??= 'Giờ kết thúc phải sau giờ bắt đầu';
    list.push({ code, start, end });
  }
  return { list, errors };
}

// Ô lịch: chỉ nhập khi tạo lớp, để sinh các buổi học.
// Mỗi ngày học có giờ riêng (dayTimes). startTime, endTime là giờ chung cho ngày không có giờ riêng (dữ liệu cũ, nhập từ Excel).
const classScheduleShape = {
  weekdays: z
    .array(z.enum(WEEKDAY_CODES, { error: 'Ngày học không hợp lệ' }), { error: 'Chọn ít nhất một ngày học' })
    .min(1, 'Chọn ít nhất một ngày học'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  dayTimes: z.record(z.string(), z.object({ start: z.string(), end: z.string() })).default({}),
  startDate: z
    .string({ error: 'Vui lòng chọn ngày khai giảng' })
    .min(1, 'Vui lòng chọn ngày khai giảng')
    .refine(isRealIsoDate, 'Ngày không hợp lệ'),
  sessionsTotal: z.coerce
    .number({ error: 'Số buổi phải là số' })
    .int('Số buổi phải là số nguyên')
    .min(1, 'Lớp có ít nhất 1 buổi')
    .max(200, 'Tối đa 200 buổi'),
};

// Form tạo lớp: ô chung cộng ô lịch. Kết quả có dayTimes đã chuẩn hoá theo thứ tự tuần,
// startTime, endTime là giờ của ngày học đầu tuần (giữ cho dữ liệu cũ đọc hai cột này).
export const classCreateSchema = z
  .object({ ...classCoreSchema.shape, ...classScheduleShape })
  .superRefine((v, ctx) => {
    const { errors } = checkDayTimes(v.weekdays, v.dayTimes as DayTimesInput, { start: v.startTime, end: v.endTime });
    for (const [key, message] of Object.entries(errors)) ctx.addIssue({ code: 'custom', path: [key], message });
  })
  .transform((v) => {
    const { list } = checkDayTimes(v.weekdays, v.dayTimes as DayTimesInput, { start: v.startTime, end: v.endTime });
    return { ...v, dayTimes: list, startTime: list[0]?.start ?? '', endTime: list[0]?.end ?? '' };
  });

export type ClassCoreInput = z.infer<typeof classCoreSchema>;
export type ClassCreateInput = z.infer<typeof classCreateSchema>;

// Buổi học: đổi ngày, giờ, phòng, chủ đề, giáo viên. Không đổi số buổi.
export const sessionFormSchema = z
  .object({
    date: z.string({ error: 'Vui lòng chọn ngày' }).min(1, 'Vui lòng chọn ngày').refine(isRealIsoDate, 'Ngày không hợp lệ'),
    startTime: z.string({ error: 'Vui lòng chọn giờ bắt đầu' }).regex(TIME, 'Giờ theo dạng HH:MM'),
    endTime: z.string({ error: 'Vui lòng chọn giờ kết thúc' }).regex(TIME, 'Giờ theo dạng HH:MM'),
    teacherId: z.coerce.number({ error: 'Vui lòng chọn giáo viên' }).int().positive('Vui lòng chọn giáo viên'),
    room: z.string().trim().max(40, 'Phòng tối đa 40 ký tự').default(''),
    topic: z.string().trim().max(160, 'Chủ đề tối đa 160 ký tự').default(''),
  })
  .refine((v) => v.endTime > v.startTime, { message: 'Giờ kết thúc phải sau giờ bắt đầu', path: ['endTime'] });

export const cancelReasonSchema = z
  .string({ error: 'Vui lòng nhập lý do huỷ buổi' })
  .trim()
  .min(3, 'Lý do cần ít nhất 3 ký tự')
  .max(200, 'Lý do tối đa 200 ký tự');
