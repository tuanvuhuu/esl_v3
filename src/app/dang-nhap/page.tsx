import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { demoLoginEnabled } from '@/lib/demo-account';
import { getCurrentAccount } from '@/lib/session';

// Trang đăng nhập. Đã đăng nhập thì chuyển thẳng vào Tổng quan.
export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={null}>
      <LoginData searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginData({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const account = await getCurrentAccount();
  // ?next=: mở tiếp trang đó sau khi đăng nhập (máy chủ kiểm lại đường dẫn trong loginAction)
  const next = (await searchParams).next ?? '';
  if (account) redirect(next.startsWith('/trinh-chieu/') ? next : '/tong-quan');
  // Đăng nhập nhanh chỉ khi không phải production (tạm thời, xem devQuickLoginAction)
  return <LoginForm quickLogin={process.env.NODE_ENV !== 'production'} demo={demoLoginEnabled()} next={next} />;
}
