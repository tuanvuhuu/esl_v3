import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { readSession, signSession } from '@/lib/auth/token';

const SECRET = 'x'.repeat(40);
const NOW = Date.parse('2026-10-13T12:00:00Z');

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
    const token = signSession(7, NOW + 60_000, SECRET);
    expect(readSession(token, SECRET, NOW)).toBe(7);
  });
  it('token hết hạn thì bị từ chối', () => {
    const token = signSession(7, NOW - 1, SECRET);
    expect(readSession(token, SECRET, NOW)).toBeNull();
  });
  it('sửa id hoặc chữ ký thì bị từ chối', () => {
    const token = signSession(7, NOW + 60_000, SECRET);
    const [, exp, sig] = token.split('.');
    expect(readSession(`8.${exp}.${sig}`, SECRET, NOW)).toBeNull();
    expect(readSession(`7.${exp}.${sig.slice(0, -2)}xx`, SECRET, NOW)).toBeNull();
  });
  it('khác khoá bí mật thì bị từ chối', () => {
    const token = signSession(7, NOW + 60_000, SECRET);
    expect(readSession(token, 'y'.repeat(40), NOW)).toBeNull();
  });
  it('chuỗi không đúng dạng thì bị từ chối', () => {
    expect(readSession('abc', SECRET, NOW)).toBeNull();
    expect(readSession('0.1.2', SECRET, NOW)).toBeNull();
  });
});
