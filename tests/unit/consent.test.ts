import { describe, expect, it } from 'vitest';
import { ageOn, consentStatus, voiceAccess, type ConsentRow } from '@/lib/consent';

const at = (s: string) => new Date(s);
const row = (r: Partial<ConsentRow>): ConsentRow => ({ purpose: 'voice_teacher_review', granted: true, decidedAt: at('2026-10-01T08:00:00Z'), withdrawnAt: null, childAgreedAt: null, ...r });

describe('trạng thái đồng ý', () => {
  it('chưa hỏi, đồng ý, không đồng ý, rút lại; dòng mới nhất quyết định', () => {
    expect(consentStatus([], 'voice_teacher_review').status).toBe('none');
    expect(consentStatus([row({})], 'voice_teacher_review').status).toBe('granted');
    expect(consentStatus([row({ granted: false })], 'voice_teacher_review').status).toBe('refused');
    expect(consentStatus([row({ withdrawnAt: at('2026-10-05T00:00:00Z') })], 'voice_teacher_review').status).toBe('withdrawn');
    // Từ chối rồi sau đó đồng ý: đồng ý
    expect(consentStatus([row({ granted: false }), row({ decidedAt: at('2026-10-10T00:00:00Z') })], 'voice_teacher_review').status).toBe('granted');
    // Mục đích khác không ảnh hưởng
    expect(consentStatus([row({ purpose: 'voice_auto_scoring' })], 'voice_teacher_review').status).toBe('none');
  });
});

describe('tuổi và quyền ghi âm', () => {
  it('tính tuổi tròn theo ngày', () => {
    expect(ageOn('2019-10-22', '2026-10-22')).toBe(7);
    expect(ageOn('2019-10-23', '2026-10-22')).toBe(6);
    expect(ageOn('2019-11-01', '2026-10-22')).toBe(6);
  });
  it('dưới 7 tuổi: phụ huynh đồng ý là đủ', () => {
    expect(voiceAccess([row({})], '2021-05-01', '2026-10-22')).toEqual({ allowed: true, needsChild: false });
  });
  it('từ 7 tuổi: cần cả trẻ đồng ý', () => {
    expect(voiceAccess([row({})], '2018-01-01', '2026-10-22')).toEqual({ allowed: false, needsChild: true });
    expect(voiceAccess([row({ childAgreedAt: at('2026-10-02T00:00:00Z') })], '2018-01-01', '2026-10-22')).toEqual({ allowed: true, needsChild: false });
  });
  it('chưa có, không đồng ý hoặc đã rút lại thì không ghi âm, không hỏi trẻ', () => {
    expect(voiceAccess([], '2018-01-01', '2026-10-22')).toEqual({ allowed: false, needsChild: false });
    expect(voiceAccess([row({ granted: false })], '2021-01-01', '2026-10-22').allowed).toBe(false);
    expect(voiceAccess([row({ withdrawnAt: at('2026-10-05T00:00:00Z'), childAgreedAt: at('2026-10-02T00:00:00Z') })], '2018-01-01', '2026-10-22')).toEqual({ allowed: false, needsChild: false });
  });
});
