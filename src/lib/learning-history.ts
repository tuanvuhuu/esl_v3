// Gộp lịch sử học tập từ nhiều nguồn thành một dòng thời gian. Hàm thuần, có unit test.
// Nguồn: điểm danh (vắng, trễ), bài đã chấm, khoản thu học phí, sự kiện học tập (ghi chú, thăng cấp, thi, đổi lớp, đổi trạng thái).

export const HISTORY_KINDS = ['absent', 'late', 'graded', 'payment', 'note', 'level_up', 'exam', 'class_change', 'status_change'] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];

export const HISTORY_KIND_LABELS: Record<HistoryKind, string> = {
  absent: 'Vắng',
  late: 'Trễ',
  graded: 'Bài tập',
  payment: 'Học phí',
  note: 'Ghi chú',
  level_up: 'Thăng cấp',
  exam: 'Kiểm tra',
  class_change: 'Đổi lớp',
  status_change: 'Trạng thái',
};

export type HistoryItem = {
  id: string; // duy nhất trong danh sách, ví dụ "att-12", "pay-3"
  kind: HistoryKind;
  at: string; // ISO, thời điểm để sắp xếp
  title: string;
  detail: string;
  amount: number | null; // chỉ có với khoản thu học phí
  studentId: number;
  studentName: string;
  classId: number;
  className: string;
};

// Sắp xếp mới nhất trước. Nếu trùng thời điểm thì giữ thứ tự id để ổn định.
export function mergeHistory(items: HistoryItem[]): HistoryItem[] {
  return [...items].sort((a, b) => {
    const diff = Date.parse(b.at) - Date.parse(a.at);
    if (diff !== 0) return diff;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

// Lọc theo nhiều loại và nhiều lớp. Danh sách rỗng nghĩa là không lọc.
export function filterHistory(items: HistoryItem[], filter: { classIds?: number[]; kinds?: HistoryKind[] }): HistoryItem[] {
  return items.filter((i) => {
    if (filter.kinds?.length && !filter.kinds.includes(i.kind)) return false;
    if (filter.classIds?.length && !filter.classIds.includes(i.classId)) return false;
    return true;
  });
}
