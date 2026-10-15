// Tiện ích sắp xếp dùng chung cho toàn bộ dự án.
export type SortDirection = 'asc' | 'desc';

// So sánh 2 giá trị theo thứ tự tiếng Việt chuẩn và theo kiểu dữ liệu
export function compareValues(a: unknown, b: unknown, direction: SortDirection = 'asc'): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return direction === 'asc' ? 1 : -1;
  if (b === null || b === undefined) return direction === 'asc' ? -1 : 1;

  let res = 0;
  if (typeof a === 'number' && typeof b === 'number') {
    res = a - b;
  } else if (typeof a === 'boolean' && typeof b === 'boolean') {
    res = a === b ? 0 : a ? 1 : -1;
  } else if (a instanceof Date && b instanceof Date) {
    res = a.getTime() - b.getTime();
  } else {
    // So sánh chuỗi tiếng Việt chuẩn, hỗ trợ số tự nhiên (HS-2 đứng trước HS-10)
    const sa = String(a).trim();
    const sb = String(b).trim();
    res = sa.localeCompare(sb, 'vi', { numeric: true, sensitivity: 'base' });
  }

  return direction === 'asc' ? res : -res;
}

// Trích xuất giá trị để sắp xếp từ một dòng dữ liệu theo key hoặc hàm tuỳ biến
export function getRowSortValue<T>(row: T, key: string, customExtractor?: (row: T) => unknown): unknown {
  if (customExtractor) {
    return customExtractor(row);
  }
  const r = row as Record<string, unknown>;
  if (!r) return undefined;

  // 1. Nếu dòng có thuộc tính trùng khớp key chính xác
  if (key in r && r[key] !== undefined && r[key] !== null) {
    return r[key];
  }

  // 2. Hỗ trợ các trường phổ biến theo schema của các bảng trong dự án
  switch (key) {
    case 'parent':
      return r.fullName ?? r.name ?? r.parentName;
    case 'teacher':
      return r.name ?? r.fullName ?? r.teacherName;
    case 'student':
      return r.fullName ?? r.studentName ?? r.name;
    case 'member':
      return r.fullName ?? r.name ?? r.email;
    case 'name':
    case 'fullName':
      return r.fullName ?? r.name ?? r.title ?? r.className;
    case 'code':
      return r.code ?? r.id;
    case 'contact':
      return r.phone ?? r.email ?? r.contact;
    case 'phone':
      return r.phone ?? '';
    case 'email':
      return r.email ?? '';
    case 'subject':
      return r.subject ?? '';
    case 'gender':
      return r.gender ?? '';
    case 'children':
    case 'child':
      if (Array.isArray(r.children)) {
        return r.children.map((c) => (c && typeof c === 'object' && 'studentName' in c ? String(c.studentName) : '')).join(', ');
      }
      return '';
    case 'class':
    case 'classes':
      return Array.isArray(r.classes) ? r.classes.length : (r.className ?? r.name);
    case 'campus':
      return Array.isArray(r.campusNames) ? r.campusNames.join(', ') : (r.campusName ?? r.campus);
    case 'role':
      return r.roleLabel ?? r.role;
    case 'status':
    case 'state':
      return r.status ?? r.state;
    case 'last':
      return r.lastLoginAt ?? '';
    case 'link':
      return r.teacherName ?? '';
    case 'years':
      return r.years ?? 0;
    case 'fee':
      return r.fee ?? 0;
    case 'paid':
      return r.paid ?? 0;
    case 'debt':
      return r.debt ?? 0;
    case 'due':
      return r.dueAt ?? r.dueDate ?? '';
    case 'attendance':
      return r.attendanceRate ?? r.attendance ?? 0;
    case 'progress':
      return typeof r.sessionsDone === 'number' && typeof r.sessionsTotal === 'number'
        ? r.sessionsDone / (r.sessionsTotal || 1)
        : (r.progress ?? 0);
    case 'materials':
      return typeof r.materialCount === 'number' ? r.materialCount : (Array.isArray(r.materials) ? r.materials.length : 0);
    case 'assignments':
      return typeof r.assignmentCount === 'number' ? r.assignmentCount : (Array.isArray(r.assignments) ? r.assignments.length : 0);
    case 'prompt':
      return r.prompt ?? '';
    case 'skill':
      return r.skill ?? '';
    case 'type':
      return r.itemType ?? r.type ?? '';
    case 'points':
      return r.points ?? 0;
    case 'usage':
      return r.usageCount ?? 0;
    case 'count':
      return r.count ?? 0;
    case 'total':
      return r.total ?? 0;
    case 'listening':
    case 'speaking':
    case 'reading':
    case 'writing':
      if (r.totals && typeof r.totals === 'object') {
        const totals = r.totals as Record<string, { earned: number; max: number }>;
        const skillData = totals[key];
        return skillData && skillData.max > 0 ? (skillData.earned / skillData.max) * 100 : -1;
      }
      return r[key];
    case 'graded':
      return r.gradedCount ?? r.graded ?? 0;
    default:
      // Hỗ trợ cột child-0, child-1, ... trong ParentList
      if (key.startsWith('child-')) {
        const idx = Number(key.replace('child-', ''));
        if (Array.isArray(r.children) && r.children[idx]) {
          return (r.children[idx] as { studentName?: string }).studentName ?? '';
        }
      }
      return r[key];
  }
}

// Sắp xếp một mảng dòng dữ liệu
export function sortRows<T>(
  rows: T[],
  key: string,
  direction: SortDirection = 'asc',
  getValue?: (row: T) => unknown,
): T[] {
  return [...rows].sort((a, b) => {
    const valA = getRowSortValue(a, key, getValue);
    const valB = getRowSortValue(b, key, getValue);
    return compareValues(valA, valB, direction);
  });
}
