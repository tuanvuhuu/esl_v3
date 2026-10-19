// Phần thuần của bot Telegram: đọc lệnh, tạo mã kết nối, link mời. Không đụng DB, có unit test.
import { randomBytes } from 'node:crypto';

export const LINK_CODE_DAYS = 7;

export type BotCommand =
  | { kind: 'start'; code: string | null }
  | { kind: 'schedule' }
  | { kind: 'tuition' }
  | { kind: 'homework' }
  | { kind: 'scores' }
  | { kind: 'attendance' }
  | { kind: 'leave'; arg?: string }
  | { kind: 'today' }
  | { kind: 'pending_grading' }
  | { kind: 'report' }
  | { kind: 'stop' }
  | { kind: 'help' }
  | { kind: 'text'; text: string };

// "/start abc", "/lich@ten_bot", tin thường. Lệnh không biết thì coi là tin thường để trung tâm đọc.
export function parseCommand(raw: string): BotCommand {
  const text = raw.trim();
  const match = /^\/([a-zA-Z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/.exec(text);
  if (!match) return { kind: 'text', text };
  const name = match[1].toLowerCase();
  const arg = (match[2] ?? '').trim();
  switch (name) {
    case 'start':
      return { kind: 'start', code: /^[a-f0-9]{16,40}$/.test(arg) ? arg : null };
    case 'lich':
    case 'schedule':
      return { kind: 'schedule' };
    case 'hocphi':
    case 'tuition':
      return { kind: 'tuition' };
    case 'baitap':
    case 'homework':
      return { kind: 'homework' };
    case 'diem':
    case 'scores':
    case 'grade':
    case 'nhanxet':
      return { kind: 'scores' };
    case 'chuyencan':
    case 'attendance':
      return { kind: 'attendance' };
    case 'nghi':
    case 'leave':
      return { kind: 'leave', arg: arg || undefined };
    case 'homnay':
    case 'today':
      return { kind: 'today' };
    case 'chocham':
    case 'pending':
      return { kind: 'pending_grading' };
    case 'baocao':
    case 'report':
      return { kind: 'report' };
    case 'huy':
    case 'stop':
      return { kind: 'stop' };
    case 'help':
    case 'trogiup':
      return { kind: 'help' };
    default:
      return { kind: 'text', text };
  }
}

// Mã kết nối: 20 ký tự hex ngẫu nhiên, đủ khó đoán, vừa với tham số start của Telegram (tối đa 64 ký tự)
export function newLinkCode(): string {
  return randomBytes(10).toString('hex');
}

export function deepLink(username: string, code: string): string {
  return `https://t.me/${username}?start=${code}`;
}

export const PARENT_KEYBOARD = {
  keyboard: [
    [{ text: '/lich' }, { text: '/diem' }],
    [{ text: '/chuyencan' }, { text: '/hocphi' }],
    [{ text: '/baitap' }, { text: '/nghi' }],
    [{ text: '/help' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

export const STAFF_KEYBOARD = {
  keyboard: [
    [{ text: '/homnay' }, { text: '/chocham' }],
    [{ text: '/baocao' }, { text: '/help' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

export const HELP_TEXT = [
  'Các lệnh tra cứu dành cho phụ huynh:',
  '/lich – lịch học 7 ngày tới của con',
  '/diem – điểm và nhận xét bài tập gần nhất',
  '/chuyencan – tình hình chuyên cần 10 buổi gần nhất',
  '/hocphi – học phí còn thiếu và đã đóng',
  '/baitap – bài tập chưa nộp',
  '/nghi – gửi đơn xin nghỉ học cho con',
  '/huy – ngừng nhận tin từ trung tâm',
  '/help – xem hướng dẫn lệnh',
  '',
  'Nhắn tin trực tiếp để trao đổi với giáo viên và trung tâm.',
].join('\n');

export const STAFF_HELP_TEXT = [
  'Các lệnh cho giáo viên & quản trị:',
  '/homnay – lịch dạy hôm nay và phòng học',
  '/chocham – các bài tập đang chờ chấm điểm',
  '/baocao – báo cáo tổng quan hôm nay (Quản trị)',
  '/huy – huỷ nhận thông báo từ hệ thống',
  '/help – xem hướng dẫn',
].join('\n');

