import { KeyIcon, MortarBoardIcon, SignOutIcon } from '@primer/octicons-react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { isDemoAccount } from '@/lib/demo-account';
import { getCurrentAccount } from '@/lib/session';
import { Btn } from '@/components/ui/Btn';
import { Avatar, Pill } from '@/components/ui/primitives';

// Khu học sinh (P28): khung riêng theo chuẩn CaNhanApp (01. TSUKUBA) với thanh đầu mờ cố định, huy hiệu thương hiệu và thẻ tài khoản.
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
      <header className="sticky top-0 z-30 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-default)]/88 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[920px] flex-wrap items-center justify-between gap-2.5 px-4 py-2.5">
          <Link
            href="/cua-toi"
            data-card="true"
            className="group inline-flex items-center gap-2.5 text-left no-underline"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--on-primary,#fff)] shadow-xs transition-transform group-hover:scale-105">
              <MortarBoardIcon size={16} aria-hidden />
            </span>
            <span className="flex flex-col leading-tight">
              <b className="text-sm font-semibold tracking-tight text-[var(--fgColor-default)] transition-colors group-hover:text-[var(--primary)]">
                ESL Center
              </b>
              <small className="text-[11px] text-[var(--fgColor-muted)]">Khu học sinh</small>
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] py-1 pr-3 pl-1.5 text-xs text-[var(--fgColor-default)] max-[639px]:hidden">
              <Avatar name={account.fullName} seed={account.id} size="sm" quiet />
              <span className="max-w-[160px] truncate">{account.fullName}</span>
            </span>
            {/* Tài khoản học thử không có mật khẩu, nên không có đổi mật khẩu */}
            {isDemoAccount(account.email) ? (
              <Pill tone="butter">Học thử</Pill>
            ) : (
              <Link
                href="/cua-toi/doi-mat-khau"
                data-link="true"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--fgColor-accent,var(--primary))] hover:underline"
              >
                <KeyIcon size={14} aria-hidden />
                <span className="max-[420px]:hidden">Đổi mật khẩu</span>
              </Link>
            )}
            <form action="/logout" method="post">
              <Btn type="submit" variant="ghost" leadingVisual={<SignOutIcon size={16} aria-hidden />}>
                Đăng xuất
              </Btn>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[920px] flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
