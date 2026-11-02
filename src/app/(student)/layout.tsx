import { KeyIcon, SignOutIcon } from '@primer/octicons-react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { isDemoAccount } from '@/lib/demo-account';
import { getCurrentAccount } from '@/lib/session';
import { Btn } from '@/components/ui/Btn';
import { Pill } from '@/components/ui/primitives';

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
    <div className="flex min-h-dvh flex-col bg-[var(--bgColor-inset,var(--bgColor-muted))]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-4 py-3">
        <span className="text-base font-semibold text-[var(--fgColor-default)]">ESL Center · Khu học sinh</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--fgColor-muted)] max-[767px]:hidden">{account.fullName}</span>
          {/* Tài khoản học thử không có mật khẩu, nên không có đổi mật khẩu */}
          {isDemoAccount(account.email) ? (
            <Pill tone="butter">Học thử</Pill>
          ) : (
            <Link
              href="/cua-toi/doi-mat-khau"
              data-link="true"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--fgColor-accent)] hover:underline"
            >
              <KeyIcon size={14} aria-hidden />
              Đổi mật khẩu
            </Link>
          )}
          <form action="/logout" method="post">
            <Btn type="submit" variant="ghost" leadingVisual={<SignOutIcon size={16} aria-hidden />}>
              Đăng xuất
            </Btn>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[860px] flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
