// Tải file mẫu nhập dữ liệu (.xlsx). Cần quyền cài đặt trung tâm, giống màn Nhập dữ liệu.
import { connection } from 'next/server';
import { buildTemplate } from '@/lib/import/excel';
import { hasPermission } from '@/lib/permissions';
import { getCurrentPermissions } from '@/lib/session';

export async function GET() {
  await connection();
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'settings.manage')) return new Response('Không có quyền tải file mẫu', { status: 403 });

  const bytes = await buildTemplate();
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': String(bytes.length),
      'Content-Disposition': `attachment; filename="mau-nhap-du-lieu.xlsx"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
