// Vào học thử: không cần đăng nhập, mở thẳng bài học mẫu bằng tài khoản học sinh học thử.
// Link chia sẻ được (/hoc-thu). Tắt bằng DEMO_LOGIN=off. Mỗi lần vào, bài làm cũ của tài khoản này bị xoá.
import { NextResponse } from 'next/server';
import { demoLoginEnabled } from '@/lib/demo-account';
import { prepareDemoStudent } from '@/lib/demo';
import { startSession } from '@/lib/session';

export async function GET(request: Request) {
  if (!demoLoginEnabled()) return NextResponse.redirect(new URL('/dang-nhap', request.url), 303);
  try {
    const { accountId, assignmentId } = await prepareDemoStudent();
    await startSession(accountId);
    return NextResponse.redirect(new URL(`/cua-toi/${assignmentId}`, request.url), 303);
  } catch (error) {
    console.error('Lỗi vào học thử:', error);
    return new Response('Không mở được bài học thử. Thử lại sau ít phút.', { status: 500 });
  }
}
