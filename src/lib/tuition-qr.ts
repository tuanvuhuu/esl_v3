// Mã VietQR cho khoản học phí còn thiếu của một học sinh (37.13). Chỉ chạy trên server.
import QRCode from 'qrcode';
import { getCenterSettings } from '@/lib/queries/settings';
import { formatVND } from '@/lib/money';
import { studentCode } from '@/lib/student-code';
import { bankName, isBankReady, transferNote, vietQrPayload } from '@/lib/vietqr';

export type TuitionQr = { png: Uint8Array; payload: string; note: string; bankLine: string };

// Nội dung chuyển khoản "HP HS-00076 Do Minh Dang": kế toán đối chiếu sao kê theo mã học sinh
export function tuitionNote(studentId: number, name: string): string {
  return transferNote(`HP ${studentCode(studentId)} ${name}`);
}

// null khi trung tâm chưa nhập tài khoản nhận học phí trong Cài đặt
export async function tuitionQr(studentId: number, name: string, amount: number): Promise<TuitionQr | null> {
  const s = await getCenterSettings();
  if (!isBankReady({ bin: s.bankBin, account: s.bankAccount })) return null;
  const note = tuitionNote(studentId, name);
  const payload = vietQrPayload({ bin: s.bankBin, account: s.bankAccount, amount, note });
  const png = await QRCode.toBuffer(payload, { type: 'png', margin: 2, width: 480, errorCorrectionLevel: 'M' });
  const owner = s.bankAccountName ? ` · ${s.bankAccountName}` : '';
  const money = amount > 0 ? formatVND(amount) : 'phụ huynh tự nhập số tiền';
  return { png: new Uint8Array(png), payload, note, bankLine: `${bankName(s.bankBin)} ${s.bankAccount}${owner} · ${money} · nội dung: ${note}` };
}
