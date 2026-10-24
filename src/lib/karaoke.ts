// Karaoke đọc theo (35.7): chữ sáng dần theo giọng mẫu. Mốc bắt đầu của từng từ (mili giây) do giáo viên chạm theo giọng mẫu,
// hoặc chia đều theo độ dài từ khi chưa chỉnh. Lưu dạng chuỗi "0,420,900". Hàm thuần.

export function karaokeWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

// Chia đều theo độ dài: từ dài chiếm nhiều thời gian hơn (cộng 2 ký tự cho khoảng nghỉ giữa các từ)
export function evenTimings(words: string[], durationMs: number): number[] {
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return weights.map((w) => {
    const start = Math.round((acc / total) * durationMs);
    acc += w;
    return start;
  });
}

// Mốc đã lưu: đúng số từ, không âm, không giảm. Sai thì coi như chưa chỉnh (dùng chia đều).
export function parseTimings(raw: string | null | undefined, wordCount: number): number[] | null {
  if (!raw || !raw.trim()) return null;
  const parts = raw.split(',').map((p) => Number(p.trim()));
  if (parts.length !== wordCount || parts.some((n) => !Number.isInteger(n) || n < 0)) return null;
  for (let i = 1; i < parts.length; i++) if (parts[i] < parts[i - 1]) return null;
  return parts;
}

export function formatTimings(timings: number[]): string {
  return timings.map((t) => Math.max(0, Math.round(t))).join(',');
}

// Từ đang đọc tại thời điểm t: từ cuối cùng có mốc ≤ t; trước mốc đầu thì -1
export function activeWord(timings: number[], tMs: number): number {
  let idx = -1;
  for (let i = 0; i < timings.length; i++) {
    if (timings[i] <= tMs) idx = i;
    else break;
  }
  return idx;
}

// Máy đọc (không có giọng mẫu thu sẵn): ước lượng thời lượng để chữ vẫn sáng dần khi trình duyệt không báo từng từ
export function estimateDurationMs(words: string[], rate = 0.85): number {
  const chars = words.reduce((s, w) => s + w.length, 0);
  return Math.round((words.length * 260 + chars * 55) / rate);
}

// Trình duyệt báo vị trí ký tự đang đọc (sự kiện boundary): đổi ra số thứ tự từ
export function wordIndexAtChar(text: string, charIndex: number): number {
  const before = text.slice(0, Math.max(0, charIndex));
  return Math.max(0, karaokeWords(before + 'x').length - 1);
}
