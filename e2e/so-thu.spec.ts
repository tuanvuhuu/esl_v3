import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { loadEnvLocal } from './env';
import { expectToast, login } from './helpers';

// Sổ thu học phí (huỷ khoản thu, hoàn số dư). Lớp thử ở Cơ sở test, học phí 5.000.000 ₫.
// Học sinh A đang học, đã đóng 2.000.000 ₫: huỷ khoản thu ghi nhầm, sổ còn dòng huỷ, số đã thu về 0.
// Học sinh B đã nghỉ, đóng 5.600.000 ₫ (dư 600.000 ₫): hoàn số dư, số dư về 0, dòng hoàn có số âm.
const run = String(Date.now()).slice(-6);
const CLS = `SO-${run}`;
const A = `Học viên huỷ ${run}`;
const B = `Học viên hoàn ${run}`;

test('sổ thu: huỷ khoản thu ghi nhầm (có lý do), hoàn số dư cho học sinh đã nghỉ; sổ chỉ thêm dòng, không xoá', async ({ page }) => {
  test.setTimeout(150_000);
  loadEnvLocal();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const stale = `select id from classes where name ~ '^SO-[0-9]{6}$' and campus_id = (select id from campuses where name = 'Cơ sở test')`;
  await db.query(`delete from students where class_id in (${stale})`);
  await db.query(`delete from classes where id in (${stale})`);
  try {
    const [campus] = (await db.query<{ id: number }>(`select id from campuses where name = 'Cơ sở test'`)).rows;
    const [teacher] = (await db.query<{ id: number }>(`select t.id from teachers t join teacher_campuses tc on tc.teacher_id = t.id where tc.campus_id = $1 and t.staff_role = 'teacher' order by t.id limit 1`, [campus.id])).rows;
    const [cls] = (
      await db.query<{ id: number }>(
        `insert into classes (campus_id, name, course, teacher_id, schedule, weekdays, start_time, end_time, sessions_total, fee, room, capacity)
         values ($1, $2, 'E2E sổ thu', $3, 'T2 · 09:00–10:00', 'T2', '09:00', '10:00', 1, 5000000, 'SO-P', 10) returning id`,
        [campus.id, CLS, teacher.id],
      )
    ).rows;
    const [a] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'female', $3, 'active', '2026-09-01') returning id`, [A, `hoc vien huy ${run}`, cls.id])).rows;
    const [b] = (await db.query<{ id: number }>(`insert into students (full_name, search_key, gender, class_id, status, start_date) values ($1, $2, 'male', $3, 'finished', '2026-09-01') returning id`, [B, `hoc vien hoan ${run}`, cls.id])).rows;
    const [payA] = (await db.query<{ id: number }>(`insert into tuition_payments (student_id, amount, note) values ($1, 2000000, 'Ghi nhầm') returning id`, [a.id])).rows;
    await db.query(`insert into tuition_payments (student_id, amount, note) values ($1, 5600000, 'Đóng đủ và dư')`, [b.id]);

    await login(page);

    // Huỷ khoản thu ghi nhầm của A: phải có lý do, sau đó sổ có dòng huỷ và số đã thu về 0
    await page.goto(`/hoc-phi?q=${encodeURIComponent(A)}`);
    await page.getByRole('button', { name: 'Ghi thu' }).first().click();
    const dlg = page.locator('[role="dialog"][aria-labelledby="payment-title"]');
    await expect(dlg.getByText('Ghi nhầm')).toBeVisible();
    await dlg.getByRole('listitem').getByRole('button', { name: 'Huỷ', exact: true }).click();
    await dlg.getByLabel('Lý do huỷ khoản thu').fill('x');
    await dlg.getByRole('button', { name: 'Xác nhận huỷ' }).click();
    await expect(dlg.getByRole('alert')).toContainText('Ghi rõ lý do');
    await dlg.getByLabel('Lý do huỷ khoản thu').fill('Ghi nhầm số tiền của học sinh khác');
    await dlg.getByRole('button', { name: 'Xác nhận huỷ' }).click();
    await expectToast(page, /Đã huỷ khoản thu/);
    const [sumA] = (await db.query<{ total: number; lines: number }>(`select coalesce(sum(amount),0)::int as total, count(*)::int as lines from tuition_payments where student_id = $1`, [a.id])).rows;
    expect(sumA.total).toBe(0);
    expect(sumA.lines).toBe(2);
    const [voidRow] = (await db.query<{ kind: string; ref_id: number; amount: number }>(`select kind, ref_id, amount from tuition_payments where student_id = $1 and kind = 'void'`, [a.id])).rows;
    expect(voidRow).toEqual({ kind: 'void', ref_id: payA.id, amount: -2000000 });
    // Khoản đã huỷ không huỷ thêm được
    await page.goto(`/hoc-phi?q=${encodeURIComponent(A)}`);
    await page.getByRole('button', { name: 'Ghi thu' }).first().click();
    await expect(page.locator('[role="dialog"][aria-labelledby="payment-title"]').getByRole('listitem').getByRole('button', { name: 'Huỷ', exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');

    // Hoàn số dư cho B (đã nghỉ): mặc định hoàn đủ 600.000 ₫, sau đó số dư về 0 và không còn nút hoàn
    await page.goto(`/hoc-phi?q=${encodeURIComponent(B)}`);
    await page.getByRole('button', { name: 'Hoàn số dư' }).first().click();
    const refund = page.getByRole('dialog', { name: `Hoàn số dư · ${B}` });
    await expect(refund.getByLabel('Số tiền hoàn (VND) *')).toHaveValue('600000');
    await refund.getByLabel('Ghi chú').fill('Nghỉ học từ tháng 10');
    await refund.getByRole('button', { name: 'Hoàn tiền' }).click();
    await expectToast(page, /Đã hoàn 600\.000/);
    const [sumB] = (await db.query<{ total: number }>(`select coalesce(sum(amount),0)::int as total from tuition_payments where student_id = $1`, [b.id])).rows;
    expect(sumB.total).toBe(5000000);
    const [refundRow] = (await db.query<{ kind: string; amount: number }>(`select kind, amount from tuition_payments where student_id = $1 and kind = 'refund'`, [b.id])).rows;
    expect(refundRow).toEqual({ kind: 'refund', amount: -600000 });
    await expect(page.getByRole('button', { name: 'Hoàn số dư' })).toHaveCount(0);
  } finally {
    await db.query(`delete from students where class_id in (select id from classes where name = $1)`, [CLS]);
    await db.query('delete from classes where name = $1', [CLS]);
    await db.end();
  }
});
