// Khảo sát hài lòng cuối khoá qua bot (37.14). Chỉ chạy trên server.
// Câu 1: mức hài lòng 1–5 sao (sv:<dòng>:<sao>). Câu 2: có học tiếp khoá sau không (svc:<dòng>:yes|maybe|no).
// Mọi nút kiểm lại dòng khảo sát thuộc đúng phụ huynh của chat đang bấm.
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, courseSurveys, studentParents, students, telegramChats } from '@/db/schema';
import { chatAllowed, sendAndRecord, sendCopyToSuperAdmins, type Chat } from './core';

export const SURVEY_CONTINUE_LABELS = { yes: 'Có, học tiếp', maybe: 'Chưa chắc', no: 'Không' } as const;
type ContinueChoice = keyof typeof SURVEY_CONTINUE_LABELS;

const stars = (n: number) => '⭐'.repeat(n);

function scoreKeyboard(rowId: number) {
  return {
    inline_keyboard: [
      [1, 2, 3].map((n) => ({ text: `${n} ⭐`, callback_data: `sv:${rowId}:${n}` })),
      [4, 5].map((n) => ({ text: `${n} ⭐`, callback_data: `sv:${rowId}:${n}` })),
    ],
  };
}

function continueKeyboard(rowId: number) {
  return {
    inline_keyboard: [(Object.keys(SURVEY_CONTINUE_LABELS) as ContinueChoice[]).map((c) => ({ text: SURVEY_CONTINUE_LABELS[c], callback_data: `svc:${rowId}:${c}` }))],
  };
}

export type SurveySendSummary = { students: number; chats: number; delivered: number; alreadySent: number };

// Gửi khảo sát cho phụ huynh đã kết nối Telegram của các học sinh đang học hoặc học thử của lớp.
// Phụ huynh đã được gửi khảo sát của lớp này thì bỏ qua (mỗi khoá hỏi một lần).
export async function sendCourseSurvey(classId: number, sentByAccountId: number | null): Promise<SurveySendSummary> {
  const [cls] = await db.select({ name: classes.name, course: classes.course }).from(classes).where(eq(classes.id, classId)).limit(1);
  if (!cls) return { students: 0, chats: 0, delivered: 0, alreadySent: 0 };
  const rows = await db
    .select({ studentId: students.id, studentName: students.fullName, parentId: studentParents.parentId, chat: telegramChats })
    .from(students)
    .innerJoin(studentParents, eq(studentParents.studentId, students.id))
    .innerJoin(telegramChats, and(eq(telegramChats.parentId, studentParents.parentId), eq(telegramChats.active, true)))
    .where(and(eq(students.classId, classId), sql`${students.status} IN ('active', 'trial')`));

  const summary: SurveySendSummary = { students: new Set(rows.map((r) => r.studentId)).size, chats: 0, delivered: 0, alreadySent: 0 };
  for (const r of rows) {
    if (!chatAllowed(r.chat.chatId)) continue;
    const [row] = await db
      .insert(courseSurveys)
      .values({ classId, studentId: r.studentId, parentId: r.parentId, sentByAccountId })
      .onConflictDoNothing()
      .returning({ id: courseSurveys.id });
    if (!row) {
      summary.alreadySent += 1;
      continue;
    }
    summary.chats += 1;
    const text = `🌟 KHẢO SÁT CUỐI KHOÁ\nLớp ${cls.name} (${cls.course}) đã kết thúc khoá học.\n\nQuý phụ huynh hài lòng thế nào với việc học của em ${r.studentName} tại trung tâm? Bấm số sao bên dưới (5 sao là rất hài lòng).\n\n— ESL Center`;
    if (await sendAndRecord(r.chat, text, 'survey', sentByAccountId, scoreKeyboard(row.id))) summary.delivered += 1;
  }
  return summary;
}

// Việc tự động: lớp vừa học xong buổi cuối trong 3 ngày qua (không còn buổi nào chưa học) và chưa gửi khảo sát
export async function autoCourseSurveys(now: Date): Promise<number> {
  const due = await db.execute<{ id: number }>(sql`
    SELECT c.id FROM classes c
    WHERE EXISTS (SELECT 1 FROM class_sessions cs WHERE cs.class_id = c.id AND cs.status <> 'cancelled'
                  AND cs.ends_at <= ${now} AND cs.ends_at > ${new Date(now.getTime() - 3 * 86_400_000)})
      AND NOT EXISTS (SELECT 1 FROM class_sessions cs WHERE cs.class_id = c.id AND cs.status <> 'cancelled' AND cs.ends_at > ${now})
      AND NOT EXISTS (SELECT 1 FROM course_surveys sv WHERE sv.class_id = c.id)`);
  let delivered = 0;
  for (const c of due.rows) delivered += (await sendCourseSurvey(Number(c.id), null)).delivered;
  return delivered;
}

async function surveyOf(chat: Chat, rowId: number) {
  if (!chat.parentId || !Number.isInteger(rowId)) return null;
  const [row] = await db
    .select({ id: courseSurveys.id, score: courseSurveys.score, studentName: students.fullName, className: classes.name })
    .from(courseSurveys)
    .innerJoin(students, eq(students.id, courseSurveys.studentId))
    .innerJoin(classes, eq(classes.id, courseSurveys.classId))
    .where(and(eq(courseSurveys.id, rowId), eq(courseSurveys.parentId, chat.parentId)))
    .limit(1);
  return row ?? null;
}

// Phụ huynh bấm số sao: lưu (bấm lại thì sửa), hỏi tiếp câu học khoá sau. 1–3 sao thì báo quản trị để liên hệ sớm.
export async function answerSurveyScore(chat: Chat, rowId: number, score: number): Promise<string> {
  const row = await surveyOf(chat, rowId);
  if (!row || !Number.isInteger(score) || score < 1 || score > 5) return 'Nút này không còn dùng được.';
  await db.update(courseSurveys).set({ score, answeredAt: new Date(), updatedAt: new Date() }).where(eq(courseSurveys.id, row.id));
  await sendAndRecord(chat, `Cảm ơn Quý phụ huynh đã chấm ${stars(score)} cho khoá học của em ${row.studentName}.\n\nQuý phụ huynh có cho em tiếp tục học khoá sau tại trung tâm không?`, 'survey', null, continueKeyboard(row.id));
  if (score <= 3) await sendCopyToSuperAdmins(`⚠️ Khảo sát cuối khoá: phụ huynh em ${row.studentName} (lớp ${row.className}) chấm ${score}/5 sao. Trung tâm nên liên hệ sớm.`);
  return `Đã ghi ${score} sao`;
}

// Phụ huynh chọn có học tiếp không: lưu và cảm ơn. Góp ý thêm thì nhắn thẳng vào bot (vào màn Tin nhắn của trung tâm).
export async function answerSurveyContinue(chat: Chat, rowId: number, choice: string): Promise<string> {
  const row = await surveyOf(chat, rowId);
  if (!row || !(choice in SURVEY_CONTINUE_LABELS)) return 'Nút này không còn dùng được.';
  await db.update(courseSurveys).set({ continueChoice: choice as ContinueChoice, updatedAt: new Date() }).where(eq(courseSurveys.id, row.id));
  const tail = choice === 'yes' ? 'Trung tâm sẽ báo lịch khoá tiếp theo sớm.' : 'Trung tâm rất mong được tiếp tục đồng hành cùng em.';
  await sendAndRecord(chat, `Trung tâm đã ghi nhận. ${tail}\n\nQuý phụ huynh có góp ý gì thêm, cứ nhắn trực tiếp vào đây, Thầy/Cô sẽ đọc và trả lời.`, 'survey', null);
  return 'Đã ghi nhận';
}
