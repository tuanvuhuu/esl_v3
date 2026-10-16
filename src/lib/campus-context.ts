// Cơ sở đang xem trong yêu cầu hiện tại: danh sách cơ sở và lựa chọn trong cookie. Chỉ chạy trên server.
// Danh sách chỉ gồm các cơ sở tài khoản được làm việc (P32). Tài khoản bị giới hạn không có "Tất cả cơ sở":
// mỗi lần xem một cơ sở trong phạm vi, nên mọi truy vấn lọc theo scope đều không lộ dữ liệu cơ sở khác.
import { cookies } from 'next/headers';
import { cache } from 'react';
import { CAMPUS_COOKIE, CAMPUS_NONE, resolveCampusScope, type CampusOption, type CampusScope } from './campus';
import { getAllowedCampusIds } from './campus-access';
import { listCampuses } from './queries/campuses';

// Cache theo từng yêu cầu nên gọi nhiều lần (layout, trang, hành động) chỉ đọc DB một lần, giống getCurrentAccount.
export const getCampusContext = cache(async (): Promise<{ campuses: CampusOption[]; scope: CampusScope; allowAll: boolean }> => {
  const allowed = await getAllowedCampusIds();
  const all = await listCampuses();
  const campuses = allowed === null ? all : all.filter((c) => allowed.includes(c.id));
  const jar = await cookies();
  const raw = jar.get(CAMPUS_COOKIE)?.value;
  if (allowed !== null && campuses.length === 0) return { campuses, scope: CAMPUS_NONE, allowAll: false };
  const scope = resolveCampusScope(raw, campuses.map((c) => c.id), allowed === null);
  return { campuses, scope, allowAll: allowed === null };
});
