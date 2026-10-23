import { describe, expect, it } from 'vitest';
import { crc16, isBankReady, transferNote, vietQrPayload } from '@/lib/vietqr';

describe('mã VietQR', () => {
  it('CRC-16/CCITT-FALSE đúng giá trị chuẩn', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('nội dung chuyển khoản bỏ dấu, chữ hoa, tối đa 25 ký tự', () => {
    expect(transferNote('HP HS-00076 Đỗ Minh Đăng')).toBe('HP HS 00076 DO MINH DANG');
    expect(transferNote('Học phí lớp GS 02 của bé Nguyễn Ngọc Tâm Anh').length).toBeLessThanOrEqual(25);
  });

  it('chuỗi QR có đủ trường và mã kiểm tra khớp', () => {
    const payload = vietQrPayload({ bin: '970436', account: '0011001234567', amount: 3000000, note: 'HP HS-00076' });
    expect(payload.startsWith('000201010212')).toBe(true);
    expect(payload).toContain('0010A000000727');
    expect(payload).toContain('0006970436');
    expect(payload).toContain('01130011001234567');
    expect(payload).toContain('0208QRIBFTTA');
    expect(payload).toContain('5303704');
    expect(payload).toContain('54073000000');
    expect(payload).toContain('5802VN');
    expect(payload).toContain('0811HP HS 00076');
    expect(payload.slice(-8, -4)).toBe('6304');
    expect(crc16(payload.slice(0, -4))).toBe(payload.slice(-4));
  });

  it('không có số tiền thì là mã tĩnh, người chuyển tự nhập', () => {
    const payload = vietQrPayload({ bin: '970422', account: '123456789', amount: 0, note: '' });
    expect(payload.startsWith('000201010211')).toBe(true);
    expect(payload).not.toContain('5407');
  });

  it('kiểm tài khoản đủ thông tin', () => {
    expect(isBankReady({ bin: '970436', account: '0011001234567' })).toBe(true);
    expect(isBankReady({ bin: '', account: '0011001234567' })).toBe(false);
    expect(isBankReady({ bin: '970436', account: '12-34' })).toBe(false);
  });
});
