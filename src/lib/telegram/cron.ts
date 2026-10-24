// Việc tự động theo giờ của bot (docs/KICH-BAN-TELEGRAM.md mục 1.8, 2, 3). Route /api/cron/telegram gọi mỗi giờ.
// Mỗi việc tự kiểm giờ Việt Nam (dueJobs); gửi qua sendOnce nên chạy lại trong ngày không gửi trùng. Chỉ chạy trên server.
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { addDaysKey, dateKeyLabel, todayKeyVN, vnDayBounds, vnDateTimeLabel, vnTimeLabel, weekStartKey } from '@/lib/datetime';
import { appLink } from '@/lib/app-link';
import { formatVND } from '@/lib/money';
import { getCenterSettings } from '@/lib/queries/settings';
import { tuitionQr } from '@/lib/tuition-qr';
import { autoCourseSurveys } from './survey';
import { adminChats, chatOf, parentChatsOfStudent, sendOnce, staffChatsOfClass, type SendResult } from './core';
import { CRON_JOBS, dueJobs, isoWeekKey, tuitionPhase, type CronJob } from './prefs';
import { dailyReportText } from './service';

export type CronTaskResult = Record<CronJob, number> & { jobs: CronJob[] };

const count = (results: SendResult[]) => results.filter((r) => r === 'sent' || r === 'failed').length;

// jobs: chạy đúng các việc này, bỏ qua kiểm giờ (kiểm thử, chạy tay). Bỏ trống thì chạy các việc đến giờ.
export async function runTelegramCronTasks(options?: { jobs?: CronJob[]; now?: Date }): Promise<CronTaskResult> {
  const now = options?.now ?? new Date();
  const jobs = options?.jobs?.length ? options.jobs : dueJobs(now);
  const result = Object.fromEntries(CRON_JOBS.map((j) => [j, 0])) as Record<CronJob, number>;
  const runners: Record<CronJob, (now: Date) => Promise<SendResult[]>> = {
    schedule: remindSchedule,
    teacher_day: teacherDay,
    homework_due: remindHomeworkDue,
    tuition: remindTuition,
    grading: remindGrading,
    weekly: weeklyReport,
    daily_report: dailyReport,
    survey: async (now) => Array.from({ length: await autoCourseSurveys(now) }, () => 'sent' as SendResult),
  };
  for (const job of jobs) {
    try {
      result[job] = count(await runners[job](now));
    } catch (error) {
      // Một việc lỗi không chặn các việc còn lại
      console.error(`Lỗi việc Telegram ${job}:`, error);
    }
  }
  return { ...result, jobs };
}

// Nhắc lịch học trong ngày cho phụ huynh: mỗi học sinh mỗi buổi một tin, kèm nút xin nghỉ buổi này.
// Buổi đã có đơn nghỉ được duyệt thì không nhắc.
async function remindSchedule(now: Date): Promise<SendResult[]> {
  const { end } = vnDayBounds(todayKeyVN(now));
  const rows = await db.execute<{ session_id: number; starts_at: Date; room: string; topic: string; class_name: string; teacher_name: string | null; student_id: number; student_name: string }>(sql`
    SELECT cs.id AS session_id, cs.starts_at, cs.room, cs.topic, c.name AS class_name, t.name AS teacher_name, s.id AS student_id, s.full_name AS student_name
    FROM class_sessions cs
    JOIN classes c ON c.id = cs.class_id
    JOIN students s ON s.class_id = c.id AND s.status IN ('active', 'trial')
    LEFT JOIN teachers t ON t.id = cs.teacher_id
    WHERE cs.status = 'planned' AND cs.starts_at > ${now} AND cs.starts_at < ${end}
      AND NOT EXISTS (SELECT 1 FROM leave_requests lr WHERE lr.session_id = cs.id AND lr.student_id = s.id AND lr.status = 'approved')`);
  const out: SendResult[] = [];
  for (const r of rows.rows) {
    const lines = [
      `⏰ NHẮC LỊCH HỌC HÔM NAY`,
      `Em ${r.student_name} có buổi học lớp ${r.class_name} lúc ${vnTimeLabel(new Date(r.starts_at))}.`,
      r.room ? `Phòng: ${r.room}` : '',
      r.teacher_name ? `Giáo viên: ${r.teacher_name}` : '',
      r.topic ? `Chủ đề: ${r.topic}` : '',
      '',
      'Chúc em có buổi học thật vui! Con bận không đến được thì Quý phụ huynh bấm nút bên dưới.',
    ].filter((l, i, all) => l !== '' || (i > 0 && all[i - 1] !== ''));
    for (const chat of await parentChatsOfStudent(r.student_id)) {
      out.push(
        await sendOnce(chat, {
          kind: 'remind_schedule',
          ref: `s:${r.session_id}:hs:${r.student_id}`,
          pref: 'schedule',
          text: lines.join('\n'),
          markup: { inline_keyboard: [[{ text: '🩺 Xin nghỉ buổi này', callback_data: `leave_sess:${r.student_id}:${r.session_id}` }]] },
        }),
      );
    }
  }
  return out;
}

// Lịch dạy trong ngày cho giáo viên: lớp, giờ, phòng, số học sinh, số đơn nghỉ đã duyệt
async function teacherDay(now: Date): Promise<SendResult[]> {
  const today = todayKeyVN(now);
  const { start, end } = vnDayBounds(today);
  const rows = await db.execute<{ chat_id: number; class_name: string; starts_at: Date; room: string; students: number; excused: number }>(sql`
    SELECT tc.chat_id, c.name AS class_name, cs.starts_at, cs.room,
      (SELECT COUNT(*)::int FROM students s WHERE s.class_id = c.id AND s.status IN ('active', 'trial')) AS students,
      (SELECT COUNT(*)::int FROM leave_requests lr WHERE lr.session_id = cs.id AND lr.status = 'approved') AS excused
    FROM class_sessions cs
    JOIN classes c ON c.id = cs.class_id
    JOIN accounts a ON a.status = 'active' AND a.teacher_id IN (cs.teacher_id, c.teacher_id, c.assistant_id, c.foreign_teacher_id)
    JOIN telegram_chats tc ON tc.account_id = a.id AND tc.active = true
    WHERE cs.status = 'planned' AND cs.starts_at >= ${start} AND cs.starts_at < ${end}
    ORDER BY tc.chat_id, cs.starts_at`);
  const byChat = new Map<number, string[]>();
  for (const r of rows.rows) {
    const line = `• ${vnTimeLabel(new Date(r.starts_at))} lớp ${r.class_name}${r.room ? ` · phòng ${r.room}` : ''} · ${r.students} học sinh${r.excused ? ` (${r.excused} nghỉ có phép)` : ''}`;
    const key = Number(r.chat_id);
    byChat.set(key, [...(byChat.get(key) ?? []), line]);
  }
  const out: SendResult[] = [];
  for (const [chatId, lines] of byChat) {
    const chat = await chatOf(chatId);
    if (!chat) continue;
    const text = [`📅 LỊCH DẠY HÔM NAY (${dateKeyLabel(today)})`, ...[...new Set(lines)], '', 'Gõ /donnghi để xem đơn xin nghỉ đang chờ duyệt.'].join('\n');
    out.push(await sendOnce(chat, { kind: 'teacher_day', ref: today, text }));
  }
  return out;
}

// Nhắc hạn nộp: bài hết hạn trong 24 giờ tới mà học sinh chưa nộp. Mỗi học sinh mỗi bài một lần.
async function remindHomeworkDue(now: Date): Promise<SendResult[]> {
  const rows = await db.execute<{ assignment_id: number; title: string; due_at: Date; class_name: string; student_id: number; student_name: string }>(sql`
    SELECT a.id AS assignment_id, a.title, a.due_at, c.name AS class_name, s.id AS student_id, s.full_name AS student_name
    FROM assignments a
    JOIN classes c ON c.id = a.class_id
    JOIN students s ON s.class_id = c.id AND s.status IN ('active', 'trial')
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
    WHERE a.due_at > ${now} AND a.due_at < ${new Date(now.getTime() + 86_400_000)}
      AND COALESCE(sub.status, 'not_submitted') = 'not_submitted'`);
  const out: SendResult[] = [];
  for (const r of rows.rows) {
    for (const chat of await parentChatsOfStudent(r.student_id)) {
      out.push(
        await sendOnce(chat, {
          kind: 'remind_homework',
          ref: `hw_due:${r.assignment_id}:hs:${r.student_id}`,
          pref: 'homework',
          text: `📝 NHẮC HẠN NỘP BÀI\nEm ${r.student_name} (lớp ${r.class_name}) chưa nộp bài "${r.title}".\nHạn nộp: ${vnDateTimeLabel(new Date(r.due_at))}\n\nQuý phụ huynh nhắc con hoàn thành giúp Thầy/Cô nhé.\n\n— ESL Center`,
        }),
      );
    }
  }
  return out;
}

// Học phí: 3 ngày trước ngày hạn (theo cờ Nhắc trước hạn trong Cài đặt) và sau ngày hạn. Mỗi tháng mỗi giai đoạn một lần.
async function remindTuition(now: Date): Promise<SendResult[]> {
  const settings = await getCenterSettings();
  const today = todayKeyVN(now);
  const { phase, dueKey } = tuitionPhase(today, settings.dueDay);
  if (!phase || (phase === 'before' && !settings.notifySmsBeforeDue)) return [];
  const rows = await db.execute<{ student_id: number; student_name: string; fee: number; paid: number }>(sql`
    SELECT s.id AS student_id, s.full_name AS student_name, COALESCE(s.tuition_fee, c.fee) AS fee,
      COALESCE((SELECT SUM(p.amount) FROM tuition_payments p WHERE p.student_id = s.id), 0)::int AS paid
    FROM students s JOIN classes c ON c.id = s.class_id
    WHERE s.status = 'active'`);
  const out: SendResult[] = [];
  for (const r of rows.rows) {
    const debt = r.fee - r.paid;
    if (debt <= 0) continue;
    const text =
      phase === 'before'
        ? `💳 NHẮC HỌC PHÍ\nHọc phí của em ${r.student_name} còn thiếu ${formatVND(debt)} (đã đóng ${formatVND(r.paid)} / ${formatVND(r.fee)}).\nHạn đóng: ${dateKeyLabel(dueKey)}.\n\nQuý phụ huynh đã đóng rồi thì bỏ qua tin này. Gõ /hocphi để xem lại bất cứ lúc nào.\n\n— ESL Center`
        : `💳 HỌC PHÍ QUÁ HẠN\nHọc phí của em ${r.student_name} còn thiếu ${formatVND(debt)}, đã quá hạn ${dateKeyLabel(dueKey)}.${settings.lateFeePercent > 0 ? `\nTheo quy định, học phí trễ hạn có thể tính thêm ${settings.lateFeePercent}%.` : ''}\n\nQuý phụ huynh liên hệ văn phòng nếu cần hỗ trợ.\n\n— ESL Center`;
    // Có tài khoản nhận học phí thì gửi kèm ảnh mã VietQR khoản còn thiếu (37.13)
    const chats = await parentChatsOfStudent(r.student_id);
    if (chats.length === 0) continue;
    const qr = await tuitionQr(r.student_id, r.student_name, debt);
    const body = qr ? `${text}\n\nQuét mã QR bằng app ngân hàng để chuyển khoản:\n${qr.bankLine}` : text;
    for (const chat of chats) {
      out.push(await sendOnce(chat, { kind: 'remind_tuition', ref: `tuition:${r.student_id}:${dueKey.slice(0, 7)}:${phase}`, pref: 'tuition', text: body, photo: qr?.png }));
    }
  }
  return out;
}

// Bài nộp chờ chấm quá 2 ngày: báo giáo viên lớp, mỗi bài mỗi ngày một lần
async function remindGrading(now: Date): Promise<SendResult[]> {
  const today = todayKeyVN(now);
  const rows = await db.execute<{ assignment_id: number; title: string; class_id: number; class_name: string; waiting: number; speaking: number; oldest: Date }>(sql`
    SELECT a.id AS assignment_id, a.title, c.id AS class_id, c.name AS class_name, COUNT(*)::int AS waiting, MIN(sub.submitted_at) AS oldest,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM submission_item_scores sis JOIN assignment_items ai ON ai.id = sis.item_id
        WHERE sis.submission_id = sub.id AND sis.file_id IS NOT NULL AND ai.item_type::text LIKE 'speak_%'))::int AS speaking
    FROM assignment_submissions sub
    JOIN assignments a ON a.id = sub.assignment_id
    JOIN classes c ON c.id = a.class_id
    WHERE sub.status = 'submitted' AND sub.submitted_at < ${new Date(now.getTime() - 2 * 86_400_000)}
    GROUP BY a.id, a.title, c.id, c.name`);
  const out: SendResult[] = [];
  for (const r of rows.rows) {
    const link = appLink(`/bai-tap/${r.assignment_id}`);
    const lines = [
      `📝 NHẮC CHẤM BÀI`,
      `Lớp ${r.class_name}, bài "${r.title}": ${r.waiting} bài nộp đang chờ chấm quá 2 ngày${r.speaking > 0 ? ` (🎙️ ${r.speaking} bài có câu nói)` : ''}, bài sớm nhất nộp lúc ${vnDateTimeLabel(new Date(r.oldest))}.`,
      link ? `Mở màn chấm: ${link}` : '',
      '',
      'Phụ huynh nhận điểm qua Telegram ngay khi Thầy/Cô chấm xong.',
    ];
    const text = lines.filter((l, i) => l !== '' || lines[i - 1] !== '').join('\n');
    for (const chat of await staffChatsOfClass(r.class_id)) out.push(await sendOnce(chat, { kind: 'remind_grading', ref: `grading:${r.assignment_id}:${today}`, text }));
  }
  return out;
}

// Báo cáo tuần (Chủ nhật tối): chuyên cần, bài tập, điểm mới trong tuần và số buổi tuần tới
async function weeklyReport(now: Date): Promise<SendResult[]> {
  const settings = await getCenterSettings();
  if (!settings.notifyWeeklyReport) return [];
  const today = todayKeyVN(now);
  const monday = weekStartKey(today);
  const { start } = vnDayBounds(monday);
  const { start: nextMonday } = vnDayBounds(addDaysKey(monday, 7));
  const { start: nextNextMonday } = vnDayBounds(addDaysKey(monday, 14));
  const week = isoWeekKey(today);
  const kids = await db.execute<{
    id: number;
    full_name: string;
    class_name: string;
    present: number;
    late: number;
    absent: number;
    submitted: number;
    missing: number;
    next_sessions: number;
  }>(sql`
    SELECT s.id, s.full_name, c.name AS class_name,
      (SELECT COUNT(*)::int FROM attendance at WHERE at.student_id = s.id AND at.session_date >= ${monday}::date AND at.session_date <= ${today}::date AND at.mark = 'present') AS present,
      (SELECT COUNT(*)::int FROM attendance at WHERE at.student_id = s.id AND at.session_date >= ${monday}::date AND at.session_date <= ${today}::date AND at.mark = 'late') AS late,
      (SELECT COUNT(*)::int FROM attendance at WHERE at.student_id = s.id AND at.session_date >= ${monday}::date AND at.session_date <= ${today}::date AND at.mark = 'absent') AS absent,
      (SELECT COUNT(*)::int FROM assignment_submissions sub WHERE sub.student_id = s.id AND sub.submitted_at >= ${start} AND sub.submitted_at < ${nextMonday}) AS submitted,
      (SELECT COUNT(*)::int FROM assignments a LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
         WHERE a.class_id = c.id AND a.due_at >= ${start} AND a.due_at < ${nextMonday} AND COALESCE(sub.status, 'not_submitted') = 'not_submitted') AS missing,
      (SELECT COUNT(*)::int FROM class_sessions cs WHERE cs.class_id = c.id AND cs.status = 'planned' AND cs.starts_at >= ${nextMonday} AND cs.starts_at < ${nextNextMonday}) AS next_sessions
    FROM students s JOIN classes c ON c.id = s.class_id
    WHERE s.status IN ('active', 'trial')
      AND EXISTS (SELECT 1 FROM student_parents sp JOIN telegram_chats tc ON tc.parent_id = sp.parent_id AND tc.active = true WHERE sp.student_id = s.id)`);
  const out: SendResult[] = [];
  for (const k of kids.rows) {
    const scores = await db.execute<{ title: string; score: number | null; max_score: number }>(sql`
      SELECT a.title, sub.score, a.max_score FROM assignment_submissions sub JOIN assignments a ON a.id = sub.assignment_id
      WHERE sub.student_id = ${k.id} AND sub.status = 'graded' AND sub.updated_at >= ${start} AND sub.updated_at < ${nextMonday}
      ORDER BY sub.updated_at DESC LIMIT 5`);
    const lines = [
      `📋 BÁO CÁO TUẦN (${dateKeyLabel(monday)} – ${dateKeyLabel(today)})`,
      `Em ${k.full_name} · lớp ${k.class_name}`,
      '',
      `Chuyên cần: ${k.present} có mặt, ${k.late} đi trễ, ${k.absent} vắng`,
      `Bài tập: đã nộp ${k.submitted} bài${k.missing ? `, còn ${k.missing} bài chưa nộp` : ''}`,
    ];
    if (scores.rows.length) {
      lines.push('Điểm mới:');
      for (const s of scores.rows) lines.push(`  • ${s.title}: ${s.score ?? 0}/${s.max_score}`);
    }
    lines.push(`Tuần tới: ${k.next_sessions} buổi học. Gõ /lich để xem giờ học.`, '', '— ESL Center');
    for (const chat of await parentChatsOfStudent(k.id)) {
      out.push(await sendOnce(chat, { kind: 'weekly', ref: `weekly:${k.id}:${week}`, pref: 'weekly', text: lines.join('\n') }));
    }
  }
  return out;
}

// Báo cáo cuối ngày cho quản trị, mỗi ngày một lần
async function dailyReport(now: Date): Promise<SendResult[]> {
  const today = todayKeyVN(now);
  const out: SendResult[] = [];
  for (const chat of await adminChats()) {
    out.push(await sendOnce(chat, { kind: 'daily_report', ref: today, text: await dailyReportText(chat.accountId!, now) }));
  }
  return out;
}
