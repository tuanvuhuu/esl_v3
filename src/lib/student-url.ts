// Đường dẫn danh sách học sinh với bộ lọc và phân trang trên URL. Dùng chung cho server và client.
export type ListParams = {
  q?: string;
  status?: string; // all | active | trial | paused | finished
  cls?: string; // id lớp
  tuition?: string; // all | paid | partial | unpaid
  p?: number; // trang (máy tính, bảng)
  n?: number; // số trang đã tải (điện thoại, nút Xem thêm)
  h?: string; // id học sinh đang mở trong ngăn kéo hồ sơ (máy tính)
  tab?: string; // tab trong hồ sơ: tong-quan | phu-huynh | hoc-tap
  sort?: string;
  order?: string;
};

export function studentsHref(params: ListParams): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.status && params.status !== 'all') sp.set('status', params.status);
  if (params.cls) sp.set('cls', params.cls);
  if (params.tuition && params.tuition !== 'all') sp.set('tuition', params.tuition);
  if (params.p && params.p > 1) sp.set('p', String(params.p));
  if (params.n && params.n > 1) sp.set('n', String(params.n));
  if (params.h) sp.set('h', params.h);
  if (params.h && params.tab && params.tab !== 'tong-quan') sp.set('tab', params.tab);
  if (params.sort) sp.set('sort', params.sort);
  if (params.sort && params.order) sp.set('order', params.order);
  const qs = sp.toString();
  return qs ? `/hoc-sinh?${qs}` : '/hoc-sinh';
}

// Đường dẫn tab trong hồ sơ: trang riêng (/hoc-sinh/12) hoặc ngăn kéo (/hoc-sinh?h=12)
export function profileTabHref(base: string, tab: string): string {
  if (tab === 'tong-quan') return base;
  return base.includes('?') ? `${base}&tab=${tab}` : `${base}?tab=${tab}`;
}
