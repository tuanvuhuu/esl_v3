// Tiện ích ngày giờ theo múi giờ Việt Nam (UTC+7). Hàm thuần, không đụng DB, dùng được cả server và client.
// Ngày dạng khoá "YYYY-MM-DD" là ngày theo giờ Việt Nam.

const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;

const pad = (n: number) => String(n).padStart(2, '0');

// Chuyển thời điểm thành ngày khoá YYYY-MM-DD theo giờ Việt Nam
export function vnDateKey(date: Date): string {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function todayKeyVN(now: Date = new Date()): string {
  return vnDateKey(now);
}

// "13/10/2026 17:45" theo giờ Việt Nam
export function vnDateTimeLabel(date: Date): string {
  const vn = new Date(date.getTime() + VN_OFFSET_MS);
  return `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()} ${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}

// "17:45" theo giờ Việt Nam
export function vnTimeLabel(date: Date): string {
  const vn = new Date(date.getTime() + VN_OFFSET_MS);
  return `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}

// "13/10/2026" từ khoá YYYY-MM-DD
export function dateKeyLabel(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

// Cộng n ngày vào khoá YYYY-MM-DD (n có thể âm)
export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
}

// Thứ trong tuần của khoá ngày: 0 = Chủ nhật
export function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Nhãn thứ ngắn: T2 … T7, CN
export function weekdayLabel(index: number): string {
  return WEEKDAY_LABELS[index];
}

// Thứ Hai đầu tuần chứa ngày key
export function weekStartKey(key: string): string {
  const day = weekdayOfKey(key);
  const offset = day === 0 ? -6 : 1 - day;
  return addDaysKey(key, offset);
}

// Khoảng thời điểm [start, end) của một ngày theo giờ Việt Nam, dùng để lọc theo khoảng trong SQL
export function vnDayBounds(key: string): { start: Date; end: Date } {
  return {
    start: new Date(`${key}T00:00:00+07:00`),
    end: new Date(`${addDaysKey(key, 1)}T00:00:00+07:00`),
  };
}

// Số ngày từ a đến b (b - a), cả hai là khoá YYYY-MM-DD
export function daysBetweenKeys(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

// Tháng dạng YYYY-MM từ khoá ngày
export function monthKey(key: string): string {
  return key.slice(0, 7);
}

// Hai khoá ngày cùng tháng?
export function sameMonth(key: string, month: string): boolean {
  return key.startsWith(month);
}

// Ngày đầu tháng của tháng dạng YYYY-MM
export function monthStartKey(month: string): string {
  return `${month}-01`;
}

// Tháng liền trước hoặc liền sau, dạng YYYY-MM
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}`;
}

// Nhãn tháng: "10/2026"
export function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${m}/${y}`;
}
