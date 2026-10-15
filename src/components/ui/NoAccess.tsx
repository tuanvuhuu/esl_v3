// Màn báo không có quyền xem. Dùng ở đầu trang khi người dùng thiếu quyền (task 9.2).
import { EmptyPanel } from './surfaces';

export function NoAccess({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Từ 768px tên trang nằm trên thanh trên cùng, nên tiêu đề chỉ hiện trên điện thoại */}
      <h1 className="text-h1 font-extrabold leading-tight tracking-tight text-ink min-[768px]:sr-only">{title}</h1>
      <EmptyPanel title="Bạn không có quyền xem màn này" hint="Nhờ quản trị cấp quyền trong màn Tài khoản & quyền." />
    </div>
  );
}
