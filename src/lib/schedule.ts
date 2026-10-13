// Sinh các buổi học cụ thể từ lịch tuần của lớp. Hàm thuần, không đụng DB.
// Múi giờ cố định Việt Nam (+07:00).

const VN_OFFSET = '+07:00';
const WEEKDAY_INDEX: Record<string, number> = { CN: 0, T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6 };
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type GeneratedSession = {
  sessionNo: number;
  date: string; // YYYY-MM-DD theo giờ Việt Nam
  startsAt: Date;
  endsAt: Date;
};

// "T2,T4,T6" → [1, 3, 5] (0 = Chủ nhật), đã sắp xếp và bỏ trùng
export function parseWeekdays(text: string): number[] {
  const codes = text.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (codes.length === 0) throw new Error('Chưa chọn ngày học trong tuần.');
  const days = codes.map((code) => {
    const day = WEEKDAY_INDEX[code];
    if (day === undefined) throw new Error(`Ngày học không hợp lệ: ${code}`);
    return day;
  });
  return [...new Set(days)].sort((a, b) => a - b);
}

export function assertTime(value: string, label: string): void {
  if (!TIME_PATTERN.test(value)) throw new Error(`${label} phải theo dạng HH:MM, nhận được "${value}".`);
}

// Sinh đúng sessionsTotal buổi, bắt đầu từ ngày fromDate (YYYY-MM-DD), theo các ngày trong tuần
export function generateSessions(input: { weekdays: string; startTime: string; endTime: string; sessionsTotal: number; fromDate: string }): GeneratedSession[] {
  const { weekdays, startTime, endTime, sessionsTotal, fromDate } = input;
  assertTime(startTime, 'Giờ bắt đầu');
  assertTime(endTime, 'Giờ kết thúc');
  if (endTime <= startTime) throw new Error('Giờ kết thúc phải sau giờ bắt đầu.');
  if (!Number.isInteger(sessionsTotal) || sessionsTotal < 1) throw new Error('Số buổi phải là số nguyên dương.');
  if (!DATE_PATTERN.test(fromDate)) throw new Error('Ngày bắt đầu phải theo dạng YYYY-MM-DD.');

  const wanted = new Set(parseWeekdays(weekdays));
  const [y, m, d] = fromDate.split('-').map(Number);
  const sessions: GeneratedSession[] = [];
  // Đi theo lịch UTC để không phụ thuộc múi giờ của máy chạy
  for (let day = Date.UTC(y, m - 1, d); sessions.length < sessionsTotal; day += 86_400_000) {
    if (!wanted.has(new Date(day).getUTCDay())) continue;
    const date = new Date(day).toISOString().slice(0, 10);
    sessions.push({
      sessionNo: sessions.length + 1,
      date,
      startsAt: new Date(`${date}T${startTime}:00${VN_OFFSET}`),
      endsAt: new Date(`${date}T${endTime}:00${VN_OFFSET}`),
    });
  }
  return sessions;
}

// Nhãn ngày theo chỉ số của Date: 0 = CN
const DAY_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Mô tả lịch lớp để hiển thị: "T2 · T4 · T6 · 18:30–20:30", thứ Hai đứng đầu tuần
export function describeSchedule(weekdays: string, startTime: string, endTime: string): string {
  const days = parseWeekdays(weekdays).sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  return `${days.map((d) => DAY_LABEL[d]).join(' · ')} · ${startTime}–${endTime}`;
}

// Chuỗi ngày lưu trong DB: "T2,T4,T6", theo đúng thứ tự của mảng đầu vào đã chuẩn hoá
export function joinWeekdays(codes: readonly string[]): string {
  return codes.join(',');
}
