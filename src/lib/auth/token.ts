// Token phiên: "<id tài khoản>.<hết hạn (ms)>.<chữ ký HMAC-SHA256>". Hàm thuần, không đụng DB hay cookie.
import { createHmac, timingSafeEqual } from 'node:crypto';

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function signSession(accountId: number, expiresAtMs: number, secret: string): string {
  const payload = `${accountId}.${expiresAtMs}`;
  return `${payload}.${sign(payload, secret)}`;
}

// Trả về id tài khoản nếu token hợp lệ và chưa hết hạn, ngược lại trả về null
export function readSession(token: string, secret: string, nowMs: number): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [idText, expText, signature] = parts;
  const expected = Buffer.from(sign(`${idText}.${expText}`, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const accountId = Number(idText);
  const expiresAt = Number(expText);
  if (!Number.isInteger(accountId) || accountId <= 0) return null;
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return null;
  return accountId;
}
