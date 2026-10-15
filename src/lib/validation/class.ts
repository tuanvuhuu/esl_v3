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
  // Lớp cần đủ ba vị trí: giáo viên chủ nhiệm (vai trò giáo viên), trợ giảng, giáo viên nước ngoài
  teacherId: z.coerce.number({ error: 'Vui lòng chọn giáo viên chủ nhiệm' }).int('Giáo viên không hợp lệ').positive('Vui lòng chọn giáo viên chủ nhiệm'),
  assistantId: z.coerce.number({ error: 'Vui lòng chọn trợ giảng' }).int('Trợ giảng không hợp lệ').positive('Vui lòng chọn trợ giảng'),
  foreignTeacherId: z.coerce
    .number({ error: 'Vui lòng chọn giáo viên nước ngoài' })
    .int('Giáo viên không hợp lệ')
    .positive('Vui lòng chọn giáo viên nước ngoài'),
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

// Ô lịch: chỉ nhập khi tạo lớp, để sinh các buổi học
const classScheduleShape = {
  weekdays: z
    .array(z.enum(WEEKDAY_CODES, { error: 'Ngày học không hợp lệ' }), { error: 'Chọn ít nhất một ngày học' })
    .min(1, 'Chọn ít nhất một ngày học'),
  startTime: z.string({ error: 'Vui lòng chọn giờ bắt đầu' }).regex(TIME, 'Giờ theo dạng HH:MM'),
  endTime: z.string({ error: 'Vui lòng chọn giờ kết thúc' }).regex(TIME, 'Giờ theo dạng HH:MM'),
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

const endAfterStart = (v: { startTime: string; endTime: string }) => v.endTime > v.startTime;
const endAfterStartMessage = { message: 'Giờ kết thúc phải sau giờ bắt đầu', path: ['endTime'] };

// Form tạo lớp: ô chung cộng ô lịch
export const classCreateSchema = z
  .object({ ...classCoreSchema.shape, ...classScheduleShape })
  .refine(endAfterStart, endAfterStartMessage);

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
