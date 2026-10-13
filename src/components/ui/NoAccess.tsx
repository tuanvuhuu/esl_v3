// Màn báo không có quyền xem. Dùng ở đầu trang khi người dùng thiếu quyền (task 9.2).
import { EmptyState } from './primitives';

export function NoAccess({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-h1 font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
      <div className="rounded-[24px] bg-surface shadow-card">
        <EmptyState title="Bạn không có quyền xem màn này" hint="Nhờ quản trị cấp quyền trong màn Tài khoản & quyền." />
      </div>
    </div>
  );
}
