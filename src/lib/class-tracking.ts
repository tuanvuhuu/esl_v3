// Bảng theo dõi lớp (35.20): gom em nào chưa làm bài, câu cả lớp hay sai, bài nói chờ chấm. Logic thuần, không đụng DB.
import { itemPoints, isAutoScoredItem, type ScoringAnswer, type ScoringItem } from '@/lib/assignment-scoring';

export const SPEAKING_WAIT_DAYS = 2; // bài nói chờ quá số ngày này thì tô đỏ, bot nhắc giáo viên

// ---------- Em nào chưa làm ----------
export type MissingRow = { studentId: number; fullName: string; assignmentId: number; title: string; dueAt: Date };
export type MissingStudent = { studentId: number; fullName: string; assignments: { id: number; title: string; dueAt: Date; overdue: boolean }[] };

// Gom theo học sinh: em thiếu nhiều bài trước, cùng số bài thì theo tên; trong mỗi em, bài hạn sớm trước
export function missingByStudent(rows: MissingRow[], now: Date): MissingStudent[] {
  const map = new Map<number, MissingStudent>();
  for (const r of rows) {
    const s = map.get(r.studentId) ?? { studentId: r.studentId, fullName: r.fullName, assignments: [] };
    s.assignments.push({ id: r.assignmentId, title: r.title, dueAt: r.dueAt, overdue: r.dueAt.getTime() < now.getTime() });
    map.set(r.studentId, s);
  }
  return [...map.values()]
    .map((s) => ({ ...s, assignments: s.assignments.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()) }))
    .sort((a, b) => b.assignments.length - a.assignments.length || a.fullName.localeCompare(b.fullName, 'vi'));
}

// ---------- Câu cả lớp hay sai (chỉ câu tự chấm) ----------
export type TrackedItem = ScoringItem & { assignmentId: number; assignmentTitle: string };
export type HardQuestion = { itemId: number; assignmentId: number; assignmentTitle: string; prompt: string; answer: string; answered: number; wrong: number };

// Đáp án đúng để giáo viên nhìn là biết lớp sai chỗ nào
export function correctAnswerText(item: ScoringItem): string {
  const correct = item.options.filter((o) => o.isCorrect).map((o) => o.label);
  if (item.itemType === 'choice' || item.itemType === 'picture_choice') return correct.join(', ');
  if (item.itemType === 'gap_fill') return (item.referenceText ?? '').split(/[|,]/)[0]?.trim() || correct[0] || '';
  if (item.itemType === 'order') return item.referenceText ?? '';
  if (item.itemType === 'match') return (item.pairs ?? []).map((p) => `${p.leftLabel} – ${p.rightLabel}`).join(' · ');
  return '';
}

// answers: đáp án của các bài đã nộp (mỗi phần tử một bài nộp). Câu chưa trả lời trong bài đã nộp tính là sai.
export function hardQuestions(items: TrackedItem[], submissions: { assignmentId: number; answers: ScoringAnswer[] }[], limit = 5): HardQuestion[] {
  const stats = new Map<number, { answered: number; wrong: number }>();
  for (const sub of submissions) {
    for (const item of items) {
      if (item.assignmentId !== sub.assignmentId || !isAutoScoredItem(item.itemType)) continue;
      const got = itemPoints(item, sub.answers.find((a) => a.itemId === item.id)) ?? 0;
      const st = stats.get(item.id) ?? { answered: 0, wrong: 0 };
      st.answered += 1;
      if (got < item.points) st.wrong += 1;
      stats.set(item.id, st);
    }
  }
  return items
    .filter((i) => (stats.get(i.id)?.wrong ?? 0) > 0)
    .map((i) => ({ itemId: i.id, assignmentId: i.assignmentId, assignmentTitle: i.assignmentTitle, prompt: i.prompt ?? '', answer: correctAnswerText(i), ...stats.get(i.id)! }))
    .sort((a, b) => b.wrong / b.answered - a.wrong / a.answered || b.wrong - a.wrong)
    .slice(0, limit);
}

// ---------- Bài nói chờ chấm ----------
export function waitingDays(submittedAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - submittedAt.getTime()) / 86_400_000));
}
