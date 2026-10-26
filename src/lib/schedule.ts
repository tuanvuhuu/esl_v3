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

// Một ca học trong tuần. Mỗi ngày học có giờ riêng, và một ngày có thể có nhiều ca
// (T3 18:00–19:30; T7 08:00–09:30 và 14:00–15:30).
export type DayTime = { code: string; start: string; end: string };

// Nhãn ngày theo chỉ số của Date: 0 = CN
const DAY_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const mondayFirst = (a: number, b: number) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b);

// Chuỗi lưu trong cột day_times: "T3 18:00-19:30,T7 08:00-09:30,T7 14:00-15:30". Một ngày nhiều ca thì lặp mã ngày.
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

// Các ca học trong tuần, thứ Hai đứng đầu, trong một ngày xếp theo giờ bắt đầu.
// Lớp cũ (dayTimes rỗng) dùng một giờ chung cho mọi ngày. Ngày có trong weekdays mà thiếu trong dayTimes cũng dùng giờ chung.
export function resolveDayTimes(weekdays: string, startTime: string, endTime: string, dayTimes = ''): DayTime[] {
  const own = new Map<string, DayTime[]>();
  for (const d of decodeDayTimes(dayTimes)) own.set(d.code, [...(own.get(d.code) ?? []), d]);
  return parseWeekdays(weekdays)
    .sort(mondayFirst)
    .flatMap((day) => {
      const code = DAY_LABEL[day];
      const slots = own.get(code);
      if (!slots) return [{ code, start: startTime, end: endTime }];
      return [...slots].sort((a, b) => a.start.localeCompare(b.start)).map((s) => ({ code, start: s.start, end: s.end }));
    });
}

// Giờ đúng dạng, kết thúc sau bắt đầu, và các ca trong cùng một ngày không chồng lên nhau
function assertDayTimes(list: readonly DayTime[]): void {
  for (const [i, d] of list.entries()) {
    assertTime(d.start, `Giờ bắt đầu ${d.code}`);
    assertTime(d.end, `Giờ kết thúc ${d.code}`);
    if (d.end <= d.start) throw new Error(`Giờ kết thúc ${d.code} phải sau giờ bắt đầu.`);
    const prev = list[i - 1];
    if (prev && prev.code === d.code && d.start < prev.end) throw new Error(`Hai ca ${d.code} trùng giờ nhau.`);
  }
}

// Sinh đúng sessionsTotal buổi, bắt đầu từ ngày fromDate (YYYY-MM-DD), theo các ca trong tuần.
// Ngày có hai ca thì sinh hai buổi trong ngày đó. dayTimes (tuỳ chọn) đặt giờ riêng; ngày không có trong đó dùng startTime, endTime.
export function generateSessions(input: { weekdays: string; startTime: string; endTime: string; dayTimes?: string; sessionsTotal: number; fromDate: string }): GeneratedSession[] {
  const { weekdays, startTime, endTime, sessionsTotal, fromDate } = input;
  const times = resolveDayTimes(weekdays, startTime, endTime, input.dayTimes);
  assertDayTimes(times);
  if (!Number.isInteger(sessionsTotal) || sessionsTotal < 1) throw new Error('Số buổi phải là số nguyên dương.');
  if (!DATE_PATTERN.test(fromDate)) throw new Error('Ngày bắt đầu phải theo dạng YYYY-MM-DD.');

  const byDay = new Map<number, DayTime[]>();
  for (const t of times) byDay.set(WEEKDAY_INDEX[t.code], [...(byDay.get(WEEKDAY_INDEX[t.code]) ?? []), t]);
  const [y, m, d] = fromDate.split('-').map(Number);
  const sessions: GeneratedSession[] = [];
  // Đi theo lịch UTC để không phụ thuộc múi giờ của máy chạy
  for (let day = Date.UTC(y, m - 1, d); sessions.length < sessionsTotal; day += 86_400_000) {
    const slots = byDay.get(new Date(day).getUTCDay());
    if (!slots) continue;
    const date = new Date(day).toISOString().slice(0, 10);
    for (const time of slots) {
      if (sessions.length >= sessionsTotal) break;
      sessions.push({
        sessionNo: sessions.length + 1,
        date,
        startsAt: new Date(`${date}T${time.start}:00${VN_OFFSET}`),
        endsAt: new Date(`${date}T${time.end}:00${VN_OFFSET}`),
      });
    }
  }
  return sessions;
}

// Mô tả lịch lớp để hiển thị, thứ Hai đứng đầu tuần.
// Mọi ngày cùng một giờ: "T2 · T4 · T6 · 18:30–20:30". Giờ khác nhau: "T3 18:00–19:30 · T7 08:00–09:30".
// Các ngày có cùng ca gộp lại: "T2, T4 18:00–19:30 · T7 08:00–09:30". Một ngày nhiều ca: "T7 08:00–09:30, 14:00–15:30".
// Lớp có dữ liệu thiếu hoặc sai (chưa chọn ngày học, giờ không đúng dạng) thì ghi rõ là chưa đủ lịch,
// không ném lỗi: một lớp hỏng không được làm sập cả trang tổng quan, danh sách lớp.
export function describeSchedule(weekdays: string, startTime: string, endTime: string, dayTimes = ''): string {
  try {
    return describeScheduleStrict(weekdays, startTime, endTime, dayTimes);
  } catch {
    return weekdays.trim() ? 'Lịch chưa đủ, cần sửa lại' : 'Chưa có ngày học';
  }
}

function describeScheduleStrict(weekdays: string, startTime: string, endTime: string, dayTimes = ''): string {
  const times = resolveDayTimes(weekdays, startTime, endTime, dayTimes);
  const perDay: { code: string; ranges: string[] }[] = [];
  for (const t of times) {
    const range = `${t.start}–${t.end}`;
    const last = perDay[perDay.length - 1];
    if (last && last.code === t.code) last.ranges.push(range);
    else perDay.push({ code: t.code, ranges: [range] });
  }
  const groups: { codes: string[]; slots: string }[] = [];
  for (const d of perDay) {
    const slots = d.ranges.join(', ');
    const group = groups.find((g) => g.slots === slots);
    if (group) group.codes.push(d.code);
    else groups.push({ codes: [d.code], slots });
  }
  if (groups.length === 1) return `${groups[0].codes.join(' · ')} · ${groups[0].slots}`;
  return groups.map((g) => `${g.codes.join(', ')} ${g.slots}`).join(' · ');
}

// Chuỗi ngày lưu trong DB: "T2,T4,T6", theo đúng thứ tự của mảng đầu vào đã chuẩn hoá
export function joinWeekdays(codes: readonly string[]): string {
  return codes.join(',');
}
