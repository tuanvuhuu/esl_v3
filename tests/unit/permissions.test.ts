import { describe, expect, it } from 'vitest';
import { DEFAULT_GRANTS, LOCKED_ADMIN_PERMISSIONS, PERMISSIONS, ROLE_CODES, hasPermission, type Permission } from '@/lib/permissions';
import { NAV_GROUPS, MOBILE_TABS, visibleGroups } from '@/lib/nav';

const ALL = PERMISSIONS.map((p) => p.key) as Permission[];

describe('ma trận quyền mặc định', () => {
  it('quản trị có đủ mọi quyền', () => {
    expect(new Set(DEFAULT_GRANTS.admin)).toEqual(new Set(ALL));
  });
  it('mọi vai trò chỉ dùng quyền có trong danh sách', () => {
    for (const role of ROLE_CODES) {
      for (const p of DEFAULT_GRANTS[role]) expect(ALL).toContain(p);
    }
  });
  it('quyền khoá của quản trị nằm trong danh sách quyền', () => {
    for (const p of LOCKED_ADMIN_PERMISSIONS) expect(ALL).toContain(p);
  });
  it('kế toán không có quyền quản lý học sinh và tài khoản', () => {
    expect(hasPermission(new Set(DEFAULT_GRANTS.accountant), 'students.edit')).toBe(false);
    expect(hasPermission(new Set(DEFAULT_GRANTS.accountant), 'accounts.manage')).toBe(false);
    expect(hasPermission(new Set(DEFAULT_GRANTS.accountant), 'tuition.manage')).toBe(true);
  });
});

describe('menu theo quyền', () => {
  it('không có quyền nào thì chỉ còn mục không cần quyền (Tổng quan không có trong nhóm)', () => {
    const groups = visibleGroups(new Set());
    expect(groups).toEqual([]);
  });
  it('kế toán không thấy nhóm Hệ thống, thấy Học phí và Báo cáo', () => {
    const groups = visibleGroups(new Set(DEFAULT_GRANTS.accountant));
    const titles = groups.map((g) => g.title);
    expect(titles).not.toContain('Hệ thống');
    const finance = groups.find((g) => g.title === 'Tài chính');
    expect(finance?.items.map((i) => i.label)).toEqual(['Học phí', 'Báo cáo doanh thu']);
  });
  it('quản trị thấy đủ mọi mục trong menu', () => {
    const total = NAV_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
    const visible = visibleGroups(new Set(ALL)).reduce((sum, g) => sum + g.items.length, 0);
    expect(visible).toBe(total);
  });
  it('tab điện thoại: Tổng quan không cần quyền, các tab còn lại có quyền riêng', () => {
    const tabs = MOBILE_TABS.map((t) => t.label);
    expect(tabs[0]).toBe('Tổng quan');
    expect(MOBILE_TABS.find((t) => t.label === 'Điểm danh')?.permission).toBe('attendance.record');
  });
});
