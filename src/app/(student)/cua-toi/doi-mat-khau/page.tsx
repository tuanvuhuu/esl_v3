import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { PageHeader } from '@/components/ui/PageHeader';

// Học sinh đổi mật khẩu đăng nhập. Layout (student) đã kiểm tra vai trò học sinh.
export default function StudentChangePasswordPage() {
  return (
    <section className="flex max-w-[520px] flex-col gap-4">
      <PageHeader crumbs={['Khu học sinh']} title="Đổi mật khẩu" subtitle="Mật khẩu mới áp dụng ngay. Các thiết bị khác sẽ bị đăng xuất." titleOnTopbar={false} />
      <ChangePasswordForm />
    </section>
  );
}
