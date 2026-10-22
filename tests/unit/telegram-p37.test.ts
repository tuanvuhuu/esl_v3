import { describe, expect, it } from 'vitest';
import { normalizePhone, parseCommand, SHARE_PHONE_KEYBOARD } from '@/lib/telegram/commands';
import {
  absenceStreak,
  cleanLeaveReason,
  clip,
  dueJobs,
  isCronJob,
  isLeaveReasonCode,
  isoWeekKey,
  leaveReasonKeyboard,
  NOTIFY_KINDS,
  settingsKeyboard,
  toggleMuted,
  tuitionPhase,
  vnClock,
} from '@/lib/telegram/prefs';

// Giờ Việt Nam = UTC+7: 06:00 VN là 23:00 UTC hôm trước
const vn = (iso: string) => new Date(`${iso}+07:00`);

describe('lệnh mới của bot (P37)', () => {
  it('/caidat, /donnghi và nút bấm tiếng Việt', () => {
    expect(parseCommand('/caidat')).toEqual({ kind: 'settings' });
    expect(parseCommand('⚙️ Cài đặt nhận tin')).toEqual({ kind: 'settings' });
    expect(parseCommand('/donnghi')).toEqual({ kind: 'leave_list' });
    expect(parseCommand('🩺 Đơn nghỉ chờ duyệt')).toEqual({ kind: 'leave_list' });
  });

  it('chuẩn hoá số điện thoại từ danh bạ Telegram', () => {
    expect(normalizePhone('+84963882797')).toBe('0963882797');
    expect(normalizePhone('84963882797')).toBe('0963882797');
    expect(normalizePhone('0963 882.797')).toBe('0963882797');
  });

  it('nút chia sẻ số điện thoại dùng request_contact của Telegram', () => {
    expect(SHARE_PHONE_KEYBOARD.keyboard[0][0].request_contact).toBe(true);
  });
});

describe('cài đặt nhận tin', () => {
  it('bật tắt giữ thứ tự và bỏ mã lạ', () => {
    expect(toggleMuted([], 'score')).toEqual(['score']);
    expect(toggleMuted(['weekly', 'score'], 'absence')).toEqual(['absence', 'score', 'weekly']);
    expect(toggleMuted(['score', 'la'], 'score')).toEqual([]);
  });

  it('mỗi loại tin một nút, nút ghi trạng thái hiện tại', () => {
    const kb = settingsKeyboard(['tuition']);
    expect(kb.inline_keyboard).toHaveLength(NOTIFY_KINDS.length);
    const tuition = kb.inline_keyboard.find((row) => row[0].callback_data === 'pref:tuition')!;
    expect(tuition[0].text.startsWith('🔕')).toBe(true);
    expect(kb.inline_keyboard.find((row) => row[0].callback_data === 'pref:schedule')![0].text.startsWith('✅')).toBe(true);
  });
});

describe('đơn xin nghỉ', () => {
  it('lý do gõ tay được gộp khoảng trắng và cắt 200 ký tự; rỗng thì null', () => {
    expect(cleanLeaveReason('  Con   bị sốt  ')).toBe('Con bị sốt');
    expect(cleanLeaveReason('   ')).toBeNull();
    expect(cleanLeaveReason('a'.repeat(300))).toHaveLength(200);
  });

  it('nút lý do mang mã đơn, chỉ nhận mã lý do đã định', () => {
    const data = leaveReasonKeyboard(42).inline_keyboard.flat().map((b) => b.callback_data);
    expect(data).toEqual(['lv_r:42:sick', 'lv_r:42:family', 'lv_r:42:travel', 'lv_r:42:none']);
    expect(data.every((d) => d.length <= 64)).toBe(true);
    expect(isLeaveReasonCode('sick')).toBe(true);
    expect(isLeaveReasonCode('toString')).toBe(false);
  });
});

describe('giờ chạy việc tự động theo giờ Việt Nam', () => {
  it('đọc giờ và thứ theo UTC+7', () => {
    expect(vnClock(vn('2026-10-25T06:30:00'))).toEqual({ hour: 6, weekday: 0, day: 25 });
  });

  it('nửa đêm chỉ nhắc hạn bài; sáng nhắc lịch; 8 giờ học phí, chấm bài; tối Chủ nhật báo cáo tuần; 20 giờ báo cáo ngày', () => {
    expect(dueJobs(vn('2026-10-22T02:00:00'))).toEqual(['homework_due']);
    expect(dueJobs(vn('2026-10-22T06:05:00'))).toEqual(['schedule', 'teacher_day', 'homework_due']);
    expect(dueJobs(vn('2026-10-22T09:00:00'))).toEqual(['schedule', 'teacher_day', 'homework_due', 'tuition', 'grading']);
    expect(dueJobs(vn('2026-10-25T18:30:00'))).toContain('weekly');
    expect(dueJobs(vn('2026-10-24T18:30:00'))).not.toContain('weekly');
    expect(dueJobs(vn('2026-10-22T20:00:00'))).toContain('daily_report');
  });

  it('chỉ nhận tên việc đã định', () => {
    expect(isCronJob('weekly')).toBe(true);
    expect(isCronJob('drop_table')).toBe(false);
  });
});

describe('học phí, vắng liên tiếp, tuần', () => {
  it('3 ngày trước hạn là sắp đến hạn, sau hạn là quá hạn; hạn 31 ở tháng 2 lấy ngày cuối tháng', () => {
    expect(tuitionPhase('2026-10-07', 10)).toEqual({ phase: 'before', dueKey: '2026-10-10' });
    expect(tuitionPhase('2026-10-10', 10)).toEqual({ phase: 'before', dueKey: '2026-10-10' });
    expect(tuitionPhase('2026-10-06', 10).phase).toBeNull();
    expect(tuitionPhase('2026-10-11', 10).phase).toBe('overdue');
    expect(tuitionPhase('2026-02-27', 31)).toEqual({ phase: 'before', dueKey: '2026-02-28' });
  });

  it('đếm buổi vắng liên tiếp từ buổi gần nhất', () => {
    expect(absenceStreak(['absent', 'absent', 'absent', 'present'])).toBe(3);
    expect(absenceStreak(['present', 'absent', 'absent'])).toBe(0);
    expect(absenceStreak(['absent', 'late', 'absent'])).toBe(1);
  });

  it('mã tuần ISO', () => {
    expect(isoWeekKey('2026-10-25')).toBe('2026-W43');
    expect(isoWeekKey('2026-10-19')).toBe('2026-W43');
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53');
  });

  it('cắt chữ dài có dấu …', () => {
    expect(clip('abcdef', 4)).toBe('abc…');
    expect(clip(' abc ', 10)).toBe('abc');
  });
});
