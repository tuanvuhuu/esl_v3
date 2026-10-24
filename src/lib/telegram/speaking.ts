// Gửi nhận xét bài nói cho phụ huynh qua Telegram (35.11): chữ ký giáo viên, giọng mẫu gửi kèm, bản sao cho super admin
// (như tin giáo viên gửi phụ huynh ở P34.13). /nhanxet của bot đọc cùng dữ liệu này. Chỉ chạy trên server.
import { createHash } from 'node:crypto';
import { and, asc, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { accounts, assignmentItems, assignments, assignmentSubmissions, classes, speakingAssessments, speakingFeedback, students, teachers } from '@/db/schema';
import { hasSpeakingFeedback, speakingFeedbackText, type SpeakingItemFeedback } from '@/lib/speaking-message';
import { SCALE_CRITERIA, isSpeakingError, type SpeakingCriterion, type SpeakingMark, type SpeakingScale } from '@/lib/speaking';
import { readUpload } from '@/lib/storage';
import { adminChats, parentChatsOfStudent, sendOnce, type AudioFile } from './core';

type Loaded = { studentId: number; studentName: string; className: string; title: string; items: SpeakingItemFeedback[]; models: { fileId: number; position: number }[] };

// Nhận xét bài nói của một bài nộp: câu nói theo thứ tự, tiêu chí, lời khen, lỗi, giọng mẫu (của câu hoặc của từng lỗi)
export async function loadSpeakingFeedback(submissionId: number): Promise<Loaded | null> {
  const [head] = await db
    .select({ assignmentId: assignmentSubmissions.assignmentId, studentId: students.id, studentName: students.fullName, className: classes.name, title: assignments.title })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
    .where(eq(assignmentSubmissions.id, submissionId))
    .limit(1);
  if (!head) return null;
  const items = (
    await db
      .select({ id: assignmentItems.id, itemType: assignmentItems.itemType, referenceText: assignmentItems.referenceText, modelAudioFileId: assignmentItems.modelAudioFileId })
      .from(assignmentItems)
      .where(eq(assignmentItems.assignmentId, head.assignmentId))
      .orderBy(asc(assignmentItems.position), asc(assignmentItems.id))
  ).filter((i) => i.itemType.startsWith('speak_'));
  if (items.length === 0) return { ...head, items: [], models: [] };
  const [assessed, marks] = await Promise.all([
    db.select().from(speakingAssessments).where(eq(speakingAssessments.submissionId, submissionId)),
    db.select().from(speakingFeedback).where(eq(speakingFeedback.submissionId, submissionId)).orderBy(asc(speakingFeedback.atMs)),
  ]);
  const models: Loaded['models'] = [];
  const out = items.map((it, idx): SpeakingItemFeedback => {
    const a = assessed.find((x) => x.itemId === it.id);
    const scale = (a?.scale ?? null) as SpeakingScale | null;
    const scores: Partial<Record<SpeakingCriterion, number>> = {};
    if (a && scale) for (const k of SCALE_CRITERIA[scale]) if (a[k] !== null) scores[k] = a[k]!;
    const itemMarks: SpeakingMark[] = marks
      .filter((m) => m.itemId === it.id && isSpeakingError(m.errorType))
      .map((m) => ({ id: m.id, itemId: m.itemId, atMs: m.atMs, errorType: m.errorType as SpeakingMark['errorType'], correctText: m.correctText, note: m.note, redo: m.redo, modelFileId: m.modelFileId }));
    const fileIds = [...new Set([it.modelAudioFileId, ...itemMarks.map((m) => m.modelFileId)].filter((x): x is number => x !== null))];
    for (const fileId of fileIds) models.push({ fileId, position: idx + 1 });
    return { position: idx + 1, referenceText: it.referenceText, scale, scores, praise: a?.praise ?? '', marks: itemMarks, hasModel: fileIds.length > 0 };
  });
  return { ...head, items: out, models };
}

// Chữ ký giáo viên kèm lớp (giống tin giáo viên gửi phụ huynh, P34.12)
async function signatureOf(accountId: number, className: string): Promise<{ text: string; name: string }> {
  const [acc] = await db.select({ fullName: accounts.fullName, teacherName: teachers.name }).from(accounts).leftJoin(teachers, eq(teachers.id, accounts.teacherId)).where(eq(accounts.id, accountId)).limit(1);
  if (!acc) return { text: '— ESL Center', name: 'ESL Center' };
  if (acc.teacherName) return { text: `— Thầy/Cô ${acc.teacherName}, GV lớp ${className}`, name: acc.teacherName };
  return { text: `— ${acc.fullName}, ESL Center`, name: acc.fullName };
}

const shortHash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 10);

export type SpeakingSendResult = { status: 'sent'; chats: number } | { status: 'no_parent' } | { status: 'nothing' } | { status: 'unchanged' };

// Gửi cho mọi phụ huynh đã kết nối của học sinh. Cùng nội dung đã gửi thì không gửi lại; sửa nhận xét rồi gửi thì gửi bản mới.
export async function sendSpeakingFeedback(submissionId: number, accountId: number): Promise<SpeakingSendResult> {
  const data = await loadSpeakingFeedback(submissionId);
  if (!data || !hasSpeakingFeedback(data.items)) return { status: 'nothing' };
  const chats = await parentChatsOfStudent(data.studentId);
  if (chats.length === 0) return { status: 'no_parent' };
  const sign = await signatureOf(accountId, data.className);
  // Đọc trước giọng mẫu: tin chữ chỉ báo "gửi kèm" ở câu có tệp đọc được
  const audios: { fileId: number; position: number; file: AudioFile }[] = [];
  for (const m of data.models) {
    const f = await readUpload(m.fileId);
    if (f) audios.push({ ...m, file: { bytes: f.bytes, name: f.originalName, mime: f.mimeType } });
  }
  const items = data.items.map((it) => ({ ...it, hasModel: audios.some((a) => a.position === it.position) }));
  const text = speakingFeedbackText({ studentName: data.studentName, className: data.className, title: data.title, signature: sign.text, items });
  const ref = `speaking:${submissionId}:${shortHash(text)}`;
  let sent = 0;
  for (const chat of chats) {
    if ((await sendOnce(chat, { kind: 'speaking_feedback', ref, text, sentByAccountId: accountId })) !== 'skipped') sent += 1;
  }
  if (sent === 0) return { status: 'unchanged' };
  // Giọng mẫu gửi sau tin chữ, mỗi tệp một lần cho mỗi phụ huynh
  for (const a of audios) {
    for (const chat of chats) {
      await sendOnce(chat, {
        kind: 'speaking_model',
        ref: `speaking-model:${submissionId}:${a.fileId}`,
        text: `🔊 Giọng mẫu câu ${a.position} của Thầy/Cô ${sign.name} (bài "${data.title}")`,
        audio: a.file,
        sentByAccountId: accountId,
      });
    }
  }
  // Bản sao cho super admin (P34.13), trừ chính người gửi; lưu lại như mọi tin đi
  const copy = `📋 BẢN SAO: ${sign.name} gửi nhận xét bài nói cho phụ huynh em ${data.studentName} (lớp ${data.className})\n\n${text}`;
  for (const admin of await adminChats()) {
    if (admin.accountId === accountId) continue;
    await sendOnce(admin, { kind: 'speaking_copy', ref, text: copy, sentByAccountId: accountId });
  }
  return { status: 'sent', chats: sent };
}

// /nhanxet: nhận xét bài nói gần nhất của từng con (tối đa 2 bài mỗi con)
export async function speakingFeedbackForParent(kids: { id: number; full_name: string }[]): Promise<string> {
  if (kids.length === 0) return 'Chưa có học sinh nào gắn với phụ huynh này.';
  const blocks: string[] = [];
  for (const kid of kids) {
    const subs = await db
      .selectDistinct({ id: assignmentSubmissions.id, updatedAt: assignmentSubmissions.updatedAt })
      .from(assignmentSubmissions)
      .innerJoin(speakingAssessments, eq(speakingAssessments.submissionId, assignmentSubmissions.id))
      .where(and(eq(assignmentSubmissions.studentId, kid.id), isNotNull(speakingAssessments.scale)))
      .orderBy(desc(assignmentSubmissions.updatedAt))
      .limit(2);
    const marked = subs.length > 0 ? [] : await db.selectDistinct({ id: speakingFeedback.submissionId }).from(speakingFeedback).innerJoin(assignmentSubmissions, eq(assignmentSubmissions.id, speakingFeedback.submissionId)).where(eq(assignmentSubmissions.studentId, kid.id)).limit(2);
    const ids = [...subs.map((s) => s.id), ...marked.map((m) => m.id)];
    if (ids.length === 0) {
      blocks.push(`${kid.full_name}: chưa có bài nói nào được Thầy/Cô nhận xét.`);
      continue;
    }
    for (const id of ids) {
      const data = await loadSpeakingFeedback(id);
      if (!data || !hasSpeakingFeedback(data.items)) continue;
      blocks.push(speakingFeedbackText({ studentName: data.studentName, className: data.className, title: data.title, signature: '— ESL Center', items: data.items }).replace('\n\nGõ /nhanxet để xem lại nhận xét bài nói gần đây.', ''));
    }
  }
  return blocks.length > 0 ? blocks.join('\n\n────────\n\n') : 'Chưa có bài nói nào được Thầy/Cô nhận xét.';
}

