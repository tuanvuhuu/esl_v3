// Tải hoặc xem một tệp tải lên (âm thanh của đề, bài nộp). Cần quyền xem học sinh, giống các màn bài tập.
import { connection } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { studentMayReadFile } from '@/lib/queries/student-portal';
import { getCurrentAccount, getCurrentPermissions } from '@/lib/session';
import { readUpload } from '@/lib/storage';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Quyền đọc theo phiên hiện tại, chỉ kiểm lúc có yêu cầu (docs: connection())
  await connection();
  const { id: raw } = await params;
  if (!/^\d+$/.test(raw)) return new Response('Không tìm thấy tệp', { status: 404 });

  // Người quản lý xem mọi tệp. Học sinh chỉ xem tệp bài làm của chính mình hoặc âm thanh câu trong lớp mình (P28).
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) {
    const account = await getCurrentAccount();
    if (!account || account.role !== 'student' || account.studentId === null) return new Response('Không có quyền xem tệp này', { status: 403 });
    if (!(await studentMayReadFile(account.studentId, Number(raw)))) return new Response('Không có quyền xem tệp này', { status: 403 });
  }

  const file = await readUpload(Number(raw));
  if (!file) return new Response('Không tìm thấy tệp', { status: 404 });

  // Trả đúng loại đã kiểm khi tải lên. Không cho trình duyệt đoán loại và không cho chạy script trong tệp.
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(file.bytes.length),
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, no-store',
    },
  });
}
