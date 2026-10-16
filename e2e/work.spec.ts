import { expect, test } from '@playwright/test';
import ExcelJS from 'exceljs';
import { IMPORT_COLUMNS, type ImportColumnKey } from '../src/lib/import/columns';

import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';
import { ACADEMIC, loadEnvLocal } from './env';
import { dialogById, dialogFieldErrors, expectToast, login, uniq } from './helpers';

test.describe('bài tập, điểm danh, học phí', () => {
  test('tạo bài tập, chấm điểm vượt mức bị chặn, xoá bài kèm bài nộp', async ({ page }) => {
    await login(page);
    const title = uniq('BT E2E');
    await page.goto('/bai-tap?cls=2'); // IELTS-K14
    await page.getByRole('button', { name: 'Thêm bài tập' }).first().click();
    const create = dialogById(page, 'assignment-create-title');
    await create.getByLabel('Tiêu đề *').fill(title);
    await create.getByLabel('Điểm tối đa *').fill('10');
    await create.getByLabel('Hạn nộp (ngày) *').fill('2026-10-20');
    await create.getByLabel('Hạn nộp (giờ) *').fill('20:00');
    await create.getByRole('button', { name: 'Tạo bài tập' }).click();
    await expectToast(page, `Đã tạo bài tập ${title}`);

    await page.getByRole('link', { name: title }).first().click();
    await page.waitForURL('**/bai-tap/*');
    await page.getByRole('button', { name: /Trạng thái của/ }).nth(0).click();
    await page.getByRole('option', { name: 'Đã chấm' }).click();
    await page.getByLabel(/Điểm của/).nth(0).fill('11');
    await page.getByRole('button', { name: 'Lưu tất cả' }).click();
    await expectToast(page, 'phải là số nguyên từ 0 đến 10');
    await page.getByLabel(/Điểm của/).nth(0).fill('8');
    await page.getByRole('button', { name: 'Lưu tất cả' }).click();
    await expectToast(page, 'Đã lưu');

    // Sửa điểm tối đa xuống dưới điểm đã chấm: bị chặn
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: `Thao tác với bài ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    await dialogById(page, 'assignment-edit-title').getByLabel('Điểm tối đa *').fill('5');
    await dialogById(page, 'assignment-edit-title').getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(dialogById(page, 'assignment-edit-title').getByRole('alert')).toContainText('thấp hơn điểm đã chấm (8)');
    await expect(dialogById(page, 'assignment-edit-title').getByText('Tối thiểu 8')).toBeVisible();
    await page.keyboard.press('Escape');

    // Xoá: xác nhận, kèm số bài đã nộp
    await page.getByRole('button', { name: `Thao tác với bài ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('bài đã nộp hoặc đã chấm sẽ bị xoá');
    await page.getByRole('button', { name: 'Xoá bài tập', exact: true }).click();
    await expectToast(page, `Đã xoá bài tập ${title}`);
  });

  test('điểm danh: buổi chưa diễn ra thì khoá nút và báo lý do', async ({ page }) => {
    await login(page);
    await page.goto('/diem-danh?cls=1');
    // Dải buổi học: mỗi buổi là một chip, có ngày trong nhãn (dd/mm)
    await page.getByRole('tab', { name: /19\/10/ }).click();
    await expect(page.getByText('Buổi này chưa diễn ra nên chưa điểm danh được.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu điểm danh' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Có mặt', exact: true }).first()).toBeDisabled();
  });

  test('điểm danh: có mặt cả lớp đếm đúng (không lưu)', async ({ page }) => {
    await login(page);
    // Buổi đã bắt đầu gần nhất của lớp TOEIC-T2 được chọn mặc định
    await page.goto('/diem-danh?cls=3');
    // Mỗi học sinh là một thẻ có nhóm ba nút trạng thái (aria-label "Điểm danh <tên>")
    const roster = await page.locator('[role="group"][aria-label^="Điểm danh "]').count();
    await page.getByRole('button', { name: 'Có mặt cả lớp' }).click();
    await expect(page.getByText(`Có mặt ${roster}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Chưa điểm danh 0', { exact: true })).toBeVisible();
    // Không bấm Lưu: dữ liệu không đổi
  });

  test('học phí: không thu quá số còn nợ, nhắc đóng có thông báo', async ({ page }) => {
    await login(page);
    await page.goto('/hoc-phi?f=unpaid');
    await page.getByRole('button', { name: 'Ghi thu' }).first().click();
    const dialog = page.locator('[role="dialog"][aria-labelledby="payment-title"]');
    await dialog.locator('input[name="amount"]').fill('999999999999');
    await dialog.getByRole('button', { name: 'Ghi nhận thu' }).click();
    await expect(dialogFieldErrors(page).first()).toContainText('Tối đa');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Nhắc', exact: true }).first().click();
    await expectToast(page, 'Đã ghi nhắc đóng');
  });

  test('bài tập có câu hỏi: trắc nghiệm, viết và nộp tệp; chấm từng câu, tổng điểm đúng', async ({ page }) => {
    await login(page);
    const title = uniq('BT E2E câu');
    await page.goto('/bai-tap?cls=2'); // IELTS-K14
    await page.getByRole('button', { name: 'Thêm bài tập' }).first().click();
    const create = dialogById(page, 'assignment-create-title');
    await create.getByLabel('Tiêu đề *').fill(title);
    await create.getByLabel('Điểm tối đa *').fill('1');
    await create.getByLabel('Hạn nộp (ngày) *').fill('2026-10-20');
    await create.getByLabel('Hạn nộp (giờ) *').fill('20:00');
    await create.getByRole('button', { name: 'Tạo bài tập' }).click();
    await expectToast(page, `Đã tạo bài tập ${title}`);

    await page.getByRole('link', { name: title }).first().click();
    await page.waitForURL('**/bai-tap/*');

    // Soạn ba câu: trắc nghiệm (đọc, 2 điểm), trả lời viết (viết, 5 điểm), nộp tệp (nói, 3 điểm)
    await page.getByRole('button', { name: 'Soạn câu hỏi' }).click();
    const editor = dialogById(page, 'items-editor-title');
    await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
    await editor.getByLabel('Nội dung câu 1').fill('Choose the correct answer.');
    await editor.getByLabel('Nội dung đáp án 1 của câu 1').fill('Monday');
    await editor.getByLabel('Nội dung đáp án 2 của câu 1').fill('Tuesday');
    await editor.getByLabel('Đáp án 2 là đáp án đúng').check();
    await editor.getByLabel('Điểm của câu 1').fill('2');

    await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
    await editor.getByRole('button', { name: 'Loại của câu 2' }).click();
    await page.getByRole('option', { name: 'Trả lời viết', exact: true }).click();
    await editor.getByRole('button', { name: 'Kỹ năng của câu 2' }).click();
    await page.getByRole('option', { name: 'Viết', exact: true }).click();
    await editor.getByLabel('Nội dung câu 2').fill('Write about your weekend.');
    await editor.getByLabel('Điểm của câu 2').fill('5');

    await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
    await editor.getByRole('button', { name: 'Loại của câu 3' }).click();
    await page.getByRole('option', { name: 'Nộp tệp', exact: true }).click();
    await editor.getByRole('button', { name: 'Kỹ năng của câu 3' }).click();
    await page.getByRole('option', { name: 'Nói', exact: true }).click();
    await editor.getByLabel('Nội dung câu 3').fill('Record a short introduction about yourself.');
    await editor.getByLabel('Điểm của câu 3').fill('3');
    await editor.getByRole('button', { name: 'Lưu câu hỏi' }).click();
    await expectToast(page, 'Đã lưu 3 câu hỏi, tổng 10 điểm');

    // Chấm một học sinh: chọn đáp án đúng, nhập điểm câu viết, tải tệp và cho điểm câu nói
    await expect(page.getByText('3 câu hỏi · ')).toBeVisible();
    await page.getByRole('button', { name: 'Chấm bài' }).first().click();
    const answer = dialogById(page, 'answer-dialog-title');
    await answer.getByLabel('B. Tuesday').check();
    await answer.getByLabel('Bài làm câu 2').fill('I went hiking with my friends.');
    await answer.getByLabel('Điểm câu 2').fill('4');
    await answer.getByLabel('Tải tệp bài nộp câu 3').setInputFiles({ name: 'gioi-thieu.txt', mimeType: 'text/plain', buffer: Buffer.from('Hello, my name is E2E.') });
    await expect(answer.getByRole('link', { name: 'gioi-thieu.txt' })).toBeVisible();
    await answer.getByLabel('Điểm câu 3').fill('3');
    await answer.getByRole('button', { name: 'Lưu bài làm' }).click();
    // 2 (trắc nghiệm đúng) + 4 (viết) + 3 (nói) = 9 trên 10
    await expectToast(page, '9/10 điểm');
    await expect(page.getByText('9/10', { exact: true }).first()).toBeVisible();

    // Xoá bài kèm bài làm
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: `Thao tác với bài ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Xoá bài tập', exact: true }).click();
    await expectToast(page, `Đã xoá bài tập ${title}`);
  });

  test('chấm theo tiêu chí IELTS và chấm chéo: người khác chấm lại, lệch từ 2 điểm được đánh dấu', async ({ page }) => {
    await login(page);
    const title = uniq('BT E2E tiêu chí');
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: 'Thêm bài tập' }).first().click();
    const create = dialogById(page, 'assignment-create-title');
    await create.getByLabel('Tiêu đề *').fill(title);
    await create.getByLabel('Điểm tối đa *').fill('1');
    await create.getByLabel('Hạn nộp (ngày) *').fill('2026-10-20');
    await create.getByLabel('Hạn nộp (giờ) *').fill('20:00');
    await create.getByRole('button', { name: 'Tạo bài tập' }).click();
    await expectToast(page, `Đã tạo bài tập ${title}`);

    await page.getByRole('link', { name: title }).first().click();
    await page.waitForURL('**/bai-tap/*');
    const assignmentUrl = page.url();

    // Câu 1: trả lời viết với mẫu IELTS viết (bốn tiêu chí, 5 điểm mỗi tiêu chí). Câu 2: nộp tệp với mẫu IELTS nói.
    await page.getByRole('button', { name: 'Soạn câu hỏi' }).click();
    const editor = dialogById(page, 'items-editor-title');
    await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
    await editor.getByRole('button', { name: 'Loại của câu 1' }).click();
    await page.getByRole('option', { name: 'Trả lời viết', exact: true }).click();
    await editor.getByRole('button', { name: 'Kỹ năng của câu 1' }).click();
    await page.getByRole('option', { name: 'Viết', exact: true }).click();
    await editor.getByLabel('Nội dung câu 1').fill('Write an essay about technology.');
    await editor.getByRole('button', { name: 'Mẫu IELTS viết' }).click();
    await expect(editor.getByLabel('Điểm của câu 1')).toHaveValue('20');

    await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
    await editor.getByRole('button', { name: 'Loại của câu 2' }).click();
    await page.getByRole('option', { name: 'Nộp tệp', exact: true }).click();
    await editor.getByRole('button', { name: 'Kỹ năng của câu 2' }).click();
    await page.getByRole('option', { name: 'Nói', exact: true }).click();
    await editor.getByLabel('Nội dung câu 2').fill('Talk about your favourite place.');
    await editor.getByRole('button', { name: 'Mẫu IELTS nói' }).click();
    await editor.getByRole('button', { name: 'Lưu câu hỏi' }).click();
    await expectToast(page, 'Đã lưu 2 câu hỏi, tổng 40 điểm');

    // Lần chấm đầu: câu 1 đủ bốn tiêu chí (13 điểm), câu 2 mới chấm hai tiêu chí nên bài còn câu chưa chấm
    await page.getByRole('button', { name: 'Chấm bài' }).first().click();
    const answer = dialogById(page, 'answer-dialog-title');
    const q1 = answer.getByRole('region', { name: 'Câu 1' });
    const q2 = answer.getByRole('region', { name: 'Câu 2' });
    await q1.getByLabel('Bài làm câu 1').fill('Technology has changed our lives.');
    await q1.getByLabel('Điểm tiêu chí Task Response câu 1').fill('4');
    await q1.getByLabel('Điểm tiêu chí Coherence and Cohesion câu 1').fill('3');
    await q1.getByLabel('Điểm tiêu chí Lexical Resource câu 1').fill('4');
    await q1.getByLabel('Điểm tiêu chí Grammatical Range and Accuracy câu 1').fill('2');
    await expect(q1.getByText('Điểm câu: 13 / 20')).toBeVisible();
    await q2.getByLabel('Tải tệp bài nộp câu 2').setInputFiles({ name: 'noi.txt', mimeType: 'text/plain', buffer: Buffer.from('My favourite place is the beach.') });
    await expect(q2.getByRole('link', { name: 'noi.txt' })).toBeVisible();
    await q2.getByLabel('Điểm tiêu chí Fluency and Coherence câu 2').fill('4');
    await q2.getByLabel('Điểm tiêu chí Lexical Resource câu 2').fill('4');
    await answer.getByRole('button', { name: 'Lưu bài làm' }).click();
    await expectToast(page, '13/40 điểm (còn câu chưa chấm)');
    // Chờ bảng làm mới xong rồi mới mở lại, để không mở bằng dữ liệu cũ
    await expect(page.getByText('13/40 (chưa chấm đủ)', { exact: true }).first()).toBeVisible();

    // Chấm nốt câu 2: điểm đã lưu được nạp lại vào ô tiêu chí
    await page.getByRole('button', { name: 'Chấm bài' }).first().click();
    const resume = dialogById(page, 'answer-dialog-title');
    await expect(resume.getByRole('region', { name: 'Câu 1' }).getByLabel('Điểm tiêu chí Task Response câu 1')).toHaveValue('4');
    await resume.getByRole('region', { name: 'Câu 2' }).getByLabel('Điểm tiêu chí Grammatical Range and Accuracy câu 2').fill('4');
    await resume.getByRole('region', { name: 'Câu 2' }).getByLabel('Điểm tiêu chí Pronunciation câu 2').fill('5');
    await resume.getByRole('button', { name: 'Lưu bài làm' }).click();
    await expectToast(page, 'Đã lưu bài làm của');
    await expect(page.getByText('30/40', { exact: true }).first()).toBeVisible();

    // Chấm chéo bằng tài khoản học vụ: chấm lại mù (chưa thấy điểm lần đầu), lưu xong mới thấy lệch 3 điểm
    await page.context().clearCookies();
    await login(page, ACADEMIC);
    await page.goto(assignmentUrl);
    await page.getByRole('button', { name: 'Chấm bài' }).first().click();
    const second = dialogById(page, 'answer-dialog-title');
    const s1 = second.getByRole('region', { name: 'Câu 1' });
    await expect(s1.getByText('Điểm lần đầu: 13/20')).toHaveCount(0);
    await s1.getByLabel('Điểm chấm lại câu 1').fill('10');
    await s1.getByRole('button', { name: 'Lưu chấm lại' }).click();
    await expectToast(page, 'Đã lưu chấm lại câu 1. Lệch 3 điểm, cần xem lại.');
    await expect(s1.getByText('Lệch 3 điểm', { exact: true })).toBeVisible();
    await expect(s1.getByText('Điểm lần đầu: 13/20')).toBeVisible();
    await expect(s1.getByText('Nguyễn Thu Trang')).toBeVisible();

    // Người chấm lần đầu không chấm lại được bài của chính mình
    await page.context().clearCookies();
    await login(page);
    await page.goto(assignmentUrl);
    await page.getByRole('button', { name: 'Chấm bài' }).first().click();
    const own = dialogById(page, 'answer-dialog-title');
    await expect(own.getByRole('region', { name: 'Câu 1' }).getByText('Bạn là người chấm lần đầu bài này')).toBeVisible();

    // Xoá bài kèm bài làm và chấm chéo
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: `Thao tác với bài ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Xoá bài tập', exact: true }).click();
    await expectToast(page, `Đã xoá bài tập ${title}`);
  });

  test('ngân hàng câu hỏi: soạn một câu, chép vào bài, bảng ngân hàng hiện số bài dùng; xoá câu không xoá bài', async ({ page }) => {
    await login(page);
    const prompt = uniq('Ngân hàng E2E');
    await page.goto('/ngan-hang-cau-hoi');
    await page.getByRole('button', { name: 'Thêm câu hỏi' }).click();
    const editor = dialogById(page, 'question-editor-title');
    await editor.getByRole('button', { name: 'Kỹ năng của câu 1' }).click();
    await page.getByRole('option', { name: 'Nghe', exact: true }).click();
    await editor.getByLabel('Nội dung câu 1').fill(prompt);
    await editor.getByLabel('Nội dung đáp án 1 của câu 1').fill('Đáp án đúng');
    await editor.getByLabel('Nội dung đáp án 2 của câu 1').fill('Đáp án sai');
    await editor.getByRole('button', { name: 'Lưu câu hỏi' }).click();
    await expectToast(page, 'Đã thêm câu hỏi vào ngân hàng');
    await expect(page.getByRole('row').filter({ hasText: prompt })).toBeVisible();

    // Soạn bài: chép câu từ ngân hàng rồi lưu
    const title = uniq('BT E2E ngân hàng');
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: 'Thêm bài tập' }).first().click();
    const create = dialogById(page, 'assignment-create-title');
    await create.getByLabel('Tiêu đề *').fill(title);
    await create.getByLabel('Điểm tối đa *').fill('1');
    await create.getByLabel('Hạn nộp (ngày) *').fill('2026-10-20');
    await create.getByLabel('Hạn nộp (giờ) *').fill('20:00');
    await create.getByRole('button', { name: 'Tạo bài tập' }).click();
    await expectToast(page, `Đã tạo bài tập ${title}`);
    await page.getByRole('link', { name: title }).first().click();
    await page.waitForURL('**/bai-tap/*');

    await page.getByRole('button', { name: 'Soạn câu hỏi' }).click();
    const items = dialogById(page, 'items-editor-title');
    await items.getByRole('button', { name: 'Thêm từ ngân hàng' }).click();
    const picker = dialogById(page, 'bank-picker-title');
    await picker.getByRole('checkbox', { name: `Chọn câu: ${prompt}` }).check();
    await picker.getByRole('button', { name: 'Chép vào bài (1)' }).click();
    await expect(items.getByLabel('Nội dung câu 1')).toHaveValue(prompt);
    await items.getByRole('button', { name: 'Lưu câu hỏi' }).click();
    await expectToast(page, 'Đã lưu 1 câu hỏi, tổng 1 điểm');

    // Ngân hàng đếm bài dùng câu này
    await page.goto('/ngan-hang-cau-hoi');
    await expect(page.getByRole('row').filter({ hasText: prompt }).getByText('1 bài')).toBeVisible();

    // Xoá câu trong ngân hàng: bài đã chép vẫn giữ câu
    await page.getByRole('row').filter({ hasText: prompt }).getByRole('button', { name: /Thao tác với câu/ }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Xoá câu hỏi', exact: true }).click();
    await expectToast(page, 'Đã xoá câu hỏi khỏi ngân hàng');
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('link', { name: title }).first().click();
    await expect(page.getByText('1 câu hỏi · ')).toBeVisible();
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: `Thao tác với bài ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Xoá bài tập', exact: true }).click();
    await expectToast(page, `Đã xoá bài tập ${title}`);
  });

  test('bài giảng: tạo cho cơ sở, thêm liên kết, gắn bài tập; xoá bị chặn khi còn bài gắn', async ({ page }) => {
    await login(page);
    const lesson = uniq('Bài giảng E2E');
    await page.goto('/bai-giang');
    await page.getByRole('button', { name: 'Thêm bài giảng' }).click();
    const form = dialogById(page, 'lesson-form-title');
    await form.getByLabel('Tiêu đề bài giảng').fill(lesson);
    await form.getByLabel('Mục tiêu bài giảng').fill('Học sinh kể lại việc đã làm bằng quá khứ đơn');
    // Cơ sở đang chọn ở thanh trên được điền sẵn; bấm lại mục đó sẽ bỏ chọn
    await expect(form.getByRole('button', { name: 'Cơ sở dùng bài giảng *' })).toContainText('Cơ sở chính');
    await form.getByRole('button', { name: 'Lưu bài giảng' }).click();
    await expectToast(page, `Đã tạo bài giảng ${lesson}`);

    // Thêm một liên kết tài liệu
    const row = page.getByRole('row').filter({ hasText: lesson });
    await row.getByRole('button', { name: /Thao tác với bài giảng/ }).click();
    await page.getByRole('menuitem', { name: 'Tài liệu' }).click();
    const materials = dialogById(page, 'lesson-materials-title');
    await materials.getByLabel('Tên tài liệu').fill('Slide buổi 1');
    await materials.getByLabel('Liên kết tài liệu').fill('javascript:alert(1)');
    await materials.getByRole('button', { name: 'Thêm tài liệu' }).click();
    await expect(materials.getByText('Liên kết phải bắt đầu bằng http:// hoặc https://')).toBeVisible();
    await materials.getByLabel('Liên kết tài liệu').fill('https://example.com/slide-1');
    await materials.getByRole('button', { name: 'Thêm tài liệu' }).click();
    await expectToast(page, 'Đã thêm tài liệu Slide buổi 1');
    await expect(materials.getByRole('link', { name: 'Slide buổi 1' })).toBeVisible();

    // Thêm một tệp tải lên
    await materials.getByRole('button', { name: 'Loại tài liệu' }).click();
    await page.getByRole('option', { name: 'Tệp', exact: true }).click();
    await materials.getByLabel('Tải tệp tài liệu').setInputFiles({ name: 'tu-vung.txt', mimeType: 'text/plain', buffer: Buffer.from('apple, banana') });
    await materials.getByLabel('Tên tài liệu').fill('Bảng từ vựng');
    await materials.getByRole('button', { name: 'Thêm tài liệu' }).click();
    await expectToast(page, 'Đã thêm tài liệu Bảng từ vựng');
    await expect(materials.getByRole('link', { name: 'Bảng từ vựng' })).toHaveAttribute('href', /\/api\/files\/\d+/);
    await materials.getByRole('button', { name: /Đóng/ }).click();

    // Gắn bài giảng vào một bài tập của lớp cùng cơ sở
    const title = uniq('BT E2E bài giảng');
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: 'Thêm bài tập' }).first().click();
    const create = dialogById(page, 'assignment-create-title');
    await create.getByLabel('Tiêu đề *').fill(title);
    await create.getByLabel('Điểm tối đa *').fill('1');
    await create.getByLabel('Hạn nộp (ngày) *').fill('2026-10-20');
    await create.getByLabel('Hạn nộp (giờ) *').fill('20:00');
    await create.getByRole('button', { name: 'Bài giảng', exact: true }).click();
    await page.getByRole('option', { name: lesson, exact: true }).click();
    await create.getByRole('button', { name: 'Tạo bài tập' }).click();
    await expectToast(page, `Đã tạo bài tập ${title}`);
    await expect(page.getByText(`Bài giảng: ${lesson}`).first()).toBeVisible();

    // Xoá bài giảng đang có bài tập gắn bị chặn và nêu lý do
    await page.goto('/bai-giang');
    await page.getByRole('row').filter({ hasText: lesson }).getByRole('button', { name: /Thao tác với bài giảng/ }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.getByText(`Bài giảng "${lesson}" đang có 1 bài tập gắn`)).toBeVisible();
    await page.getByRole('button', { name: 'Đã hiểu', exact: true }).click();

    // Dọn: xoá bài tập trước, rồi xoá bài giảng
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: `Thao tác với bài ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Xoá bài tập', exact: true }).click();
    await expectToast(page, `Đã xoá bài tập ${title}`);
    await page.goto('/bai-giang');
    await page.getByRole('row').filter({ hasText: lesson }).getByRole('button', { name: /Thao tác với bài giảng/ }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Xoá bài giảng', exact: true }).click();
    await expectToast(page, `Đã xoá bài giảng ${lesson}`);
  });

  test('báo cáo kỹ năng: bài đã chấm đủ hiện bốn kỹ năng ở báo cáo lớp và tab Kỹ năng trong hồ sơ', async ({ page }) => {
    await login(page);
    const title = uniq('BT E2E kỹ năng');
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: 'Thêm bài tập' }).first().click();
    const create = dialogById(page, 'assignment-create-title');
    await create.getByLabel('Tiêu đề *').fill(title);
    await create.getByLabel('Điểm tối đa *').fill('1');
    await create.getByLabel('Hạn nộp (ngày) *').fill('2026-10-20');
    await create.getByLabel('Hạn nộp (giờ) *').fill('20:00');
    await create.getByRole('button', { name: 'Tạo bài tập' }).click();
    await expectToast(page, `Đã tạo bài tập ${title}`);
    await page.getByRole('link', { name: title }).first().click();
    await page.waitForURL('**/bai-tap/*');

    // Nghe (trắc nghiệm 2 điểm), viết (mẫu IELTS viết 20 điểm), nói (mẫu IELTS nói 20 điểm)
    await page.getByRole('button', { name: 'Soạn câu hỏi' }).click();
    const editor = dialogById(page, 'items-editor-title');
    await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
    await editor.getByRole('button', { name: 'Kỹ năng của câu 1' }).click();
    await page.getByRole('option', { name: 'Nghe', exact: true }).click();
    await editor.getByLabel('Nội dung câu 1').fill('Listen and choose the day.');
    await editor.getByLabel('Nội dung đáp án 1 của câu 1').fill('Monday');
    await editor.getByLabel('Nội dung đáp án 2 của câu 1').fill('Tuesday');
    await editor.getByLabel('Đáp án 2 là đáp án đúng').check();
    await editor.getByLabel('Điểm của câu 1').fill('2');
    await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
    await editor.getByRole('button', { name: 'Loại của câu 2' }).click();
    await page.getByRole('option', { name: 'Trả lời viết', exact: true }).click();
    await editor.getByRole('button', { name: 'Kỹ năng của câu 2' }).click();
    await page.getByRole('option', { name: 'Viết', exact: true }).click();
    await editor.getByLabel('Nội dung câu 2').fill('Write about your weekend.');
    await editor.getByRole('button', { name: 'Mẫu IELTS viết' }).click();
    await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
    await editor.getByRole('button', { name: 'Loại của câu 3' }).click();
    await page.getByRole('option', { name: 'Nộp tệp', exact: true }).click();
    await editor.getByRole('button', { name: 'Kỹ năng của câu 3' }).click();
    await page.getByRole('option', { name: 'Nói', exact: true }).click();
    await editor.getByLabel('Nội dung câu 3').fill('Talk about your favourite place.');
    await editor.getByRole('button', { name: 'Mẫu IELTS nói' }).click();
    await editor.getByRole('button', { name: 'Lưu câu hỏi' }).click();
    await expectToast(page, 'Đã lưu 3 câu hỏi, tổng 42 điểm');

    // Chấm đủ học sinh đầu danh sách: 2 + 13 + 17 = 32 trên 42
    await page.getByRole('button', { name: 'Chấm bài' }).first().click();
    const answer = dialogById(page, 'answer-dialog-title');
    await answer.getByLabel('B. Tuesday').check();
    const q2 = answer.getByRole('region', { name: 'Câu 2' });
    await q2.getByLabel('Điểm tiêu chí Task Response câu 2').fill('4');
    await q2.getByLabel('Điểm tiêu chí Coherence and Cohesion câu 2').fill('3');
    await q2.getByLabel('Điểm tiêu chí Lexical Resource câu 2').fill('4');
    await q2.getByLabel('Điểm tiêu chí Grammatical Range and Accuracy câu 2').fill('2');
    const q3 = answer.getByRole('region', { name: 'Câu 3' });
    await q3.getByLabel('Tải tệp bài nộp câu 3').setInputFiles({ name: 'noi.txt', mimeType: 'text/plain', buffer: Buffer.from('My favourite place is the beach.') });
    await q3.getByLabel('Điểm tiêu chí Fluency and Coherence câu 3').fill('4');
    await q3.getByLabel('Điểm tiêu chí Lexical Resource câu 3').fill('4');
    await q3.getByLabel('Điểm tiêu chí Grammatical Range and Accuracy câu 3').fill('4');
    await q3.getByLabel('Điểm tiêu chí Pronunciation câu 3').fill('5');
    await answer.getByRole('button', { name: 'Lưu bài làm' }).click();
    await expectToast(page, '32/42 điểm');
    await expect(page.getByRole('row').filter({ hasText: '32/42' })).toBeVisible();

    // Báo cáo lớp: nghe 100%, nói 85%, đọc chưa có, viết 65%
    await page.goto('/bao-cao-ky-nang?cls=2');
    const row = page.getByRole('row').filter({ hasText: '65%' });
    await expect(row).toHaveCount(1);
    await expect(row.getByText('100%', { exact: true })).toBeVisible();
    await expect(row.getByText('85%', { exact: true })).toBeVisible();
    await expect(row.getByText('1 bài', { exact: true })).toBeVisible();
    const name = (await row.getByRole('cell').first().textContent())?.trim() ?? '';
    expect(name).not.toBe('');

    // Hồ sơ học sinh: tab Kỹ năng hiện cùng số liệu
    await page.goto('/hoc-sinh?cls=2');
    await page.getByRole('link', { name, exact: true }).first().click();
    await page.getByRole('link', { name: 'Kỹ năng', exact: true }).first().click();
    const region = page.getByRole('region', { name: 'Điểm trung bình theo kỹ năng' });
    await expect(region.getByText('65%', { exact: true }).first()).toBeVisible();
    await expect(region.getByText('Chưa có bài', { exact: false }).first()).toBeVisible();

    // Xoá bài kèm bài làm
    await page.goto('/bai-tap?cls=2');
    await page.getByRole('button', { name: `Thao tác với bài ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await page.getByRole('button', { name: 'Xoá bài tập', exact: true }).click();
    await expectToast(page, `Đã xoá bài tập ${title}`);
  });

  test('trình độ: ba bài đã chấm đạt ngưỡng thì gợi ý lên, giáo viên xác nhận và ghi lịch sử', async ({ page }) => {
    // Dữ liệu thử: ba bài đã chấm xong, mỗi bài có bốn kỹ năng, điểm 100, 100, 80, 80 phần trăm.
    // Tạo bằng SQL để nhanh; các bài và sự kiện thử đều bị xoá ở cuối kịch bản.
    loadEnvLocal();
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const tag = uniq('E2E trình độ');
    let studentId = 0;
    try {
      const [student] = (
        await db.query<{ id: number; class_id: number; full_name: string }>(
          `select id, class_id, full_name from students where class_id = 2 and status in ('active', 'trial') order by full_name limit 1`,
        )
      ).rows;
      studentId = student.id;
      const [a1] = (await db.query<{ id: number }>(`select id from course_levels where code = 'A1'`)).rows;
      await db.query('update students set level_id = $1 where id = $2', [a1.id, studentId]);

      for (let i = 1; i <= 3; i++) {
        const [asg] = (
          await db.query<{ id: number }>(
            `insert into assignments (class_id, title, description, due_at, max_score) values ($1, $2, '', $3, 24) returning id`,
            [student.class_id, `${tag} ${i}`, new Date(Date.now() - (4 - i) * 86_400_000)],
          )
        ).rows;
        const assignmentId = asg.id;
        const itemRows = [
          { skill: 'listening', type: 'choice', points: 2, correct: true },
          { skill: 'reading', type: 'choice', points: 2, correct: true },
          { skill: 'writing', type: 'text', points: 10, got: 8 },
          { skill: 'speaking', type: 'file', points: 10, got: 8 },
        ];
        const [sub] = (
          await db.query<{ id: number }>(
            `insert into assignment_submissions (assignment_id, student_id, status, score, submitted_at, feedback) values ($1, $2, 'graded', 20, now(), '') returning id`,
            [assignmentId, studentId],
          )
        ).rows;
        for (const [pos, row] of itemRows.entries()) {
          const [item] = (
            await db.query<{ id: number }>(
              `insert into assignment_items (assignment_id, position, skill, item_type, prompt, passage, points) values ($1, $2, $3, $4, 'Câu thử', '', $5) returning id`,
              [assignmentId, pos + 1, row.skill, row.type, row.points],
            )
          ).rows;
          let optionId: number | null = null;
          if (row.type === 'choice') {
            const [opt] = (
              await db.query<{ id: number }>(
                `insert into assignment_item_options (item_id, position, label, is_correct) values ($1, 1, 'Đúng', true), ($1, 2, 'Sai', false) returning id`,
                [item.id],
              )
            ).rows;
            optionId = opt.id;
          }
          await db.query(
            `insert into submission_item_scores (submission_id, item_id, selected_option_id, answer_text, points, comment) values ($1, $2, $3, '', $4, '')`,
            [sub.id, item.id, optionId, row.type === 'choice' ? null : row.got],
          );
        }
      }

      await login(page);
      await page.goto('/hoc-sinh?cls=2');
      await page.getByRole('link', { name: student.full_name, exact: true }).first().click();
      await page.getByRole('link', { name: 'Kỹ năng', exact: true }).first().click();
      const level = page.getByRole('region', { name: 'Trình độ' });
      await expect(level.getByText('A1 · Sơ cấp A1')).toBeVisible();
      await expect(level.getByText('Đủ điều kiện lên A2 (Sơ cấp A2)')).toBeVisible();
      await level.getByRole('button', { name: 'Xác nhận lên A2' }).click();
      await expectToast(page, `Lên trình độ A2 · ${student.full_name}`);
      await expect(level.getByText('A2 · Sơ cấp A2')).toBeVisible();

      const events = await db.query<{ title: string; event_type: string }>(
        `select title, event_type from learning_events where student_id = $1 and title = 'Lên trình độ A2'`,
        [studentId],
      );
      expect(events.rows).toEqual([{ title: 'Lên trình độ A2', event_type: 'level_up' }]);
    } finally {
      // Dọn: xoá các bài thử (kèm bài làm), trả trình độ về chưa xếp, xoá sự kiện thử
      await db.query(`delete from assignments where title like $1`, [`${tag}%`]);
      await db.query(`update students set level_id = null where id = $1`, [studentId]);
      await db.query(`delete from learning_events where student_id = $1 and title = 'Lên trình độ A2'`, [studentId]);
      await db.end();
    }
  });

  test('cổng học sinh: tạo tài khoản, học sinh đăng nhập bằng mã, nộp bài; giáo viên thấy bài nộp', async ({ page }) => {
    loadEnvLocal();
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const title = uniq('BT E2E cổng');
    let studentId = 0;
    try {
      const [student] = (
        await db.query<{ id: number; full_name: string }>(
          `select id, full_name from students where class_id = 2 and status in ('active', 'trial') order by full_name limit 1`,
        )
      ).rows;
      studentId = student.id;
      const fullName = student.full_name;
      const code = `HS-${String(studentId).padStart(4, '0')}`;
      await db.query('delete from accounts where student_id = $1', [studentId]); // dọn tài khoản còn sót từ lần chạy trước

      // Giáo viên soạn bài: trắc nghiệm nghe (2 điểm) và trả lời viết (5 điểm)
      await login(page);
      await page.goto('/bai-tap?cls=2');
      await page.getByRole('button', { name: 'Thêm bài tập' }).first().click();
      const create = dialogById(page, 'assignment-create-title');
      await create.getByLabel('Tiêu đề *').fill(title);
      await create.getByLabel('Điểm tối đa *').fill('1');
      await create.getByLabel('Hạn nộp (ngày) *').fill('2026-10-20');
      await create.getByLabel('Hạn nộp (giờ) *').fill('20:00');
      await create.getByRole('button', { name: 'Tạo bài tập' }).click();
      await expectToast(page, `Đã tạo bài tập ${title}`);
      await page.getByRole('link', { name: title }).first().click();
      await page.waitForURL('**/bai-tap/*');
      await page.getByRole('button', { name: 'Soạn câu hỏi' }).click();
      const editor = dialogById(page, 'items-editor-title');
      await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
      await editor.getByRole('button', { name: 'Kỹ năng của câu 1' }).click();
      await page.getByRole('option', { name: 'Nghe', exact: true }).click();
      await editor.getByLabel('Nội dung câu 1').fill('Listen and choose the day.');
      await editor.getByLabel('Nội dung đáp án 1 của câu 1').fill('Monday');
      await editor.getByLabel('Nội dung đáp án 2 của câu 1').fill('Tuesday');
      await editor.getByLabel('Đáp án 2 là đáp án đúng').check();
      await editor.getByLabel('Điểm của câu 1').fill('2');
      await editor.getByRole('button', { name: 'Thêm câu', exact: true }).click();
      await editor.getByRole('button', { name: 'Loại của câu 2' }).click();
      await page.getByRole('option', { name: 'Trả lời viết', exact: true }).click();
      await editor.getByRole('button', { name: 'Kỹ năng của câu 2' }).click();
      await page.getByRole('option', { name: 'Viết', exact: true }).click();
      await editor.getByLabel('Nội dung câu 2').fill('Write about your weekend.');
      await editor.getByLabel('Điểm của câu 2').fill('5');
      await editor.getByRole('button', { name: 'Lưu câu hỏi' }).click();
      await expectToast(page, 'Đã lưu 2 câu hỏi, tổng 7 điểm');

      // Tạo tài khoản học sinh từ hồ sơ: mật khẩu ban đầu là esl123 (hiện một lần)
      await page.goto('/hoc-sinh?cls=2');
      await page.getByRole('link', { name: fullName, exact: true }).first().click();
      const account = page.getByRole('region', { name: 'Tài khoản học sinh' });
      await account.getByRole('button', { name: 'Tạo tài khoản học sinh' }).click();
      const password = ((await page.locator('code[aria-label="Mật khẩu tạm thời"]').textContent()) ?? '').trim();
      expect(password).toBe('esl123');
      await page.getByRole('button', { name: 'Đã ghi lại', exact: true }).click();

      // Học sinh đăng nhập bằng mã: vào khu học sinh, không vào được màn quản lý
      await page.context().clearCookies();
      await page.goto('/dang-nhap');
      await page.getByLabel('Email').fill(code);
      await page.getByLabel('Mật khẩu').fill(password);
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await page.waitForURL('**/cua-toi');
      await page.getByRole('link', { name: title }).click();
      await page.waitForURL('**/cua-toi/*');
      const assignmentUrl = page.url();
      await page.goto('/tong-quan');
      await page.waitForURL('**/cua-toi');
      await page.goto(assignmentUrl);

      // Làm bài và nộp
      await page.getByLabel('B. Tuesday').check();
      await page.getByLabel('Bài làm câu 2').fill('I went hiking with my friends.');
      await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
      await expectToast(page, 'Đã nộp bài. Giáo viên sẽ chấm câu viết và nộp tệp.');

      // Giáo viên thấy bài nộp và bài làm của học sinh
      await page.context().clearCookies();
      await login(page);
      await page.goto('/bai-tap?cls=2');
      await page.getByRole('link', { name: title }).first().click();
      await page.waitForURL('**/bai-tap/*');
      const row = page.getByRole('row').filter({ hasText: fullName });
      await expect(row.getByText('Đã nộp', { exact: true })).toBeVisible();
      await row.getByRole('button', { name: 'Chấm bài' }).click();
      const answer = dialogById(page, 'answer-dialog-title');
      await expect(answer.getByLabel('B. Tuesday')).toBeChecked();
      await expect(answer.getByLabel('Bài làm câu 2')).toHaveValue('I went hiking with my friends.');
    } finally {
      await db.query('delete from assignments where title = $1', [title]);
      await db.query('delete from accounts where student_id = $1', [studentId]);
      await db.end();
    }
  });

  test('dọn tệp: tệp quá 24 giờ không còn dùng bị xoá, tệp mới được giữ', async ({ page }) => {
    loadEnvLocal();
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const dir = join(process.cwd(), 'storage', 'uploads');
    const stamp = Date.now();
    const oldKey = `e2eold${stamp}`;
    const newKey = `e2enew${stamp}`;
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, oldKey), 'cũ');
      await writeFile(join(dir, newKey), 'mới');
      await db.query(
        `insert into uploaded_files (storage_key, original_name, mime_type, size_bytes, created_at) values ($1, 'cu.txt', 'text/plain', 3, now() - interval '2 days'), ($2, 'moi.txt', 'text/plain', 3, now())`,
        [oldKey, newKey],
      );

      await login(page);
      await page.goto('/cai-dat');
      const panel = page.getByRole('region', { name: 'Tệp không còn dùng' });
      await panel.getByRole('button', { name: 'Dọn tệp không còn dùng' }).click();
      await page.getByRole('button', { name: 'Dọn tệp', exact: true }).click();
      await expectToast(page, 'Đã dọn');

      const left = await db.query<{ storage_key: string }>(`select storage_key from uploaded_files where storage_key in ($1, $2)`, [oldKey, newKey]);
      expect(left.rows.map((r) => r.storage_key)).toEqual([newKey]);
      expect(existsSync(join(dir, oldKey))).toBe(false);
      expect(existsSync(join(dir, newKey))).toBe(true);
    } finally {
      await db.query(`delete from uploaded_files where storage_key in ($1, $2)`, [oldKey, newKey]);
      await rm(join(dir, oldKey), { force: true });
      await rm(join(dir, newKey), { force: true });
      await db.end();
    }
  });

  test('cài đặt: hạn đóng ngoài 1–28 bị chặn', async ({ page }) => {
    await login(page);
    await page.goto('/cai-dat');
    await page.locator('input[name="dueDay"]').fill('40');
    await page.getByRole('button', { name: 'Lưu cài đặt' }).click();
    await expect(page.getByText('Ngày đến hạn từ 1 đến 28')).toBeVisible();
    await expect(page.locator('input[name="dueDay"]')).toHaveValue('40');
    await page.locator('input[name="dueDay"]').fill('10');
  });

  test('lịch học: chuyển tuần và mở buổi đã học chỉ để xem', async ({ page }) => {
    await login(page);
    await page.goto('/lich-hoc?w=2026-10-12');
    await expect(page.getByText(/Tuần 12\/10\/2026 – 18\/10\/2026/)).toBeVisible();
    await page.getByRole('link', { name: 'Khoảng sau' }).click();
    await expect(page.getByText(/Tuần 19\/10\/2026 – 25\/10\/2026/)).toBeVisible();
    await page.goto('/lich-hoc?w=2026-10-12');
    await page.locator('button:visible', { hasText: 'Đã học' }).first().click();
    await expect(page.getByText('đã học xong nên không sửa được')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('nhập dữ liệu: dòng lỗi chặn nhập; nhập tạo cơ sở, lớp, giáo viên, học sinh, phụ huynh; nhập lại thì cập nhật', async ({ page }) => {
    loadEnvLocal();
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    const stamp = String(Date.now()).slice(-6);
    const campus = `CS E2E nhap ${stamp}`;
    const className = `LOP E2E N${stamp}`;
    const teacherPhone = `09${stamp}11`;
    const parentPhone = `09${stamp}22`;
    const header = IMPORT_COLUMNS.map((c) => c.header);
    const lineOf = (v: Partial<Record<ImportColumnKey, string | number>>) => IMPORT_COLUMNS.map((c) => v[c.key] ?? null);
    const classCells = {
      campusName: campus, className, course: 'Kiểm thử nhập', weekdays: 'T2,T4', startTime: '18:00', endTime: '19:30',
      classStartDate: '02/11/2026', sessionsTotal: 6, fee: 3000000, capacity: 15, teacherName: `GV E2E nhap ${stamp}`, teacherPhone,
    };
    const studentA = { studentName: `HS E2E nhap A ${stamp}`, gender: 'Nam', dob: '01/01/2012', parentName: `PH E2E nhap ${stamp}`, parentPhone, relation: 'Bố' };
    const studentB = { studentName: `HS E2E nhap B ${stamp}`, gender: 'Nữ', dob: '02/02/2013', parentPhone, relation: 'Bố' };

    async function xlsx(lines: Partial<Record<ImportColumnKey, string | number>>[]): Promise<Buffer> {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Du lieu');
      ws.addRow(header);
      for (const l of lines) ws.addRow(lineOf(l));
      return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    }
    const upload = (name: string, buffer: Buffer) =>
      page.locator('input[aria-label="File Excel cần nhập"]').setInputFiles({ name, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });

    try {
      await login(page);
      await page.goto('/nhap-du-lieu');
      await expect(page.getByRole('link', { name: 'Tải file mẫu' })).toHaveAttribute('href', '/api/nhap-du-lieu/mau');
      const template = await page.request.get('/api/nhap-du-lieu/mau');
      expect(template.status()).toBe(200);
      expect(template.headers()['content-type']).toContain('spreadsheetml');

      // File có một dòng lỗi: lớp mới thiếu lịch. Không nhập được dòng nào.
      await upload('loi.xlsx', await xlsx([{ ...classCells, ...studentA }, { campusName: campus, className: `${className}X`, studentName: 'HS E2E thiếu lịch', gender: 'Nam', dob: '03/03/2012' }]));
      await expect(page.getByText('Có 1 dòng lỗi.')).toBeVisible();
      await expect(page.getByText(/cần ghi đủ để tạo lớp mới: khoá học, ngày học/).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /Nhập dữ liệu \(/ })).toBeDisabled();

      // File đúng: hai học sinh cùng lớp, chung một phụ huynh
      await upload('dung.xlsx', await xlsx([{ ...classCells, ...studentA }, { campusName: campus, className, ...studentB }]));
      await expect(page.getByText('Không có lỗi.')).toBeVisible();
      await expect(page.getByRole('region', { name: 'Học sinh' })).toContainText('Thêm2');
      await page.getByRole('button', { name: 'Nhập dữ liệu (2 dòng)' }).click();
      await expect(page.getByText(/Đã nhập xong: cơ sở thêm 1; giáo viên thêm 1; lớp thêm 1; học sinh thêm 2; phụ huynh thêm 1/)).toBeVisible();

      const cls = (await db.query<{ id: number; assistant_id: number | null; n: number }>(
        `select c.id, c.assistant_id, (select count(*)::int from class_sessions s where s.class_id = c.id) as n
         from classes c join campuses k on k.id = c.campus_id where k.name = $1 and c.name = $2`, [campus, className],
      )).rows;
      expect(cls).toHaveLength(1);
      expect(cls[0].n).toBe(6);
      expect(cls[0].assistant_id).toBeNull();
      const links = (await db.query<{ full_name: string; is_primary: boolean; relation: string }>(
        `select s.full_name, sp.is_primary, sp.relation from student_parents sp join students s on s.id = sp.student_id
         join parents p on p.id = sp.parent_id where p.phone = $1 order by s.full_name`, [parentPhone],
      )).rows;
      expect(links).toEqual([
        { full_name: studentA.studentName, is_primary: true, relation: 'father' },
        { full_name: studentB.studentName, is_primary: true, relation: 'father' },
      ]);

      // Nhập lại: lớp đổi học phí, học sinh A nhận theo họ tên và ngày sinh, đổi trạng thái
      await upload('capnhat.xlsx', await xlsx([{ campusName: campus, className, fee: 3500000, studentName: studentA.studentName, dob: studentA.dob, status: 'Bảo lưu' }]));
      await expect(page.getByText('Không có lỗi.')).toBeVisible();
      await page.getByRole('button', { name: 'Nhập dữ liệu (1 dòng)' }).click();
      await expect(page.getByText(/Đã nhập xong: lớp cập nhật 1; học sinh cập nhật 1/)).toBeVisible();
      const after = (await db.query<{ fee: number; status: string; total: number }>(
        `select c.fee, s.status, (select count(*)::int from students x where x.class_id = c.id) as total
         from students s join classes c on c.id = s.class_id where s.full_name = $1`, [studentA.studentName],
      )).rows;
      expect(after).toEqual([{ fee: 3500000, status: 'paused', total: 2 }]);
    } finally {
      // Dọn theo thứ tự khoá ngoại: học sinh (kèm liên kết), lớp (kèm buổi học), giáo viên, phụ huynh, cơ sở
      await db.query(`delete from students where full_name like $1`, [`HS E2E nhap % ${stamp}`]);
      await db.query(`delete from classes where campus_id in (select id from campuses where name = $1)`, [campus]);
      await db.query(`delete from teachers where phone = $1`, [teacherPhone]);
      await db.query(`delete from parents where phone = $1`, [parentPhone]);
      await db.query(`delete from campuses where name = $1`, [campus]);
      await db.end();
    }
  });
});
