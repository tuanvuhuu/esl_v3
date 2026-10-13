// Băm và kiểm tra mật khẩu bằng scrypt của Node (không cần thư viện ngoài, xem D9).
// Định dạng lưu: "scrypt$<salt hex>$<khoá hex>". Chỉ chạy trên server.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const SCHEME = 'scrypt';
const KEY_LENGTH = 64;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `${SCHEME}$${salt.toString('hex')}$${key.toString('hex')}`;
}

// Trả về false khi chưa đặt mật khẩu (hash null) hoặc định dạng không đúng
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [scheme, saltHex, keyHex] = stored.split('$');
  if (scheme !== SCHEME || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await deriveKey(password, Buffer.from(saltHex, 'hex'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
