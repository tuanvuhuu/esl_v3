// Phần thuần của bot Telegram: đọc lệnh, tạo mã kết nối, link mời. Không đụng DB, có unit test.
import { randomBytes } from 'node:crypto';

export const LINK_CODE_DAYS = 7;

export type BotCommand =
  | { kind: 'start'; code: string | null }
  | { kind: 'schedule' }
  | { kind: 'tuition' }
  | { kind: 'homework' }
  | { kind: 'scores' }
  | { kind: 'speaking' }
  | { kind: 'attendance' }
  | { kind: 'leave'; arg?: string }
  | { kind: 'today' }
  | { kind: 'pending_grading' }
  | { kind: 'report' }
  | { kind: 'settings' }
  | { kind: 'leave_list' }
  | { kind: 'stop' }
  | { kind: 'help' }
  | { kind: 'text'; text: string };

// Bàn phím nút bấm cố định dưới màn hình cho Phụ huynh (chạm là tra cứu ngay, không cần gõ)
export const PARENT_KEYBOARD = {
  keyboard: [
    [{ text: '📅 Lịch học' }, { text: '📊 Điểm số' }],
    [{ text: '📝 Chuyên cần' }, { text: '💳 Học phí' }],
    [{ text: '📚 Bài tập' }, { text: '🩺 Xin nghỉ học' }],
    [{ text: '⚙️ Cài đặt nhận tin' }, { text: '❓ Hướng dẫn' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

// Bàn phím nút bấm cố định cho Giáo viên & Quản trị
export const STAFF_KEYBOARD = {
  keyboard: [
    [{ text: '📅 Lịch dạy hôm nay' }, { text: '📝 Bài chờ chấm' }],
    [{ text: '🩺 Đơn nghỉ chờ duyệt' }, { text: '📊 Báo cáo ngày' }],
    [{ text: '❓ Hướng dẫn' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

// Menu nút bấm tương tác trực tiếp (Inline Keyboard) gắn dưới tin nhắn chào mừng / hướng dẫn
export const PARENT_INLINE_MENU = {
  inline_keyboard: [
    [
      { text: '📅 Lịch học 7 ngày tới', callback_data: 'cmd:schedule' },
      { text: '📊 Bảng điểm & Nhận xét', callback_data: 'cmd:scores' },
    ],
    [
      { text: '📝 Điểm danh chuyên cần', callback_data: 'cmd:attendance' },
      { text: '💳 Tra cứu học phí', callback_data: 'cmd:tuition' },
    ],
    [
      { text: '📚 Bài tập về nhà', callback_data: 'cmd:homework' },
      { text: '🩺 Đơn xin nghỉ học', callback_data: 'cmd:leave' },
    ],
    [
      { text: '⚙️ Cài đặt nhận tin', callback_data: 'cmd:settings' },
      { text: '❓ Hướng dẫn sử dụng', callback_data: 'cmd:help' },
    ],
  ],
};

// Menu nút bấm nhỏ đi kèm sau mỗi câu trả lời để phụ huynh chạm tiếp tính năng khác
export const QUICK_MENU_INLINE = {
  inline_keyboard: [
    [
      { text: '📅 Lịch học', callback_data: 'cmd:schedule' },
      { text: '📊 Điểm', callback_data: 'cmd:scores' },
      { text: '💳 Học phí', callback_data: 'cmd:tuition' },
    ],
    [
      { text: '📚 Bài tập', callback_data: 'cmd:homework' },
      { text: '🩺 Xin nghỉ', callback_data: 'cmd:leave' },
      { text: '📋 Menu chính', callback_data: 'cmd:help' },
    ],
  ],
};

// Danh sách lệnh chính thức đăng ký với Telegram Bot để hiện nút [Menu] cạnh ô gõ phím
export const DEFAULT_BOT_COMMANDS = [
  { command: 'lich', description: '📅 Xem lịch học 7 ngày tới' },
  { command: 'diem', description: '📊 Xem bảng điểm & nhận xét bài tập' },
  { command: 'nhanxet', description: '🎙️ Nhận xét bài nói của Thầy/Cô' },
  { command: 'chuyencan', description: '📝 Xem điểm danh, chuyên cần' },
  { command: 'hocphi', description: '💳 Tra cứu học phí đã đóng & còn lại' },
  { command: 'baitap', description: '📚 Xem bài tập về nhà chưa nộp' },
  { command: 'nghi', description: '🩺 Gửi đơn xin nghỉ học cho con' },
  { command: 'caidat', description: '⚙️ Bật, tắt từng loại tin tự động' },
  { command: 'help', description: '❓ Hướng dẫn tra cứu & liên hệ' },
];

// "/start abc", "/lich@ten_bot", bấm nút tiếng Việt hoặc tin thường.
export function parseCommand(raw: string): BotCommand {
  const text = raw.trim();

  // 1. Kiểm tra lệnh dạng /command arg
  const match = /^\/([a-zA-Z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/.exec(text);
  if (match) {
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
        return { kind: 'scores' };
      // Nhận xét bài nói của Thầy/Cô (35.11)
      case 'nhanxet':
      case 'speaking':
        return { kind: 'speaking' };
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
      case 'caidat':
      case 'settings':
        return { kind: 'settings' };
      case 'donnghi':
        return { kind: 'leave_list' };
      case 'huy':
      case 'stop':
        return { kind: 'stop' };
      case 'help':
      case 'trogiup':
      case 'menu':
        return { kind: 'help' };
      default:
        return { kind: 'text', text };
    }
  }

  // 2. Nhận diện nút bấm tiếng Việt (có hoặc không có emoji, viết hoa/thường, không dấu). Bỏ cả U+FE0F, U+200D đi kèm emoji như ⚙️
  const cleaned = text
    .replace(/^[\p{Emoji}\p{Symbol}️‍\s]+/gu, '')
    .replace(/[\p{Emoji}\p{Symbol}️‍\s]+$/gu, '')
    .trim();
  const norm = cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  if (['lich', 'lich hoc', 'xem lich', 'thoi khoa bieu', 'tkb', 'schedule'].includes(norm)) {
    return { kind: 'schedule' };
  }
  if (['diem', 'diem so', 'bang diem', 'xem diem', 'ket qua', 'scores', 'grade'].includes(norm)) {
    return { kind: 'scores' };
  }
  if (['nhan xet', 'nhan xet bai noi', 'bai noi'].includes(norm)) {
    return { kind: 'speaking' };
  }
  if (['chuyen can', 'diem danh', 'tinh hinh di hoc', 'attendance'].includes(norm)) {
    return { kind: 'attendance' };
  }
  if (['hoc phi', 'tien hoc', 'dong tien', 'tra cuu hoc phi', 'tuition', 'fee'].includes(norm)) {
    return { kind: 'tuition' };
  }
  if (['bai tap', 'bai ve nha', 'bvn', 'homework', 'assignment'].includes(norm)) {
    return { kind: 'homework' };
  }
  if (['xin nghi hoc', 'xin nghi', 'nghi hoc', 'nghi', 'bao nghi', 'leave'].includes(norm)) {
    return { kind: 'leave' };
  }
  if (['cai dat', 'cai dat nhan tin', 'tat thong bao', 'settings'].includes(norm)) {
    return { kind: 'settings' };
  }
  if (['don nghi', 'don nghi cho duyet', 'duyet don nghi'].includes(norm)) {
    return { kind: 'leave_list' };
  }
  if (['huong dan', 'tro giup', 'cach dung', 'menu', 'help'].includes(norm)) {
    return { kind: 'help' };
  }
  if (['lich day hom nay', 'lich day', 'hom nay', 'today'].includes(norm)) {
    return { kind: 'today' };
  }
  if (['bai cho cham', 'cho cham', 'pending'].includes(norm)) {
    return { kind: 'pending_grading' };
  }
  if (['bao cao ngay', 'bao cao', 'report'].includes(norm)) {
    return { kind: 'report' };
  }
  if (['huy', 'ngung nhan', 'stop'].includes(norm)) {
    return { kind: 'stop' };
  }

  // 3. Tin nhắn tự do của phụ huynh gửi cho giáo viên & trung tâm
  return { kind: 'text', text };
}

// Bàn phím xin số điện thoại của chính người dùng (nút request_contact). Dùng khi người lạ nhắn bot (kịch bản 1.2).
export const SHARE_PHONE_KEYBOARD = {
  keyboard: [[{ text: '📱 Chia sẻ số điện thoại', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export const CONNECT_HINT = [
  '👋 Xin chào! Đây là bot của ESL Center.',
  '',
  'Để nhận lịch học, điểm, học phí của con, Quý phụ huynh bấm nút 📱 Chia sẻ số điện thoại ở phía dưới.',
  'Bot chỉ nhận số điện thoại của chính tài khoản Telegram này và số phải trùng với số đã đăng ký ở trung tâm.',
  '',
  'Hoặc bấm vào link kết nối riêng do trung tâm gửi.',
].join('\n');

// Chuẩn hoá số điện thoại Việt Nam: bỏ khoảng trắng, dấu chấm, gạch; +84 hoặc 84 đầu thành 0
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+84')) return `0${digits.slice(3)}`;
  if (digits.startsWith('84') && digits.length === 11) return `0${digits.slice(2)}`;
  return digits.replace(/^\+/, '');
}

// Mã kết nối: 20 ký tự hex ngẫu nhiên, đủ khó đoán, vừa với tham số start của Telegram (tối đa 64 ký tự)
export function newLinkCode(): string {
  return randomBytes(10).toString('hex');
}

export function deepLink(username: string, code: string): string {
  return `https://t.me/${username}?start=${code}`;
}

export const HELP_TEXT = [
  '🌟 HƯỚNG DẪN TRA CỨU DÀNH CHO PHỤ HUYNH',
  '',
  '👉 Quý phụ huynh CHỈ CẦN CHẠM (CLICK) vào các nút bên dưới để xem thông tin ngay lập tức (không cần gõ lệnh):',
  '',
  '• 📅 Lịch học: Xem lịch học 7 ngày tới, giờ học và phòng học của con',
  '• 📊 Điểm số: Xem điểm bài kiểm tra và nhận xét của Thầy/Cô',
  '• /nhanxet: Nhận xét bài nói của Thầy/Cô (lỗi cần luyện, lời khen)',
  '• 📝 Chuyên cần: Xem số buổi đi học, đi trễ hoặc vắng mặt',
  '• 💳 Học phí: Xem các khoản đã đóng và học phí còn lại',
  '• 📚 Bài tập: Xem danh sách bài tập về nhà và hạn nộp',
  '• 🩺 Xin nghỉ học: Chọn buổi, chọn lý do, Thầy/Cô duyệt và báo lại cho Quý phụ huynh',
  '• ⚙️ Cài đặt nhận tin: Bật hoặc tắt từng loại tin tự động (nhắc lịch, báo vắng, điểm mới...)',
  '',
  '💬 Trao đổi với Thầy/Cô:',
  'Quý phụ huynh chỉ cần gõ nội dung tin nhắn trực tiếp vào đây, Thầy/Cô phụ trách lớp sẽ nhận được và phản hồi lại sớm nhất ạ!',
].join('\n');

export const STAFF_HELP_TEXT = [
  'Các lệnh cho giáo viên & quản trị:',
  '• /homnay hoặc bấm [📅 Lịch dạy hôm nay]: Lịch dạy hôm nay và phòng học',
  '• /chocham hoặc bấm [📝 Bài chờ chấm]: Các bài tập đang chờ chấm điểm',
  '• /donnghi hoặc bấm [🩺 Đơn nghỉ chờ duyệt]: Đơn xin nghỉ của lớp bạn đang chờ duyệt',
  '• /baocao hoặc bấm [📊 Báo cáo ngày]: Báo cáo tổng quan hôm nay (Quản trị)',
  '• /huy: Huỷ nhận thông báo từ hệ thống',
  '• /help: Xem lại hướng dẫn',
].join('\n');


