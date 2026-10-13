---
name: esl-feature-crud
description: Dùng khi thêm một tính năng thêm, sửa, xoá hoặc danh sách mới cho ESL Center (học sinh, lớp, giáo viên, tài khoản, học phí). Checklist từ schema đến kiểm chứng và cập nhật PLAN.md.
---

# Tính năng CRUD trong ESL Center

Làm đúng thứ tự. Mỗi bước có kiểm chứng riêng trước khi sang bước sau.

## Bước 1: Đọc quy tắc

- `CLAUDE.md`, mục DB và thiết kế.
- `docs/DESIGN.md` mục 7 (bảng thao tác theo màn).
- `docs/ERROR-LOG.md` các mục liên quan.
- Tài liệu Next.js trong `node_modules/next/dist/docs/` cho Server Actions.

## Bước 2: Schema và migration

- Thêm hoặc sửa bảng trong `src/db/schema.ts`.
- `npm run db:generate`, đọc file SQL.
- Tiền là VND số nguyên. Xoá dữ liệu tham chiếu dùng `restrict` khi đã có quy tắc chặn.

## Bước 3: Validate (zod)

- Viết schema zod trong `src/lib/validation/<thuc-the>.ts`.
- Mỗi trường có thông báo tiếng Việt.
- Quy tắc nghiệp vụ (email không trùng, số tiền không vượt học phí khoá) viết ở đây hoặc ở lớp service, và có unit test.

## Bước 4: Server Action

- File `src/app/<tuyen>/actions.ts` bắt đầu bằng `'use server'`.
- Thứ tự trong mỗi action: kiểm tra quyền (khi có đăng nhập) → parse zod → kiểm tra nghiệp vụ → ghi DB → `revalidatePath` → trả kết quả có cấu trúc `{ ok, errors? }`.
- Không ném lỗi thô ra UI. Lỗi nghiệp vụ trả về để hiện trong form.

## Bước 5: Giao diện

- Danh sách: đọc từ DB ở Server Component. Bộ lọc và tìm kiếm đưa vào URL (`searchParams`).
- Form: Client Component dùng `useActionState` hoặc `action` của form.
- Xoá: qua `ConfirmDialog`. Nếu bị chặn, chỉ hiện nút Đã hiểu và lý do.
- Dòng bảng và thẻ theo `docs/DESIGN.md` mục 7.

## Bước 6: Kiểm chứng

- Unit test cho zod schema và quy tắc nghiệp vụ.
- Kiểm tra trình duyệt: thêm, sửa, xoá, lỗi validate, xác nhận xoá, chặn xoá.
- Kiểm tra không tràn ngang ở 360, 390, 768, 1024, 1440px.
- `npm run typecheck` và `npm run lint` sạch.

## Bước 7: Cập nhật tài liệu

- Đánh dấu task trong `PLAN.md` (skill `esl-progress-tracking`).
- Nếu có lỗi trong quá trình làm, ghi `docs/ERROR-LOG.md` (skill `esl-error-log`).

## Thứ tự khuyến nghị cho một thực thể

1. Đọc danh sách.
2. Thêm.
3. Sửa.
4. Xoá, có chặn nếu có dữ liệu liên quan.
5. Kiểm tra giao diện và test.
