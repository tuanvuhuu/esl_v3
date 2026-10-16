// Cấu hình menu dùng chung cho thanh bên (web), tab bar (điện thoại) và bảng Tính năng.
// Mỗi mục có quyền yêu cầu; menu ẩn theo quyền của tài khoản đăng nhập (P9, P10.7).
// Icon dùng khoá chuỗi (không dùng hàm) để có thể truyền từ Server Component sang Client Component.
import type { Permission } from './permissions';

export type IconKey =
  | 'house'
  | 'users'
  | 'contact'
  | 'book'
  | 'calendar'
  | 'idcard'
  | 'check'
  | 'clipboard'
  | 'library'
  | 'history'
  | 'wallet'
  | 'chart'
  | 'building'
  | 'settings'
  | 'shield'
  | 'upload';

export type NavItem = {
  href: string;
  label: string;
  icon: IconKey;
  permission: Permission | null; // null = ai cũng xem được
};

export type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'dao-tao',
    title: 'Đào tạo',
    items: [
      { href: '/hoc-sinh', label: 'Học sinh', icon: 'users', permission: 'students.view' },
      { href: '/phu-huynh', label: 'Phụ huynh', icon: 'contact', permission: 'students.view' },
      { href: '/lop-hoc', label: 'Lớp học', icon: 'book', permission: 'students.view' },
      { href: '/lich-hoc', label: 'Lịch học', icon: 'calendar', permission: 'students.view' },
      { href: '/giao-vien', label: 'Giáo viên', icon: 'idcard', permission: 'students.view' },
      { href: '/diem-danh', label: 'Điểm danh', icon: 'check', permission: 'attendance.record' },
      { href: '/bai-tap', label: 'Bài tập', icon: 'clipboard', permission: 'students.view' },
      { href: '/bai-giang', label: 'Bài giảng', icon: 'library', permission: 'students.view' },
      { href: '/lich-su-hoc-tap', label: 'Lịch sử học tập', icon: 'history', permission: 'students.view' },
    ],
  },
  {
    id: 'tai-chinh',
    title: 'Tài chính',
    items: [
      { href: '/hoc-phi', label: 'Học phí', icon: 'wallet', permission: 'tuition.manage' },
      { href: '/bao-cao', label: 'Báo cáo doanh thu', icon: 'chart', permission: 'reports.view' },
    ],
  },
  {
    id: 'he-thong',
    title: 'Hệ thống',
    items: [
      { href: '/co-so', label: 'Cơ sở', icon: 'building', permission: 'settings.manage' },
      { href: '/cai-dat', label: 'Cài đặt', icon: 'settings', permission: 'settings.manage' },
      { href: '/nhap-du-lieu', label: 'Nhập dữ liệu', icon: 'upload', permission: 'settings.manage' },
      { href: '/tai-khoan', label: 'Tài khoản & quyền', icon: 'shield', permission: 'accounts.manage' },
    ],
  },
];

export const HOME_ITEM: NavItem = { href: '/tong-quan', label: 'Tổng quan', icon: 'house', permission: null };

// Tab bar điện thoại: hai mục bên trái, nút giữa mở bảng Tính năng, hai mục bên phải
export const MOBILE_TABS: NavItem[] = [
  HOME_ITEM,
  { href: '/hoc-sinh', label: 'Học sinh', icon: 'users', permission: 'students.view' },
  { href: '/diem-danh', label: 'Điểm danh', icon: 'check', permission: 'attendance.record' },
  { href: '/cai-dat', label: 'Cài đặt', icon: 'settings', permission: 'settings.manage' },
];

// Lọc menu theo quyền. Mục không cần quyền luôn hiện.
export function visibleGroups(granted: ReadonlySet<Permission>): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.permission === null || granted.has(i.permission)),
  })).filter((g) => g.items.length > 0);
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
