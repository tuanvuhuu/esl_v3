// Trạng thái lần trình chiếu (35.19): máy chiếu và điện thoại hỏi lại mỗi giây để theo kịp bên kia. Chỉ người tạo đọc được.
import { connection } from 'next/server';
import { getOwnPresentation } from '@/lib/queries/presentation';
import { getCurrentAccount } from '@/lib/session';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const account = await getCurrentAccount();
  if (!account) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });
  const row = await getOwnPresentation(token, account.id);
  if (!row) return Response.json({ error: 'Không tìm thấy' }, { status: 404 });
  return Response.json({ slide: row.slide, revealed: row.revealed, version: row.version, mode: row.mode }, { headers: { 'Cache-Control': 'no-store' } });
}
