# ESL Center: quy tắc dự án

Đọc file này trước khi làm bất cứ việc gì trong dự án. Kế hoạch và tiến độ ở `PLAN.md`. Nhật ký lỗi ở `docs/ERROR-LOG.md`. Thiết kế ở `docs/DESIGN.md`.

## 1. Công nghệ

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- PostgreSQL với Drizzle ORM (`drizzle-orm`, `pg`, `drizzle-kit`).
- Validate dữ liệu bằng zod.
- Test: vitest (đơn vị), Playwright (đầu cuối, thêm sau).
- Không dùng Vite. Next.js đã có bộ bundler riêng, không ghép với Vite trong cùng dự án.
- Tiếng Việt cho giao diện và chú thích. Tên biến, hàm, file dùng tiếng Anh.

## 2. Next.js của phiên bản này

- Trước khi viết mã Next.js, đọc tài liệu có sẵn trong `node_modules/next/dist/docs/` (xem `AGENTS.md`). API có thể khác với kiến thức cũ.
- Mutation dùng Server Actions (`'use server'`), validate bằng zod, kiểm tra quyền trong mỗi action, rồi `revalidatePath` hoặc `refresh()`.
- Chỉ import `src/db/client.ts` từ code chạy trên server.

## 3. Thiết kế giao diện

- Nguồn chuẩn: `docs/DESIGN.md`. Đọc mục liên quan trước khi sửa UI.
- Không viết số cố định cho cỡ chữ, màu, khoảng cách. Dùng token trong `globals.css` (`--fs-*`, `--bg`, `--primary`...).
- Ô nhập trên điện thoại giữ 16px, không nhỏ hơn.
- Xoá luôn qua hộp xác nhận. Khi còn dữ liệu liên quan, chặn xoá và nêu lý do.
- Icon xoá luôn có viền đỏ nhạt.
- Trên web (từ 768px): dòng bảng và danh sách dùng nút ⋯ mở menu có icon.
- Trên điện thoại: thẻ học sinh có hàng nút có chữ. Dòng tài khoản dùng cụm icon.
- Mọi thay đổi UI phải kiểm tra không tràn ngang ở 360, 390, 768, 1024, 1440px.

## 4. Cơ sở dữ liệu

- Schema nằm ở `src/db/schema.ts`, là nguồn chuẩn.
- Mỗi thay đổi schema: sửa `schema.ts`, chạy `npm run db:generate`, commit file migration sinh ra.
- Không sửa một migration đã áp dụng. Muốn đổi thì tạo migration mới.
- Tiền luôn là số nguyên VND. Không dùng số thực.
- Không ghép chuỗi SQL. Dùng query builder của Drizzle hoặc tham số hoá.
- `DATABASE_URL` chỉ nằm trong `.env.local`. File này không được commit.

## 5. Tiến độ và kế hoạch

- Mọi task làm xong phải đánh dấu `[x]` trong `PLAN.md`, ghi ngày và kết quả kiểm chứng ngắn.
- Chỉ đánh dấu khi đã kiểm chứng: typecheck, test, hoặc kiểm tra trên trình duyệt. Chưa kiểm chứng thì để `[ ]`.
- Cập nhật dòng tiến độ tổng ở đầu `PLAN.md` sau mỗi lần đánh dấu.
- Task bị chặn (ví dụ chờ PostgreSQL) ghi rõ lý do trong `PLAN.md`, không để im.

## 6. Lỗi và bài học

- Mỗi lỗi gặp phải: ghi vào `docs/ERROR-LOG.md` theo mẫu có sẵn trong file, gồm triệu chứng, nguyên nhân, cách sửa và quy tắc phòng ngừa.
- Trước khi làm việc tương tự (CSS responsive, kiểm thử trình duyệt, migration, server action), đọc `docs/ERROR-LOG.md`.
- Quy tắc phòng ngừa phải được áp dụng: nếu đã có quy tắc thì làm đúng theo, không lặp lại lỗi.

## 7. Kiểm thử trước khi báo xong

- `npm run typecheck` và `npm run lint` phải sạch.
- `npm run test` khi có test.
- Thay đổi UI: kiểm tra trên trình duyệt đúng breakpoint, xem không tràn ngang và không mất thông tin.
- Báo cáo đúng kết quả. Nếu một bước không chạy được (ví dụ chưa có DB), nói rõ là chưa chạy và lý do.

## 8. Git và bí mật

- Xong mỗi việc thì commit và push lên `origin main` luôn, không hỏi lại (người dùng đã chốt ngày 2026-10-16). Trước khi push: `npm run typecheck` và `npm run lint` phải sạch. Không tạo PR khi người dùng chưa yêu cầu, không force push.
- Không dùng `--no-verify` hay tắt hook.
- Không ghi mật khẩu, token, `DATABASE_URL` thật vào repo.
