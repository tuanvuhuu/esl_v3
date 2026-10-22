// Cột của file mẫu nhập dữ liệu (Excel một sheet). Mỗi dòng là một học sinh, kèm cơ sở, lớp, giáo viên và một phụ huynh.
// Dòng không có học sinh thì chỉ tạo hoặc cập nhật lớp. Dùng chung cho file mẫu và bộ đọc file. Hàm thuần.

export type ImportGroup = 'campus' | 'class' | 'staff' | 'student' | 'parent';

export type ImportColumnKey =
  | 'campusName'
  | 'campusAddress'
  | 'className'
  | 'course'
  | 'weekdays'
  | 'startTime'
  | 'endTime'
  | 'classStartDate'
  | 'sessionsTotal'
  | 'fee'
  | 'room'
  | 'capacity'
  | 'teacherName'
  | 'teacherPhone'
  | 'assistantName'
  | 'assistantPhone'
  | 'foreignName'
  | 'foreignPhone'
  | 'studentCode'
  | 'studentName'
  | 'gender'
  | 'dob'
  | 'status'
  | 'studentStartDate'
  | 'studentNote'
  | 'parentName'
  | 'parentPhone'
  | 'parentEmail'
  | 'relation';

export type ImportColumn = {
  key: ImportColumnKey;
  header: string; // tiêu đề cột trong file. Dấu * là bắt buộc
  group: ImportGroup;
  width: number;
  text?: boolean; // định dạng Text trong Excel để giữ số 0 đầu (số điện thoại, ngày)
  note: string; // ghi chú hiện khi rê chuột vào tiêu đề cột
  choices?: readonly string[]; // danh sách chọn trong Excel
};

export const GENDER_CHOICES = ['Nam', 'Nữ'] as const;
export const STATUS_CHOICES = ['Đang học', 'Học thử', 'Bảo lưu', 'Đã nghỉ'] as const;
export const RELATION_CHOICES = ['Bố', 'Mẹ', 'Người giám hộ', 'Khác'] as const;

export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'campusName', header: 'Tên cơ sở *', group: 'campus', width: 18, note: 'Trùng tên với cơ sở đã có thì cập nhật, chưa có thì thêm mới.' },
  { key: 'campusAddress', header: 'Địa chỉ cơ sở', group: 'campus', width: 28, note: 'Để trống thì giữ địa chỉ cũ.' },

  { key: 'className', header: 'Mã lớp *', group: 'class', width: 14, note: 'Mã lớp duy nhất trong từng cơ sở. Đã có thì cập nhật, chưa có thì tạo lớp mới.' },
  { key: 'course', header: 'Khoá học', group: 'class', width: 22, note: 'Bắt buộc khi tạo lớp mới.' },
  { key: 'weekdays', header: 'Ngày học', group: 'class', width: 12, note: 'VD: T2,T4,T6 (CN là Chủ nhật). Bắt buộc khi tạo lớp mới. Lớp đã có giữ lịch cũ.' },
  { key: 'startTime', header: 'Giờ bắt đầu', group: 'class', width: 11, text: true, note: 'Dạng HH:MM, VD 18:30. Bắt buộc khi tạo lớp mới.' },
  { key: 'endTime', header: 'Giờ kết thúc', group: 'class', width: 11, text: true, note: 'Dạng HH:MM, sau giờ bắt đầu. Bắt buộc khi tạo lớp mới.' },
  { key: 'classStartDate', header: 'Ngày khai giảng', group: 'class', width: 14, text: true, note: 'Dạng dd/mm/yyyy. Bắt buộc khi tạo lớp mới, dùng để sinh buổi học.' },
  { key: 'sessionsTotal', header: 'Số buổi', group: 'class', width: 9, note: 'Số nguyên. Bắt buộc khi tạo lớp mới.' },
  { key: 'fee', header: 'Học phí (VND)', group: 'class', width: 14, note: 'Số nguyên, VD 12000000. Bắt buộc khi tạo lớp mới.' },
  { key: 'room', header: 'Phòng', group: 'class', width: 9, note: 'Không bắt buộc.' },
  { key: 'capacity', header: 'Sĩ số tối đa', group: 'class', width: 11, note: 'Số nguyên. Bắt buộc khi tạo lớp mới.' },

  { key: 'teacherName', header: 'GV chủ nhiệm', group: 'staff', width: 18, note: 'Bắt buộc khi tạo lớp mới. Tìm theo số điện thoại, không có số thì theo họ tên.' },
  { key: 'teacherPhone', header: 'SĐT GV chủ nhiệm', group: 'staff', width: 14, text: true, note: '10 số, bắt đầu bằng 0.' },
  { key: 'assistantName', header: 'Trợ giảng', group: 'staff', width: 18, note: 'Không bắt buộc.' },
  { key: 'assistantPhone', header: 'SĐT trợ giảng', group: 'staff', width: 14, text: true, note: '10 số, bắt đầu bằng 0.' },
  { key: 'foreignName', header: 'GV nước ngoài', group: 'staff', width: 18, note: 'Không bắt buộc.' },
  { key: 'foreignPhone', header: 'SĐT GV nước ngoài', group: 'staff', width: 14, text: true, note: '10 số, bắt đầu bằng 0.' },

  { key: 'studentCode', header: 'Mã HS', group: 'student', width: 10, text: true, note: 'VD HS-00012. Có mã thì cập nhật đúng học sinh đó. Để trống thì tìm theo họ tên và ngày sinh.' },
  { key: 'studentName', header: 'Họ tên học sinh', group: 'student', width: 20, note: 'Để trống cả dòng học sinh nếu dòng chỉ khai báo lớp.' },
  { key: 'gender', header: 'Giới tính', group: 'student', width: 9, note: 'Nam hoặc Nữ. Bắt buộc với học sinh mới.', choices: GENDER_CHOICES },
  { key: 'dob', header: 'Ngày sinh', group: 'student', width: 12, text: true, note: 'Dạng dd/mm/yyyy. Để trống nếu chưa biết.' },
  { key: 'status', header: 'Trạng thái', group: 'student', width: 11, note: 'Để trống thì học sinh mới là Đang học.', choices: STATUS_CHOICES },
  { key: 'studentStartDate', header: 'Ngày bắt đầu học', group: 'student', width: 14, text: true, note: 'Dạng dd/mm/yyyy. Để trống thì học sinh mới lấy ngày nhập.' },
  { key: 'studentNote', header: 'Ghi chú học sinh', group: 'student', width: 22, note: 'Không bắt buộc.' },

  { key: 'parentName', header: 'Họ tên phụ huynh', group: 'parent', width: 20, note: 'Bắt buộc với phụ huynh mới.' },
  { key: 'parentPhone', header: 'SĐT phụ huynh', group: 'parent', width: 14, text: true, note: 'Bắt buộc khi có phụ huynh. Đã có số này thì cập nhật, chưa có thì thêm mới.' },
  { key: 'parentEmail', header: 'Email phụ huynh', group: 'parent', width: 22, note: 'Không bắt buộc.' },
  { key: 'relation', header: 'Quan hệ', group: 'parent', width: 13, note: 'Bố, Mẹ, Người giám hộ hoặc Khác.', choices: RELATION_CHOICES },
];

// Tiêu đề so khớp không phân biệt hoa thường, bỏ dấu * và khoảng trắng thừa
export function headerKey(text: string): string {
  return text.replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export const COLUMN_BY_HEADER: ReadonlyMap<string, ImportColumnKey> = new Map(IMPORT_COLUMNS.map((c) => [headerKey(c.header), c.key]));

// Dữ liệu mẫu trong file: hai học sinh cùng lớp, một dòng chỉ khai báo lớp
export const TEMPLATE_EXAMPLES: Partial<Record<ImportColumnKey, string | number>>[] = [
  {
    campusName: 'Cơ sở test', campusAddress: 'Dữ liệu thử nghiệm, không phải cơ sở thật', className: 'IELTS-MAU1', course: 'IELTS Foundation 5.5',
    weekdays: 'T2,T4,T6', startTime: '18:30', endTime: '20:30', classStartDate: '02/11/2026', sessionsTotal: 36, fee: 12000000, room: 'P.201', capacity: 20,
    teacherName: 'Cô Thu Hà', teacherPhone: '0901000101', assistantName: 'Cô Lan Anh', assistantPhone: '0901000203', foreignName: 'Ms. Emily Carter', foreignPhone: '0901000201',
    studentName: 'Nguyễn Văn Mẫu', gender: 'Nam', dob: '15/03/2010', status: 'Đang học', studentStartDate: '02/11/2026',
    parentName: 'Nguyễn Văn Bố', parentPhone: '0912345678', parentEmail: 'bo.mau@example.com', relation: 'Bố',
  },
  {
    campusName: 'Cơ sở test', className: 'IELTS-MAU1',
    studentName: 'Trần Thị Mẫu', gender: 'Nữ', dob: '20/07/2011', status: 'Học thử',
    parentName: 'Trần Thị Mẹ', parentPhone: '0912345679', relation: 'Mẹ',
  },
  {
    campusName: 'Cơ sở test', className: 'KIDS-MAU1', course: 'Starters (Thiếu nhi)',
    weekdays: 'T3,T5', startTime: '16:00', endTime: '17:30', classStartDate: '03/11/2026', sessionsTotal: 24, fee: 5200000, room: 'P.301', capacity: 14,
    teacherName: 'Cô Ngọc Ánh', teacherPhone: '0901000105',
  },
];
