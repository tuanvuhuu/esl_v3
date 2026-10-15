// Danh sách quyền và ma trận mặc định theo vai trò, lấy từ bản mẫu (mục PERMS).
// Nguồn chuẩn cho server action (requirePermission) và giao diện (ẩn menu, nút).
// Quyền thực tế đang áp dụng nằm trong bảng role_permissions, quản trị chỉnh ở màn Tài khoản & quyền.

export const ROLE_CODES = ['admin', 'academic', 'teacher', 'accountant'] as const;
export type Role = (typeof ROLE_CODES)[number];

// Vai trò của mọi tài khoản trong bảng accounts. Học sinh đăng nhập làm bài (P28), không nằm trong ma trận quyền.
export const STUDENT_ROLE = 'student';
export type AccountRole = Role | typeof STUDENT_ROLE;

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị',
  academic: 'Giáo vụ',
  teacher: 'Giáo viên',
  accountant: 'Kế toán',
};
export const ACCOUNT_ROLE_LABELS: Record<AccountRole, string> = { ...ROLE_LABELS, student: 'Học sinh' };

export const PERMISSIONS = [
  { key: 'students.view', label: 'Xem danh sách học sinh' },
  { key: 'students.edit', label: 'Sửa hồ sơ học sinh' },
  { key: 'students.delete', label: 'Xoá học sinh' },
  { key: 'parents.manage', label: 'Quản lý phụ huynh' },
  { key: 'classes.manage', label: 'Quản lý lớp và lịch học' },
  { key: 'teachers.manage', label: 'Quản lý giáo viên' },
  { key: 'attendance.record', label: 'Điểm danh' },
  { key: 'assignments.manage', label: 'Bài tập và chấm điểm' },
  { key: 'learning.manage', label: 'Ghi lịch sử học tập' },
  { key: 'tuition.manage', label: 'Thu học phí, lập hoá đơn' },
  { key: 'reports.view', label: 'Xem báo cáo doanh thu' },
  { key: 'accounts.manage', label: 'Quản lý tài khoản và quyền' },
  { key: 'settings.manage', label: 'Cài đặt trung tâm' },
] as const;

export type Permission = (typeof PERMISSIONS)[number]['key'];

const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.key) as Permission[];

// Mặc định khi tạo hệ thống. Quản trị luôn có toàn bộ quyền.
export const DEFAULT_GRANTS: Record<Role, Permission[]> = {
  admin: ALL_PERMISSIONS,
  academic: [
    'students.view',
    'students.edit',
    'parents.manage',
    'classes.manage',
    'teachers.manage',
    'attendance.record',
    'assignments.manage',
    'learning.manage',
  ],
  teacher: ['students.view', 'attendance.record', 'assignments.manage', 'learning.manage'],
  accountant: ['students.view', 'tuition.manage', 'reports.view'],
};

// Quyền bắt buộc không được gỡ khỏi quản trị, tránh khoá hết quyền quản lý
export const LOCKED_ADMIN_PERMISSIONS: Permission[] = ['accounts.manage', 'settings.manage'];

export function hasPermission(granted: ReadonlySet<Permission>, required: Permission): boolean {
  return granted.has(required);
}
