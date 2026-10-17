import { expect, test } from '@playwright/test';
import { login } from './helpers';

// Kiểm tra chuẩn giao diện (docs/DESIGN.md mục 8), để chặn lệch chuẩn về sau:
// - mọi nút, ô nhập, ô chọn, chip cao đúng token: 32px trên máy tính; 32, 36 hoặc 44px trên điện thoại;
// - khung có bóng (shadow-card) bo 24px;
// - tiêu đề cột bảng và nhãn trạng thái không đậm (400).
// Thẻ bấm được có data-card không thuộc kiểm tra này: đó là thẻ dữ liệu, không phải nút điều khiển.
// Liên kết trong ô có data-link cũng không thuộc kiểm tra: tên học sinh xuống dòng khi dài nên cao theo chữ.

const ROUTES = [
  '/tong-quan',
  '/tinh-nang',
  '/hoc-sinh',
  '/phu-huynh',
  '/giao-vien',
  '/lop-hoc',
  '/lich-hoc',
  '/diem-danh?cls=1',
  '/bai-tap?cls=2',
  '/hoc-phi',
  '/bao-cao',
  '/lich-su-hoc-tap',
  '/cai-dat',
  '/tai-khoan',
  '/tai-khoan?tab=phan-quyen',
  '/tai-khoan?tab=nhat-ky',
  '/doi-mat-khau',
  '/nhap-du-lieu',
];

// Đo trên trang. Trả về danh sách vi phạm, rỗng là đạt.
function audit(phone: boolean): string[] {
  {
    const issues: string[] = [];
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const name = (el: Element) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
    const allowed = phone ? [32, 36, 44] : [32, 36];

    for (const el of Array.from(document.querySelectorAll('button, select, input, textarea, [role="tab"]'))) {
      if (!visible(el)) continue;
      const html = el as HTMLElement;
      if (el.tagName === 'TEXTAREA') continue; // ô nhập nhiều dòng (ghi chú, nội dung) có chiều cao theo rows
      if (el.tagName === 'INPUT' && ['checkbox', 'radio', 'hidden'].includes((el as HTMLInputElement).type)) continue;
      const role = el.getAttribute('role');
      if (role === 'checkbox' || role === 'switch') continue; // ô đánh dấu quyền có cỡ riêng
      if (html.style.height || el.getAttribute('data-card') === 'true' || el.getAttribute('data-link') === 'true') continue; // khối lịch, thẻ dữ liệu và liên kết trong ô
      if (el.closest('.fixed.inset-x-0.bottom-0')) continue; // thanh tab dưới điện thoại
      // Ô không viền nằm trong khung tìm kiếm của thanh trên: khung ngoài mới là ô có cỡ chuẩn
      if (el.tagName === 'INPUT' && el.closest('form[role="search"]') && getComputedStyle(el).borderTopWidth === '0px') continue;
      // Ô chọn và ô nhập đặt trong nhãn có cỡ chuẩn (FilterSelect): tính cỡ của nhãn
      const parent = el.parentElement;
      if (parent && parent.tagName === 'LABEL' && visible(parent)) {
        const ph = Math.round(parent.getBoundingClientRect().height);
        if (allowed.includes(ph)) continue;
      }
      const h = Math.round(el.getBoundingClientRect().height);
      if (!allowed.includes(h)) issues.push(`cao ${h}px: ${el.tagName.toLowerCase()} "${name(el)}"`);
    }

    for (const el of Array.from(document.querySelectorAll('.shadow-card'))) {
      if (!visible(el) || el.classList.contains('rounded-full')) continue;
      const rad = getComputedStyle(el).borderTopLeftRadius;
      if (rad !== '24px') issues.push(`khung bo ${rad}: ${el.tagName.toLowerCase()} "${name(el)}"`);
    }

    for (const el of Array.from(document.querySelectorAll('[role="columnheader"]'))) {
      if (!visible(el)) continue;
      const w = getComputedStyle(el).fontWeight;
      if (w !== '400') issues.push(`tiêu đề cột đậm ${w}: "${name(el)}"`);
    }

    for (const el of Array.from(document.querySelectorAll('span.rounded-full.text-xs'))) {
      if (!visible(el)) continue;
      const w = getComputedStyle(el).fontWeight;
      if (w !== '400') issues.push(`nhãn đậm ${w}: "${name(el)}"`);
    }
    return issues;
  }
}

for (const width of [1440, 390]) {
  test(`chuẩn giao diện ở ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const all: string[] = [];

    // Đo trang Đăng nhập trước khi vào app
    await page.goto('/dang-nhap', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const loginIssues = await page.evaluate(audit, width < 768);
    for (const i of loginIssues) all.push(`/dang-nhap: ${i}`);

    await login(page);
    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: 'load' });
      await page.waitForTimeout(300);
      const issues = await page.evaluate(audit, width < 768);
      for (const i of issues) all.push(`${route}: ${i}`);
    }

    // Đo hộp thoại form: mở form thêm học sinh (web: "Thêm học sinh", mobile: "Thêm mới")
    await page.goto('/hoc-sinh');
    const addBtn = width < 768 ? page.getByRole('button', { name: 'Thêm mới' }) : page.getByRole('button', { name: 'Thêm học sinh' });
    await addBtn.first().click();
    await page.waitForTimeout(300);
    const formIssues = await page.evaluate(audit, width < 768);
    for (const i of formIssues) all.push(`/hoc-sinh (dialog thêm): ${i}`);
    await page.keyboard.press('Escape');

    // Đo hồ sơ học sinh (ngăn kéo web hoặc trang riêng điện thoại)
    const profileUrl = width < 768 ? '/hoc-sinh/1' : '/hoc-sinh?h=1';
    await page.goto(profileUrl, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const profileIssues = await page.evaluate(audit, width < 768);
    for (const i of profileIssues) all.push(`${profileUrl}: ${i}`);

    expect(all, all.join('\n')).toEqual([]);
  });
}
