import { ArrowLeftIcon, KeyIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { Section } from '@/components/ui/surfaces';

// Học sinh đổi mật khẩu đăng nhập. Layout (student) đã kiểm tra vai trò học sinh.
export default function StudentChangePasswordPage() {
  return (
    <section className="tsukuba-rise mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <Link
        href="/cua-toi"
        data-link="true"
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[var(--fgColor-muted)] underline underline-offset-4 hover:text-[var(--fgColor-default)]"
      >
        <ArrowLeftIcon size={16} aria-hidden /> Bài của tôi
      </Link>
      <div className="rounded-2xl border border-[var(--borderColor-default)] border-l-4 border-l-[var(--primary)] bg-[var(--bgColor-default)] p-4 min-[640px]:p-5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--primary)]">
          <KeyIcon size={12} aria-hidden />
          Khu học sinh
        </span>
        <h1 className="m-0 mt-1 text-xl font-semibold tracking-tight text-[var(--fgColor-default)]">
          Đổi mật khẩu
        </h1>
        <p className="mt-1 text-sm text-[var(--fgColor-muted)]">
          Mật khẩu mới áp dụng ngay. Các thiết bị khác sẽ bị đăng xuất.
        </p>
      </div>
      <Section title="Cập nhật mật khẩu">
        <ChangePasswordForm />
      </Section>
    </section>
  );
}
