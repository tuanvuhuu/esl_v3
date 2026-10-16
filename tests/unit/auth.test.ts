import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { passwordFingerprint, readSession, sessionAccountId, signSession } from '@/lib/auth/token';

const SECRET = 'x'.repeat(40);
const NOW = Date.parse('2026-10-13T12:00:00Z');
const FP = passwordFingerprint('scrypt$salt$key-a');

describe('hashPassword và verifyPassword', () => {
  it('đúng mật khẩu thì khớp, sai thì không khớp', async () => {
    const stored = await hashPassword('mat-khau-thu-1');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('mat-khau-thu-1', stored)).toBe(true);
    expect(await verifyPassword('mat-khau-thu-2', stored)).toBe(false);
  });
  it('cùng mật khẩu nhưng hai lần băm khác nhau (có muối)', async () => {
    const a = await hashPassword('giong-nhau');
    const b = await hashPassword('giong-nhau');
    expect(a).not.toBe(b);
  });
  it('không có hash hoặc định dạng sai thì không khớp', async () => {
    expect(await verifyPassword('abc', null)).toBe(false);
    expect(await verifyPassword('abc', 'md5$xx$yy')).toBe(false);
    expect(await verifyPassword('abc', 'scrypt$zz')).toBe(false);
  });
});

describe('signSession và readSession', () => {
  it('token còn hạn thì trả về đúng id tài khoản', () => {
    const token = signSession(7, NOW + 60_000, SECRET, FP);
    expect(readSession(token, SECRET, NOW, FP)).toBe(7);
  });
  it('token hết hạn thì bị từ chối', () => {
    const token = signSession(7, NOW - 1, SECRET, FP);
    expect(readSession(token, SECRET, NOW, FP)).toBeNull();
  });
  it('sửa id hoặc chữ ký thì bị từ chối', () => {
    const token = signSession(7, NOW + 60_000, SECRET, FP);
    const [, exp, sig] = token.split('.');
    expect(readSession(`8.${exp}.${sig}`, SECRET, NOW, FP)).toBeNull();
    expect(readSession(`7.${exp}.${sig.slice(0, -2)}xx`, SECRET, NOW, FP)).toBeNull();
  });
  it('khác khoá bí mật thì bị từ chối', () => {
    const token = signSession(7, NOW + 60_000, SECRET, FP);
    expect(readSession(token, 'y'.repeat(40), NOW, FP)).toBeNull();
  });
  it('chuỗi không đúng dạng thì bị từ chối', () => {
    expect(readSession('abc', SECRET, NOW, FP)).toBeNull();
    expect(readSession('0.1.2', SECRET, NOW, FP)).toBeNull();
  });
  it('đổi mật khẩu (dấu khác) thì phiên cũ bị từ chối, phiên mới với dấu mới thì được', async () => {
    const oldFp = passwordFingerprint(await hashPassword('mat-khau-cu-1'));
    const newFp = passwordFingerprint(await hashPassword('mat-khau-moi-1'));
    const oldToken = signSession(7, NOW + 60_000, SECRET, oldFp);
    expect(readSession(oldToken, SECRET, NOW, oldFp)).toBe(7);
    expect(readSession(oldToken, SECRET, NOW, newFp)).toBeNull();
    expect(readSession(signSession(7, NOW + 60_000, SECRET, newFp), SECRET, NOW, newFp)).toBe(7);
  });
});

describe('sessionAccountId', () => {
  it('đọc được id từ token đúng dạng, kể cả khi chữ ký chưa kiểm', () => {
    expect(sessionAccountId('7.1700000000000.ky')).toBe(7);
  });
  it('chuỗi không đúng dạng hoặc id không hợp lệ thì trả về null', () => {
    expect(sessionAccountId('abc')).toBeNull();
    expect(sessionAccountId('0.1.2')).toBeNull();
    expect(sessionAccountId('x.1.2')).toBeNull();
  });
});

describe('passwordFingerprint', () => {
  it('cùng chuỗi băm thì cùng dấu, khác chuỗi băm thì khác dấu, không lộ chuỗi băm', () => {
    expect(passwordFingerprint('abc')).toBe(passwordFingerprint('abc'));
    expect(passwordFingerprint('abc')).not.toBe(passwordFingerprint('abd'));
    expect(passwordFingerprint('abc')).toHaveLength(32);
    expect(passwordFingerprint(null)).toBe(passwordFingerprint(''));
  });
});
