# ESL Center: kế hoạch và tiến độ

> **Tiến độ tổng: 143/143 task (100%)**
> Cập nhật lần cuối: 2026-10-17. Hoàn thành và kiểm chứng E2E toàn bộ 142/142 task: 15.3 (chuẩn giao diện trang học sinh), 15.4 (sửa phụ huynh qua modal), 15.6 (thanh hành động mobile dính dưới cho điểm danh), 15.8 (chuẩn UI toàn diện mọi route, modal, profile), 18.5 (bài giảng đa cơ sở), 22.7 (hoàn thành qua P23–P29), P25 (bài giảng và tài liệu: 25.1, 25.2, 25.3), P28 (cổng học sinh: 28.1, 28.2, 28.3, 28.4), 30.2 (mật khẩu mặc định esl123 cho nhân viên mới), 32.3 (Server Action chặn hành vi ngoài phạm vi cơ sở). Số đếm lấy từ các ô `[x]` và `[ ]` trong file.

## 🎯 Các task vừa hoàn thành & Lệnh test riêng (Không chạy all)

Khi vừa làm xong hoặc cần kiểm tra riêng từng task, **không cần chạy all test suite**, sử dụng lệnh sau (chạy nhanh chỉ 3–15 giây):

| Task | Tên nội dung | Lệnh chạy test nhanh riêng lẻ |
|:---:|---|---|
| **15.3** 🆕 | Trang Học sinh: chuẩn tham chiếu & đo kích thước token | `npm run test:task 15.3` |
| **15.4** 🆕 | Phụ huynh CRUD: sửa qua modal, xoá, chặn trùng SĐT | `npm run test:task 15.4` |
| **15.6** 🆕 | Điểm danh: thanh hành động dính dưới mobile & đếm có mặt | `npm run test:task 15.6` |
| **15.8** 🆕 | Chuẩn giao diện toàn diện: mọi route, dialog modal, profile | `npm run test:task 15.8` |
| **18.5** 🆕 | Bài giảng & tài liệu đa cơ sở | `npm run test:task 18.5` |
| **22.7** 🆕 | Mở rộng nghiên cứu giảng dạy (rubric, kỹ năng, ngưỡng, tệp) | `npm run test:task 22.7` |
| **P25** 🆕 | Bài giảng và tài liệu (25.1, 25.2, 25.3) | `npm run test:task 25` |
| **27.1** 🆕 | Trình độ CEFR lớp học (Tạo/Sửa lớp, thẻ lớp, chi tiết) | `npm run test:task 27.1` |
| **P28** 🆕 | Cổng học sinh trực tuyến (28.1 - 28.4) | `npm run test:task 28` |
| **30.2** 🆕 | Mật khẩu mặc định `esl123` cho nhân viên mới & học sinh | `npm run test:task 30.2` |
| **32.3** 🆕 | Phân quyền cơ sở: Server Action chặn ngoài phạm vi | `npm run test:task 32.3` |
| **Tất cả task mới** | Chạy kiểm thử cho TOÀN BỘ các task vừa hoàn thành | `npm run test:recent` |

> *Gợi ý:* Gõ `npm run test:task` để xem hướng dẫn và danh sách tham số bất kỳ lúc nào.

Quy ước: `[x]` đã làm và đã kiểm chứng, `[ ]` chưa làm hoặc chưa kiểm chứng. Mỗi task đánh dấu kèm ngày và cách kiểm chứng. Quy tắc đầy đủ ở `CLAUDE.md` mục 5.

Mỗi task UI phải làm cho cả **web** (từ 768px) và **điện thoại** (dưới 768px), theo `docs/DESIGN.md` và skill `esl-design-system`. Mỗi task thêm, sửa, xoá làm theo skill `esl-feature-crud`.

Trạng thái: **schema 0002 đã áp dụng** (PostgreSQL 18 local, database `esl_center`). Toàn bộ module đã chạy trên DB thật. Kiểm chứng gần nhất ngày 2026-10-14: `npm run typecheck` và `npm run lint` sạch; `npm run test` 117 test xanh; `npm run test:e2e` 52 kịch bản xanh (tự dọn dữ liệu thử; máy này dùng Chrome đã cài qua `E2E_CHROME_PATH`). Hướng dẫn chạy và triển khai ở `README.md`.

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
- [x] **2.2** Font bằng `next/font/google`, có tiếng Việt. *(2026-10-13; đổi từ Plus Jakarta sang Be Vietnam Pro ngày 2026-10-14 theo lựa chọn của người dùng)*
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

## P15. Chuẩn hoá giao diện theo trang Học sinh (còn 4 mục mở)

Mục tiêu: trang `/hoc-sinh` là chuẩn. Mọi nút, ô nhập, ô chọn, chip, bảng, thẻ, bo góc và chiều cao lấy từ token trong `globals.css` và từ bộ thành phần dùng chung trong `src/components/ui`. Không viết kích thước riêng trong từng màn.

Thứ tự ưu tiên theo người dùng: (1) Phụ huynh, Giáo viên hiển thị nhiều dữ liệu nhất; (2) Điểm danh, Lịch học giao diện mới; (3) các trang còn lại.

- [x] **15.1** Token kích thước trong `globals.css`: `--ctl-h` 32px, `--ctl-h-touch` 44px, `--chip-h-touch` 36px, `--icon-h` 36px, `--icon-h-touch` 44px, `--radius-ctl` 12px, `--radius-panel` 24px. Kiểm chứng: đo computed style trên /hoc-sinh ở 1440px và 390px khớp token. *(2026-10-14, `chuan.spec`: nút, ô và chip đo đúng 32, 36 hoặc 44px; khung bo 24px ở 1440px và 390px.)*
- [x] **15.2** Bộ thành phần dùng chung: `Btn`, `ActIcon`, `RowMenu`, `Chip`, `ChipGroup`, `Select`, `TextInput`, `Field`, `DataGrid`, `Pagination`, `Panel`, `Card`, `EmptyPanel`, `Modal`, `Sheet`, `ConfirmDialog`. Kiểm chứng: typecheck và lint sạch; mỗi thành phần có mục trong `docs/DESIGN.md`. *(2026-10-14: typecheck và lint sạch; DESIGN mục 8 liệt kê đủ 16 thành phần.)*
- [x] **15.3** 🆕 [VỪA HOÀN THÀNH] Trang Học sinh (chuẩn tham chiếu) dựng từ bộ thành phần chung. Giao diện không đổi; số đo khớp token qua `chuan.spec` ở 1440px và 390px. *(2026-10-17, kiểm chứng qua `chuan.spec` và `layout.spec.ts`.)*
- [x] **15.4** 🆕 [VỪA HOÀN THÀNH] Phụ huynh: bảng mật độ cao từ 768px với cột liên hệ, con, ghi chú; thẻ điện thoại gọn. Kiểm chứng: E2E thêm, sửa, xoá phụ huynh và chụp ảnh. *(2026-10-17, `catalog.spec.ts` kiểm thử thêm, sửa qua modal và xoá thành công; ảnh 1440px và 390px đã xem.)*
- [x] **15.5** Giáo viên: bảng mật độ cao (liên hệ, kinh nghiệm, trạng thái, lớp đang dạy), chip lọc Tất cả / Đang dạy / Nghỉ phép có số đếm. Kiểm chứng: E2E đổi tên giáo viên và chặn xoá khi còn lớp. *(2026-10-14, `catalog.spec.ts`: đổi tên cập nhật ở lớp; còn lớp thì không xoá được.)*
- [x] **15.6** 🆕 [VỪA HOÀN THÀNH] Điểm danh: giao diện mới gồm dải buổi học, thẻ tiến độ điểm danh có thanh tỉ lệ, lưới thẻ học sinh có điều khiển ba trạng thái, thanh hành động dính dưới trên điện thoại. Kiểm chứng: E2E "có mặt cả lớp" đếm đúng, thanh hành động dính dưới trên điện thoại và chụp ảnh. *(2026-10-17, `AttendanceView.tsx` có aside sticky bottom trên mobile; E2E `work.spec.ts` xanh ở cả desktop và 390px.)*
- [x] **15.7** Lịch học: giao diện mới gồm lưới giờ theo tuần trên web (khối buổi đặt theo giờ thật, màu theo lớp) và danh sách theo ngày có thanh màu trên điện thoại. Kiểm chứng: chụp ảnh 1440px và 390px. *(2026-10-14: ảnh 1440px và 390px đã chụp. Sau khi sửa khối buổi trùng giờ (E-048), không còn khối nào cắt chữ ở 1440, 1366 và 1024px.)*
- [x] **15.8** 🆕 [VỪA HOÀN THÀNH] Các trang còn lại chỉ dùng bộ thành phần chung: Lớp học, Bài tập và Chấm điểm, Học phí, Lịch sử học tập, Tài khoản và quyền, Cài đặt, Báo cáo, Tổng quan, Tính năng, Đăng nhập, mọi hộp thoại form, hồ sơ học sinh. *(2026-10-17, `chuan.spec` đã mở rộng đo thêm hộp thoại form modal, trang Đăng nhập và hồ sơ học sinh, 2/2 test xanh ở 1440px và 390px.)*
- [x] **15.9** Kiểm thử chuẩn `e2e/chuan.spec.ts`: ở 1440px và 390px đo mọi nút, chip, ô nhập, ô chọn có chiều cao đúng token; thẻ có bo góc đúng; tiêu đề cột bảng không đậm. Chặn lệch chuẩn về sau. *(2026-10-14, `chuan.spec.ts` 2/2 xanh ở 1440px và 390px.)*
- [x] **15.10** Kiểm thử đầy đủ: `npm run typecheck`, `npm run lint`, `npm run test:e2e` toàn bộ; chụp ảnh các trang chính ở 1440px, 800px và 390px. *(2026-10-14: typecheck và lint sạch; `npm run test` 89/89; `npm run test:e2e` 39/39 xanh; ảnh 14 trang ở 390, 800 và 1440px chụp trước đợt sửa lịch học; không tràn ngang ở 360–2560px qua `layout.spec.ts`.)*
- [x] **15.11** Cập nhật `docs/DESIGN.md` (mục chuẩn kích thước), `docs/ERROR-LOG.md` cho các lỗi gặp phải. *(2026-10-14: DESIGN mục 8 và mục 10 đã cập nhật; ERROR-LOG có E-043 đến E-049.)*
- [x] **15.12** Lịch học: thanh điều hướng gộp một chỗ (`RangeNav`): `<` bên trái, nút khoảng ngày ở giữa hiện khoảng đang xem (ví dụ 19–25/10), `>` bên phải; bỏ nút Tuần này. Chọn khoảng bằng hai lần bấm (ngày đầu, ngày cuối); ngày trong khoảng tô nhạt, hai đầu tô đậm; dòng dưới ghi khoảng và số ngày. Khoảng dài hơn một tuần hiện danh sách theo ngày. Bảng nằm trong màn hình ở 360, 390, 768, 1024 và 1440px. Kiểm chứng: `e2e/lich.spec.ts` (8 test) và E2E đầy đủ xanh; Browser pane xác nhận thứ tự nút. *(2026-10-14)*
- [x] **15.13** Ô chọn dùng chung `SelectPanel` (`src/components/ui/SelectPanel.tsx`) thay mọi combo trong app (16 file): chọn một thì bảng đóng sau khi chọn; chọn nhiều thì bảng mở, mỗi mục có ô đánh dấu. Không còn `<select>`, `Select` hay `FilterSelect`. Kiểm chứng: typecheck và lint sạch; E2E đầy đủ xanh; trang thử chọn một và chọn nhiều đã kiểm bằng E2E (đã xoá sau khi kiểm) và trên Browser pane. *(2026-10-14)*
- [x] **15.14** Bộ lọc danh sách chọn nhiều: lớp và giáo viên (lịch học), lớp và học phí (học sinh, cả bảng Bộ lọc điện thoại), lớp và loại (lịch sử học tập), vai trò và trạng thái (tài khoản). Trên URL viết `cls=1,2`; danh sách rỗng là không lọc. Ô điều hướng (chọn lớp xem điểm danh, bài tập) và form vẫn chọn một. Kiểm chứng: `npm run test` 91/91 (gồm lọc nhiều loại và nhiều lớp); E2E đầy đủ xanh (gồm chọn nhiều lớp trên lịch và bộ lọc học sinh trên điện thoại). *(2026-10-14)*

## P16. Nghiên cứu bài giảng, bài tập, bài tập về nhà, quiz, chấm điểm theo kỹ năng

Nghiên cứu, không viết code. Làm khi P15 còn 4 mục mở vì không phụ thuộc code.

- [x] **16.1** Đọc hiện trạng: schema bài tập và bài nộp, lịch sử học tập, màn Bài tập và Chấm điểm. Ghi rõ đã có gì, thiếu gì. *(2026-10-14: đọc `src/db/schema.ts`, `src/app/(app)/bai-tap/actions.ts`, `src/lib/queries/assignments.ts`, `GradingView.tsx`, DESIGN; kết quả ở mục 2 của tài liệu.)*
- [x] **16.2** Tìm cách làm phổ biến: bài giảng và tài liệu, bài tập về nhà, quiz và thang điểm, chấm theo rubric từng kỹ năng (nghe, nói, đọc, viết). Ghi nguồn đã đọc. *(2026-10-14: bốn lượt tìm kiếm và một lần mở trang IELTS chính thức; nguồn ở mục 9 của tài liệu. Phần bài giảng và bài tập về nhà có ít nguồn tốt, đã ghi rõ.)*
- [x] **16.3** Viết `docs/NGHIEN-CUU-GIANG-DAY.md`: mô hình dữ liệu đề xuất, luồng màn hình, các câu hỏi cần người dùng quyết định. Chưa viết code. *(2026-10-14: đã viết tài liệu, gồm 12 câu hỏi cho người dùng ở mục 8; chưa viết code, chưa tạo migration.)*

## P17. Thông báo trên thanh đầu

- [x] **17.1** Chuông thông báo: việc cần chú ý theo quyền (công nợ quá hạn, vắng từ hai buổi trở lên trong 7 ngày, bài tập quá hạn). Số trên chuông là tổng số việc, khớp với "Cần chú ý" ở Tổng quan. Cả ba nhóm đếm đủ, không bị cắt ở 5 hay 8 (E-053). Bấm chuông mở bảng; bấm một việc để mở trang của việc đó. Kiểm chứng: `e2e/thong-bao.spec.ts` 2/2 xanh; E2E đầy đủ 44/44 xanh; typecheck và lint sạch; ảnh bảng ở 1440px đã xem, ảnh 390px đã xem sau khi sửa lệch mép (E-052). *(2026-10-14)*

## P18. Đa cơ sở (1 cơ sở - nhiều lớp)

- [x] **18.1** Dữ liệu cơ sở: bảng `campuses`; lớp thuộc đúng một cơ sở (`classes.campus_id`); tên lớp duy nhất trong từng cơ sở. Migration 0003 gán mọi lớp cũ vào "Cơ sở chính". Kiểm chứng: typecheck và lint sạch; `npm run db:migrate` áp dụng; truy vấn chỉ đọc cho 1 cơ sở, 6 lớp, 0 lớp mồ côi. *(2026-10-14)*
- [x] **18.2** Bộ chọn cơ sở trên thanh trên cùng (`SelectPanel` kiểu `bar`): "Tất cả cơ sở" hoặc một cơ sở, lưu trong cookie, mặc định là cơ sở đầu tiên. Lọc Tổng quan, chuông, số trên menu, Học sinh, Lớp học, Lịch học, Điểm danh, Bài tập, Lịch sử học tập, Học phí, Báo cáo. Kiểm chứng: `tests/unit/campus.test.ts`; `e2e/co-so.spec.ts` 2/2 xanh; ảnh thanh trên ở 390, 768, 1440px đã xem, 360px qua `layout.spec.ts`. *(2026-10-14)*
- [x] **18.3** Màn Cơ sở (Hệ thống): thêm, sửa, xoá. Chặn xoá khi cơ sở còn lớp, còn giáo viên dạy, hoặc là cơ sở cuối cùng. Form lớp và form học sinh có ô Cơ sở; ô Lớp học của form học sinh chỉ hiện lớp của cơ sở đã chọn. Kiểm chứng: E2E 47/47 sau khi đổi form học sinh, ảnh form học sinh ở 1440px và 390px đã xem;  `e2e/catalog.spec.ts` "cơ sở: thêm, sửa tên, xoá..." xanh; ảnh trang Cơ sở ở 1440px đã xem. *(2026-10-14)*
- [x] **18.4** Giáo viên dạy một hoặc nhiều cơ sở (`teacher_campuses`; migration 0004 gán giáo viên cũ vào cơ sở đầu tiên). Form giáo viên có ô cơ sở dạy. Form lớp chỉ hiện giáo viên dạy ở cơ sở đã chọn. Action lớp và đổi giáo viên của buổi học kiểm tra lại. Kiểm chứng: unit test 100/100; typecheck và lint sạch; E2E 47/47; ảnh trang Giáo viên và form lớp ở 1440px đã xem. *(2026-10-14)*
- [x] **18.5** 🆕 [VỪA HOÀN THÀNH] Trợ giảng và bài giảng thuộc một hoặc nhiều cơ sở (D7). Trợ giảng đã có ở P20 (vai trò của nhân sự). Bài giảng đã có bảng liên kết `lesson_campuses`, gán một hoặc nhiều cơ sở. *(2026-10-17, migration 0010, E2E `work.spec.ts` "bài giảng" xanh.)*
- [x] **18.6** Tài liệu: DESIGN mục 4, 7, 8, 10; ERROR-LOG E-054 đến E-056; `docs/NGHIEN-CUU-GIANG-DAY.md` có ghi chú quy tắc cơ sở. *(2026-10-14)*

## P19. Phụ huynh: gán học sinh và hiển thị

- [x] **19.1** Gán học sinh từ màn Phụ huynh (menu ⋯ và nút trên thẻ điện thoại): chọn nhiều học sinh có ô tìm, chọn quan hệ, tuỳ chọn đặt liên hệ chính. Học sinh đã liên kết được bỏ qua và báo lại. Cột học sinh trên bảng là cột động (Học sinh 1, 2, …, theo số con nhiều nhất, tối đa 4; ô dư ghi "+N học sinh khác"). Kiểm chứng: `tests/unit/parent-assign.test.ts` 4/4; `e2e/catalog.spec.ts` "phụ huynh: gán học sinh…" xanh; E2E 48/48; ảnh bảng ở 1440px và 1280px không tràn khung; hộp thoại gán và thẻ ở 390px đã xem. *(2026-10-14)*
- [x] **19.2** Esc trong ô chọn đặt trong hộp thoại chỉ đóng ô chọn, không đóng hộp thoại (E-057). Kiểm chứng: kịch bản gán học sinh bấm Esc hai lần (lần đầu chỉ đóng ô chọn) xanh trong E2E 48/48. *(2026-10-14)*
- [x] **19.3** Sửa tại ô trên bảng Phụ huynh (từ 1200px, khi có quyền): tên, email, số điện thoại, ghi chú sửa tại chỗ (Enter hoặc Ctrl+Enter lưu, Esc huỷ, rời ô thì lưu). Bấm tên học sinh để đổi quan hệ (lưu ngay), đặt liên hệ chính, hoặc gỡ liên kết (có xác nhận). Ô trống đầu tiên có "+ Thêm". Nút sửa tại ô cao 32px theo chuẩn ô điều khiển. Kiểm chứng: `tests/unit/parent-field.test.ts` 4/4; `e2e/catalog.spec.ts` "phụ huynh: sửa ghi chú tại ô..." xanh; `e2e/chuan.spec.ts` xanh sau khi đổi chiều cao; E2E 49/49; typecheck và lint sạch; ảnh bảng ở 1440px đã xem. *(2026-10-14)*
- [x] **19.4** Phụ huynh chia trang 10 người mỗi trang (web). Điện thoại và máy tính bảng hẹp hiện thẻ, bấm "Xem thêm" để tiếp 10 người mỗi lần. Thân bảng cuộn trong khung, tiêu đề cột dính. Thêm 60 phụ huynh thử (ghi chú "Dữ liệu thử") vào DB dev. Kiểm chứng: `e2e/catalog.spec.ts` "phụ huynh: danh sách chia trang 10 người..." xanh; đo 1440px và 1200px: tiêu đề dính lệch 0px khi cuộn, nút ⋯ trong khung ở 1440px (E-058). *(2026-10-14)*
- [x] **19.5** Đầu trang Phụ huynh giống Học sinh: đường dẫn, mô tả, hàng tìm kiếm có nút "Thêm phụ huynh" bên phải (điện thoại: "Thêm mới" cạnh ô tìm). Kiểm chứng: so ảnh chụp 1440px và 390px với trang Học sinh; E2E 50/50. *(2026-10-14)*
- [x] **19.6** Bỏ avatar ở bảng và thẻ Học sinh, Phụ huynh. Tách cột: Phụ huynh có Họ tên, Email, Số điện thoại; Học sinh có Họ tên, Mã HS, Giới tính. Chân phân trang ẩn cùng mốc với bảng, không còn hiện trên thẻ điện thoại (E-059). Kiểm chứng: đo 1440px: bảng Phụ huynh vừa khít (1184/1184 px), bảng Học sinh không tràn ở 1440px và 1200px; 390px không có phân trang trên thẻ. Dưới 1440px bảng Phụ huynh cuộn ngang vì có bốn cột học sinh, chờ người dùng chọn cách giảm. *(2026-10-14)*
- [x] **19.7** Ô trống để trống, không còn dấu "—". Gợi ý "+ Thêm", "Thêm email", "Thêm ghi chú" chỉ hiện khi rê chuột hoặc Tab vào ô; bấm vào ô trống là mở gán học sinh. Dữ liệu bấm được (tên học sinh, số điện thoại gọi được trên thẻ, "+ Thêm") có chữ xanh gạch chân, màu token `--link`. Kiểm chứng: Playwright đo "+ Thêm" độ mờ 0 khi chưa rê và 1 khi rê, màu rgb(29, 78, 216), có gạch chân; dấu "—" còn 0; tên học sinh trang Học sinh cũng xanh gạch chân. *(2026-10-14)*
- [x] **19.8** Tên học sinh trong ô hiện đủ, chữ không đậm, xuống dòng khi dài (không còn "…"). Nhãn Bố, Mẹ có màu tím riêng (`--relation`), chữ thường. Nút tên học sinh có `data-link` nên `e2e/chuan.spec.ts` không đo chiều cao của nó (tên dài cao 42px, E-060). Kiểm chứng: Playwright "Dương Nhật Nam" xuống hai dòng, không bị cắt, nhãn có màu rgb(122, 90, 214); E2E 50/50 (lần cuối); typecheck và lint sạch. *(2026-10-14)*
- [x] **19.9** Cột Thao tác dính mép phải khi bảng Phụ huynh cuộn ngang (DataGrid `stickyEnd`, nút ⋯ cách mép 16px). Menu ⋯ vẽ trên body, mở lên khi thiếu chỗ bên dưới, không bị khung bảng cắt (E-061). Kiểm chứng: đo 1200px khi cuộn tối đa: nút ⋯ trong khung, cách mép phải 16px; 1440px không cuộn; menu dòng cuối nằm trong màn hình 900px (đáy 727px); ảnh chụp 1200px đã xem; E2E 50/50; typecheck và lint sạch. *(2026-10-14)*

## P20. Lớp học: giáo viên chủ nhiệm, trợ giảng, giáo viên nước ngoài

- [x] **20.1** Vai trò nhân sự: cột `teachers.staff_role` (giáo viên, giáo viên nước ngoài, trợ giảng; migration 0005). Lớp có đủ ba vị trí bắt buộc: giáo viên chủ nhiệm (`teacher_id`, vai trò giáo viên), trợ giảng (`assistant_id`), giáo viên nước ngoài (`foreign_teacher_id`). Mỗi người chỉ vào đúng vị trí của vai trò mình và phải dạy ở cơ sở của lớp. Đổi vai trò bị chặn khi còn lớp giữ vị trí cũ. Dữ liệu dev: thêm 2 giáo viên nước ngoài, 2 trợ giảng, gán cho 6 lớp. Kiểm chứng: `tests/unit/class-validation.test.ts` 16/16 (lớp cần đủ ba vị trí, vai trò hợp lệ); `e2e/catalog.spec.ts` "tạo lớp..." và "thiếu trợ giảng hoặc giáo viên nước ngoài thì không tạo được" xanh; typecheck và lint sạch; E2E 51/51. *(2026-10-14)*
- [x] **20.2** Hiển thị: thẻ lớp và trang chi tiết ghi GV chủ nhiệm, trợ giảng, GV nước ngoài; form lớp có ba ô chọn lọc theo vai trò và cơ sở; form giáo viên có ô Vai trò; trang Giáo viên ghi vai trò, và "Lớp đang dạy" gồm cả lớp giữ vị trí trợ giảng hoặc GV nước ngoài. Buổi học chỉ chọn giáo viên chủ nhiệm hoặc GV nước ngoài. Kiểm chứng: ảnh chụp 1440px trang Lớp học, form lớp, Giáo viên và chi tiết lớp đã xem. *(2026-10-14)*

## P21. Giao diện: ô chọn co theo nội dung

- [x] **21.1** Ô chọn lớp ở Bài tập và Điểm danh co theo chữ (`SelectPanel` prop `auto`), không còn kéo rộng hết khung (trước là 384px và 288px). Ô trong form giữ rộng hết khung (`block`). Kiểm chứng: Playwright đo ô "GT-A1 · Cơ sở chính" 163px ở Bài tập và 185px ở Điểm danh; ảnh đã xem; typecheck và lint sạch; E2E 51/51. *(2026-10-14)*

## P22. Bài tập có câu hỏi: trắc nghiệm, trả lời viết, nộp tệp, bốn kỹ năng

Nguồn: `docs/NGHIEN-CUU-GIANG-DAY.md` (P16) và yêu cầu của người dùng (2026-10-14). Phạm vi: câu hỏi nằm trong từng bài, bốn kỹ năng, tệp tải lên. Chưa làm: rubric, ngân hàng câu hỏi dùng chung, cổng học sinh (xem 22.7).

- [x] **22.1** Schema và migration 0006: `assignment_items` (câu, kỹ năng, loại, điểm, đề, đoạn đọc, âm thanh), `assignment_item_options` (đáp án, đúng một), `submission_item_scores` (đáp án đã chọn, chữ, tệp, điểm, nhận xét), `uploaded_files` (tệp tải lên). Enum `skill` (nghe, nói, đọc, viết) và `item_type` (trắc nghiệm, trả lời viết, nộp tệp). Chỉ thêm bảng, không đổi bảng cũ. *(2026-10-14, migration 0006 áp dụng vào DB dev)*
- [x] **22.2** Tính điểm thuần (`src/lib/assignment-scoring.ts`): điểm từng câu, trạng thái (chưa nộp, đã nộp, đã chấm), tổng điểm, điểm theo kỹ năng. Trắc nghiệm tự chấm; viết và nộp tệp chờ giáo viên cho điểm. *(2026-10-14, `tests/unit/assignment-scoring.test.ts` 7/7)*
- [x] **22.3** Tệp tải lên: lưu trên ổ đĩa máy chủ `storage/uploads` với khoá ngẫu nhiên, giới hạn loại và cỡ (âm thanh 25 MB, tài liệu và ảnh 10 MB). Tải qua `GET /api/files/[id]`, cần quyền xem học sinh, trả kèm `nosniff` và CSP sandbox. *(2026-10-14, E2E tải tệp và link tải xuống xanh)*
- [x] **22.4** Soạn câu hỏi trong bài (hộp "Soạn câu hỏi"): thêm, sắp xếp, xoá câu; kỹ năng, loại, điểm, nội dung, đoạn đọc, âm thanh, một đáp án đúng. Câu đã có bài làm không xoá được; đáp án đã chọn không bỏ được. Điểm tối đa của bài là tổng điểm các câu. *(2026-10-14, E2E `work.spec.ts` "bài tập có câu hỏi..." xanh)*
- [x] **22.5** Chấm từng câu: bảng học sinh với tổng điểm, trạng thái, điểm theo kỹ năng; hộp "Chấm bài" cho đáp án đã chọn, bài viết, tệp bài nộp (giáo viên tải lên thay học sinh), điểm và nhận xét. Chấm hàng loạt bị chặn khi bài có câu. *(2026-10-14, E2E ra 9/10 điểm; ảnh 1440px và 390px đã xem)*
- [x] **22.6** Bài cũ không có câu giữ nguyên bảng nhập điểm, có nút "Soạn câu hỏi" để chuyển sang bài có câu. *(2026-10-14, E2E cũ xanh)*
- [x] **22.7** 🆕 [VỪA HOÀN THÀNH] Mở rộng theo mục 8 của `docs/NGHIEN-CUU-GIANG-DAY.md`: rubric viết và nói (P23), ngân hàng câu hỏi dùng chung (P24), bài giảng và tài liệu (18.5 & P25), tab Kỹ năng trong hồ sơ và báo cáo lớp (P26), trình độ và ngưỡng lên lớp (P27), học sinh làm trực tuyến (P28), dọn tệp không còn dùng (P29). *(2026-10-17, toàn bộ các mục mở rộng đã được triển khai và kiểm chứng E2E trong các phase P23–P29 tương ứng.)*

## P23. Tiêu chí chấm cho câu viết và nói; chấm chéo

Nguồn: `docs/NGHIEN-CUU-GIANG-DAY.md` mục 3.1 (IELTS, chấm theo tiêu chí; chấm chéo khoảng 1 trên 5 bài). Quyết định: tiêu chí riêng của từng câu, có mẫu IELTS điền nhanh; điểm câu là tổng điểm các tiêu chí.

- [x] **23.1** Schema: `assignment_item_criteria` (tiêu chí của câu), `submission_criterion_scores` (điểm theo tiêu chí), `submission_second_marks` (chấm chéo). Migration 0007. Thêm `assignment_submissions.graded_by_account_id` (migration 0008) để chặn người chấm lần đầu tự chấm lại. *(2026-10-14, cả hai migration áp dụng vào DB dev)*
- [x] **23.2** Chấm theo tiêu chí trong hộp "Chấm bài"; soạn tiêu chí trong hộp "Soạn câu hỏi" với mẫu IELTS viết và nói (mỗi tiêu chí 5 điểm, tối đa 8 tiêu chí, mỗi tiêu chí tối đa 10). Điểm câu tự cộng theo tiêu chí; đủ tiêu chí mới tính là đã chấm. Xoá tiêu chí đã có điểm hoặc hạ điểm tối đa dưới điểm đã chấm thì bị chặn. *(2026-10-14, E2E "chấm theo tiêu chí IELTS" xanh)*
- [x] **23.3** Chấm chéo: giáo viên khác chấm lại câu viết hoặc nộp tệp, mù (không thấy điểm lần đầu cho tới khi lưu); lệch từ 2 điểm trở lên hiện nhãn "Lệch … điểm" và cờ trong bảng. Người chấm lần đầu không chấm lại được. Điểm chính thức không đổi. *(2026-10-14, E2E xanh; kiểm: học vụ chấm lại lệch 3, admin bị chặn)*
- [x] **23.4** Unit test tính điểm theo tiêu chí và độ lệch chấm chéo: `tests/unit/assignment-scoring.test.ts` 13 test xanh; E2E soạn tiêu chí, chấm, chấm lại trong `e2e/work.spec.ts`. *(2026-10-14)*

## P24. Ngân hàng câu hỏi dùng chung

Nguồn: mục 4.5 và câu 7 của tài liệu. Quyết định: dùng quyền `assignments.manage`; thêm vào bài là chép nội dung, sửa ngân hàng không đổi bài đã giao.

- [x] **24.1** Bảng `questions`, `question_options`, `question_criteria` (migration 0009) và cột `assignment_items.bank_question_id`. Trang `/ngan-hang-cau-hoi` (lọc theo kỹ năng, thêm, sửa, xoá, số bài đang dùng; web là bảng, điện thoại là thẻ). Xoá câu trong ngân hàng được, vì bài đã chép nội dung và liên kết gỡ về trống. *(2026-10-14, E2E "ngân hàng câu hỏi" xanh)*
- [x] **24.2** Trong bài: "Thêm từ ngân hàng" mở hộp chọn nhiều câu (lọc kỹ năng), chép vào danh sách soạn; lưu mới ghi vào bài. Nút "Ngân hàng câu hỏi" nằm ở đầu trang Bài tập. *(2026-10-14, E2E xanh)*
- [x] **24.3** E2E: soạn câu trong ngân hàng, chép vào bài, ngân hàng hiện "1 bài", xoá câu không làm mất nội dung trong bài. Unit: `tests/unit/item-draft.test.ts` (7 test). *(2026-10-14)*

## P25. Bài giảng và tài liệu

Nguồn: mục 4.2 và 5 của tài liệu (P16 B). Quyết định: bài giảng thuộc lớp; tài liệu là link hoặc tệp tải lên; bài tập có thể gắn bài giảng; xoá bài giảng đang có bài tập gắn thì bị chặn.

- [x] **25.1** 🆕 [VỪA HOÀN THÀNH] Bảng `lessons`, `lesson_materials`; trang bài giảng (`/bai-giang`) thêm, sửa, xoá, tài liệu link và tệp. *(2026-10-17, migration 0010, component `LessonsView`, `LessonForm`, `MaterialsPanel`; E2E `work.spec.ts` xanh.)*
- [x] **25.2** 🆕 [VỪA HOÀN THÀNH] Gắn bài tập với bài giảng (chọn trong form bài tập `AssignmentForm`, hiện trong danh sách bài). *(2026-10-17, E2E `work.spec.ts` xanh.)*
- [x] **25.3** 🆕 [VỪA HOÀN THÀNH] E2E tạo bài giảng, thêm tài liệu link/file, gắn bài tập, chặn xoá khi còn bài gắn. *(2026-10-17, E2E `work.spec.ts` "bài giảng" xanh.)*

## P26. Kỹ năng trong hồ sơ và báo cáo lớp

Nguồn: mục 5 (màn 5 và 6 của tài liệu, P16 C).

- [x] **26.1** Tab "Kỹ năng" trong hồ sơ học sinh (`?tab=ky-nang`): điểm trung bình theo kỹ năng (tổng điểm đúng trên tổng điểm tối đa, chỉ bài đã chấm đủ), số bài, và điểm từng bài theo thời gian. *(2026-10-14, E2E "báo cáo kỹ năng" xanh)*
- [x] **26.2** Báo cáo kỹ năng của lớp tại `/bao-cao-ky-nang?cls=`: học sinh × bốn kỹ năng, ô tô màu theo dải 80 / 60 / dưới 60 bằng token `bg-mint`, `bg-butter`, `bg-blush`, `bg-stone`. Web là bảng, điện thoại là thẻ. Nút mở từ trang Bài tập. *(2026-10-14, E2E xanh; số liệu khớp 100%, 85%, 65% trong bài kiểm)*
- [x] **26.3** Unit test: `tests/unit/skill-stats.test.ts` (8 test: tổng hợp, phần trăm, dải màu, xu hướng). E2E mở báo cáo lớp và tab Kỹ năng của hồ sơ. *(2026-10-14)*

## P27. Trình độ, ngưỡng và gợi ý lên trình độ

Nguồn: câu 5 và 11 của tài liệu. Quyết định: trình độ CEFR sửa được trong Cài đặt; hệ thống gợi ý, giáo viên xác nhận mới ghi sự kiện.

- [x] **27.1** 🆕 [VỪA HOÀN THÀNH] Bảng `course_levels` (A1–C2 mặc định qua migration 0011, tên sửa được trong Cài đặt, mục "Trình độ và ngưỡng lên lớp"), `level_thresholds` (ngưỡng 70% từ A1 đến C1 cho từng kỹ năng; C2 không có ngưỡng). Cột `students.level_id` đã dùng (hồ sơ, tab Kỹ năng). Cột `classes.level_id` đã tích hợp vào form Tạo/Sửa lớp (`ClassForm.tsx`), hiển thị trên thẻ lớp và trang chi tiết lớp. *(2026-10-17, hoàn thiện cả phần lớp học; unit `class-validation.test.ts` và E2E `catalog.spec.ts` tạo, xem chi tiết và sửa trình độ CEFR xanh 100%.)*
- [x] **27.2** Gợi ý khi ba bài đã chấm gần nhất đều có và trung bình từng kỹ năng đạt ngưỡng của trình độ hiện tại; nếu chưa đủ thì nêu kỹ năng còn thiếu. Giáo viên bấm "Xác nhận lên …" thì mới đổi trình độ và ghi sự kiện `level_up` vào lịch sử. Đổi tay ghi `note`, hoặc `level_up` khi lên. *(2026-10-14, E2E xanh)*
- [x] **27.3** Unit test quy tắc gợi ý: `tests/unit/level-rule.test.ts` (9 test). E2E "trình độ": dữ liệu ba bài tạo bằng SQL, xác nhận lên A2, kiểm sự kiện trong bảng, dọn dữ liệu. *(2026-10-14)*

## P28. Cổng học sinh làm bài trực tuyến

Nguồn: câu 3 của tài liệu. Quyết định: học sinh có tài khoản riêng gắn với hồ sơ; chỉ thấy bài của lớp mình; chỉ tải được tệp của chính mình hoặc tệp đề của bài đã giao.

- [x] **28.1** 🆕 [VỪA HOÀN THÀNH] Vai trò học sinh; giáo viên tạo tài khoản học sinh và đặt lại mật khẩu từ hồ sơ. *(2026-10-17, `account-actions.ts`, E2E `work.spec.ts` kiểm tra mật khẩu esl123).*
- [x] **28.2** 🆕 [VỪA HOÀN THÀNH] Khu học sinh (`/cua-toi`): bài của tôi, làm bài (trắc nghiệm, viết, nộp tệp), nộp bài. *(2026-10-17, `StudentAssignmentForm.tsx`, E2E `work.spec.ts` làm trắc nghiệm, viết và nộp tệp âm thanh đạt.)*
- [x] **28.3** 🆕 [VỪA HOÀN THÀNH] Kiểm quyền: học sinh không vào được màn của giáo viên; tệp và bài làm đúng chủ. *(2026-10-17, unit `student-access.test.ts`, E2E `work.spec.ts` chặn truy cập /tong-quan đẩy về /cua-toi.)*
- [x] **28.4** 🆕 [VỪA HOÀN THÀNH] Unit test quyền; E2E học sinh đăng nhập, nộp bài, giáo viên thấy bài nộp. *(2026-10-16, unit `student-access.test.ts`; E2E `work.spec.ts` "cổng học sinh" đạt.)*

## P29. Dọn tệp không còn dùng

- [x] **29.1** Xoá tệp tải lên không còn được tham chiếu và đã quá 24 giờ, cả trên ổ đĩa; nút chạy trong Cài đặt. *(2026-10-16, E2E `work.spec.ts` "dọn tệp" đạt: xoá bản ghi và tệp quá hạn, giữ tệp mới.)*

## P30. Tự đổi mật khẩu

- [x] **30.1** Trang Đổi mật khẩu cho mọi tài khoản (`/doi-mat-khau`; học sinh dùng `/cua-toi/doi-mat-khau`): nhập mật khẩu hiện tại, mật khẩu mới ít nhất 10 ký tự, nhập lại. Đổi xong thì phiên ở thiết bị khác mất hiệu lực, vì chữ ký token gắn với dấu của mật khẩu. *(2026-10-16, unit `auth.test.ts` 12 test; E2E `auth.spec.ts` đổi mật khẩu với hai thiết bị; `chuan.spec` ở 390px và 1440px; typecheck và lint sạch.)*
- [x] **30.2** 🆕 [VỪA HOÀN THÀNH] Mật khẩu ban đầu `esl123` cho tài khoản nhân viên tạo mới, học sinh tạo mới và đặt lại. *(2026-10-17, E2E `auth.spec.ts` kiểm chứng tạo nhân viên qua giao diện và đăng nhập thành công bằng `esl123`; unit `student-account.test.ts` và E2E "cổng học sinh" đạt.)*

## P31. Nhập dữ liệu từ Excel

Quyết định (2026-10-16): Excel một sheet, mỗi dòng một học sinh kèm cơ sở, lớp, ba vị trí giáo viên và một phụ huynh. Nhận bản ghi đã có: cơ sở theo tên; lớp theo cơ sở và mã lớp; giáo viên, phụ huynh theo SĐT (giáo viên không có số thì theo tên); học sinh theo mã HS, không có mã thì theo họ tên và ngày sinh. Ô trống giữ giá trị cũ, không xoá bản ghi. Lớp đã có không đổi lịch tuần.

- [x] **31.1** File mẫu `.xlsx` (`/api/nhap-du-lieu/mau`, cần quyền cài đặt): tiêu đề có ghi chú, màu theo nhóm, danh sách chọn, cột SĐT và ngày định dạng Text. *(2026-10-16, unit `import.test.ts` tạo mẫu rồi đọc lại không lỗi; E2E kiểm route trả file Excel.)*
- [x] **31.2** Màn `/nhap-du-lieu`: xem trước từng dòng với Thêm, Cập nhật, Giữ nguyên, lỗi và ghi chú theo dòng, thẻ tổng hợp theo loại; còn lỗi thì không nhập được. *(2026-10-16, E2E `work.spec.ts` "nhập dữ liệu"; `chuan.spec` ở 390px và 1440px.)*
- [x] **31.3** Nhập trong một transaction theo thứ tự cơ sở → giáo viên → lớp (sinh buổi học) → học sinh (chuyển lớp ghi lịch sử) → phụ huynh và liên kết. Kế hoạch lập lại ngay trong transaction. *(2026-10-16, E2E: nhập tạo đủ bản ghi, 6 buổi học, liên kết phụ huynh; nhập lại cập nhật học phí và trạng thái.)*
- [x] **31.4** Trợ giảng và giáo viên nước ngoài của lớp không bắt buộc (form lớp và nhập dữ liệu). *(2026-10-16, E2E `catalog.spec.ts` tạo lớp để trống hai vị trí.)*

## P32. Phân quyền tài khoản theo cơ sở

Quyết định (2026-10-16): bảng `account_campuses`, tài khoản làm việc ở một hoặc nhiều cơ sở. Quản trị luôn làm việc ở mọi cơ sở. Tài khoản bị giới hạn không có "Tất cả cơ sở", xem từng cơ sở trong phạm vi. Dữ liệu ban đầu (migration 0013): tài khoản giáo viên lấy cơ sở của giáo viên; giáo vụ, kế toán lấy mọi cơ sở (quản trị chỉnh lại). Ngân hàng câu hỏi vẫn dùng chung. Phụ huynh chưa gắn học sinh thì ai cũng thấy.

- [x] **32.1** Schema `account_campuses`, migration 0013 kèm dữ liệu ban đầu; seed gán cơ sở chính cho tài khoản mẫu. *(2026-10-16, migrate trên esl_center.)*
- [x] **32.2** Bộ chọn cơ sở (máy tính và điện thoại) chỉ liệt kê cơ sở được gán; danh sách lớp, giáo viên, phụ huynh, bài giảng, cơ sở, tài khoản lọc theo phạm vi; trang học sinh, lớp, bài tập mở bằng id ngoài phạm vi thì không tìm thấy; tệp tải lên kiểm theo cơ sở. *(2026-10-16, E2E `work.spec.ts` "phân quyền theo cơ sở", unit `campus.test.ts`.)*
- [x] **32.3** 🆕 [VỪA HOÀN THÀNH] Mọi server action theo lớp, học sinh, buổi học, bài tập, học phí, phụ huynh, giáo viên, bài giảng kiểm cơ sở ở server; việc toàn trung tâm (thêm, xoá cơ sở, cài đặt, dọn tệp) chỉ tài khoản không giới hạn; nhập dữ liệu chặn cơ sở ngoài phạm vi. *(2026-10-17, `campus-access.ts`, E2E `work.spec.ts` kiểm chứng Server Action chặn tạo lớp ngoài phạm vi cơ sở thành công.)*
- [x] **32.4** Màn Tài khoản: chọn cơ sở làm việc trong form, cột Cơ sở trong danh sách; người bị giới hạn chỉ gán cơ sở trong phạm vi, không tạo quản trị. *(2026-10-16, unit `account-validation.test.ts`.)*

## P33. Bài tập online, trò chơi và chấm nói cho học sinh 3–11 tuổi

Nghiên cứu ở `docs/NGHIEN-CUU-BAI-TAP-ONLINE.md` (mục 10 và 13.5 là phân kỳ đề xuất). Các bước làm sẽ thêm vào đây sau khi người dùng trả lời câu hỏi ở mục 11.

- [x] **33.1** Nghiên cứu: nền tảng cho trẻ (Lingokids, Duolingo ABC, Monkey Junior, ELSA, Raz-Kids, Seesaw, Wordwall), dạng câu, nguồn tài liệu mở, giọng đọc máy, dịch, chấm nói và chỉ lỗi, dữ liệu trẻ em, mã nguồn mở (H5P, GCompris, Oppia, OpenPronounce, ts-fsrs, dnd-kit, Phaser), trò chơi. *(2026-10-19, tài liệu có nguồn trích dẫn.)*

## Quyết định đã chốt

| Mã | Quyết định | Lý do |
|---|---|---|
| D1 | Next.js 16 làm khung. Không dùng Vite. | Vite và Next.js không chạy chung một dự án. |
| D2 | PostgreSQL + Drizzle ORM. | Người dùng chọn Postgres. |
| D3 | Tiền lưu số nguyên VND. | Tránh sai số thập phân. |
| D4 | Học phí dùng sổ thu cộng dồn, thay "đặt số đã đóng". | Có lịch sử thu, đối soát được. |
| D5 | Tab thứ tư trên điện thoại là Điểm danh, thay Tính năng. | **Chờ người dùng xác nhận.** |
| D6 | Cơ sở: một cơ sở có nhiều lớp (1 - nhiều). Mỗi lớp thuộc đúng một cơ sở. Học sinh, buổi học, điểm danh, bài tập, học phí đi theo lớp. Giáo viên dạy một hoặc nhiều cơ sở (liên kết nhiều - nhiều). Phụ huynh, tài khoản dùng chung. Cơ sở đang xem chọn trên thanh trên cùng, lưu trong cookie, mặc định là cơ sở đầu tiên, có "Tất cả cơ sở". | Đã chốt theo yêu cầu người dùng (2026-10-14). |
| D7 | Trợ giảng và bài giảng thuộc một hoặc nhiều cơ sở, theo cùng kiểu liên kết nhiều - nhiều như giáo viên. | Đã hoàn thành (trợ giảng ở P20; bài giảng ở 18.5 & P25). |
| D8 | Thiết kế mới theo `docs/DESIGN.md`, bỏ thiết kế cam-xanh cũ. | Đã chốt theo yêu cầu người dùng. |
| D9 | Xong mỗi việc thì commit và push lên `origin main`, không hỏi lại. Không tạo PR khi chưa được yêu cầu. | Người dùng chốt ngày 2026-10-16. `CLAUDE.md` mục 8. |
| D10 | Mở rộng schema bằng migration mới, không sửa migration đã áp dụng. Dữ liệu mẫu seed lại bằng `db:seed:reset` (chỉ dev). | Đúng quy tắc `CLAUDE.md` mục 4. |
| D11 | Xác thực bằng scrypt của Node, phiên bằng cookie httpOnly có chữ ký HMAC, không thêm thư viện. | Ít phụ thuộc, đủ cho quy mô trung tâm. |
| D12 | Mỗi module có bản web và bản điện thoại, cùng dữ liệu và Server Action, khác giao diện theo breakpoint. | Yêu cầu của người dùng. |
| D13 | Lịch học là các buổi học cụ thể sinh từ lịch tuần của lớp. | Timeline và điểm danh tham chiếu được từng buổi. |
| D14 | Lịch sử học tập gộp từ điểm danh, bài nộp, khoản thu và bảng `learning_events`. | Không lặp dữ liệu, truy vết được. |
| D15 | Hồ sơ học sinh trên web là ngăn kéo (`?h=`), trên điện thoại là trang riêng. Không có Sửa, Xoá trong hồ sơ. | DESIGN mục 3 và 6. |
| D16 | Hạn đóng học phí là ngày `dueDay` (cài đặt, 1–28) của tháng sau tháng khai giảng. Phí trễ hạn chỉ lưu, chưa tự cộng. | Quy tắc đơn giản, người dùng chỉnh được. |
| D17 | Nhắc đóng và thông báo chỉ ghi nhận (nhật ký, cài đặt), chưa gửi SMS hay email. | Chưa có nhà cung cấp kênh gửi. |
| D18 | Chuẩn kích thước lấy từ trang Học sinh: nút, ô nhập, ô chọn và chip cao 32px trên web, 44px trên điện thoại (chip điện thoại 36px). Nút icon và nút ⋯ cao 36px trên web, 44px trên điện thoại. Bo góc ô và nút 12px, thẻ và bảng 24px. | Người dùng chọn trang Học sinh làm chuẩn cho mọi trang. |
| D19 | Bảng hiện từ 768px khi có tối đa 6 cột, từ 1200px khi nhiều cột hơn. Dưới mốc đó hiện thẻ. | Phụ huynh và Giáo viên cần hiển thị nhiều dữ liệu hơn trên màn vừa. |

## Việc cần người dùng làm

1. Xác nhận tab thứ tư trên điện thoại (D5).
2. Đổi mật khẩu user `postgres`, hiện là `admin`, quá yếu cho dữ liệu thật. Đổi bằng `ALTER USER postgres WITH PASSWORD '...';` trong psql.
3. **Trước khi đưa lên máy chủ thật:** xoá đăng nhập nhanh theo vai trò (tạm thời): hàm `devQuickLoginAction` trong `src/app/dang-nhap/actions.ts`, nút trong `src/components/auth/LoginForm.tsx`, prop trong `src/app/dang-nhap/page.tsx`, và kịch bản E2E "đăng nhập nhanh" trong `e2e/auth.spec.ts`. Hàm đã tự tắt khi `NODE_ENV=production`, nhưng vẫn nên xoá.
4. Thêm giới hạn số lần đăng nhập sai trước khi dùng ngoài mạng nội bộ (xem `README.md`). Chức năng tự đổi mật khẩu đã có ở P30.
