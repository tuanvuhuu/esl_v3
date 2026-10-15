// Tệp tải lên không còn được dùng (P29). Chỉ chạy trên server.
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

// Tệp đã quá 24 giờ và không còn được tham chiếu ở đâu: âm thanh câu, tệp bài nộp, âm thanh ngân hàng, tài liệu bài giảng
const ORPHAN_SQL = sql`
  SELECT f.id, f.storage_key, f.size_bytes
  FROM uploaded_files f
  WHERE f.created_at < now() - interval '24 hours'
    AND NOT EXISTS (SELECT 1 FROM assignment_items i WHERE i.audio_file_id = f.id)
    AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.audio_file_id = f.id)
    AND NOT EXISTS (SELECT 1 FROM submission_item_scores s WHERE s.file_id = f.id)
    AND NOT EXISTS (SELECT 1 FROM lesson_materials m WHERE m.file_id = f.id)
`;

export type OrphanFile = { id: number; storageKey: string; sizeBytes: number };

export async function listOrphanFiles(): Promise<OrphanFile[]> {
  const result = await db.execute<{ id: number; storage_key: string; size_bytes: number }>(ORPHAN_SQL);
  return result.rows.map((r) => ({ id: r.id, storageKey: r.storage_key, sizeBytes: r.size_bytes }));
}
