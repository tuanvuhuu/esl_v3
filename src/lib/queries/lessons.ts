// Bài giảng, cơ sở và tài liệu (P25). Chỉ chạy trên server.
import { asc, count, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { assignments, campuses, lessonCampuses, lessonMaterials, lessons, uploadedFiles } from '@/db/schema';
import type { CampusScope } from '@/lib/campus';
import { getAllowedCampusIds } from '@/lib/campus-access';
import type { MaterialKind } from '@/lib/validation/lesson';

export type LessonMaterial = {
  id: number;
  kind: MaterialKind;
  title: string;
  url: string;
  fileId: number | null;
  fileName: string | null;
};

export type LessonRow = {
  id: number;
  title: string;
  objectives: string;
  content: string;
  campusIds: number[];
  campusNames: string[];
  materials: LessonMaterial[];
  assignmentCount: number; // số bài tập đang gắn bài giảng này
};

// Bài giảng theo phạm vi cơ sở đang chọn ở thanh trên. Phạm vi "Tất cả cơ sở" thì lấy hết.
export async function listLessons(scope: CampusScope): Promise<LessonRow[]> {
  const rows = await db.select({ id: lessons.id, title: lessons.title, objectives: lessons.objectives, content: lessons.content }).from(lessons).orderBy(asc(lessons.title), asc(lessons.id));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const campusRows = await db
    .select({ lessonId: lessonCampuses.lessonId, campusId: lessonCampuses.campusId, campusName: campuses.name })
    .from(lessonCampuses)
    .innerJoin(campuses, eq(campuses.id, lessonCampuses.campusId))
    .where(inArray(lessonCampuses.lessonId, ids))
    .orderBy(asc(campuses.id));

  const materialRows = await db
    .select({
      id: lessonMaterials.id,
      lessonId: lessonMaterials.lessonId,
      kind: lessonMaterials.kind,
      title: lessonMaterials.title,
      url: lessonMaterials.url,
      fileId: lessonMaterials.fileId,
      fileName: uploadedFiles.originalName,
    })
    .from(lessonMaterials)
    .leftJoin(uploadedFiles, eq(uploadedFiles.id, lessonMaterials.fileId))
    .where(inArray(lessonMaterials.lessonId, ids))
    .orderBy(asc(lessonMaterials.position), asc(lessonMaterials.id));

  const usage = await db
    .select({ lessonId: assignments.lessonId, n: count() })
    .from(assignments)
    .where(inArray(assignments.lessonId, ids))
    .groupBy(assignments.lessonId);
  const usageBy = new Map(usage.map((u) => [u.lessonId, Number(u.n)]));

  const all: LessonRow[] = rows.map((r) => {
    const mine = campusRows.filter((c) => c.lessonId === r.id);
    return {
      id: r.id,
      title: r.title,
      objectives: r.objectives,
      content: r.content,
      campusIds: mine.map((c) => c.campusId),
      campusNames: mine.map((c) => c.campusName),
      materials: materialRows
        .filter((m) => m.lessonId === r.id)
        .map((m) => ({ id: m.id, kind: m.kind, title: m.title, url: m.url, fileId: m.fileId, fileName: m.fileName ?? null })),
      assignmentCount: usageBy.get(r.id) ?? 0,
    };
  });
  return scope === null ? all : all.filter((l) => l.campusIds.includes(scope));
}

// Bài giảng dạng gọn cho form bài tập: tên và cơ sở, để lọc theo lớp
export async function listLessonChoices(): Promise<{ id: number; title: string; campusIds: number[] }[]> {
  const rows = await db.select({ id: lessons.id, title: lessons.title }).from(lessons).orderBy(asc(lessons.title), asc(lessons.id));
  if (rows.length === 0) return [];
  const campusRows = await db
    .select({ lessonId: lessonCampuses.lessonId, campusId: lessonCampuses.campusId })
    .from(lessonCampuses)
    .where(inArray(lessonCampuses.lessonId, rows.map((r) => r.id)));
  const allowed = await getAllowedCampusIds();
  return rows
    .map((r) => ({ id: r.id, title: r.title, campusIds: campusRows.filter((c) => c.lessonId === r.id).map((c) => c.campusId) }))
    .filter((r) => allowed === null || r.campusIds.some((c) => allowed.includes(c)));
}

// Số bài tập đang gắn một bài giảng
export async function countAssignmentsOfLesson(lessonId: number): Promise<number> {
  const [row] = await db.select({ n: count() }).from(assignments).where(eq(assignments.lessonId, lessonId));
  return Number(row?.n ?? 0);
}
