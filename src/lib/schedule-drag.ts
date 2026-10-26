// Kéo buổi học trên lưới tuần (Lịch học): giờ bắt đầu mới theo độ dời theo chiều dọc, làm tròn 15 phút,
// kẹp trong khung giờ của lịch. Hàm thuần.
export const DRAG_SNAP_MIN = 15;

export function draggedStart(startMin: number, deltaY: number, columnPx: number, hourCount: number, frameStartMin: number, frameEndMin: number, durationMin: number): number {
  if (columnPx <= 0 || hourCount <= 0) return startMin;
  const minutesPerPx = (hourCount * 60) / columnPx;
  const snapped = Math.round((startMin + deltaY * minutesPerPx) / DRAG_SNAP_MIN) * DRAG_SNAP_MIN;
  return Math.min(Math.max(snapped, frameStartMin), Math.max(frameStartMin, frameEndMin - durationMin));
}

// "18:30" từ số phút trong ngày
export function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
