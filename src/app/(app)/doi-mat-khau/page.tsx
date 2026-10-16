import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { PageHeader } from '@/components/ui/PageHeader';

// Đổi mật khẩu của tài khoản đang đăng nhập. Layout (app) đã kiểm tra đăng nhập.
export default function ChangePasswordPage() {
  return (
    <section className="flex max-w-[520px] flex-col gap-4">
      <PageHeader crumbs={['Tài khoản', 'Đổi mật khẩu']} title="Đổi mật khẩu" subtitle="Mật khẩu mới áp dụng ngay. Các thiết bị khác sẽ bị đăng xuất." />
      <ChangePasswordForm />
    </section>
  );
}
