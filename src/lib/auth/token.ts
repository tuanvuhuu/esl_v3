// Token phiên: "<id tài khoản>.<hết hạn (ms)>.<chữ ký HMAC-SHA256>". Hàm thuần, không đụng DB hay cookie.
// Chữ ký tính trên id, hết hạn và "dấu" của mật khẩu hiện tại. Dấu không nằm trong token. Đổi mật khẩu thì dấu đổi,
// nên mọi phiên cũ (kể cả trên thiết bị khác) không kiểm được chữ ký và bị từ chối.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

// Dấu của mật khẩu: băm rút gọn của chuỗi băm đã lưu. Không lộ mật khẩu.
export function passwordFingerprint(passwordHash: string | null): string {
  return createHash('sha256').update(passwordHash ?? '').digest('hex').slice(0, 32);
}

export function signSession(accountId: number, expiresAtMs: number, secret: string, fingerprint: string): string {
  const payload = `${accountId}.${expiresAtMs}`;
  return `${payload}.${sign(`${payload}.${fingerprint}`, secret)}`;
}

// Id tài khoản ghi trong token, CHƯA kiểm chữ ký. Chỉ dùng để tra cứu dấu mật khẩu; phải gọi readSession sau đó.
export function sessionAccountId(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const accountId = Number(parts[0]);
  return Number.isInteger(accountId) && accountId > 0 ? accountId : null;
}

// Trả về id tài khoản nếu chữ ký khớp với dấu mật khẩu hiện tại và token chưa hết hạn, ngược lại trả về null
export function readSession(token: string, secret: string, nowMs: number, fingerprint: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [idText, expText, signature] = parts;
  const expected = Buffer.from(sign(`${idText}.${expText}.${fingerprint}`, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const accountId = Number(idText);
  const expiresAt = Number(expText);
  if (!Number.isInteger(accountId) || accountId <= 0) return null;
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return null;
  return accountId;
}
