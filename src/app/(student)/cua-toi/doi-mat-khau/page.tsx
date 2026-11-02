import { ArrowLeftIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { PageHeader } from '@/components/ui/PageHeader';

// Học sinh đổi mật khẩu đăng nhập. Layout (student) đã kiểm tra vai trò học sinh.
export default function StudentChangePasswordPage() {
  return (
    <section className="flex max-w-[520px] flex-col gap-4">
      <Link
        href="/cua-toi"
        data-link="true"
        className="inline-flex items-center gap-1 self-start text-sm font-semibold text-[var(--fgColor-muted)] underline underline-offset-4 hover:text-[var(--fgColor-default)]"
      >
        <ArrowLeftIcon size={16} aria-hidden /> Bài của tôi
      </Link>
      <PageHeader crumbs={['Khu học sinh']} title="Đổi mật khẩu" subtitle="Mật khẩu mới áp dụng ngay. Các thiết bị khác sẽ bị đăng xuất." titleOnTopbar={false} />
      <ChangePasswordForm />
    </section>
  );
}
