// Chuyển một ca học sang vị trí khác trong form lớp (kéo thả): đổi thứ tự trong cùng ngày, hoặc sang ngày khác.
// Một ngày luôn còn ít nhất một ca (không chuyển ca cuối cùng đi), và ngày nhận không quá max ca. Hàm thuần.
export type SlotPos = { code: string; index: number };

export function moveSlot<T>(lists: ReadonlyMap<string, readonly T[]>, from: SlotPos, to: SlotPos, max: number): Map<string, T[]> | null {
  const src = lists.get(from.code);
  if (!src || from.index < 0 || from.index >= src.length) return null;
  const moved = src[from.index];
  const next = new Map<string, T[]>([...lists].map(([k, v]) => [k, [...v]]));
  if (from.code === to.code) {
    const list = next.get(from.code)!;
    list.splice(from.index, 1);
    list.splice(Math.min(Math.max(to.index, 0), list.length), 0, moved);
    return next;
  }
  if (src.length <= 1) return null;
  const dst = next.get(to.code);
  if (!dst || dst.length >= max) return null;
  next.get(from.code)!.splice(from.index, 1);
  dst.splice(Math.min(Math.max(to.index, 0), dst.length), 0, moved);
  return next;
}
