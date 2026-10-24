import { describe, expect, it } from 'vitest';
import { hasSpeakingFeedback, speakingFeedbackText, type SpeakingItemFeedback } from '@/lib/speaking-message';
import type { SpeakingMark } from '@/lib/speaking';

const mark = (atMs: number, errorType: SpeakingMark['errorType'], extra: Partial<SpeakingMark> = {}): SpeakingMark => ({ id: atMs, itemId: 1, atMs, errorType, correctText: '', note: '', redo: false, modelFileId: null, ...extra });
const base: SpeakingItemFeedback = { position: 1, referenceText: 'I have three cats.', scale: 'stars', scores: { pronunciation: 2, fluency: 3, task: 3 }, praise: 'Con nói to, rõ.', marks: [], hasModel: false };
const text = (items: SpeakingItemFeedback[]) => speakingFeedbackText({ studentName: 'Bé An', className: 'KIDS-1', title: 'Bài nói 1', signature: '— Thầy/Cô Hà · lớp KIDS-1', items });

describe('tin nhận xét bài nói cho phụ huynh', () => {
  it('có lời khen, sao từng tiêu chí, câu mẫu và chữ ký', () => {
    const t = text([base]);
    expect(t).toContain('🎙️ NHẬN XÉT BÀI NÓI của em Bé An (lớp KIDS-1)');
    expect(t).toContain('Câu 1: "I have three cats."');
    expect(t).toContain('👍 Điều con làm tốt: Con nói to, rõ.');
    expect(t).toContain('Phát âm ⭐⭐☆ · Trôi chảy ⭐⭐⭐ · Hoàn thành yêu cầu ⭐⭐⭐');
    expect(t.trim().endsWith('— Thầy/Cô Hà · lớp KIDS-1')).toBe(true);
  });

  it('trẻ nhỏ chỉ nêu 2 lỗi quan trọng nhất (ưu tiên lỗi cần nói lại), xếp theo giây; có nhắc nói lại và giọng mẫu', () => {
    const t = text([{ ...base, hasModel: true, marks: [mark(600, 'final_sound', { correctText: 'have' }), mark(1500, 'th', { correctText: 'three', redo: true }), mark(2400, 'intonation')] }]);
    expect(t).toContain('Âm /θ/ /ð/ (th) ở giây 0:01, nói đúng: "three"');
    expect(t).toContain('Mất âm cuối ở giây 0:00, nói đúng: "have"');
    expect(t).not.toContain('Ngữ điệu');
    expect(t.indexOf('Mất âm cuối')).toBeLessThan(t.indexOf('Âm /θ/'));
    expect(t).toContain('nêu 2 lỗi quan trọng nhất');
    expect(t).toContain('🔁 Thầy/Cô đề nghị con nói lại câu này');
    expect(t).toContain('🔊 Giọng mẫu của Thầy/Cô gửi kèm bên dưới.');
  });

  it('thang điểm (từ 9 tuổi): điểm 0–5 và đủ mọi lỗi', () => {
    const t = text([{ ...base, scale: 'points', scores: { pronunciation: 4, fluency: 3, task: 5, vocabulary: 4, grammar: 2 }, marks: [mark(1, 'tense'), mark(2, 'ed'), mark(3, 'z')] }]);
    expect(t).toContain('Phát âm 4/5 · Trôi chảy 3/5 · Hoàn thành yêu cầu 5/5 · Từ vựng 4/5 · Ngữ pháp 2/5');
    expect(t).toContain('Sai thì');
    expect(t).toContain('Đuôi -ed');
    expect(t).toContain('Âm /z/');
  });

  it('câu chưa có nhận xét thì bỏ qua; không câu nào có thì không có gì để gửi', () => {
    const empty = { ...base, position: 2, scale: null, praise: '', marks: [] };
    expect(text([base, empty])).not.toContain('Câu 2');
    expect(hasSpeakingFeedback([empty])).toBe(false);
    expect(hasSpeakingFeedback([base])).toBe(true);
  });
});
