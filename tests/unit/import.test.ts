import { describe, expect, it } from 'vitest';
import { buildTemplate, readImportFile } from '@/lib/import/excel';
import { parseDate, parseGender, parsePhone, parseRelation, parseRow, parseStatus, parseTime, parseWeekdayList, parseWhole } from '@/lib/import/rows';

describe('đọc ô của file nhập', () => {
  it('số điện thoại: bỏ khoảng trắng, đổi +84, thêm số 0 bị Excel làm mất', () => {
    expect(parsePhone('0901 000 101')).toBe('0901000101');
    expect(parsePhone('+84901000101')).toBe('0901000101');
    expect(parsePhone(901000101)).toBe('0901000101');
    expect(parsePhone('')).toBe('');
    expect(parsePhone('12345')).toBeNull();
  });

  it('ngày: dd/mm/yyyy, yyyy-mm-dd, ô ngày và số ngày của Excel; ngày không có thật bị từ chối', () => {
    expect(parseDate('15/03/2010')).toBe('2010-03-15');
    expect(parseDate('2010-3-5')).toBe('2010-03-05');
    expect(parseDate(new Date(Date.UTC(2026, 10, 2)))).toBe('2026-11-02');
    expect(parseDate(46328)).toBe('2026-11-02');
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('')).toBe('');
  });

  it('giờ: 18:30, 18h30, phần ngày của Excel', () => {
    expect(parseTime('18:30')).toBe('18:30');
    expect(parseTime('8h05')).toBe('08:05');
    expect(parseTime(0.75)).toBe('18:00');
    expect(parseTime('25:00')).toBeNull();
  });

  it('số nguyên có dấu phân cách, ngày học trong tuần, giới tính, trạng thái, quan hệ', () => {
    expect(parseWhole('12.000.000')).toBe(12_000_000);
    expect(parseWhole('abc')).toBeNaN();
    expect(parseWeekdayList('T6, T2 T4')).toBe('T2,T4,T6');
    expect(parseWeekdayList('Thứ 3, Chủ nhật')).toBe('T3,CN');
    expect(parseWeekdayList('T9')).toBeNull();
    expect(parseGender('Nữ')).toBe('female');
    expect(parseStatus('Bảo lưu')).toBe('paused');
    expect(parseRelation('Người giám hộ')).toBe('guardian');
    expect(parseRelation('ông')).toBeNull();
  });
});

describe('đọc một dòng', () => {
  it('dòng trống bị bỏ qua; thiếu cơ sở và lớp thì báo lỗi', () => {
    expect(parseRow({ rowNumber: 2, cells: { campusName: '', studentName: null } })).toBeNull();
    const row = parseRow({ rowNumber: 3, cells: { studentName: 'Nguyễn An' } });
    expect(row?.errors).toEqual(expect.arrayContaining(['Thiếu tên cơ sở.', 'Thiếu mã lớp.']));
  });

  it('phụ huynh phải có số điện thoại và đi cùng học sinh', () => {
    const row = parseRow({ rowNumber: 4, cells: { campusName: 'CS', className: 'L1', parentName: 'Bố An' } });
    expect(row?.errors).toEqual(expect.arrayContaining(['Thiếu SĐT phụ huynh.', 'Phụ huynh phải đi cùng một học sinh trên cùng dòng.']));
  });

  it('mã học sinh sai dạng và giờ kết thúc trước giờ bắt đầu bị báo lỗi', () => {
    const row = parseRow({ rowNumber: 5, cells: { campusName: 'CS', className: 'L1', studentCode: 'ABC', startTime: '19:00', endTime: '18:00' } });
    expect(row?.errors).toEqual(expect.arrayContaining(['Mã học sinh "ABC" không đúng dạng HS-00001.', 'Giờ kết thúc phải sau giờ bắt đầu.']));
  });

  const base = { campusName: 'CS', className: 'L1', studentName: 'Phạm Trí Quân', gender: 'Nam', parentName: 'Trần Thị Hiền', relation: 'Mẹ' };

  it('ô SĐT phụ huynh có hai số: lấy số đầu, số sau vào ghi chú học sinh, không báo lỗi', () => {
    for (const phone of ['0336018115 -0922240886', '0336018115-0922240886', '0336018115, 0922240886', '0336 018 115 và 0922 240 886']) {
      const row = parseRow({ rowNumber: 6, cells: { ...base, parentPhone: phone, studentNote: 'Hay quên vở' } });
      expect(row?.errors).toEqual([]);
      expect(row?.parent?.phone).toBe('0336018115');
      expect(row?.student?.note).toBe('Hay quên vở. SĐT khác của phụ huynh: 0922240886');
      expect(row?.notes[0]).toMatch(/có 2 số: dùng 0336018115/);
    }
    // Một cụm sai vẫn báo lỗi như cũ
    expect(parseRow({ rowNumber: 7, cells: { ...base, parentPhone: '0336018115 - abc' } })?.errors).toContain('SĐT phụ huynh phải gồm 10 số, bắt đầu bằng 0.');
  });

  it('trợ giảng trùng giáo viên chủ nhiệm thì bỏ ô trợ giảng', () => {
    const row = parseRow({ rowNumber: 8, cells: { ...base, parentPhone: '0969335597', teacherName: 'Nguyễn Thị Phượng', teacherPhone: '0397245240', assistantName: 'Nguyễn Thị Phượng', assistantPhone: '0397245240' } });
    expect(row?.errors).toEqual([]);
    expect(row?.assistant).toBeNull();
    expect(row?.notes).toContain('Trợ giảng trùng giáo viên chủ nhiệm nên bỏ ô trợ giảng.');
  });

  it('không có ngày sinh thì không báo lỗi', () => {
    const row = parseRow({ rowNumber: 9, cells: { ...base, parentPhone: '0969335597' } });
    expect(row?.errors).toEqual([]);
    expect(row?.student?.dob).toBe('');
  });
});

describe('file mẫu', () => {
  it('tạo file mẫu rồi đọc lại: đủ cột, các dòng mẫu không có lỗi định dạng', async () => {
    const bytes = await buildTemplate();
    const read = await readImportFile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.rows).toHaveLength(3);
    const parsed = read.rows.map(parseRow);
    expect(parsed.every((r) => r !== null && r.errors.length === 0)).toBe(true);
    expect(parsed[0]?.teacher).toEqual({ name: 'Cô Thu Hà', phone: '0901000101' });
    expect(parsed[0]?.klass.startDate).toBe('2026-11-02');
    expect(parsed[1]?.student?.gender).toBe('female');
  });

  it('file không đúng định dạng thì báo lỗi dễ hiểu', async () => {
    const read = await readImportFile(new TextEncoder().encode('không phải excel').buffer as ArrayBuffer);
    expect(read.ok).toBe(false);
  });
});
