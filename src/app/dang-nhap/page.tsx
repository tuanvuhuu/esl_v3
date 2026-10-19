import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { demoLoginEnabled } from '@/lib/demo-account';
import { getCurrentAccount } from '@/lib/session';

// Trang đăng nhập. Đã đăng nhập thì chuyển thẳng vào Tổng quan.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginData />
    </Suspense>
  );
}

async function LoginData() {
  await connection();
  const account = await getCurrentAccount();
  if (account) redirect('/tong-quan');
  // Đăng nhập nhanh chỉ khi không phải production (tạm thời, xem devQuickLoginAction)
  return <LoginForm quickLogin={process.env.NODE_ENV !== 'production'} demo={demoLoginEnabled()} />;
}
