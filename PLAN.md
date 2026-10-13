# ESL Center: kế hoạch và tiến độ

> **Tiến độ tổng: 68/68 task (100%)**
> Cập nhật lần cuối: 2026-10-13. Còn một quyết định chờ người dùng (D5), không phải task.

Quy ước: `[x]` đã làm và đã kiểm chứng, `[ ]` chưa làm hoặc chưa kiểm chứng. Mỗi task đánh dấu kèm ngày và cách kiểm chứng. Quy tắc đầy đủ ở `CLAUDE.md` mục 5.

Mỗi task UI phải làm cho cả **web** (từ 768px) và **điện thoại** (dưới 768px), theo `docs/DESIGN.md` và skill `esl-design-system`. Mỗi task thêm, sửa, xoá làm theo skill `esl-feature-crud`.

Trạng thái: **schema 0002 đã áp dụng** (PostgreSQL 18 local, database `esl_center`). Toàn bộ module đã chạy trên DB thật. Kiểm chứng gồm: `npm run typecheck`, `npm run lint`, `npm run test` (89 test xanh), `npm run build`, và `npm run test:e2e` (23 kịch bản xanh, tự dọn dữ liệu thử). Hướng dẫn chạy và triển khai ở `README.md`.

---

## P0. Nền tảng

- [x] **0.1** Next.js 16, Tailwind CSS 4, TypeScript, ESLint đã khởi tạo trong `esl-center`. *(2026-10-13, `npm run typecheck` và `lint` chạy được)*
- [x] **0.2** Cài thư viện: `drizzle-orm`, `pg`, `zod`, `drizzle-kit`, `@types/pg`, `tsx`, `vitest@3`, `@playwright/test`. *(2026-10-13, `npm ls` không lỗi nghiêm trọng)*
- [x] **0.3** Tài liệu: `CLAUDE.md`, `PLAN.md`, `docs/ERROR-LOG.md`, `docs/DESIGN.md`, `README.md`. *(2026-10-13)*
- [x] **0.4** Skill dự án trong `.claude/skills/`: tiến độ, nhật ký lỗi, thiết kế, Postgres/Drizzle, CRUD tính năng, Next.js. *(2026-10-13)*
- [x] **0.5** Script npm: `typecheck`, `test`, `test:e2e`, `build`, `db:generate`, `db:migrate`, `db:seed`, `db:set-password`, `db:studio`. *(2026-10-13, các lệnh đã chạy)*
- [x] **0.6** PostgreSQL 18 local chạy được. Database `esl_center`, user `esl`, `.env.local` có `DATABASE_URL`, `SESSION_SECRET`, `DEV_PASSWORD`. *(2026-10-13, mật khẩu chỉ nằm trong `.env.local`)*
- [x] **0.7** Vitest chạy được với test thật. *(2026-10-13, `npm run test`: 89/89 xanh)*

## P1. Cơ sở dữ liệu

- [x] **1.1** Schema trong `src/db/schema.ts`. *(2026-10-13)*
- [x] **1.2** Migration `0000` và `0001`, `0002`. *(2026-10-13)*
- [x] **1.3** Áp dụng migration vào `esl_center`. *(2026-10-13, liệt kê bảng xác nhận)*
- [x] **1.4** Seed dữ liệu mẫu (`src/db/seed.ts`): 5 giáo viên, 6 lớp, 24 học sinh, 248 buổi, điểm danh, học phí, 12 bài tập, 5 tài khoản. *(2026-10-13, số liệu khớp sau mỗi lần kiểm thử)*
- [x] **1.5** Tiện ích không cần DB, có test: `money`, `student-code`, `text`, `datetime`, `tuition`, `learning-history`. *(2026-10-13, `tests/unit`)*

## P2. Lõi giao diện và điều hướng

- [x] **2.1** `globals.css`: token màu sáng và tối, thang cỡ chữ `--fs-*` ba breakpoint. *(2026-10-13, đo trên trình duyệt ở 390, 1024, 1440px)*
- [x] **2.2** Font Plus Jakarta Sans bằng `next/font/google`, có tiếng Việt. *(2026-10-13)*
- [x] **2.3** Khung trang: sidebar web, ngăn kéo tablet, appbar, tab bar điện thoại lọc theo quyền, sheet "Tính năng" có huy hiệu. *(2026-10-13, E2E `layout.spec.ts` và `mobile.spec.ts`)*
- [x] **2.4** Chuyển giao diện Sáng, Tối, Theo hệ thống, lưu `localStorage` khoá `esl-theme`. *(2026-10-13)*
- [x] **2.5** Thành phần dùng chung: `Pill`, `Btn`, `ActIcon`, `RowMenu`, `ConfirmDialog`, `Modal`, `Sheet` (bộ lọc điện thoại), `Toast`, `Field`, `PageHeader`, `NoAccess`, `HistoryTimeline`. *(2026-10-13, mỗi thành phần có chỗ dùng trong module; không có Sheet ngoài bộ lọc)*
- [x] **2.6** Xoá mã cũ bản cam-xanh. *(2026-10-13, không còn tham chiếu; typecheck và lint sạch)*

## P3. Học sinh

- [x] **3.1** Danh sách đọc từ DB: lọc trạng thái, lớp, học phí; tìm kiếm không dấu theo tên, mã HS-, SĐT phụ huynh; phân trang số và "Xem thêm". *(2026-10-13, trình duyệt)*
- [x] **3.2** Hàng thao tác. Web: ⋯. Điện thoại: ba nút có chữ Xem, Sửa, Xoá. *(2026-10-13, trình duyệt cả hai)*
- [x] **3.3** Hồ sơ học sinh. Web: ngăn kéo bên phải (`?h=`). Điện thoại: trang riêng. Ba tab Tổng quan, Phụ huynh, Học tập (`?tab=`). Không có Sửa, Xoá trong hồ sơ. Chân hồ sơ có Nhắc học phí. *(2026-10-13, trình duyệt và E2E `students.spec.ts`)*
- [x] **3.4** Thêm học sinh: Server Action kiểm quyền, zod, chọn phụ huynh có sẵn hoặc nhập người mới, lỗi hiện trong từng ô. *(2026-10-13, trình duyệt và E2E)*
- [x] **3.5** Sửa học sinh: dùng lại form thêm, điền sẵn từ DB. *(2026-10-13, trình duyệt)*
- [x] **3.6** Xoá học sinh: hộp xác nhận, Huỷ không xoá; xoá thật. *(2026-10-13, E2E)*
- [x] **3.7** Bộ lọc điện thoại là bảng trượt từ đáy (`Sheet`), áp dụng cập nhật URL. Nút Thêm mới cạnh Bộ lọc. *(2026-10-13, E2E `mobile.spec.ts`)*
- [x] **3.8** Chuyển lớp: đổi `class_id` và ghi sự kiện `class_change` vào lịch sử học tập. *(2026-10-13, E2E: tab Học tập có "Chuyển từ GT-A1 sang TOEIC-T2")*

## P4. Lớp học, Giáo viên, Tài khoản

- [x] **4.1** Lớp học: danh sách thẻ, tạo lớp (sinh các buổi học), sửa, xoá. Chặn xoá khi còn học sinh hoặc đã điểm danh. Chi tiết lớp có sĩ số, lịch, học sinh, buổi sắp tới, bài tập. *(2026-10-13, E2E `catalog.spec.ts`)*
- [x] **4.2** Giáo viên: danh sách thẻ, thêm, sửa, xoá. Chặn xoá khi còn lớp. Đổi tên giáo viên cập nhật ở lớp. *(2026-10-13, E2E: đổi tên rồi trả lại, lớp TOEIC-T2 hiện tên mới)*
- [x] **4.3** Tài khoản: kiểm lại khi P10 xong. *(2026-10-13, P10.5 và P10.7 đã xong, E2E `auth.spec.ts`)*

## P5. Điểm danh, Học phí, Báo cáo, Cài đặt

- [x] **5.1** Điểm danh: chọn lớp và buổi đã bắt đầu, đánh dấu có mặt, trễ, vắng. "Có mặt cả lớp". Web: bảng; điện thoại: thẻ, cùng danh sách và cùng action lưu. Lần lưu đầu chuyển buổi sang đã học và cộng số buổi. *(2026-10-13, trình duyệt: lưu rồi mở lại còn nguyên, buổi chưa diễn ra bị khoá; E2E: có mặt cả lớp đếm đúng)*
- [x] **5.2** Học phí: hoá đơn theo học sinh, lọc (đã đóng, còn nợ, chưa đóng, quá hạn), ghi thu không vượt số còn nợ, nhắc đóng ghi vào nhật ký. *(2026-10-13, trình duyệt và E2E; chưa gửi SMS vì chưa có kênh gửi, ghi chú trong màn Cài đặt)*
- [x] **5.3** Báo cáo doanh thu theo tháng và theo lớp, biểu đồ sáu tháng, từ `tuition_payments`. *(2026-10-13, trình duyệt: tháng 10 và tháng 9)*
- [x] **5.4** Cài đặt: thông tin trung tâm, quy định học phí (ngày đến hạn 1–28, phí trễ hạn), thông báo; lưu `center_settings`. *(2026-10-13, trình duyệt và E2E)*

## P6. Tổng quan

- [x] **6.1** Số liệu đang học, học thử, chuyên cần 30 ngày, công nợ quá hạn, sắp hết buổi; cần chú ý (công nợ, vắng từ hai buổi, bài quá hạn); buổi học hôm nay; lớp đang học. Từ DB, mỗi mục ẩn theo quyền. *(2026-10-13, trình duyệt; overflow 360px đã sửa)*

## P7. Tính năng

- [x] **7.1** Lưới tính năng `/tinh-nang` và sheet từ nút tròn, huy hiệu đếm từ DB (`getNavBadges`), ẩn mục không có quyền. *(2026-10-13, E2E `mobile.spec.ts`; trình duyệt)*

## P8. Kiểm thử và chất lượng

- [x] **8.1** Unit test: tiền, mã học sinh, zod schema, sinh buổi học, quy tắc quyền, xác thực, học phí, lịch sử học tập, ngày giờ. *(2026-10-13, `npm run test`: 89 test xanh)*
- [x] **8.2** E2E Playwright: thêm, sửa, xoá học sinh, phụ huynh, lớp, bài tập; xác nhận xoá; chặn xoá; đăng nhập và phân quyền. *(2026-10-13, `npm run test:e2e`: 23 kịch bản xanh)*
- [x] **8.3** Kiểm tra tràn ngang và cắt chữ ở 360, 390, 768, 1024, 1440px trên mọi màn hình. *(2026-10-13, E2E `layout.spec.ts`: 22 màn × 5 độ rộng)*
- [x] **8.4** `lint`, `typecheck`, `build` sạch. *(2026-10-13, build production thành công)*

## P9. Xác thực và triển khai

- [x] **9.1** Đăng nhập bằng email và mật khẩu băm scrypt, cookie httpOnly có chữ ký HMAC. Tài khoản bị khoá không đăng nhập được và phiên mở cũng mất hiệu lực. *(2026-10-13, unit `auth.test.ts`; E2E: sai mật khẩu, khoá rồi mở khoá)*
- [x] **9.2** Quyền ở server action (`requirePermission`) và UI (menu, tab bar, nút, màn báo không có quyền). *(2026-10-13, E2E: kế toán không thấy mục hệ thống, không vào được /tai-khoan)*
- [x] **9.3** Biến môi trường, hướng dẫn chạy local và triển khai trong `README.md`. *(2026-10-13)*

---

## P10. Người dùng và phân quyền

- [x] **10.1** Schema: `accounts.teacher_id`, `accounts.password_hash`; `role_permissions`; `audit_logs`. *(2026-10-13, migration 0001, 52 dòng quyền)*
- [x] **10.2** Danh sách người dùng: tìm kiếm, lọc vai trò và trạng thái. Web: bảng 6 cột gồm đăng nhập gần nhất và ⋯. Điện thoại: thẻ. *(2026-10-13, trình duyệt ở 360–1440px; tìm "ngoc" ra 1)*
- [x] **10.3** Thêm (mời), sửa, xoá tài khoản. Email không trùng. Không xoá quản trị cuối. Liên kết giáo viên khi vai trò là Giáo viên. Dùng `Modal` chung. *(2026-10-13, trình duyệt và DB)*
- [x] **10.4** Khoá và mở tài khoản. Tài khoản bị khoá không đăng nhập được. *(2026-10-13, E2E `auth.spec.ts`: đăng nhập bị chặn, mở khoá thì vào được)*
- [x] **10.5** Màn phân quyền: ma trận 4 vai trò × 13 quyền. Chỉ quản trị đổi được (`requireAdmin` ở server, ô bị khoá với người khác). Quản trị luôn giữ `accounts.manage` và `settings.manage`. Lưu vào `role_permissions`. *(2026-10-13, trình duyệt: bật rồi tắt quyền và DB lưu đúng; kế toán không vào được màn)*
- [x] **10.6** Nhật ký hoạt động: ghi thêm, sửa, xoá, đổi quyền, khoá, sửa và xoá học sinh, điểm danh, thu học phí, đăng nhập. Tab Nhật ký: web bảng, điện thoại danh sách. *(2026-10-13, DB và trình duyệt)*
- [x] **10.7** `requirePermission(key)` trong mọi Server Action. Menu, tab bar, nút và màn hình ẩn theo quyền của tài khoản đăng nhập. *(2026-10-13, grep: mọi action gọi `requirePermission`; E2E: tab bar và sidebar theo quyền)*

## P11. Phụ huynh

- [x] **11.1** Schema: `parents`, `student_parents` (quan hệ, liên hệ chính, mỗi cặp một dòng). *(2026-10-13, migration 0001)*
- [x] **11.2** Danh sách phụ huynh: tìm kiếm không dấu, xem các con. Web: bảng. Điện thoại: thẻ. *(2026-10-13, E2E và trình duyệt)*
- [x] **11.3** Thêm, sửa, xoá phụ huynh. Xoá chỉ gỡ liên kết, học sinh vẫn giữ. Có xác nhận. Trùng SĐT báo lỗi. *(2026-10-13, E2E `catalog.spec.ts`)*
- [x] **11.4** Liên kết phụ huynh trong form học sinh: chọn người có sẵn hoặc nhập mới, quan hệ, liên hệ chính. *(2026-10-13, trình duyệt: lỗi thiếu tên giữ SĐT; chọn người có sẵn ẩn ô nhập mới)*
- [x] **11.5** Hồ sơ học sinh: tab Phụ huynh, SĐT có link `tel:`, nút "Gọi" trên điện thoại, đặt liên hệ chính, gỡ liên kết có xác nhận. *(2026-10-13, trình duyệt)*

## P12. Lớp học và lịch học dạng timeline

- [x] **12.1** Schema: `classes.weekdays`, giờ bắt đầu, giờ kết thúc; `class_sessions` (planned, done, cancelled). *(2026-10-13, seed 248 buổi)*
- [x] **12.2** Hàm sinh buổi học `generateSessions`: đúng thứ, đúng số buổi, múi giờ +07:00. *(2026-10-13, `schedule.test.ts` 7 test xanh)*
- [x] **12.3** Trang Lịch học dạng timeline: tuần, lọc lớp và giáo viên, trạng thái buổi. Web: bảy cột ngày. Điện thoại: danh sách dọc theo ngày. *(2026-10-13, trình duyệt ở 390 và 1440px; E2E)*
- [x] **12.4** Sửa một buổi (ngày, giờ, giáo viên, phòng, chủ đề), huỷ buổi có lý do, khôi phục. Buổi huỷ gạch ngang. *(2026-10-13, trình duyệt: huỷ không lý do báo lỗi; huỷ rồi khôi phục)*
- [x] **12.5** Chi tiết lớp: sĩ số, giáo viên, lịch tuần, học sinh, buổi sắp tới, bài tập. Web: hai cột. Điện thoại: xếp dọc. *(2026-10-13, trình duyệt)*
- [x] **12.6** Thêm, sửa, xoá lớp, sinh buổi học tự động khi tạo lớp, chặn xoá khi còn học sinh. *(2026-10-13, E2E `catalog.spec.ts`)*

## P13. Bài tập

- [x] **13.1** Schema: `assignments`, `assignment_submissions`. *(2026-10-13, migration 0001)*
- [x] **13.2** Tạo, sửa, xoá bài tập trong lớp. Xoá kèm bài nộp, có xác nhận. Không đặt điểm tối đa dưới điểm đã chấm. *(2026-10-13, E2E `work.spec.ts`)*
- [x] **13.3** Chấm điểm và trạng thái nộp. Web: bảng nhập nhanh. Điện thoại: từng học sinh một với nút Đã nộp và ô điểm, có nút trước và sau. *(2026-10-13, trình duyệt cả hai; điểm vượt mức bị chặn)*
- [x] **13.4** Trạng thái quá hạn và chưa nộp hiện ở chi tiết lớp, hồ sơ học sinh, và mục cần chú ý trên Tổng quan. *(2026-10-13, trình duyệt)*

## P14. Lịch sử học tập

- [x] **14.1** Schema: `learning_events`. *(2026-10-13, seed 12 sự kiện)*
- [x] **14.2** Hàm gộp lịch sử: điểm danh (vắng, trễ), bài đã chấm, khoản thu, sự kiện học tập, đổi lớp, sắp theo thời gian. Có unit test. *(2026-10-13, `learning-history.test.ts` 6 test xanh; truy vấn SQL kiểm trên trình duyệt)*
- [x] **14.3** Thêm ghi chú hoặc sự kiện (thăng cấp, kiểm tra, ghi chú, đổi trạng thái). Quyền `learning.manage`. *(2026-10-13, trình duyệt: ghi chú hiện trên dòng thời gian)*
- [x] **14.4** Timeline lịch sử trong hồ sơ (tab Học tập) và trang Lịch sử học tập tổng hợp, lọc theo lớp và loại. Web: cột thời gian. Điện thoại: danh sách dọc. *(2026-10-13, trình duyệt)*

---

## Quyết định đã chốt

| Mã | Quyết định | Lý do |
|---|---|---|
| D1 | Next.js 16 làm khung. Không dùng Vite. | Vite và Next.js không chạy chung một dự án. |
| D2 | PostgreSQL + Drizzle ORM. | Người dùng chọn Postgres. |
| D3 | Tiền lưu số nguyên VND. | Tránh sai số thập phân. |
| D4 | Học phí dùng sổ thu cộng dồn, thay "đặt số đã đóng". | Có lịch sử thu, đối soát được. |
| D5 | Tab thứ tư trên điện thoại là Điểm danh, thay Tính năng. | **Chờ người dùng xác nhận.** |
| D6 | Thiết kế mới theo `docs/DESIGN.md`, bỏ thiết kế cam-xanh cũ. | Người dùng đã từ chối. |
| D7 | Không commit khi chưa được yêu cầu. | `CLAUDE.md` mục 8. |
| D8 | Mở rộng schema bằng migration mới, không sửa migration đã áp dụng. Dữ liệu mẫu seed lại bằng `db:seed:reset` (chỉ dev). | Đúng quy tắc `CLAUDE.md` mục 4. |
| D9 | Xác thực bằng scrypt của Node, phiên bằng cookie httpOnly có chữ ký HMAC, không thêm thư viện. | Ít phụ thuộc, đủ cho quy mô trung tâm. |
| D10 | Mỗi module có bản web và bản điện thoại, cùng dữ liệu và Server Action, khác giao diện theo breakpoint. | Yêu cầu của người dùng. |
| D11 | Lịch học là các buổi học cụ thể sinh từ lịch tuần của lớp. | Timeline và điểm danh tham chiếu được từng buổi. |
| D12 | Lịch sử học tập gộp từ điểm danh, bài nộp, khoản thu và bảng `learning_events`. | Không lặp dữ liệu, truy vết được. |
| D13 | Hồ sơ học sinh trên web là ngăn kéo (`?h=`), trên điện thoại là trang riêng. Không có Sửa, Xoá trong hồ sơ. | DESIGN mục 3 và 6. |
| D14 | Hạn đóng học phí là ngày `dueDay` (cài đặt, 1–28) của tháng sau tháng khai giảng. Phí trễ hạn chỉ lưu, chưa tự cộng. | Quy tắc đơn giản, người dùng chỉnh được. |
| D15 | Nhắc đóng và thông báo chỉ ghi nhận (nhật ký, cài đặt), chưa gửi SMS hay email. | Chưa có nhà cung cấp kênh gửi. |

## Việc cần người dùng làm

1. Xác nhận tab thứ tư trên điện thoại (D5).
2. Đổi mật khẩu user `postgres`, hiện là `admin`, quá yếu cho dữ liệu thật. Đổi bằng `ALTER USER postgres WITH PASSWORD '...';` trong psql.
3. **Trước khi đưa lên máy chủ thật:** xoá đăng nhập nhanh theo vai trò (tạm thời): hàm `devQuickLoginAction` trong `src/app/dang-nhap/actions.ts`, nút trong `src/components/auth/LoginForm.tsx`, prop trong `src/app/dang-nhap/page.tsx`, và kịch bản E2E "đăng nhập nhanh" trong `e2e/auth.spec.ts`. Hàm đã tự tắt khi `NODE_ENV=production`, nhưng vẫn nên xoá.
4. Thêm giới hạn số lần đăng nhập sai và chức năng tự đổi mật khẩu trước khi dùng ngoài mạng nội bộ (xem `README.md`).
