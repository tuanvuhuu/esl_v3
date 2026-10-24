// Tin nhận xét bài nói gửi phụ huynh qua Telegram (35.11). Hàm thuần: dựng chữ từ tiêu chí, lời khen, lỗi theo mốc giây.
// Trẻ nhỏ (thang sao) chỉ nêu 2 lỗi quan trọng nhất, cùng quy tắc với màn của học sinh (35.9).
import { formatMs, SCALE_CRITERIA, SPEAKING_CRITERIA, SPEAKING_ERRORS, topMarks, type SpeakingCriterion, type SpeakingMark, type SpeakingScale } from '@/lib/speaking';

export type SpeakingItemFeedback = {
  position: number;
  referenceText: string;
  scale: SpeakingScale | null; // chưa chấm tiêu chí thì null
  scores: Partial<Record<SpeakingCriterion, number>>;
  praise: string;
  marks: SpeakingMark[];
  hasModel: boolean; // có giọng mẫu của giáo viên gửi kèm
};

const stars = (n: number) => '⭐'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, 3 - n));

function scoreLine(scale: SpeakingScale, scores: SpeakingItemFeedback['scores']): string {
  return SCALE_CRITERIA[scale]
    .filter((k) => scores[k] !== undefined && scores[k] !== null)
    .map((k) => `${SPEAKING_CRITERIA[k]} ${scale === 'stars' ? stars(scores[k]!) : `${scores[k]}/5`}`)
    .join(' · ');
}

// Câu nào chưa có lời khen, điểm tiêu chí và lỗi đánh dấu thì không có gì để gửi
export function hasSpeakingFeedback(items: SpeakingItemFeedback[]): boolean {
  return items.some((i) => i.praise.trim() || i.scale || i.marks.length > 0);
}

export function speakingFeedbackText(input: { studentName: string; className: string; title: string; signature: string; items: SpeakingItemFeedback[] }): string {
  const lines = [`🎙️ NHẬN XÉT BÀI NÓI của em ${input.studentName} (lớp ${input.className})`, `Bài "${input.title}"`];
  for (const it of input.items) {
    if (!it.praise.trim() && !it.scale && it.marks.length === 0) continue;
    lines.push('', `Câu ${it.position}${it.referenceText ? `: "${it.referenceText}"` : ''}`);
    if (it.praise.trim()) lines.push(`👍 Điều con làm tốt: ${it.praise.trim()}`);
    if (it.scale) {
      const s = scoreLine(it.scale, it.scores);
      if (s) lines.push(s);
    }
    const shown = it.scale === 'points' ? it.marks : topMarks(it.marks, 2);
    if (shown.length > 0) {
      lines.push('Cần luyện thêm:');
      for (const m of [...shown].sort((a, b) => a.atMs - b.atMs)) {
        const fix = m.correctText ? `, nói đúng: "${m.correctText}"` : '';
        const note = m.note ? ` (${m.note})` : '';
        lines.push(`  • ${SPEAKING_ERRORS[m.errorType]} ở giây ${formatMs(m.atMs)}${fix}${note}`);
      }
      if (shown.length < it.marks.length) lines.push(`  (Thầy/Cô nêu ${shown.length} lỗi quan trọng nhất để con dễ nhớ.)`);
    }
    if (it.marks.some((m) => m.redo)) lines.push('🔁 Thầy/Cô đề nghị con nói lại câu này trong bài (mở khu học sinh).');
    if (it.hasModel) lines.push('🔊 Giọng mẫu của Thầy/Cô gửi kèm bên dưới.');
  }
  lines.push('', 'Gõ /nhanxet để xem lại nhận xét bài nói gần đây.', input.signature);
  return lines.join('\n');
}
