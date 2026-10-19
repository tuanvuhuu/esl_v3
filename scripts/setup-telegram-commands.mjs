#!/usr/bin/env node
// scripts/setup-telegram-commands.mjs
// Đăng ký danh sách lệnh tiếng Việt và nút Menu chính thức cho Bot Telegram.
// Chạy: node scripts/setup-telegram-commands.mjs

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Nạp .env.local nếu có
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ Thiếu TELEGRAM_BOT_TOKEN trong biến môi trường hoặc .env.local');
  process.exit(1);
}

const commands = [
  { command: 'lich', description: '📅 Xem lịch học 7 ngày tới' },
  { command: 'diem', description: '📊 Xem bảng điểm & nhận xét' },
  { command: 'chuyencan', description: '📝 Xem điểm danh, chuyên cần' },
  { command: 'hocphi', description: '💳 Tra cứu học phí của con' },
  { command: 'baitap', description: '📚 Xem bài tập về nhà' },
  { command: 'nghi', description: '🩺 Gửi đơn xin nghỉ học cho con' },
  { command: 'help', description: '❓ Hướng dẫn sử dụng chi tiết' },
];

async function main() {
  console.log('🤖 Đang kết nối Telegram Bot...');
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const meData = await meRes.json();
  if (!meData.ok) {
    console.error('❌ Token Telegram không hợp lệ:', meData.description);
    process.exit(1);
  }
  console.log(`✓ Đã xác thực bot: @${meData.result.username} (${meData.result.first_name})`);

  console.log('📝 Đang đăng ký danh sách lệnh tiếng Việt và nút Menu...');
  const cmdRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands }),
  });
  const cmdData = await cmdRes.json();
  if (!cmdData.ok) {
    console.error('❌ Lỗi đăng ký lệnh:', cmdData.description);
    process.exit(1);
  }
  console.log('✓ Đã đăng ký thành công danh sách lệnh (setMyCommands)!');

  // Đặt mô tả ngắn cho bot (khi người dùng mở bot lần đầu sẽ thấy hướng dẫn)
  const desc = 'Kênh tra cứu thông tin học tập 24/7 của ESL Center dành cho Phụ huynh và Giáo viên. Chạm vào các nút menu để xem lịch học, điểm số, học phí, điểm danh hoặc gửi đơn xin nghỉ học.';
  await fetch(`https://api.telegram.org/bot${token}/setMyDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: desc }),
  });

  const shortDesc = 'Kênh tra cứu học tập 24/7 của ESL Center dành cho Phụ huynh.';
  await fetch(`https://api.telegram.org/bot${token}/setMyShortDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ short_description: shortDesc }),
  });

  console.log('🎉 Hoàn tất! Phụ huynh mở bot sẽ thấy ngay nút [Menu] và bảng tra cứu tiếng Việt đầy đủ!');
}

main().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
