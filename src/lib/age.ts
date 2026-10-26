// Tuổi và nhóm tuổi (YYYY-MM-DD). Hàm thuần.

// Tuổi tròn tại ngày todayKey; dob trống thì trả null (không biết)
export function ageOn(dob: string | null, todayKey: string): number | null {
  if (!dob) return null;
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = todayKey.split('-').map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age--;
  return age;
}

// Trẻ 3–5 tuổi: màn làm bài dùng nút lớn hơn (tối thiểu 64px). Không biết tuổi thì dùng cỡ thường.
export function isYoungLearner(dob: string | null, todayKey: string): boolean {
  const age = ageOn(dob, todayKey);
  return age !== null && age <= 5;
}
