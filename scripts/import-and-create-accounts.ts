import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/client';
import { accountCampuses, accounts, campuses, rolePermissions } from '../src/db/schema';
import { readImportFile } from '../src/lib/import/excel';
import { applyImport, planImport, type ImportPlan } from '../src/lib/import/plan';
import { DEFAULT_GRANTS, PERMISSIONS } from '../src/lib/permissions';
import { describeSchedule, generateSessions } from '../src/lib/schedule';
import { normalizeSearch } from '../src/lib/text';
import type { StaffRole } from '../src/lib/validation/teacher';

const DEFAULT_SUBJECT: Record<StaffRole, string> = { teacher: 'Tiếng Anh', assistant: 'Hỗ trợ lớp', foreign: 'Tiếng Anh' };
const DEFAULT_TONE: Record<StaffRole, string> = { teacher: 'mint', assistant: 'butter', foreign: 'lav' };
const DEFAULT_PASSWORD_HASH =
  'scrypt$afd4eac9f6c2eff118732b62162afef3$c44e68e572f076a55a9d1fbaf5b87eeff4b51bea0aa729553a8d4fd4f8f5a335bc2d64d9b3bce5de994e9706f7c3f133344cf6c296df8277e62d5fc83ddb6fc9';

const FILES = [
  path.resolve(process.cwd(), 'docs/hoàng gia.xlsx'),
  path.resolve(process.cwd(), 'docs/tuổi thần tiên.xlsx'),
];

const CAMPUS_ACCOUNTS = [
  { campusName: 'ESL Hoàng Gia', fullName: 'Quản lý cơ sở Hoàng Gia', email: 'hoanggia@esl-center.vn' },
  { campusName: 'ESL TTT', fullName: 'Quản lý cơ sở Tuổi Thần Tiên', email: 'tuoithantien@esl-center.vn' },
  { campusName: 'ESL Mầm Xanh', fullName: 'Quản lý cơ sở Mầm Xanh', email: 'mamxanh@esl-center.vn' },
  { campusName: 'Anh ngữ SILA', fullName: 'Quản lý cơ sở Anh ngữ SILA', email: 'sila@esl-center.vn' },
];

function esc(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function renderPlanSql(plan: ImportPlan, label: string): string {
  const lines: string[] = [];
  lines.push(`-- =============================================================================`);
  lines.push(`-- DỮ LIỆU NHẬP TỪ FILE: ${label}`);
  lines.push(`-- =============================================================================`);

  // 1. Campuses
  for (const c of plan.campuses) {
    if (c.id === null) {
      lines.push(
        `INSERT INTO campuses (name, address) SELECT ${esc(c.name)}, ${esc(c.address)} WHERE NOT EXISTS (SELECT 1 FROM campuses WHERE lower(trim(name)) = lower(${esc(c.name)}));`,
      );
    } else if (c.set.address !== undefined) {
      lines.push(`UPDATE campuses SET address = ${esc(c.set.address)}, updated_at = now() WHERE id = ${c.id};`);
    }
  }

  // 2. Staff (teachers / assistants / foreign teachers) & teacher_campuses
  for (const s of plan.staff) {
    if (s.id === null) {
      const cond = s.phone
        ? `regexp_replace(phone, '\\D', '', 'g') = ${esc(s.phone.replace(/\D/g, ''))}`
        : `lower(trim(name)) = lower(${esc(s.name)})`;
      lines.push(
        `INSERT INTO teachers (name, phone, subject, staff_role, status, avatar_tone) SELECT ${esc(s.name)}, ${esc(s.phone)}, ${esc(DEFAULT_SUBJECT[s.role])}, ${esc(s.role)}, 'active', ${esc(DEFAULT_TONE[s.role])} WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE ${cond});`,
      );
    } else if (Object.keys(s.set).length > 0) {
      const sets: string[] = ['updated_at = now()'];
      if (s.set.name !== undefined) sets.push(`name = ${esc(s.set.name)}`);
      if (s.set.phone !== undefined) sets.push(`phone = ${esc(s.set.phone)}`);
      lines.push(`UPDATE teachers SET ${sets.join(', ')} WHERE id = ${s.id};`);
    }
    const teacherLookup =
      s.id !== null
        ? `${s.id}`
        : s.phone
          ? `(SELECT id FROM teachers WHERE regexp_replace(phone, '\\D', '', 'g') = ${esc(s.phone.replace(/\D/g, ''))} LIMIT 1)`
          : `(SELECT id FROM teachers WHERE lower(trim(name)) = lower(${esc(s.name)}) LIMIT 1)`;
    for (const ck of s.campusKeys) {
      const campusPlan = plan.campuses.find((c) => c.key === ck)!;
      const campusLookup =
        campusPlan.id !== null
          ? `${campusPlan.id}`
          : `(SELECT id FROM campuses WHERE lower(trim(name)) = lower(${esc(campusPlan.name)}) LIMIT 1)`;
      lines.push(
        `INSERT INTO teacher_campuses (teacher_id, campus_id) VALUES (${teacherLookup}, ${campusLookup}) ON CONFLICT (teacher_id, campus_id) DO NOTHING;`,
      );
    }
  }

  const staffSqlExpr = (staffKey: string | null): string => {
    if (staffKey === null) return 'NULL';
    const s = plan.staff.find((x) => x.key === staffKey)!;
    if (s.id !== null) return `${s.id}`;
    if (s.phone) {
      return `(SELECT id FROM teachers WHERE regexp_replace(phone, '\\D', '', 'g') = ${esc(s.phone.replace(/\D/g, ''))} LIMIT 1)`;
    }
    return `(SELECT id FROM teachers WHERE lower(trim(name)) = lower(${esc(s.name)}) LIMIT 1)`;
  };

  // 3. Classes & class_sessions
  for (const c of plan.classes) {
    const campusPlan = plan.campuses.find((x) => x.key === c.campusKey)!;
    const campusLookup =
      campusPlan.id !== null
        ? `${campusPlan.id}`
        : `(SELECT id FROM campuses WHERE lower(trim(name)) = lower(${esc(campusPlan.name)}) LIMIT 1)`;
    if (c.id === null) {
      const v = c.values;
      const tExpr = staffSqlExpr(c.teacherKey);
      const aExpr = staffSqlExpr(c.assistantKey);
      const fExpr = staffSqlExpr(c.foreignKey);
      const sched = describeSchedule(v.weekdays, v.startTime, v.endTime);
      lines.push(
        `INSERT INTO classes (campus_id, name, course, teacher_id, assistant_id, foreign_teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity) SELECT ${campusLookup}, ${esc(c.name)}, ${esc(v.course)}, ${tExpr}, ${aExpr}, ${fExpr}, ${esc(sched)}, ${esc(v.weekdays)}, ${esc(v.startTime)}, ${esc(v.endTime)}, ${v.sessionsTotal!}, ${v.fee!}, ${esc(v.room)}, ${v.capacity!} WHERE NOT EXISTS (SELECT 1 FROM classes WHERE campus_id = ${campusLookup} AND lower(trim(name)) = lower(${esc(c.name)}));`,
      );
      const generated = generateSessions({
        weekdays: v.weekdays,
        startTime: v.startTime,
        endTime: v.endTime,
        sessionsTotal: v.sessionsTotal!,
        fromDate: v.startDate,
      });
      const classLookup = `(SELECT id FROM classes WHERE campus_id = ${campusLookup} AND lower(trim(name)) = lower(${esc(c.name)}) LIMIT 1)`;
      for (const s of generated) {
        lines.push(
          `INSERT INTO class_sessions (class_id, session_no, starts_at, ends_at, teacher_id, room) SELECT ${classLookup}, ${s.sessionNo}, ${esc(s.startsAt.toISOString())}, ${esc(s.endsAt.toISOString())}, ${tExpr}, ${esc(v.room)} WHERE NOT EXISTS (SELECT 1 FROM class_sessions WHERE class_id = ${classLookup} AND session_no = ${s.sessionNo});`,
        );
      }
    }
  }

  // 4. Students
  for (const s of plan.students) {
    const classPlan = plan.classes.find((x) => x.key === s.classKey)!;
    const campusPlan = plan.campuses.find((x) => x.key === classPlan.campusKey)!;
    const campusLookup =
      campusPlan.id !== null
        ? `${campusPlan.id}`
        : `(SELECT id FROM campuses WHERE lower(trim(name)) = lower(${esc(campusPlan.name)}) LIMIT 1)`;
    const classLookup =
      classPlan.id !== null
        ? `${classPlan.id}`
        : `(SELECT id FROM classes WHERE campus_id = ${campusLookup} AND lower(trim(name)) = lower(${esc(classPlan.name)}) LIMIT 1)`;

    if (s.id === null) {
      const searchKey = normalizeSearch(s.values.fullName);
      if (s.forcedId !== null) {
        lines.push(
          `INSERT INTO students (id, full_name, search_key, gender, dob, class_id, status, start_date, note) VALUES (${s.forcedId}, ${esc(s.values.fullName)}, ${esc(searchKey)}, ${esc(s.values.gender)}, ${esc(s.values.dob)}, ${classLookup}, ${esc(s.values.status)}, ${esc(s.values.startDate)}, ${esc(s.values.note)}) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, search_key = EXCLUDED.search_key, gender = EXCLUDED.gender, dob = EXCLUDED.dob, class_id = EXCLUDED.class_id, status = EXCLUDED.status, start_date = EXCLUDED.start_date, note = EXCLUDED.note, updated_at = now();`,
        );
      } else {
        lines.push(
          `INSERT INTO students (full_name, search_key, gender, dob, class_id, status, start_date, note) VALUES (${esc(s.values.fullName)}, ${esc(searchKey)}, ${esc(s.values.gender)}, ${esc(s.values.dob)}, ${classLookup}, ${esc(s.values.status)}, ${esc(s.values.startDate)}, ${esc(s.values.note)});`,
        );
      }
    }
  }

  if (plan.students.some((s) => s.forcedId !== null)) {
    lines.push(`SELECT setval(pg_get_serial_sequence('students', 'id'), (SELECT max(id) FROM students));`);
  }

  // 5. Parents & student_parents
  for (const p of plan.parents) {
    if (p.id === null) {
      lines.push(
        `INSERT INTO parents (full_name, phone, email) SELECT ${esc(p.fullName)}, ${esc(p.key)}, ${esc(p.email)} WHERE NOT EXISTS (SELECT 1 FROM parents WHERE phone = ${esc(p.key)});`,
      );
    }
  }

  for (const l of plan.links) {
    if (l.existingId !== null) continue;
    const studentLookup =
      l.student.id !== null
        ? `${l.student.id}`
        : l.student.forcedId !== null
          ? `${l.student.forcedId}`
          : `(SELECT id FROM students WHERE full_name = ${esc(l.student.values.fullName)} AND coalesce(dob, '') = ${esc(l.student.values.dob ?? '')} ORDER BY id DESC LIMIT 1)`;
    const parentPlan = plan.parents.find((p) => p.key === l.parentKey)!;
    const parentLookup =
      parentPlan.id !== null ? `${parentPlan.id}` : `(SELECT id FROM parents WHERE phone = ${esc(l.parentKey)} LIMIT 1)`;
    lines.push(
      `INSERT INTO student_parents (student_id, parent_id, relation, is_primary) VALUES (${studentLookup}, ${parentLookup}, ${esc(l.relation)}, ${l.isPrimary ? 'true' : 'false'}) ON CONFLICT (student_id, parent_id) DO NOTHING;`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

async function main() {
  const mode = process.argv.includes('--execute') ? 'execute' : 'generate-sql';

  const parsedFiles: { name: string; rows: Awaited<ReturnType<typeof readImportFile>> & { ok: true } }[] = [];
  for (const filePath of FILES) {
    const buf = fs.readFileSync(filePath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const read = await readImportFile(ab);
    if (!read.ok) throw new Error(`${path.basename(filePath)}: ${read.message}`);
    parsedFiles.push({ name: path.basename(filePath), rows: read });
  }

  if (mode === 'generate-sql') {
    const chunks: string[] = [
      '-- =============================================================================',
      '-- SCRIPT TỔNG HỢP: NHẬP DỮ LIỆU 2 CƠ SỞ (HOÀNG GIA & TUỔI THẦN TIÊN)',
      '-- VÀ TẠO TÀI KHOẢN QUẢN LÝ RIÊNG CHO TỪNG CƠ SỞ (ADMIN ĐƠN VỊ)',
      '-- =============================================================================',
      `ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'campus_admin' AFTER 'admin';`,
      '',
      'BEGIN;',
      '',
    ];

    for (const p of PERMISSIONS) {
      const granted = DEFAULT_GRANTS.campus_admin.includes(p.key);
      chunks.push(
        `INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', ${esc(p.key)}, ${granted}) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();`,
      );
    }
    chunks.push('');

    for (const f of parsedFiles) {
      const plan = await planImport(f.rows.rows, db, null);
      if (plan.errorCount > 0) {
        throw new Error(`${f.name} còn ${plan.errorCount} dòng lỗi.`);
      }
      chunks.push(renderPlanSql(plan, f.name));
    }

    chunks.push('-- =============================================================================');
    chunks.push('-- TẠO TÀI KHOẢN QUẢN LÝ RIÊNG CHO TỪNG CƠ SỞ (Mật khẩu mặc định: esl123)');
    chunks.push('-- =============================================================================');
    for (const acc of CAMPUS_ACCOUNTS) {
      chunks.push(
        `INSERT INTO accounts (full_name, email, role, status, password_hash) VALUES (${esc(acc.fullName)}, ${esc(acc.email)}, 'campus_admin', 'active', ${esc(DEFAULT_PASSWORD_HASH)}) ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, status = 'active', updated_at = now();`,
      );
      chunks.push(
        `INSERT INTO account_campuses (account_id, campus_id) SELECT a.id, c.id FROM accounts a JOIN campuses c ON a.email = ${esc(acc.email)} AND lower(trim(c.name)) = lower(${esc(acc.campusName)}) ON CONFLICT (account_id, campus_id) DO NOTHING;`,
      );
    }

    chunks.push('');
    chunks.push('COMMIT;');
    chunks.push('');

    const outPath = path.resolve(process.cwd(), 'docs/import-va-tao-tai-khoan.sql');
    fs.writeFileSync(outPath, chunks.join('\n'), 'utf8');
    console.log(`Đã xuất file SQL đầy đủ tại: ${outPath}`);
    process.exit(0);
  }

  // mode === 'execute'
  await db.execute(sql.raw(`ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'campus_admin' AFTER 'admin'`));

  await db.transaction(async (tx) => {
    for (const p of PERMISSIONS) {
      const granted = DEFAULT_GRANTS.campus_admin.includes(p.key);
      await tx
        .insert(rolePermissions)
        .values({ role: 'campus_admin', permission: p.key, granted })
        .onConflictDoUpdate({
          target: [rolePermissions.role, rolePermissions.permission],
          set: { granted, updatedAt: new Date() },
        });
    }

    for (const f of parsedFiles) {
      const plan = await planImport(f.rows.rows, tx, null);
      if (plan.errorCount > 0) {
        throw new Error(`${f.name} còn ${plan.errorCount} dòng lỗi.`);
      }
      await applyImport(plan, tx);
      console.log(`Đã nhập xong ${f.name}: ${f.rows.rows.length} dòng.`);
    }

    for (const acc of CAMPUS_ACCOUNTS) {
      const [createdAcc] = await tx
        .insert(accounts)
        .values({
          fullName: acc.fullName,
          email: acc.email,
          role: 'campus_admin',
          status: 'active',
          passwordHash: DEFAULT_PASSWORD_HASH,
        })
        .onConflictDoUpdate({
          target: accounts.email,
          set: { fullName: acc.fullName, role: 'campus_admin', status: 'active', updatedAt: new Date() },
        })
        .returning({ id: accounts.id });

      const [campusRow] = await tx
        .select({ id: campuses.id })
        .from(campuses)
        .where(sql`lower(trim(${campuses.name})) = lower(${acc.campusName})`)
        .limit(1);

      if (campusRow) {
        await tx
          .insert(accountCampuses)
          .values({ accountId: createdAcc.id, campusId: campusRow.id })
          .onConflictDoNothing();
      }
    }
  });

  console.log('Hoàn tất nhập dữ liệu 2 cơ sở và tạo 4 tài khoản cơ sở!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

