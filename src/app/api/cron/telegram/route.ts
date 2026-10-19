// Route Cron Telegram (P34.21): chạy định kỳ để nhắc lịch học hôm nay, nhắc hạn nộp bài tập,
// và gửi báo cáo ngày cho Super Admin. Gọi bằng Vercel Cron hoặc cron-job bên ngoài.
import { timingSafeEqual } from 'node:crypto';
import { connection } from 'next/server';
import { webhookSecret } from '@/lib/telegram/api';
import { runTelegramCronTasks } from '@/lib/telegram/service';

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

  const url = new URL(request.url);
  const sendReport = url.searchParams.get('report') === '1' || url.searchParams.get('report') === 'true';

  const result = await runTelegramCronTasks({ sendDailyReport: sendReport });
  return Response.json({ ok: true, result });
}

export async function POST(request: Request) {
  return GET(request);
}
