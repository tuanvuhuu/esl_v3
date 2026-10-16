import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentAccount } from '@/lib/session';
import { Btn } from '@/components/ui/Btn';

// Khu học sinh (P28): khung riêng, chỉ có bài của học sinh, đổi mật khẩu và nút đăng xuất. Tài khoản khác bị chuyển về màn quản lý.
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <StudentShell>{children}</StudentShell>
    </Suspense>
  );
}

async function StudentShell({ children }: { children: React.ReactNode }) {
  await connection();
  const account = await getCurrentAccount();
  if (!account) redirect('/dang-nhap');
  if (account.role !== 'student') redirect('/tong-quan');

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <span className="text-base font-extrabold text-ink">ESL Center · Khu học sinh</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-2 max-[767px]:hidden">{account.fullName}</span>
          <Link href="/cua-toi/doi-mat-khau" className="text-sm font-semibold text-primary-deep hover:underline">
            Đổi mật khẩu
          </Link>
          <form action="/logout" method="post">
            <Btn type="submit" variant="ghost">
              Đăng xuất
            </Btn>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[860px] flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
