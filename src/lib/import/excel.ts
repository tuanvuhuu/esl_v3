// Đọc và ghi file Excel cho chức năng nhập dữ liệu. Chỉ chạy trên server.
import ExcelJS from 'exceljs';
import { COLUMN_BY_HEADER, headerKey, IMPORT_COLUMNS, TEMPLATE_EXAMPLES, type ImportColumnKey, type ImportGroup } from './columns';
import type { CellValue, RawRow } from './rows';

// Server Action nhận tối đa 1 MB mỗi yêu cầu (mặc định của Next.js). File 2000 dòng thường dưới 300 KB.
export const MAX_IMPORT_BYTES = 900 * 1024;
export const MAX_IMPORT_ROWS = 2000;
export const TEMPLATE_SHEET = 'Du lieu';

// Màu nền tiêu đề theo nhóm, theo bảng màu nhạt của giao diện
const GROUP_FILL: Record<ImportGroup, string> = {
  campus: 'FFE7F0EA',
  class: 'FFFFF4D6',
  staff: 'FFEDE9FB',
  student: 'FFE3EEFB',
  parent: 'FFFBE5E1',
};

// File mẫu: một sheet, tiêu đề ở dòng 1, dữ liệu mẫu từ dòng 2. Cột chọn có danh sách, cột số điện thoại và ngày định dạng Text.
export async function buildTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ESL Center';
  const sheet = workbook.addWorksheet(TEMPLATE_SHEET, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.text ? { numFmt: '@' } : {} }));

  const header = sheet.getRow(1);
  header.height = 30;
  IMPORT_COLUMNS.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GROUP_FILL[c.group] } };
    cell.note = c.note;
  });

  for (const example of TEMPLATE_EXAMPLES) {
    sheet.addRow(IMPORT_COLUMNS.map((c) => example[c.key] ?? null));
  }

  // Danh sách chọn cho giới tính, trạng thái, quan hệ, áp dụng 500 dòng đầu
  IMPORT_COLUMNS.forEach((c, i) => {
    if (!c.choices) return;
    for (let r = 2; r <= 501; r++) {
      sheet.getCell(r, i + 1).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${c.choices.join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Giá trị không hợp lệ',
        error: `Chọn một trong: ${c.choices.join(', ')}`,
      };
    }
  });

  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data as ArrayBuffer);
}

// Giá trị một ô của exceljs: chữ có định dạng, liên kết, công thức đều đổi về giá trị thường
function plainValue(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((t) => t.text).join('');
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value) return plainValue(value.result as ExcelJS.CellValue);
    if ('error' in value) return null;
    // Ô công thức chưa có kết quả hoặc kiểu khác: coi như trống, không biến thành chuỗi "[object Object]"
    return null;
  }
  return String(value);
}

export type ReadResult = { ok: true; rows: RawRow[] } | { ok: false; message: string };

// Đọc sheet đầu tiên. Tiêu đề ở dòng 1, so theo tên cột của file mẫu (không phân biệt hoa thường, bỏ dấu *).
export async function readImportFile(bytes: ArrayBuffer): Promise<ReadResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(bytes);
  } catch {
    return { ok: false, message: 'Không đọc được file. Hãy dùng file .xlsx tải từ nút "Tải file mẫu".' };
  }
  const sheet = workbook.getWorksheet(TEMPLATE_SHEET) ?? workbook.worksheets[0];
  if (!sheet) return { ok: false, message: 'File không có sheet nào.' };

  const columnOf = new Map<number, ImportColumnKey>();
  sheet.getRow(1).eachCell((cell, col) => {
    const key = COLUMN_BY_HEADER.get(headerKey(String(plainValue(cell.value) ?? '')));
    if (key) columnOf.set(col, key);
  });
  const found = new Set(columnOf.values());
  const missing = (['campusName', 'className'] as const).filter((k) => !found.has(k));
  if (missing.length > 0) {
    const names = IMPORT_COLUMNS.filter((c) => (missing as readonly string[]).includes(c.key)).map((c) => `"${c.header}"`);
    return { ok: false, message: `File thiếu cột ${names.join(', ')}. Hãy dùng file mẫu và giữ nguyên dòng tiêu đề.` };
  }

  const rows: RawRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells: RawRow['cells'] = {};
    columnOf.forEach((key, col) => {
      cells[key] = plainValue(row.getCell(col).value);
    });
    rows.push({ rowNumber, cells });
  });
  if (rows.length > MAX_IMPORT_ROWS) return { ok: false, message: `File có ${rows.length} dòng, tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần.` };
  return { ok: true, rows };
}
