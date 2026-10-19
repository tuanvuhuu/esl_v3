// Phần thuần của bot Telegram: đọc lệnh, tạo mã kết nối, link mời. Không đụng DB, có unit test.
import { randomBytes } from 'node:crypto';

export const LINK_CODE_DAYS = 7;

export type BotCommand =
  | { kind: 'start'; code: string | null }
  | { kind: 'schedule' }
  | { kind: 'tuition' }
  | { kind: 'homework' }
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

export const HELP_TEXT = [
  'Các lệnh của trung tâm:',
  '/lich – lịch học 7 ngày tới của con',
  '/hocphi – học phí còn thiếu',
  '/baitap – bài tập chưa nộp',
  '/huy – ngừng nhận tin từ trung tâm',
  'Nhắn tin bình thường để gửi câu hỏi cho trung tâm.',
].join('\n');
