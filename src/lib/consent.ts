// Đồng ý của phụ huynh (P35.12). Hàm thuần, dùng ở server, giao diện và bot Telegram.
// Đồng ý theo từng mục đích, rõ ràng, lưu được bằng chứng; im lặng không phải đồng ý; rút lại thì ngừng xử lý
// (Luật 91/2025/QH15 Điều 9, 24; tóm tắt ở docs/NGHIEN-CUU-TINH-NANG-P35.md mục 10). Cần luật sư đọc lại trước khi chạy thật.

export type ConsentPurpose = 'voice_teacher_review' | 'voice_auto_scoring';
export const CONSENT_PURPOSES: ConsentPurpose[] = ['voice_teacher_review', 'voice_auto_scoring'];

// Đổi nội dung thì tăng phiên bản: dòng đồng ý lưu phiên bản phụ huynh đã đọc
export const CONSENT_TERMS_VERSION = '2026-10-22';

export const CONSENT_LABELS: Record<ConsentPurpose, string> = {
  voice_teacher_review: 'Ghi âm để giáo viên chấm bài nói',
  voice_auto_scoring: 'Gửi giọng nói tới dịch vụ chấm phát âm tự động',
};

// Nội dung hiện cho phụ huynh trước khi đồng ý: dữ liệu gì, để làm gì, ai nghe được, lưu bao lâu, cách rút lại
export const CONSENT_TERMS: Record<ConsentPurpose, string> = {
  voice_teacher_review:
    'Trung tâm xin phép phụ huynh cho con ghi âm giọng nói khi làm bài tập nói trên ứng dụng. ' +
    'Bản ghi chỉ dùng để giáo viên nghe, chấm điểm và chỉ lỗi phát âm cho con. ' +
    'Chỉ giáo viên của lớp, con và phụ huynh nghe được. Bản ghi được lưu tối đa 24 tháng hoặc tới khi con nghỉ học, sau đó tự xoá. ' +
    'Phụ huynh có thể rút lại đồng ý bất cứ lúc nào bằng cách nhắn trung tâm; khi rút lại, con không ghi âm được nữa và trung tâm xoá các bản ghi nếu phụ huynh yêu cầu.',
  voice_auto_scoring:
    'Trung tâm xin phép gửi bản ghi giọng nói của con tới một dịch vụ chấm phát âm tự động để gợi ý điểm cho giáo viên. ' +
    'Giáo viên vẫn quyết định điểm cuối cùng. Việc này tách riêng với việc ghi âm cho giáo viên chấm; không đồng ý thì con vẫn làm bài nói bình thường. ' +
    'Phụ huynh có thể rút lại đồng ý bất cứ lúc nào.',
};

export type ConsentRow = { purpose: ConsentPurpose; granted: boolean; decidedAt: Date; withdrawnAt: Date | null; childAgreedAt: Date | null };
export type ConsentStatus = 'granted' | 'refused' | 'withdrawn' | 'none';

// Trạng thái hiện tại của một mục đích: dòng mới nhất quyết định
export function consentStatus(rows: ConsentRow[], purpose: ConsentPurpose): { status: ConsentStatus; row: ConsentRow | null } {
  const mine = rows.filter((r) => r.purpose === purpose).sort((a, b) => b.decidedAt.getTime() - a.decidedAt.getTime());
  const row = mine[0] ?? null;
  if (!row) return { status: 'none', row: null };
  if (!row.granted) return { status: 'refused', row };
  if (row.withdrawnAt) return { status: 'withdrawn', row };
  return { status: 'granted', row };
}

export const CONSENT_STATUS_LABELS: Record<ConsentStatus, string> = {
  granted: 'Đã đồng ý',
  refused: 'Không đồng ý',
  withdrawn: 'Đã rút lại',
  none: 'Chưa hỏi',
};

// Tuổi tròn theo ngày sinh và ngày hôm nay, cùng dạng "YYYY-MM-DD" (ngày theo giờ Việt Nam, do nơi gọi truyền vào)
export function ageOn(dob: string, todayKey: string): number {
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = todayKey.split('-').map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age--;
  return age;
}

// Trẻ từ đủ 7 tuổi cần tự đồng ý thêm (sau khi phụ huynh đã đồng ý)
export const CHILD_CONSENT_AGE = 7;

// Học sinh được ghi âm khi phụ huynh đang đồng ý; trẻ từ 7 tuổi thì cần cả trẻ đồng ý.
// needsChild = true: phụ huynh đã đồng ý, chỉ còn chờ trẻ bấm đồng ý trong khu học sinh.
// Chưa có ngày sinh thì không biết tuổi: xin cả trẻ đồng ý cho chắc.
export function voiceAccess(rows: ConsentRow[], dob: string | null, todayKey: string): { allowed: boolean; needsChild: boolean } {
  const { status, row } = consentStatus(rows, 'voice_teacher_review');
  if (status !== 'granted' || !row) return { allowed: false, needsChild: false };
  if ((!dob || ageOn(dob, todayKey) >= CHILD_CONSENT_AGE) && !row.childAgreedAt) return { allowed: false, needsChild: true };
  return { allowed: true, needsChild: false };
}
