// Màu riêng của từng lớp, dùng chung cho Lịch học và Tổng quan. Mỗi lớp một màu cố định theo mã lớp.
// Màu lấy từ token trong globals.css (bg: nền nhạt, edge: viền, ink: vạch đậm, text: chữ đậm).
export const CLASS_TONE: { bg: string; edge: string; ink: string; text: string }[] = [
  { bg: 'bg-mint', edge: 'border-mint-ink', ink: 'bg-mint-ink', text: 'text-mint-ink' },
  { bg: 'bg-lav', edge: 'border-lav-ink', ink: 'bg-lav-ink', text: 'text-lav-ink' },
  { bg: 'bg-butter', edge: 'border-butter-ink', ink: 'bg-butter-ink', text: 'text-butter-ink' },
  { bg: 'bg-blush', edge: 'border-blush-ink', ink: 'bg-blush-ink', text: 'text-blush-ink' },
  { bg: 'bg-stone', edge: 'border-stone-ink', ink: 'bg-stone-ink', text: 'text-stone-ink' },
];

export function classTone(classId: number) {
  return CLASS_TONE[Math.abs(classId) % CLASS_TONE.length];
}
