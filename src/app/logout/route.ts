import { NextResponse } from 'next/server';
import { endSession } from '@/lib/session';

// Đăng xuất: xoá cookie phiên rồi chuyển về trang đăng nhập
export async function POST(request: Request) {
  await endSession();
  return NextResponse.redirect(new URL('/dang-nhap', request.url), 303);
}
