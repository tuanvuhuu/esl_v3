// Tìm buổi học trùng phòng (xếp lịch dễ và không trùng). Chỉ chạy trên server.
// Giáo viên chủ nhiệm được nhận nhiều lớp trùng giờ (người dạy trực tiếp có thể là trợ giảng, giáo viên nước ngoài),
// nên trùng giờ của giáo viên không còn chặn; teacherId giữ trong tham số để gọi cũ không phải đổi.
// Trùng khi khoảng giờ giao nhau (bắt đầu trước khi buổi kia kết thúc và kết thúc sau khi buổi kia bắt đầu).
// Buổi đã huỷ không tính. Phòng chỉ so trong cùng cơ sở, không phân biệt hoa thường.
import { and, eq, gt, lt, ne, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, classSessions, teachers } from '@/db/schema';
import { vnDateKey, vnTimeLabel, weekdayLabel, weekdayOfKey, dateKeyLabel } from '@/lib/datetime';

export type ScheduleConflict = {
  kind: 'teacher' | 'room';
  startsAt: Date; // buổi đang xếp
  endsAt: Date;
  otherClass: string; // lớp đang có buổi trùng
  otherStartsAt: Date;
  otherEndsAt: Date;
  who: string; // tên giáo viên hoặc phòng
};

export async function findScheduleConflicts(input: {
  slots: { startsAt: Date; endsAt: Date }[];
  teacherId: number | null;
  room: string;
  campusId: number;
  excludeClassId?: number | null;
  excludeSessionId?: number | null;
}): Promise<ScheduleConflict[]> {
  const { slots } = input;
  const room = input.room.trim().toLowerCase();
  if (slots.length === 0 || !room) return [];
  const from = new Date(Math.min(...slots.map((s) => s.startsAt.getTime())));
  const to = new Date(Math.max(...slots.map((s) => s.endsAt.getTime())));


  const rows = await db
    .select({
      id: classSessions.id,
      classId: classSessions.classId,
      className: classes.name,
      teacherId: classSessions.teacherId,
      teacherName: teachers.name,
      room: classSessions.room,
      startsAt: classSessions.startsAt,
      endsAt: classSessions.endsAt,
    })
    .from(classSessions)
    .innerJoin(classes, eq(classes.id, classSessions.classId))
    .innerJoin(teachers, eq(teachers.id, classSessions.teacherId))
    .where(
      and(
        ne(classSessions.status, 'cancelled'),
        lt(classSessions.startsAt, to),
        gt(classSessions.endsAt, from),
        sql`lower(${classSessions.room}) = ${room}`,
        eq(classes.campusId, input.campusId),
        input.excludeClassId ? ne(classSessions.classId, input.excludeClassId) : undefined,
        input.excludeSessionId ? ne(classSessions.id, input.excludeSessionId) : undefined,
      ),
    );

  const out: ScheduleConflict[] = [];
  for (const s of slots) {
    for (const r of rows) {
      if (!(r.startsAt < s.endsAt && r.endsAt > s.startsAt)) continue;
      const base = { startsAt: s.startsAt, endsAt: s.endsAt, otherClass: r.className, otherStartsAt: r.startsAt, otherEndsAt: r.endsAt };
      if (r.room.trim().toLowerCase() === room) out.push({ ...base, kind: 'room', who: r.room });
    }
  }
  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

// Một câu ngắn cho người xếp lịch: "Thầy Quốc Bảo đang dạy lớp GT-A1 lúc 09:00–11:00 Thứ 7 24/10/2026"
export function conflictText(c: ScheduleConflict): string {
  const key = vnDateKey(c.otherStartsAt);
  const when = `${vnTimeLabel(c.otherStartsAt)}–${vnTimeLabel(c.otherEndsAt)} ${weekdayLabel(weekdayOfKey(key))} ${dateKeyLabel(key)}`;
  return c.kind === 'teacher' ? `${c.who} đang dạy lớp ${c.otherClass} lúc ${when}` : `Phòng ${c.who} đã có lớp ${c.otherClass} lúc ${when}`;
}

// Gom các buổi trùng cùng người, cùng lớp, cùng giờ thành một câu, ví dụ
// "Thầy Quốc Bảo đang dạy lớp GT-A1 09:00–11:00 các ngày T7 24/10, T7 31/10, T7 07/11"
export function summarizeConflicts(list: ScheduleConflict[], maxDates = 4): string[] {
  const groups = new Map<string, { head: string; dates: string[] }>();
  for (const c of list) {
    const range = `${vnTimeLabel(c.otherStartsAt)}–${vnTimeLabel(c.otherEndsAt)}`;
    const head = c.kind === 'teacher' ? `${c.who} đang dạy lớp ${c.otherClass} ${range}` : `Phòng ${c.who} đã có lớp ${c.otherClass} ${range}`;
    const key = vnDateKey(c.otherStartsAt);
    const date = `${weekdayLabel(weekdayOfKey(key))} ${dateKeyLabel(key).slice(0, 5)}`;
    const g = groups.get(head) ?? { head, dates: [] };
    if (!g.dates.includes(date)) g.dates.push(date);
    groups.set(head, g);
  }
  return [...groups.values()].map((g) => {
    const more = g.dates.length > maxDates ? ` và ${g.dates.length - maxDates} ngày khác` : '';
    return `${g.head} ${g.dates.length > 1 ? 'các ngày' : 'ngày'} ${g.dates.slice(0, maxDates).join(', ')}${more}`;
  });
}
