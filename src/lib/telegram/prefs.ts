// Phần thuần của các kịch bản P37 (docs/KICH-BAN-TELEGRAM.md): loại tin phụ huynh tắt được, giờ chạy của từng việc tự động,
// lý do xin nghỉ, chuỗi vắng liên tiếp. Không đụng DB, có unit test.

// ---------- Cài đặt nhận tin /caidat (mục 1.6) ----------

export const NOTIFY_KINDS = ['schedule', 'absence', 'session_change', 'homework', 'score', 'tuition', 'weekly'] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];

export const NOTIFY_LABELS: Record<NotifyKind, string> = {
  schedule: 'Nhắc lịch học buổi sáng',
  absence: 'Báo con vắng hoặc đi trễ',
  session_change: 'Buổi học bị huỷ hoặc đổi giờ',
  homework: 'Bài tập mới, hạn nộp, con đã nộp',
  score: 'Điểm và nhận xét mới',
  tuition: 'Nhắc học phí',
  weekly: 'Báo cáo tuần',
};

export function isNotifyKind(value: string): value is NotifyKind {
  return (NOTIFY_KINDS as readonly string[]).includes(value);
}

// Bật thành tắt và ngược lại. Giữ thứ tự theo NOTIFY_KINDS, bỏ mã lạ.
export function toggleMuted(muted: readonly string[], kind: NotifyKind): NotifyKind[] {
  const set = new Set(muted.filter(isNotifyKind));
  if (set.has(kind)) set.delete(kind);
  else set.add(kind);
  return NOTIFY_KINDS.filter((k) => set.has(k));
}

export function settingsText(muted: readonly string[]): string {
  const off = NOTIFY_KINDS.filter((k) => muted.includes(k)).length;
  return [
    '⚙️ CÀI ĐẶT NHẬN TIN',
    '',
    'Bấm vào từng dòng để bật hoặc tắt. ✅ là đang nhận, 🔕 là đã tắt.',
    off === 0 ? 'Quý phụ huynh đang nhận đủ mọi loại tin.' : `Đang tắt ${off} loại tin.`,
    '',
    'Tin trả lời khi tra cứu, kết quả đơn xin nghỉ, tin Thầy/Cô nhắn riêng và thông báo chung của trung tâm luôn được gửi.',
  ].join('\n');
}

export function settingsKeyboard(muted: readonly string[]) {
  return {
    inline_keyboard: NOTIFY_KINDS.map((k) => [{ text: `${muted.includes(k) ? '🔕' : '✅'} ${NOTIFY_LABELS[k]}`, callback_data: `pref:${k}` }]),
  };
}

// ---------- Lý do xin nghỉ (mục 1.4) ----------

export const LEAVE_REASONS = { sick: 'Ốm, sức khoẻ', family: 'Việc gia đình', travel: 'Đi xa', none: '' } as const;
export type LeaveReasonCode = keyof typeof LEAVE_REASONS;
export const LEAVE_REASON_MAX = 200;
// Phụ huynh gõ lý do trong thời gian này sau khi chọn buổi; quá hạn thì tin gõ là tin nhắn thường
export const LEAVE_DRAFT_MINUTES = 15;

export function isLeaveReasonCode(value: string): value is LeaveReasonCode {
  return Object.prototype.hasOwnProperty.call(LEAVE_REASONS, value);
}

export function leaveReasonKeyboard(requestId: number) {
  return {
    inline_keyboard: [
      [
        { text: '🤒 Ốm, sức khoẻ', callback_data: `lv_r:${requestId}:sick` },
        { text: '🏠 Việc gia đình', callback_data: `lv_r:${requestId}:family` },
      ],
      [
        { text: '✈️ Đi xa', callback_data: `lv_r:${requestId}:travel` },
        { text: 'Gửi không ghi lý do', callback_data: `lv_r:${requestId}:none` },
      ],
    ],
  };
}

// Lý do gõ tay: gộp khoảng trắng, cắt độ dài. Rỗng thì null.
export function cleanLeaveReason(raw: string): string | null {
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, LEAVE_REASON_MAX);
  return text ? text : null;
}

export const LEAVE_STATUS_LABELS = {
  draft: 'chưa gửi',
  pending: 'chờ duyệt',
  approved: 'đã duyệt',
  denied: 'bị từ chối',
  cancelled: 'đã huỷ',
} as const;

// ---------- Giờ chạy việc tự động (mục 1.8, 2, 3) ----------

export const CRON_JOBS = [
  'schedule', // nhắc lịch học cho phụ huynh
  'teacher_day', // lịch dạy buổi sáng cho giáo viên
  'homework_due', // nhắc hạn bài trong 24 giờ tới
  'tuition', // học phí sắp đến hạn và quá hạn
  'grading', // nhắc giáo viên bài chờ chấm quá 2 ngày
  'weekly', // báo cáo tuần cho phụ huynh
  'daily_report', // báo cáo cuối ngày cho quản trị
] as const;
export type CronJob = (typeof CRON_JOBS)[number];

export function isCronJob(value: string): value is CronJob {
  return (CRON_JOBS as readonly string[]).includes(value);
}

// Giờ và thứ theo giờ Việt Nam. weekday: 0 = Chủ nhật.
export function vnClock(now: Date): { hour: number; weekday: number; day: number } {
  const vn = new Date(now.getTime() + 7 * 3_600_000);
  return { hour: vn.getUTCHours(), weekday: vn.getUTCDay(), day: vn.getUTCDate() };
}

// Việc nào đến giờ chạy. Cron gọi mỗi giờ; việc đã gửi trong ngày không gửi lại nhờ nhật ký chống trùng.
export function dueJobs(now: Date): CronJob[] {
  const { hour, weekday } = vnClock(now);
  const jobs: CronJob[] = ['homework_due'];
  if (hour >= 6) jobs.push('schedule', 'teacher_day');
  if (hour >= 8) jobs.push('tuition', 'grading');
  if (weekday === 0 && hour >= 18) jobs.push('weekly');
  if (hour >= 20) jobs.push('daily_report');
  return CRON_JOBS.filter((j) => jobs.includes(j));
}

// Học phí: còn mấy ngày tới hạn trong tháng (âm là đã quá). dueDay lớn hơn số ngày của tháng thì lấy ngày cuối tháng.
export function tuitionPhase(todayKey: string, dueDay: number): { phase: 'before' | 'overdue' | null; dueKey: string } {
  const [y, m, d] = todayKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const due = Math.min(Math.max(1, dueDay), lastDay);
  const dueKey = `${y}-${String(m).padStart(2, '0')}-${String(due).padStart(2, '0')}`;
  const diff = due - d;
  if (diff >= 0 && diff <= 3) return { phase: 'before', dueKey };
  if (diff < 0) return { phase: 'overdue', dueKey };
  return { phase: null, dueKey };
}

// ---------- Vắng liên tiếp (mục 2) ----------

export const ABSENCE_STREAK = 3;

// Số buổi vắng liên tiếp tính từ buổi gần nhất. marks xếp từ mới tới cũ.
export function absenceStreak(marks: readonly string[]): number {
  let n = 0;
  for (const m of marks) {
    if (m !== 'absent') break;
    n++;
  }
  return n;
}

// Mã tuần ISO để chống gửi trùng báo cáo tuần: "2026-W43"
export function isoWeekKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Cắt chữ dài cho tin nhắn, thêm dấu … khi cắt
export function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
