// Đọc .env.local cho bộ kiểm thử đầu cuối (không in giá trị ra màn hình). Chỉ dùng cho môi trường dev trên localhost.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let loaded = false;

export function loadEnvLocal(): void {
  if (loaded) return;
  loaded = true;
  const file = join(process.cwd(), '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

// Mật khẩu dev của tài khoản mẫu, đặt bằng npm run db:set-password
export function devPassword(): string {
  loadEnvLocal();
  const value = process.env.DEV_PASSWORD;
  if (!value) throw new Error('Thiếu DEV_PASSWORD trong .env.local. Xem .env.example.');
  return value;
}

export const ADMIN = 'admin@esl-center.vn';
export const ACCOUNTANT = 'ngoc.ketoan@esl-center.vn';
export const ACADEMIC = 'trang.giaovu@esl-center.vn';
export const TEACHER_THU_HA = 'thu.ha@esl-center.vn';
