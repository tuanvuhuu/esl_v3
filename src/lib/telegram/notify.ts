// Thông báo Telegram khi có sự kiện trong app (docs/KICH-BAN-TELEGRAM.md mục 1.7, 2). Chỉ chạy trên server.
// Nơi gọi là server action sau khi việc chính đã lưu xong; gọi qua safely() để lỗi gửi không làm hỏng việc chính.
// Mỗi tin có mã sự kiện riêng nên lưu lại nhiều lần không gửi trùng (sendOnce).
import { createHash } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { studentParents, students, telegramChats } from '@/db/schema';
import { vnDateKey, vnDateTimeLabel } from '@/lib/datetime';
import { getCenterSettings } from '@/lib/queries/settings';
import { adminChats, parentChatsOfStudent, sendOnce, staffChatsOfClass, type Chat } from './core';
import { ABSENCE_STREAK, absenceStreak, clip, type NotifyKind } from './prefs';

const shortHash = (text: string) => createHash('sha1').update(text).digest('hex').slice(0, 10);

async function sendToParents(studentId: number, opts: { kind: string; ref: string; text: string; pref: NotifyKind; markup?: Record<string, unknown> }) {
  for (const chat of await parentChatsOfStudent(studentId)) await sendOnce(chat, opts);
}

// Học sinh đang học của lớp, kèm chat phụ huynh: dùng khi báo cả lớp (huỷ buổi, bài mới)
async function classParentChats(classId: number): Promise<{ studentId: number; studentName: string; chat: Chat }[]> {
  return db
    .select({ studentId: students.id, studentName: students.fullName, chat: telegramChats })
    .from(students)
    .innerJoin(studentParents, eq(studentParents.studentId, students.id))
    .innerJoin(telegramChats, and(eq(telegramChats.parentId, studentParents.parentId), eq(telegramChats.active, true)))
    .where(and(eq(students.classId, classId), inArray(students.status, ['active', 'trial'])));
}

// ---------- Điểm danh: báo vắng, trễ, sửa lại có mặt; cảnh báo vắng liên tiếp ----------

export async function notifyAttendance(sessionId: number, entries: { studentId: number; mark: 'present' | 'late' | 'absent' }[]): Promise<void> {
  const [session] = (
    await db.execute<{ starts_at: Date; class_id: number; class_name: string }>(sql`
      SELECT cs.starts_at, c.id AS class_id, c.name AS class_name FROM class_sessions cs JOIN classes c ON c.id = cs.class_id WHERE cs.id = ${sessionId}`)
  ).rows;
  if (!session) return;
  const when = vnDateTimeLabel(new Date(session.starts_at));
  const dateKey = vnDateKey(new Date(session.starts_at));
  const ids = entries.map((e) => e.studentId);
  if (ids.length === 0) return;
  const idList = `{${ids.join(',')}}`;

  const names = new Map(
    (await db.execute<{ id: number; full_name: string }>(sql`SELECT id, full_name FROM students WHERE id = ANY(${idList}::int[])`)).rows.map((r) => [r.id, r.full_name]),
  );
  // Vắng có đơn đã duyệt thì phụ huynh đã biết, không báo
  const excused = new Set(
    (
      await db.execute<{ student_id: number }>(sql`
        SELECT student_id FROM leave_requests WHERE session_id = ${sessionId} AND status = 'approved' AND student_id = ANY(${idList}::int[])`)
    ).rows.map((r) => r.student_id),
  );
  // Học sinh đã được báo vắng hoặc trễ trong ngày này: nếu sửa thành có mặt thì báo cập nhật
  const warned = new Set(
    (
      await db.execute<{ ref_key: string }>(sql`
        SELECT DISTINCT ref_key FROM telegram_notification_log WHERE kind = 'absence' AND ref_key LIKE ${`att:%:${dateKey}:%`}`)
    ).rows.map((r) => r.ref_key.split(':')[1]),
  );

  for (const e of entries) {
    const name = names.get(e.studentId) ?? '';
    const ref = `att:${e.studentId}:${dateKey}:${e.mark}`;
    if (e.mark === 'absent' && !excused.has(e.studentId)) {
      await sendToParents(e.studentId, {
        kind: 'absence',
        ref,
        pref: 'absence',
        text: `⚠️ Em ${name} VẮNG buổi học lớp ${session.class_name} lúc ${when}.\n\nNếu có nhầm lẫn hoặc con nghỉ có lý do, Quý phụ huynh nhắn lại ngay tại đây để Thầy/Cô nắm.\n\n— ESL Center`,
      });
    } else if (e.mark === 'late') {
      await sendToParents(e.studentId, {
        kind: 'absence',
        ref,
        pref: 'absence',
        text: `⏰ Em ${name} đến lớp TRỄ buổi học lớp ${session.class_name} lúc ${when}. Quý phụ huynh giúp con đến đúng giờ ở buổi sau nhé.\n\n— ESL Center`,
      });
    } else if (e.mark === 'present' && warned.has(String(e.studentId))) {
      await sendToParents(e.studentId, {
        kind: 'absence',
        ref,
        pref: 'absence',
        text: `Cập nhật điểm danh: em ${name} CÓ MẶT buổi học lớp ${session.class_name} lúc ${when}. Xin lỗi Quý phụ huynh vì báo nhầm trước đó.\n\n— ESL Center`,
      });
    }
  }

  const absent = entries.filter((e) => e.mark === 'absent').map((e) => e.studentId);
  if (absent.length > 0) await alertAbsenceStreaks(session.class_id, session.class_name, absent, names);
}

// Học sinh vắng ABSENCE_STREAK buổi liên tiếp gần nhất: báo giáo viên lớp và quản trị, một lần cho mỗi chuỗi vắng
async function alertAbsenceStreaks(classId: number, className: string, studentIds: number[], names: Map<number, string>): Promise<void> {
  const settings = await getCenterSettings();
  if (!settings.notifyAbsentAlert) return;
  const recipients = [...(await staffChatsOfClass(classId)), ...(await adminChats())];
  const seen = new Set<number>();
  const uniqueRecipients = recipients.filter((c) => (seen.has(c.chatId) ? false : (seen.add(c.chatId), true)));
  if (uniqueRecipients.length === 0) return;
  for (const studentId of studentIds) {
    const marks = (
      await db.execute<{ mark: string; session_date: string }>(sql`
        SELECT mark, session_date::text FROM attendance WHERE student_id = ${studentId} ORDER BY session_date DESC LIMIT 10`)
    ).rows;
    const streak = absenceStreak(marks.map((m) => m.mark));
    if (streak < ABSENCE_STREAK) continue;
    // Mã chuỗi: ngày bắt đầu chuỗi vắng, để vắng thêm buổi thứ 4, 5 không báo lại
    const firstDay = marks[streak - 1].session_date;
    const text = `🚨 CẢNH BÁO VẮNG NHIỀU\nEm ${names.get(studentId) ?? ''} (lớp ${className}) đã vắng ${streak} buổi liên tiếp, từ ngày ${firstDay}.\n\nThầy/Cô vui lòng gọi điện hỏi thăm phụ huynh.`;
    for (const chat of uniqueRecipients) await sendOnce(chat, { kind: 'absent_alert', ref: `streak:${studentId}:${firstDay}`, text });
  }
}

// ---------- Lịch học: huỷ, khôi phục, đổi giờ hoặc phòng ----------

type SessionInfo = { id: number; class_id: number; class_name: string; starts_at: Date; room: string; teacher_id: number | null; cancel_reason: string; updated_at: Date };

async function sessionInfo(sessionId: number): Promise<SessionInfo | null> {
  const [row] = (
    await db.execute<SessionInfo>(sql`
      SELECT cs.id, cs.class_id, c.name AS class_name, cs.starts_at, cs.room, cs.teacher_id, cs.cancel_reason, cs.updated_at
      FROM class_sessions cs JOIN classes c ON c.id = cs.class_id WHERE cs.id = ${sessionId}`)
  ).rows;
  return row ?? null;
}

async function broadcastSession(s: SessionInfo, kind: string, ref: string, parentText: (studentName: string) => string, staffText: string, extraTeacherIds: number[]) {
  for (const r of await classParentChats(s.class_id)) {
    await sendOnce(r.chat, { kind, ref: `${ref}:hs:${r.studentId}`, pref: 'session_change', text: parentText(r.studentName) });
  }
  for (const chat of await staffChatsOfClass(s.class_id, extraTeacherIds)) await sendOnce(chat, { kind, ref, text: staffText });
}

export async function notifySessionCancelled(sessionId: number): Promise<void> {
  const s = await sessionInfo(sessionId);
  if (!s || new Date(s.starts_at).getTime() < Date.now()) return;
  const when = vnDateTimeLabel(new Date(s.starts_at));
  const reason = s.cancel_reason ? `\nLý do: ${s.cancel_reason}` : '';
  await broadcastSession(
    s,
    'session_change',
    `cancel:${s.id}:${new Date(s.updated_at).getTime()}`,
    (name) => `📌 THÔNG BÁO HUỶ BUỔI HỌC\nBuổi học lớp ${s.class_name} lúc ${when} của em ${name} được NGHỈ.${reason}\n\nTrung tâm sẽ báo lịch học bù (nếu có). Xin lỗi Quý phụ huynh vì sự bất tiện.\n\n— ESL Center`,
    `📌 Buổi lớp ${s.class_name} lúc ${when} đã bị huỷ.${reason}`,
    s.teacher_id ? [s.teacher_id] : [],
  );
}

export async function notifySessionRestored(sessionId: number): Promise<void> {
  const s = await sessionInfo(sessionId);
  if (!s || new Date(s.starts_at).getTime() < Date.now()) return;
  const when = vnDateTimeLabel(new Date(s.starts_at));
  await broadcastSession(
    s,
    'session_change',
    `restore:${s.id}:${new Date(s.updated_at).getTime()}`,
    (name) => `📌 Buổi học lớp ${s.class_name} lúc ${when} của em ${name} được HỌC LẠI như lịch cũ${s.room ? ` (phòng ${s.room})` : ''}.\n\n— ESL Center`,
    `📌 Buổi lớp ${s.class_name} lúc ${when} được khôi phục, học như lịch cũ.`,
    s.teacher_id ? [s.teacher_id] : [],
  );
}

// Đổi giờ hoặc phòng của buổi chưa học trong 14 ngày tới. Đổi giáo viên thì báo cả giáo viên cũ và mới.
export async function notifySessionChanged(sessionId: number, before: { startsAt: Date; room: string; teacherId: number | null }): Promise<void> {
  const s = await sessionInfo(sessionId);
  if (!s) return;
  const startsAt = new Date(s.starts_at);
  const timeChanged = startsAt.getTime() !== before.startsAt.getTime();
  const roomChanged = s.room !== before.room;
  const teacherChanged = s.teacher_id !== before.teacherId;
  if (!timeChanged && !roomChanged && !teacherChanged) return;
  if (startsAt.getTime() < Date.now() || startsAt.getTime() > Date.now() + 14 * 86_400_000) return;

  const changes: string[] = [];
  if (timeChanged) changes.push(`Giờ học: ${vnDateTimeLabel(before.startsAt)} → ${vnDateTimeLabel(startsAt)}`);
  if (roomChanged) changes.push(`Phòng: ${before.room || 'chưa xếp'} → ${s.room || 'chưa xếp'}`);
  const ref = `change:${s.id}:${startsAt.getTime()}:${s.room}:${s.teacher_id ?? 0}`;
  const teacherIds = [before.teacherId, s.teacher_id].filter((t): t is number => t !== null);

  if (timeChanged || roomChanged) {
    await broadcastSession(
      s,
      'session_change',
      ref,
      (name) => `📌 THAY ĐỔI LỊCH HỌC\nBuổi học lớp ${s.class_name} của em ${name}:\n${changes.join('\n')}\n\nQuý phụ huynh lưu ý giúp con nhé.\n\n— ESL Center`,
      `📌 Lịch buổi lớp ${s.class_name} thay đổi:\n${changes.join('\n')}`,
      teacherIds,
    );
  } else {
    for (const chat of await staffChatsOfClass(s.class_id, teacherIds)) {
      await sendOnce(chat, { kind: 'session_change', ref, text: `📌 Buổi lớp ${s.class_name} lúc ${vnDateTimeLabel(startsAt)} đổi giáo viên dạy. Thầy/Cô kiểm tra lịch dạy.` });
    }
  }
}

// ---------- Bài tập: giao bài mới, học sinh nộp, có điểm ----------

export async function notifyAssignmentCreated(assignmentId: number): Promise<void> {
  const [a] = (
    await db.execute<{ id: number; title: string; description: string; due_at: Date; class_id: number; class_name: string }>(sql`
      SELECT a.id, a.title, a.description, a.due_at, c.id AS class_id, c.name AS class_name
      FROM assignments a JOIN classes c ON c.id = a.class_id WHERE a.id = ${assignmentId}`)
  ).rows;
  if (!a) return;
  const desc = a.description?.trim() ? `\n${clip(a.description, 300)}` : '';
  for (const r of await classParentChats(a.class_id)) {
    await sendOnce(r.chat, {
      kind: 'homework_new',
      ref: `hw_new:${a.id}:hs:${r.studentId}`,
      pref: 'homework',
      text: `📚 BÀI TẬP MỚI cho em ${r.studentName} (lớp ${a.class_name})\n"${a.title}"${desc}\n\nHạn nộp: ${vnDateTimeLabel(new Date(a.due_at))}\nCon làm bài ở mục "Bài của tôi" trên app. Gõ /baitap để xem các bài chưa nộp.\n\n— ESL Center`,
    });
  }
}

export async function notifyStudentSubmitted(assignmentId: number, studentId: number, scoreLine: string): Promise<void> {
  const [row] = (
    await db.execute<{ title: string; student_name: string; submitted_at: Date | null }>(sql`
      SELECT a.title, s.full_name AS student_name, sub.submitted_at
      FROM assignments a JOIN students s ON s.id = ${studentId}
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
      WHERE a.id = ${assignmentId}`)
  ).rows;
  if (!row) return;
  const at = row.submitted_at ? new Date(row.submitted_at) : new Date();
  await sendToParents(studentId, {
    kind: 'homework_submitted',
    ref: `submitted:${assignmentId}:${studentId}:${at.getTime()}`,
    pref: 'homework',
    text: `✅ Em ${row.student_name} đã nộp bài "${row.title}" lúc ${vnDateTimeLabel(at)}.${scoreLine ? `\n${scoreLine}` : ''}\n\n— ESL Center`,
  });
}

// Giáo viên chấm xong một bài. Bài chưa chấm hết (status khác graded) thì nơi gọi không gọi hàm này.
export async function notifyGraded(assignmentId: number, studentId: number, result: { score: number; max: number; feedback: string }): Promise<void> {
  const [row] = (
    await db.execute<{ title: string; student_name: string; class_name: string }>(sql`
      SELECT a.title, s.full_name AS student_name, c.name AS class_name
      FROM assignments a JOIN classes c ON c.id = a.class_id JOIN students s ON s.id = ${studentId}
      WHERE a.id = ${assignmentId}`)
  ).rows;
  if (!row) return;
  const feedback = result.feedback.trim() ? `\nNhận xét của Thầy/Cô: "${clip(result.feedback, 600)}"` : '';
  await sendToParents(studentId, {
    kind: 'score',
    ref: `score:${assignmentId}:${studentId}:${result.score}:${shortHash(result.feedback)}`,
    pref: 'score',
    text: `📊 ĐIỂM MỚI của em ${row.student_name} (lớp ${row.class_name})\nBài "${row.title}": ${result.score}/${result.max} điểm.${feedback}\n\nGõ /diem để xem các bài đã chấm gần đây.\n\n— ESL Center`,
  });
}
