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

// Giờ học của một ngày trong tuần. Mỗi ngày học có thể có giờ riêng (T3 18:00–19:30, T7 08:00–09:30).
export type DayTime = { code: string; start: string; end: string };

// Nhãn ngày theo chỉ số của Date: 0 = CN
const DAY_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const mondayFirst = (a: number, b: number) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b);

// Chuỗi lưu trong cột day_times: "T3 18:00-19:30,T7 08:00-09:30"
export function encodeDayTimes(list: readonly DayTime[]): string {
  return list.map((d) => `${d.code} ${d.start}-${d.end}`).join(',');
}

function decodeDayTimes(text: string): DayTime[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /^(T[2-7]|CN)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/i.exec(part);
      if (!match) throw new Error(`Giờ học theo ngày không hợp lệ: "${part}"`);
      return { code: match[1].toUpperCase(), start: match[2], end: match[3] };
    });
}

// Giờ học của từng ngày, thứ Hai đứng đầu. Lớp cũ (dayTimes rỗng) dùng một giờ chung cho mọi ngày.
// Ngày có trong weekdays mà thiếu trong dayTimes cũng dùng giờ chung.
export function resolveDayTimes(weekdays: string, startTime: string, endTime: string, dayTimes = ''): DayTime[] {
  const own = new Map(decodeDayTimes(dayTimes).map((d) => [d.code, d]));
  return parseWeekdays(weekdays)
    .sort(mondayFirst)
    .map((day) => {
      const code = DAY_LABEL[day];
      const found = own.get(code);
      return { code, start: found?.start ?? startTime, end: found?.end ?? endTime };
    });
}

function assertDayTimes(list: readonly DayTime[]): void {
  for (const d of list) {
    assertTime(d.start, `Giờ bắt đầu ${d.code}`);
    assertTime(d.end, `Giờ kết thúc ${d.code}`);
    if (d.end <= d.start) throw new Error(`Giờ kết thúc ${d.code} phải sau giờ bắt đầu.`);
  }
}

// Sinh đúng sessionsTotal buổi, bắt đầu từ ngày fromDate (YYYY-MM-DD), theo các ngày trong tuần.
// dayTimes (tuỳ chọn) đặt giờ riêng cho từng ngày; ngày không có trong đó dùng startTime, endTime.
export function generateSessions(input: { weekdays: string; startTime: string; endTime: string; dayTimes?: string; sessionsTotal: number; fromDate: string }): GeneratedSession[] {
  const { weekdays, startTime, endTime, sessionsTotal, fromDate } = input;
  const times = resolveDayTimes(weekdays, startTime, endTime, input.dayTimes);
  assertDayTimes(times);
  if (!Number.isInteger(sessionsTotal) || sessionsTotal < 1) throw new Error('Số buổi phải là số nguyên dương.');
  if (!DATE_PATTERN.test(fromDate)) throw new Error('Ngày bắt đầu phải theo dạng YYYY-MM-DD.');

  const byDay = new Map(times.map((t) => [WEEKDAY_INDEX[t.code], t]));
  const [y, m, d] = fromDate.split('-').map(Number);
  const sessions: GeneratedSession[] = [];
  // Đi theo lịch UTC để không phụ thuộc múi giờ của máy chạy
  for (let day = Date.UTC(y, m - 1, d); sessions.length < sessionsTotal; day += 86_400_000) {
    const time = byDay.get(new Date(day).getUTCDay());
    if (!time) continue;
    const date = new Date(day).toISOString().slice(0, 10);
    sessions.push({
      sessionNo: sessions.length + 1,
      date,
      startsAt: new Date(`${date}T${time.start}:00${VN_OFFSET}`),
      endsAt: new Date(`${date}T${time.end}:00${VN_OFFSET}`),
    });
  }
  return sessions;
}

// Mô tả lịch lớp để hiển thị, thứ Hai đứng đầu tuần.
// Cùng một giờ: "T2 · T4 · T6 · 18:30–20:30". Giờ khác nhau: "T3 18:00–19:30 · T7 08:00–09:30",
// các ngày cùng giờ gộp lại: "T2, T4 18:00–19:30 · T7 08:00–09:30".
export function describeSchedule(weekdays: string, startTime: string, endTime: string, dayTimes = ''): string {
  const times = resolveDayTimes(weekdays, startTime, endTime, dayTimes);
  const groups: { codes: string[]; range: string }[] = [];
  for (const t of times) {
    const range = `${t.start}–${t.end}`;
    const group = groups.find((g) => g.range === range);
    if (group) group.codes.push(t.code);
    else groups.push({ codes: [t.code], range });
  }
  if (groups.length === 1) return `${groups[0].codes.join(' · ')} · ${groups[0].range}`;
  return groups.map((g) => `${g.codes.join(', ')} ${g.range}`).join(' · ');
}

// Chuỗi ngày lưu trong DB: "T2,T4,T6", theo đúng thứ tự của mảng đầu vào đã chuẩn hoá
export function joinWeekdays(codes: readonly string[]): string {
  return codes.join(',');
}
