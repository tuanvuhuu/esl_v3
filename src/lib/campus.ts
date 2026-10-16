// Cơ sở đang xem và các hàm dùng chung. File này không import gì, nên dùng được cả ở client và server.
// Lựa chọn lưu trong cookie của trình duyệt. Giá trị "all" nghĩa là tất cả cơ sở.
export const CAMPUS_COOKIE = 'esl-campus';
export const CAMPUS_ALL = 'all';

// Cơ sở đang xem: id của một cơ sở, hoặc null nghĩa là tất cả cơ sở
export type CampusScope = number | null;

export type CampusOption = { id: number; name: string; address: string };

// Tài khoản chưa được gán cơ sở nào: scope trỏ tới id không tồn tại, nên mọi danh sách đều trống
export const CAMPUS_NONE = 0;

// Chọn cơ sở đang xem từ cookie. Cookie rỗng, sai, hoặc cơ sở đã xoá thì lấy cơ sở đầu tiên.
// allowAll = false (tài khoản bị giới hạn theo cơ sở): "Tất cả" không dùng được, lấy cơ sở đầu tiên trong phạm vi.
export function resolveCampusScope(raw: string | undefined, campusIds: number[], allowAll = true): CampusScope {
  if (raw === CAMPUS_ALL && allowAll) return null;
  const id = Number(raw);
  if (Number.isInteger(id) && campusIds.includes(id)) return id;
  return campusIds[0] ?? null;
}

// Tên hiển thị của cơ sở đang xem
export function scopeLabel(scope: CampusScope, campuses: CampusOption[]): string {
  if (scope === null) return 'Tất cả cơ sở';
  return campuses.find((c) => c.id === scope)?.name ?? 'Tất cả cơ sở';
}

// Tên lớp kèm tên cơ sở khi danh sách gộp nhiều cơ sở, để phân biệt các lớp trùng tên
export function classLabel(name: string, campusName: string, showCampus: boolean): string {
  return showCampus ? `${name} · ${campusName}` : name;
}

// Danh sách lớp cho bộ lọc: khi xem tất cả cơ sở thì tên mỗi lớp kèm tên cơ sở
export function withCampusNames<T extends { name: string; campusName: string }>(classes: T[], showCampus: boolean): T[] {
  return showCampus ? classes.map((c) => ({ ...c, name: classLabel(c.name, c.campusName, true) })) : classes;
}
