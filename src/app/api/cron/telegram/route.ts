// Route Cron Telegram (P34.21, P37): nhắc lịch học, lịch dạy, hạn nộp bài, học phí, chấm bài, báo cáo tuần
// và báo cáo ngày. Gọi mỗi giờ bằng cron-job.org hoặc Vercel Cron (gói Pro).
import { timingSafeEqual } from 'node:crypto';
import { connection } from 'next/server';
import { webhookSecret } from '@/lib/telegram/api';
import { withOnlyChat } from '@/lib/telegram/core';
import { runTelegramCronTasks } from '@/lib/telegram/cron';
import { isCronJob } from '@/lib/telegram/prefs';

function checkAuth(request: Request): boolean {
  const expected = process.env.CRON_SECRET || webhookSecret();
  if (!expected) return false;

  // 1. Kiểm tra header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true;
    }
  }

  // 2. Kiểm tra query param ?key=...
  const url = new URL(request.url);
  const keyParam = url.searchParams.get('key');
  if (keyParam && keyParam.length === expected.length && timingSafeEqual(Buffer.from(keyParam), Buffer.from(expected))) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  await connection();
  if (!checkAuth(request)) {
    return new Response('Không có quyền', { status: 401 });
  }

  // Gọi mỗi giờ: mỗi việc tự kiểm giờ Việt Nam (docs/KICH-BAN-TELEGRAM.md mục 4).
  // ?jobs=schedule,weekly chạy đúng các việc đó, bỏ qua kiểm giờ; ?report=1 (cách gọi cũ) thêm báo cáo ngày.
  const url = new URL(request.url);
  const jobs = (url.searchParams.get('jobs') ?? '').split(',').map((j) => j.trim()).filter(isCronJob);
  const report = url.searchParams.get('report');
  if ((report === '1' || report === 'true') && !jobs.includes('daily_report')) jobs.push('daily_report');

  // ?chat=<id>: chỉ gửi cho chat này (chạy thử, kiểm thử), không gửi tới phụ huynh thật
  const chat = Number(url.searchParams.get('chat'));
  const result = await withOnlyChat(Number.isSafeInteger(chat) && chat !== 0 ? chat : null, () => runTelegramCronTasks({ jobs }));
  return Response.json({ ok: true, result });
}

export async function POST(request: Request) {
  return GET(request);
}
