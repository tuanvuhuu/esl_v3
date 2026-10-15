// Cơ sở đang xem trong yêu cầu hiện tại: danh sách cơ sở và lựa chọn trong cookie. Chỉ chạy trên server.
import { cookies } from 'next/headers';
import { cache } from 'react';
import { CAMPUS_COOKIE, resolveCampusScope, type CampusOption, type CampusScope } from './campus';
import { listCampuses } from './queries/campuses';

// Cache theo từng yêu cầu nên gọi nhiều lần (layout, trang, hành động) chỉ đọc DB một lần, giống getCurrentAccount.
export const getCampusContext = cache(async (): Promise<{ campuses: CampusOption[]; scope: CampusScope }> => {
  const campuses = await listCampuses();
  const jar = await cookies();
  const scope = resolveCampusScope(jar.get(CAMPUS_COOKIE)?.value, campuses.map((c) => c.id));
  return { campuses, scope };
});
