// Mã VietQR chuyển khoản (chuẩn EMVCo của NAPAS). Tạo ngay trên máy chủ, không gọi dịch vụ ngoài.
// Phụ huynh quét bằng app ngân hàng bất kỳ: số tài khoản, số tiền và nội dung được điền sẵn. Hàm thuần, có unit test.

// Mã BIN của các ngân hàng hay dùng (danh sách NAPAS). Thiếu ngân hàng nào thì bổ sung vào đây.
export const BANKS = [
  { bin: '970436', name: 'Vietcombank' },
  { bin: '970415', name: 'VietinBank' },
  { bin: '970418', name: 'BIDV' },
  { bin: '970405', name: 'Agribank' },
  { bin: '970422', name: 'MB Bank' },
  { bin: '970407', name: 'Techcombank' },
  { bin: '970416', name: 'ACB' },
  { bin: '970432', name: 'VPBank' },
  { bin: '970423', name: 'TPBank' },
  { bin: '970403', name: 'Sacombank' },
  { bin: '970441', name: 'VIB' },
  { bin: '970443', name: 'SHB' },
  { bin: '970437', name: 'HDBank' },
  { bin: '970448', name: 'OCB' },
  { bin: '970426', name: 'MSB' },
  { bin: '970440', name: 'SeABank' },
  { bin: '970449', name: 'LPBank' },
  { bin: '970431', name: 'Eximbank' },
  { bin: '970428', name: 'Nam A Bank' },
  { bin: '970409', name: 'Bac A Bank' },
] as const;

export function bankName(bin: string): string {
  return BANKS.find((b) => b.bin === bin)?.name ?? bin;
}

// Một trường EMVCo: mã 2 số, độ dài 2 số, giá trị
function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

// CRC-16/CCITT-FALSE (đa thức 0x1021, khởi tạo 0xFFFF), 4 chữ số hex viết hoa
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i += 1) {
    crc ^= text.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b += 1) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Nội dung chuyển khoản: bỏ dấu, chữ hoa, chỉ chữ số và khoảng trắng (app ngân hàng nào cũng nhận), tối đa 25 ký tự
export function transferNote(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 25)
    .trim();
}

export type BankAccount = { bin: string; account: string; accountName: string };

// Tài khoản nhận đủ thông tin để tạo mã (BIN 6 số, số tài khoản 6–19 chữ số)
export function isBankReady(b: { bin: string; account: string }): boolean {
  return /^\d{6}$/.test(b.bin) && /^\d{6,19}$/.test(b.account);
}

// Chuỗi dữ liệu của mã QR. amount là số nguyên VND (0 = để người chuyển tự nhập).
export function vietQrPayload(input: { bin: string; account: string; amount: number; note: string }): string {
  const beneficiary = field('00', input.bin) + field('01', input.account);
  const merchant = field('00', 'A000000727') + field('01', beneficiary) + field('02', 'QRIBFTTA');
  const note = transferNote(input.note);
  let body =
    field('00', '01') +
    field('01', input.amount > 0 ? '12' : '11') +
    field('38', merchant) +
    field('53', '704') +
    (input.amount > 0 ? field('54', String(Math.round(input.amount))) : '') +
    field('58', 'VN');
  if (note) body += field('62', field('08', note));
  body += '6304';
  return body + crc16(body);
}
