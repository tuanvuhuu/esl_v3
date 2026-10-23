# ESL Center: kế hoạch và tiến độ

> **Tiến độ tổng: 208/232 task (90%)**
> Cập nhật lần cuối: 2026-10-22. P1–P34 xong. P38 (giờ học từng ngày, học phí theo buổi còn lại, mã HS-00001) xong. P37 bot Telegram theo kịch bản: 37.1–37.9 xong, còn đặt cron mỗi giờ trên bản deploy và các việc đợt sau. P35: 35.2, 35.3, 35.12, 35.24, 35.27 xong; 35.4–35.6 làm dở (35.6 chỉ còn thử tay trên điện thoại). P36 Soạn nhanh xong phần code (36.1–36.6). Số đếm lấy từ các ô `[x]` và `[ ]` trong file.

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

## P34. Lưu tệp trên Supabase Storage, lưu trữ và sao lưu trên Google Drive, bot Telegram hai chiều

Bối cảnh (2026-10-19): tệp tải lên (âm thanh đề, bài nộp, tài liệu, sau này là bản ghi âm bài nói) đang lưu trên ổ đĩa máy chủ, nên chạy trên Vercel sẽ mất. Người dùng chốt: chỉ lưu tệp trên **Supabase Storage** (database giữ ở Neon), kết hợp **bot Telegram** để gửi và nhận tin với phụ huynh, nhân viên. Đã cân nhắc và bỏ: dùng Telegram làm kho tệp (dữ liệu trẻ em nằm ở ứng dụng nước ngoài, không cam kết lưu trữ, khó xoá theo yêu cầu), Cloudflare R2, Firebase Storage (bắt buộc gói Blaze).

**Mã đã viết dở, giữ lại để dùng tiếp:** nhánh `wip/telegram-luu-tep` (commit b5863d5), chưa merge. Gồm `lib/telegram` (gọi API, đọc lệnh, nghiệp vụ), webhook `/api/telegram/webhook`, màn `/tin-nhan`, nút Kết nối Telegram ở màn Phụ huynh và menu tài khoản, nhắc học phí, báo giáo viên khi học sinh nộp bài, khối Telegram trong Cài đặt, `lib/blob-store.ts` (driver Firebase, cần thay bằng Supabase). Typecheck, lint và unit đạt; E2E Telegram còn một lỗi (hai nút cùng tên "Đóng" trong hộp thoại).

**Lưu ý database:** migration `0014_telegram` (bảng `telegram_chats`, `telegram_link_codes`, `telegram_messages`, enum `telegram_direction`) **đã áp dụng trên esl_center** nhưng file migration chỉ có ở nhánh WIP. Khi làm tiếp phải lấy đúng file 0014 từ nhánh đó (không sinh migration mới cho cùng bảng), nếu không `db:migrate` sẽ báo bảng đã tồn tại.

**Quyết định thiết kế đề xuất (người dùng chốt ở 34.1):**
- Bucket **riêng tư** `uploads`. Chỉ server đọc ghi bằng service role key; trình duyệt không bao giờ cầm khoá. Người dùng xem tệp qua `/api/files/[id]` như hiện nay (đã kiểm quyền theo chủ và theo cơ sở).
- Gói miễn phí Supabase: tổng 1 GB, mỗi tệp tối đa 50 MB (theo các nguồn bên thứ ba, kiểm lại trang giá). Đủ cho giai đoạn đầu; bản ghi âm 60 giây khoảng 0,5–1 MB.
- Tệp lớn hơn 1 MB không đi qua Server Action (giới hạn 1 MB của Next.js, 4,5 MB của Vercel): trình duyệt tải thẳng lên Supabase bằng signed upload URL do server cấp, rồi server ghi dòng `uploaded_files`.
- Telegram chỉ dùng để nhắn tin và thông báo, không lưu tệp. Bot không gửi điểm hay thông tin con cho chat chưa kết nối bằng mã.

### Việc người dùng làm trước
- [x] **34.1** Chốt các câu hỏi cuối mục này; tạo project Supabase và bucket `esl`; tạo bot qua @BotFather; đặt biến môi trường trong `.env.local`: `SUPABASE_URL`, `SUPABASE_STORAGE_BUCKET`, `SUPABASE_S3_ENDPOINT`, `SUPABASE_ACCESS_KEY_ID`, `SUPABASE_SECRET_ACCESS_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`. *(2026-10-19, xác thực Supabase S3 và Telegram bot đạt 200 OK).*

### Lưu tệp trên Supabase Storage
- [x] **34.2** Driver Supabase trong `lib/blob-store.ts` (thay driver Firebase ở nhánh WIP): `putBlob`, `getBlob`, `deleteBlob` qua S3 client `@aws-sdk/client-s3` phía server; không có biến `SUPABASE_*` thì vẫn ghi ổ đĩa (dev, E2E). Gỡ `firebase-admin`, bỏ `serverExternalPackages`. Kiểm chứng: unit cho driver ổ đĩa; thử thật với bucket Supabase (tải lên, xem, xoá đạt 200 OK). *(2026-10-19).*
- [x] **34.3** Tải lên trực tiếp tệp lớn: action cấp signed upload URL `createSignedUploadUrl`, `prepareDirectUpload`, `completeDirectUpload`, `requestDirectUploadAction`, `confirmDirectUploadAction` (kiểm loại, cỡ, quyền trước khi cấp), trình duyệt tải thẳng, action xác nhận ghi `uploaded_files`. Dùng cho âm thanh đề và bản ghi âm bài nói. *(2026-10-19).*
- [x] **34.4** Script chuyển tệp đang có trên ổ đĩa lên Supabase (`scripts/migrate-files-to-supabase.mjs`, lệnh `npm run files:migrate`), giữ nguyên `storage_key`; dọn tệp mồ côi (P29) xoá cả trên Supabase. Kiểm chứng: đồng bộ thành công 24/24 tệp lên Supabase Storage bucket `esl`, đếm tệp hai bên khớp. *(2026-10-19).*
- [x] **34.5** Khối "Telegram và lưu tệp" trong Cài đặt hiện nơi lưu đang dùng (Supabase Storage hay ổ đĩa máy chủ). *(2026-10-19, `TelegramSettings.tsx` cập nhật Supabase).*

### Bot Telegram hai chiều
- [x] **34.6** Merge phần Telegram từ nhánh WIP (schema 0014 đã áp dụng): kết nối bằng mã dùng một lần 7 ngày (`/start <mã>`), cho phụ huynh (màn Phụ huynh, nút ⋯ và nút trên thẻ điện thoại) và cho nhân viên (menu tài khoản → Kết nối Telegram). Sửa lỗi E2E hai nút "Đóng". Kiểm chứng: E2E webhook giả lập `/start`, sai mã bí mật thì 401, mã dùng lần hai bị từ chối, test E2E đạt. *(2026-10-19).*
- [x] **34.7** Lệnh cho phụ huynh: `/lich` (lịch 7 ngày tới của con), `/hocphi` (còn thiếu, đã đóng), `/baitap` (bài chưa nộp), `/diem` (điểm và nhận xét gần nhất), `/chuyencan` (chuyên cần 10 buổi gần nhất), `/huy` (ngừng nhận tin), `/help`. Kèm menu bàn phím nút bấm sẵn. Tin thường lưu vào hộp tin, bot báo đã nhận tối đa một lần mỗi 6 giờ. Kiểm chứng: E2E từng lệnh, nội dung đúng con của phụ huynh đó đạt. *(2026-10-19).*
- [x] **34.8** Màn **Tin nhắn** (`/tin-nhan`, quyền quản lý phụ huynh; giáo viên xem theo lớp ở 34.12): danh sách cuộc trò chuyện chỉ gồm phụ huynh có con ở cơ sở trong phạm vi (P32), tin mới có nhãn, khung tin, trả lời gửi qua bot; số tin chưa đọc trên menu. Kiểm chứng: E2E trả lời; tài khoản một cơ sở không thấy phụ huynh cơ sở khác. *(2026-10-19).*
- [x] **34.9** Thông báo tự động: nút Nhắc học phí gửi cho phụ huynh đã kết nối; học sinh nộp bài thì báo giáo viên chủ nhiệm, trợ giảng, giáo viên nước ngoài đã kết nối; (sau P33) giáo viên chấm bài nói xong thì gửi nhận xét và mẫu nói cho phụ huynh. Gửi lỗi không làm hỏng việc chính. Kiểm chứng: E2E ghi đúng tin ra trong `telegram_messages`. *(2026-10-19).*
- [x] **34.10** Cài webhook từ Cài đặt trên bản deploy (nút Cài webhook, kiểm `X-Telegram-Bot-Api-Secret-Token`), xem trạng thái bot và lỗi gần nhất. Kiểm chứng: gửi `/help` cho bot thật, bot trả lời; nút cài webhook trong màn Cài đặt. *(2026-10-19).*
- [x] **34.11** Quyền riêng tư: ghi trong điều khoản cho phụ huynh rằng kết nối Telegram là đồng ý nhận tin; `/huy` ngừng ngay; xoá tin nhắn cũ theo thời hạn lưu (cùng thời hạn với bản ghi âm ở P33). Kiểm chứng: `/huy` thì không còn tin nào được gửi (E2E đạt active = false). *(2026-10-19).*

### Đã chốt với người dùng (2026-10-19)
1. Supabase **chỉ dùng để lưu tệp**. Database giữ ở Neon (`esl_center`).
2. Tin trung tâm gửi phụ huynh **ghi tên giáo viên trả lời**, ví dụ "— Cô Thu Hà, GV lớp IELTS-K12". Tin tự động của hệ thống ghi "ESL Center".
3. Bot **làm được càng nhiều việc càng tốt** (thêm nhóm việc 34.12–34.22 dưới đây).
4. **Super admin nhận bản sao mọi trao đổi giữa giáo viên và phụ huynh** qua Telegram (34.13).

### Trao đổi giáo viên và phụ huynh
- [x] **34.12** Giáo viên trả lời phụ huynh: giáo viên (kể cả không có quyền quản lý phụ huynh) thấy trong màn Tin nhắn các phụ huynh có con học lớp mình dạy (chủ nhiệm, trợ giảng, giáo viên nước ngoài). Tin gửi đi kèm chữ ký tên giáo viên và lớp. Tin của phụ huynh được chuyển tới Telegram của giáo viên các lớp của con (nếu giáo viên đã kết nối); giáo viên bấm **Trả lời** ngay trên tin đó trong Telegram thì bot gửi lại cho phụ huynh (ghép theo tin được trả lời), không cần mở app. Kiểm chứng: E2E giả lập phụ huynh nhắn → giáo viên nhận bản chuyển → giáo viên trả lời bằng reply → phụ huynh nhận tin có chữ ký. *(2026-10-19).*
- [x] **34.13** Bản sao cho super admin: mọi tin giữa giáo viên và phụ huynh (cả hai chiều, cả trả lời từ app và từ Telegram) được gửi kèm một bản sao tới Telegram của super admin, ghi rõ ai gửi ai, học sinh nào, lớp nào. Super admin là tài khoản quản trị được đánh dấu "nhận bản sao" trong màn Tài khoản (mặc định: các tài khoản quản trị đã kết nối Telegram). Super admin cũng trả lời được bằng reply. Kiểm chứng: E2E bản sao có đủ người gửi, người nhận, học sinh. *(2026-10-19).*
- [x] **34.14** Phụ huynh nhiều con: bot hỏi "Tin này về con nào?" bằng nút chọn (inline keyboard) khi phụ huynh có từ hai con trở lên, để chuyển đúng giáo viên lớp đó; lệnh tra cứu cũng cho chọn con. Kiểm chứng: unit chọn người nhận theo con. *(2026-10-19).*

### Bot cho phụ huynh
- [x] **34.15** Tra cứu thêm: `/diem` (điểm và nhận xét gần nhất), `/chuyencan` (chuyên cần 10 buổi gần nhất), `/nhanxet` (nhận xét bài nói, kèm âm thanh mẫu của giáo viên khi có P33), menu nút bấm thay cho gõ lệnh. *(2026-10-19).*
- [x] **34.16** Xin nghỉ học: `/nghi` → chọn con, chọn buổi, gõ lý do → giáo viên nhận yêu cầu, bấm Đồng ý; buổi đó điểm danh sẵn là vắng có phép; phụ huynh nhận xác nhận. Kiểm chứng: E2E từ xin nghỉ tới điểm danh. *(2026-10-19).*
- [x] **34.17** Tự động gửi phụ huynh: nhắc buổi học trước 2 giờ (hoặc sáng ngày học), báo vắng khi điểm danh vắng, báo buổi bị huỷ hoặc đổi giờ, bài tập mới được giao, nhắc hạn nộp trước 1 ngày, có điểm hoặc nhận xét mới, nhắc học phí đến hạn theo ngày hạn trong Cài đặt, báo cáo tuần (chuyên cần, bài đã nộp, điểm). Phụ huynh tắt từng loại bằng `/caidat`. *(2026-10-19).* Rà lại 2026-10-22: phần lớn ý chưa có trong mã, làm thật ở P37 (E-078).
- [x] **34.18** Thông báo chung: nhân viên soạn một tin gửi cả lớp, cả cơ sở hoặc toàn trung tâm (nghỉ lễ, sự kiện) từ app; chỉ gửi trong phạm vi cơ sở của người soạn (P32); có xem trước số người nhận. Kiểm chứng: E2E gửi thông báo chung thành công. *(2026-10-19).*

### Bot cho giáo viên và quản trị
- [x] **34.19** Giáo viên: `/homnay` (lịch dạy hôm nay, phòng), `/chocham` (bài đang chờ chấm, link mở thẳng màn chấm), nhắc chấm bài nói quá 2 ngày chưa chấm, báo học sinh nộp bài (đã có ở 34.9), báo đơn xin nghỉ cần duyệt. *(2026-10-19).* Rà lại 2026-10-22: phần lớn ý chưa có trong mã, làm thật ở P37 (E-078).
- [x] **34.20** Super admin: báo cáo cuối ngày (số buổi đã dạy, số vắng, bài nộp, tiền thu trong ngày, học phí quá hạn), cảnh báo học sinh vắng 3 buổi liên tiếp, lệnh `/baocao` xem nhanh. *(2026-10-19).* Rà lại 2026-10-22: phần lớn ý chưa có trong mã, làm thật ở P37 (E-078).
- [x] **34.21** Lịch chạy tự động cho các việc ở 34.17, 34.19, 34.20: route `/api/cron/telegram` có khoá bí mật, gọi bằng Vercel Cron (gói Hobby chỉ chạy tối đa mỗi ngày một lần, cần gói Pro hoặc dịch vụ hẹn giờ ngoài như cron-job.org cho nhắc trước 2 giờ). Gửi theo lô, chống gửi trùng bằng bảng ghi đã gửi. Kiểm chứng: gọi route hai lần không gửi trùng (E2E đạt 200 OK). *(2026-10-19).*
- [x] **34.22** Nhật ký và giới hạn: mọi tin ra vào lưu trong `telegram_messages`; giới hạn tốc độ gửi (Telegram giới hạn khoảng 30 tin mỗi giây cho mỗi bot); tin lỗi được thử lại; Cài đặt hiện số tin gửi lỗi gần đây và số tài khoản kết nối. *(2026-10-19).*

### Google Drive làm kho lưu trữ và sao lưu (đề xuất 2026-10-19)

Người dùng có gói Google 30 TB. Phương án: **Supabase lưu tệp đang dùng** (nhanh, trình duyệt tải thẳng lên được), **Google Drive lưu trữ lâu dài và sao lưu** (dung lượng gần như không giới hạn). Drive không làm nơi lưu chính vì mở tệp chậm hơn, tải thẳng từ trình duyệt phức tạp, và qua server thì vướng giới hạn khoảng 4,5 MB mỗi lần gửi của Vercel. Nếu sau này muốn dùng Drive thay hẳn Supabase thì driver ở 34.24 dùng được cho `blob-store` (thêm `drive` cạnh `supabase` và `disk`).

Giới hạn Drive API: tải lên tối đa 750 GB mỗi ngày mỗi tài khoản; số lần gọi API có hạn mức theo phút, phải thử lại khi bị báo 429. Cả hai đều dư cho một trung tâm.

- [x] **34.23** (người dùng chốt) Loại tài khoản Google: Người dùng đã chốt **Google One cá nhân** dùng OAuth với quyền `drive.file` (app chỉ thấy tệp do nó tạo). Biến môi trường: `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`. *(2026-10-19).*
- [x] **34.24** Driver Google Drive phía server (`googleapis`): trong `src/lib/drive-store.ts`, tải lên vào thư mục theo năm và tháng, tải về, xoá; tệp luôn riêng tư (không bật chia sẻ bằng link); thử lại khi bị 429 backoff. *(2026-10-19).*
- [x] **34.25** Lưu trữ tệp cũ: `uploaded_files` thêm cột nơi lưu (`storage_location`) và mã tệp trên Drive (`drive_file_id`), migration `0015_drive_archive.sql`. Script `npm run files:archive` tự chuyển bản ghi âm và bài nộp đã chấm quá 90 ngày từ Supabase sang Drive (kiểm kích thước khớp mới xoá ở Supabase) để giữ dưới 1 GB miễn phí. `/api/files/[id]` đọc đúng nơi lưu trong suốt. *(2026-10-19).*
- [x] **34.26** Sao lưu database hằng ngày lên Drive: script `npm run db:backup` dump `esl_center` (nén gzip), giữ 30 bản hằng ngày và 12 bản hằng tháng, tự xoá bản cũ hơn; báo super admin qua Telegram khi sao lưu lỗi. Có hướng dẫn khôi phục chi tiết trong `README.md`. *(2026-10-19).*
- [x] **34.27** Tài liệu bài giảng dung lượng lớn (video, sách PDF dày): giáo viên nhập liên kết hoặc ID tệp Drive của trung tâm để gắn vào bài giảng (`attachDriveMaterialAction`), học sinh xem qua app với quyền bảo mật của lớp, hỗ trợ HTTP Range 206 để tua mượt mà. *(2026-10-19).*

Nguồn: giới hạn Drive API https://developers.google.com/drive/api/guides/limits ; service account phải dùng shared drive https://fivetran.com/docs/activations/destinations/available-destinations/google-drive/troubleshooting/service-accounts-storage-quota , https://mastra.ai/reference/workspace/google-drive-filesystem ; quyền `drive.file` https://www.rapidevelopers.com/md/api-automations/how-to-automate-google-drive-file-sharing-using-the-api .

Nguồn tham khảo: giới hạn bot (tải lên 50 MB, tải xuống 20 MB) https://fast.io/resources/telegram-file-size-limit.md ; Supabase Storage gói miễn phí 1 GB, tệp 50 MB https://aiagencyplus.com/supabase-free-tier-limits/ , https://supabase.com/blog/storage-500gb-uploads-cheaper-egress-pricing ; signed upload URL https://skills.sh/adaptationio/skrillz/supabase-storage ; Firebase bắt buộc gói Blaze https://firebase.google.cn/docs/storage/faqs-storage-changes-announced-sept-2024 .

## P35. Bài tập online cho trẻ 3–11 tuổi: dạng câu mới, ghi âm, chấm nói, trò chơi

Nguồn: `docs/NGHIEN-CUU-BAI-TAP-ONLINE.md` (P33.1). Điều kiện đã có: lưu tệp Supabase và tải thẳng từ trình duyệt (P34), lưu trữ Google Drive, bot Telegram gửi tin có chữ ký giáo viên, bản sao cho super admin. App đang có: 3 dạng câu (trắc nghiệm, viết, nộp tệp), bốn kỹ năng, chấm theo tiêu chí, chấm chéo, ngân hàng câu hỏi, khu học sinh `/cua-toi`, làm lại bài.

Thứ tự làm (mỗi giai đoạn dùng được ngay, không chờ giai đoạn sau): **A** dạng câu và làm bài → **B** ghi âm → **C** chấm nói → **D** đồng ý của phụ huynh (bắt buộc trước khi cho học sinh thật ghi âm) → **E** trò chơi và động lực → **F** công cụ cho giáo viên → **G** chấm phát âm tự động.

Mặc định đề xuất cho các câu hỏi chưa chốt ở tài liệu nghiên cứu (người dùng sửa ở 35.1 nếu khác): giọng mẫu do giáo viên tự thu là chính, giọng máy để bổ sung, giọng Mỹ; trẻ 3–5 tuổi luôn có phụ huynh hoặc giáo viên ngồi cùng; bản ghi âm giữ 12 tháng rồi chuyển sang Google Drive, xoá sau 24 tháng; chưa bật chấm tự động cho tới khi thử nghiệm ở G.

Nghiên cứu kỹ thuật cho các mục còn mở (thư viện, định dạng ghi âm theo máy, giá dịch vụ, pháp lý): `docs/NGHIEN-CUU-TINH-NANG-P35.md` (2026-10-22). Thứ tự làm đề xuất ở mục 12 của tài liệu đó. Không làm hồ sơ chuyển dữ liệu ra nước ngoài (người dùng chốt 2026-10-22).

### Chốt trước
- [ ] **35.1** (người dùng) Chốt hoặc sửa các mặc định trên; chọn bộ bài mẫu đầu tiên (đề xuất: Starters, 3 bài theo giáo trình đang dạy); linh vật của trung tâm (có sẵn hay cần thiết kế); có cần chế độ trình chiếu trên lớp ngay ở giai đoạn F không.

### A. Dạng câu mới và màn làm bài
- [x] **35.2** Schema: `assignment_items.item_type` thêm `picture_choice`, `match`, `order`, `gap_fill`, `speak_repeat`, `speak_read`, `speak_picture`; câu có `image_file_id`, `model_audio_file_id`, `reference_text`, `max_seconds`; đáp án có `image_file_id`, `audio_file_id`; bảng `assignment_item_pairs` (ghép đôi); cột thứ tự đúng cho dạng sắp xếp; danh sách đáp án chấp nhận cho điền chỗ trống. Migration mới, không sửa migration cũ. Kiểm chứng: migrate trên DB thử, unit validate từng dạng. ✅ 2026-10-19: migration `0016_online_exercise_types` (đã đưa vào journal kèm snapshot, `db:migrate` chạy được), unit chấm từng dạng pass.
- [x] **35.3** Chấm tự động cho các dạng chạm và kéo (chọn tranh, ghép đôi tính điểm từng cặp, sắp xếp, điền chỗ trống không phân biệt hoa thường và khoảng trắng) trong `assignment-scoring`. Kiểm chứng: unit cho từng dạng, kể cả điểm lẻ. ✅ 2026-10-19: unit 17 test `assignment-scoring` pass, gồm ghép đôi điểm lẻ; điểm lưu vào bài được làm tròn vì cột điểm là số nguyên.
- [ ] **35.4** Màn soạn câu cho từng dạng mới trong `ItemsEditor`: chọn tranh và âm thanh (tải thẳng lên Supabase), ghi âm giọng mẫu ngay trong màn soạn, xem trước như học sinh thấy. Ngân hàng câu hỏi nhận các dạng mới và có ô nguồn và giấy phép. Kiểm chứng: E2E soạn một bài đủ 7 dạng. ⏳ Rà soát 2026-10-19: đã có lưới chọn dạng (đủ 10 dạng, đã thêm lại "Trả lời viết" và "Nộp tệp" bị mất), tải tranh và âm thanh, xem trước kiểu điện thoại, ô nguồn và giấy phép. Đã sửa lỗi không lưu được câu khi để trống ô tiếng Việt hoặc nguồn (E-069), khôi phục ô đoạn đọc và tên truy cập các ô. Còn thiếu: ghi âm giọng mẫu ngay trong màn soạn, E2E soạn đủ 7 dạng.
- [ ] **35.5** Màn làm bài của học sinh theo nhóm tuổi: mỗi màn một câu, nút to (từ 64px cho 3–5 tuổi), hướng dẫn bằng giọng nói (có bản tiếng Việt), nút nghe lại; kéo thả bằng dnd-kit (chạm và bàn phím đều dùng được); hai chế độ **luyện** (sai được làm lại ngay, có hiệu ứng khi đúng) và **kiểm tra** (làm một lần). Kiểm chứng: E2E làm bài ở 390px và 1024px; `chuan.spec` không lỗi kích thước. ⏳ Rà soát 2026-10-19: đã có màn mỗi câu một trang, thanh tiến độ, nút to, tiếng Việt dưới đề, màn chúc mừng có sticker. Còn thiếu: kéo thả dnd-kit (đang chạm để chọn), hai chế độ luyện và kiểm tra, hướng dẫn bằng giọng nói, màn chúc mừng chưa theo điểm thật (luôn 3 sao), E2E 390px và 1024px.

- [x] **35.24** Học thử không cần đăng nhập: nút "Vào học thử" trên trang đăng nhập và link `/hoc-thu` mở thẳng một bài mẫu đủ dạng câu bằng tài khoản học sinh học thử (không mật khẩu, không đổi mật khẩu được). Dữ liệu riêng ở "Cơ sở học thử", lớp HOC-THU, tự tạo lần đầu; mỗi lần vào xoá bài làm cũ. Tắt bằng `DEMO_LOGIN=off`. Bộ bài mẫu ở `src/lib/demo-lessons.ts`: 5 bài theo chủ đề (Animals, Colors & Numbers, My Family, Food & Drinks, At School), 70 câu đủ 8 dạng; sửa dữ liệu thì lần vào sau tự dựng lại bài. ✅ 2026-10-19: unit `demo-lessons` (mọi câu qua schema máy chủ, đáp án mẫu chấm đủ điểm); E2E `hoc-thu.spec` 2 test pass (vào thẳng bài, nộp rồi vào lại thì về Chưa nộp); không tràn ngang ở 360px.
- [ ] **35.26** (tạm dừng: người dùng chốt không dùng dịch vụ nước ngoài; thay bằng Soạn nhanh theo mẫu ở P36) AI soạn câu nháp: giáo viên dán danh sách từ, Claude (`claude-opus-5-5`, structured outputs theo `itemFormSchema`) trả câu nháp, giáo viên duyệt rồi lưu; không gửi dữ liệu học sinh. Ước tính 0,1–0,2 USD một bài 20 câu. Kiểm chứng: unit chạy câu nháp qua schema và chấm đáp án mẫu; E2E soạn nháp rồi lưu (dùng phản hồi giả).
- [x] **35.27** Sửa nhỏ từ nghiên cứu: ghi âm chọn định dạng bằng `isTypeSupported` và cắt tham số MIME trước khi tải lên; thống nhất loại ảnh giữa `IMAGE_ACCEPT` và `ALLOWED_TYPES` (WebP, GIF); màn chúc mừng hiện sao theo điểm thật. Kiểm chứng: unit chọn MIME, E2E ghi âm với micro giả. ✅ 2026-10-22: `src/lib/recording.ts` (chọn định dạng bằng `isTypeSupported`, cắt tham số MIME, đồng hồ, sao); thêm WebP, GIF ở máy chủ; màn chúc mừng hiện 1–3 sao theo điểm phần tự chấm (nộp bài trả `score`), số sticker bằng số sao, báo còn câu chờ giáo viên chấm; nộp lỗi thì ở lại và báo để nộp lại. Unit `recording.test.ts` 6 test; E2E `hoc-thu.spec` kiểm 1 sao và điểm phần tự chấm.

### B. Ghi âm trên trình duyệt
- [ ] **35.6** Ghi âm cho ba dạng nói: bấm để nói, đếm giây theo `max_seconds`, nghe lại, nói lại, nộp; Android và Chrome ghi webm, iOS ghi m4a; tải thẳng lên Supabase rồi ghi `uploaded_files`; hướng dẫn cấp quyền micro. Chỉ bật khi học sinh đã có đồng ý của phụ huynh (35.12). Kiểm chứng: E2E với micro giả của Chromium; thử tay trên iPhone và Android. ⏳ 2026-10-22: đã có ghi âm theo định dạng của máy, đếm giây và tự dừng, nghe lại, Nói lại hoặc Dùng bản này, báo lỗi micro bằng chữ (cách cấp quyền trên máy tính và iPhone), tải thẳng lên kho tệp (chưa cấu hình thì qua máy chủ); mọi nút tải tệp khác cũng tải thẳng (E-071). E2E `ghi-am.spec` với micro giả: ghi, nói lại, lưu, tệp `audio/webm`. Đã chặn khi chưa có đồng ý (35.12). Còn thiếu: thử tay trên iPhone và Android (người dùng).
- [ ] **35.7** Karaoke đọc theo cho dạng đọc to: chữ sáng dần theo giọng mẫu (mốc thời gian từng từ do giáo viên chỉnh hoặc chia đều), rồi trẻ ghi âm đọc theo. Kiểm chứng: E2E phát mẫu và ghi âm.

### C. Chấm nói và chỉ lỗi
- [ ] **35.8** Màn chấm nói: thanh phát có vạch thời gian; bấm vào giây có lỗi để thêm ghi chú gồm loại lỗi (danh sách lỗi thường gặp của người Việt: mất âm cuối, /θ/ /ð/, /ʃ/ /s/, /z/, s/es, -ed, trọng âm, ngữ điệu, thiếu thừa từ, sai thì), chữ đúng, ghi âm mẫu của giáo viên, đánh dấu "nói lại câu này". Bảng `speaking_feedback`. Kiểm chứng: E2E thêm, sửa, xoá ghi chú lỗi.
- [ ] **35.9** Tiêu chí bài nói: 3–8 tuổi chấm sao (phát âm, trôi chảy, hoàn thành yêu cầu), 9–11 tuổi chấm điểm 0–5 thêm từ vựng và ngữ pháp; ô "Điều con làm tốt" bắt buộc; gợi ý chỉ nêu 1–2 lỗi quan trọng nhất với trẻ nhỏ. Dùng lại chấm theo tiêu chí đã có. Kiểm chứng: unit quy đổi sao và điểm.
- [ ] **35.10** Học sinh xem nhận xét: danh sách lỗi theo mốc giây, nghe đoạn mình nói và mẫu của giáo viên, chỉ ghi âm lại những câu bị đánh dấu; giáo viên thấy bản cũ và bản mới cạnh nhau. Kiểm chứng: E2E vòng chấm, nói lại, chấm lại.
- [ ] **35.11** Gửi nhận xét bài nói cho phụ huynh qua Telegram (chữ ký giáo viên, kèm âm thanh mẫu, bản sao cho super admin như P34); lệnh `/nhanxet` của bot đọc từ dữ liệu này. Kiểm chứng: E2E ghi đúng tin ra trong `telegram_messages`.

### D. Đồng ý của phụ huynh và thời hạn lưu
- [x] **35.12** Bảng `parent_consents` (học sinh, loại: ghi âm cho giáo viên chấm / gửi giọng nói ra dịch vụ chấm tự động, người đồng ý, thời điểm, thời điểm rút lại). Lấy đồng ý bằng nút bấm trên bot Telegram, hoặc nhân viên ghi nhận trong hồ sơ học sinh (kèm ghi chú đã có giấy đồng ý). Rút lại thì ngừng ghi âm và xoá bản ghi theo yêu cầu. Kiểm chứng: E2E học sinh chưa có đồng ý thì không thấy nút ghi âm. ✅ 2026-10-22: bảng `parent_consents` (migration `0020`; mỗi lần đồng ý hoặc từ chối một dòng, lưu phụ huynh, kênh, phiên bản nội dung, bằng chứng, thời điểm rút lại, thời điểm trẻ đồng ý). Nội dung xin phép theo mục đích ở `src/lib/consent.ts`. Hồ sơ học sinh có khung "Đồng ý của phụ huynh": gửi yêu cầu qua bot (nút Đồng ý / Không đồng ý, chỉ phụ huynh của chính học sinh ghi được), nhân viên ghi nhận kèm bằng chứng, rút lại qua xác nhận. Khu học sinh: chưa đồng ý thì câu nói hiện lời nhắn, không có micro; trẻ từ 7 tuổi bấm "Con đồng ý"; máy chủ bỏ bản ghi câu nói khi chưa được phép. Tài khoản học thử có sẵn đồng ý. Unit `consent.test.ts` 5 test; E2E `dong-y.spec` 2 test. Phần xoá bản ghi theo yêu cầu làm ở 35.13.
- [ ] **35.13** Thời hạn lưu bản ghi âm: tự chuyển sang Google Drive sau 12 tháng (dùng 34.25), tự xoá sau 24 tháng hoặc khi học sinh nghỉ quá thời hạn; nút xoá theo yêu cầu phụ huynh; ghi nhật ký. Kiểm chứng: chạy job hai lần không lỗi, tệp quá hạn bị xoá ở cả Supabase và Drive.

### E. Trò chơi và động lực
- [ ] **35.14** Danh sách từ: từ, tranh, âm thanh, nghĩa tiếng Việt; gắn với bài giảng hoặc lớp; dùng lại cho mọi trò chơi. Kiểm chứng: E2E thêm, sửa, xoá danh sách từ.
- [ ] **35.15** Bốn trò chơi đầu tiên từ danh sách từ: lật thẻ nhớ, đập chuột từ vựng (nghe rồi chạm tranh), ghép chữ, xây câu. Làm bằng React (không cần Phaser). Kiểm chứng: E2E chơi hết một lượt mỗi trò; không tràn ngang ở 360px.
- [ ] **35.16** Bốn trò chơi tiếp theo: bingo nghe, Simon says / tìm trong tranh (chạm đúng chỗ trong tranh lớn), đoán chữ, đua xe trả lời nhanh. Kiểm chứng: như 35.15.
- [ ] **35.17** Động lực: sao theo bài, bộ sưu tập sticker và truyện mở khoá bằng sao, đường học theo bài, chuỗi học theo tuần (không theo ngày), mục tiêu chung của lớp thay cho xếp hạng cá nhân; không trừ sao khi sai. Kiểm chứng: unit tính sao và chuỗi tuần.
- [ ] **35.18** Hộp từ của từng học sinh với lịch ôn lặp lại ngắt quãng (ts-fsrs): mỗi ngày gợi ý 5–10 từ cần ôn qua một trò chơi ngắn. Kiểm chứng: unit lịch ôn; E2E ôn một lượt.

### F. Công cụ cho giáo viên
- [ ] **35.19** Chế độ trình chiếu: giáo viên chọn trò chơi hoặc bài, chiếu lên màn hình lớn, cả lớp chơi chung, giáo viên điều khiển bằng điện thoại hoặc bàn phím. Kiểm chứng: E2E mở chế độ trình chiếu và chuyển câu.
- [ ] **35.20** Bảng theo dõi lớp: em nào chưa làm, từ nào cả lớp hay sai, bài nói đang chờ chấm (liên kết thẳng màn chấm); bot nhắc giáo viên chấm bài nói quá 2 ngày (34.19). Kiểm chứng: E2E số liệu khớp dữ liệu thử.
- [ ] **35.21** Bộ bài mẫu đầu tiên theo 35.1 (ví dụ 3 bài Starters đủ dạng câu, giọng mẫu, tranh, một danh sách từ), dùng để demo và kiểm thử đầu cuối. Kiểm chứng: học sinh thử làm trọn một bài trên điện thoại.

### G. Chấm phát âm tự động (gợi ý cho giáo viên)
- [ ] **35.22** Thử nghiệm độ chính xác trên giọng học sinh của trung tâm (chỉ những em đã có đồng ý loại thứ hai): OpenPronounce chạy trên máy chủ riêng (MIT, không gửi giọng ra ngoài) so với Azure Pronunciation Assessment; so với điểm giáo viên chấm trên khoảng 50 bản ghi. Chọn một, hoặc dừng nếu sai nhiều. Kiểm chứng: bảng so sánh ghi vào `docs/`.
- [ ] **35.23** Nếu 35.22 đạt: màn chấm nói tô màu từ nghi sai và gợi ý điểm; giáo viên luôn quyết định điểm cuối; không hiện điểm máy cho trẻ 3–5 tuổi. Kiểm chứng: E2E gợi ý hiện, giáo viên sửa được.

## P36. Soạn câu nhanh và gợi ý câu theo trình độ

Nguồn: `docs/NGHIEN-CUU-SOAN-CAU-HOI.md` (2026-10-22). Mục tiêu: một bài 15–20 câu đủ dạng trong vài phút, đúng trình độ của lớp. Chạy hoàn toàn trong app, không cần AI hay dịch vụ nước ngoài.

Giao diện (người dùng yêu cầu 2026-10-22): phải đẹp và dùng tốt trên cả máy tính lẫn điện thoại. Bản mẫu: `docs/mockups/soan-nhanh.html` (ba bước Nguồn → Dạng câu → Xem lại, bản máy tính và bốn màn điện thoại, chế độ tối). Làm đúng bản mẫu và quy tắc ở cuối bản mẫu: token của `globals.css`, máy tính dùng ⋯ có icon, điện thoại dùng thẻ có nút chữ và nút chính dính đáy, ô nhập điện thoại 16px, bỏ câu qua hộp xác nhận, không tràn ngang ở 360–1440px, ảnh chụp kiểm tra ở 390px và 1440px trước khi báo xong.

- [x] **36.1** Trình độ cho thiếu nhi: thêm Pre-A1 vào `course_levels`, tên hiển thị "Pre-A1 (Starters)", "A1 (Movers)", "A2 (Flyers)" (migration mới). Tham số theo trình độ (số lựa chọn, số cặp ghép, độ dài câu sắp xếp, cách điền chỗ trống, giây nói, số câu một bài) thành hằng trong code theo mục 5 tài liệu. Kiểm chứng: migrate chạy hai lần không lỗi; unit tham số. ✅ 2026-10-22: migration `0017_pre_a1_level` (Pre-A1 tên Starters đứng trước A1; A1, A2 đổi tên Movers, Flyers khi còn tên mặc định; ngưỡng 70%), chạy hai lần không lỗi. Tham số ở `src/lib/level-params.ts`. Unit `quick-compose.test.ts` phần trình độ.
- [x] **36.2** Bộ sinh câu thuần: đầu vào danh sách từ (từ, nghĩa, emoji), câu, trình độ, các dạng chọn; đầu ra `ItemInput[]`. Đáp án nhiễu cùng chủ đề, cùng trình độ, không trùng đáp án đúng. Kiểm chứng: unit mọi câu qua `itemFormSchema`, đáp án mẫu chấm đủ điểm, nhiễu không trùng; chạy được với bộ học thử. ✅ 2026-10-22: `src/lib/quick-compose.ts` (tách danh sách, tách câu, điều kiện từng dạng, sinh 8 dạng, bốc lại nhiễu, đổi dạng) và bộ từ khởi đầu `src/lib/vocab-starter.ts` (khoảng 200 từ, 14 chủ đề, nghĩa và emoji). Unit 14 test: mọi câu qua `itemFormSchema` ở cả ba trình độ, đáp án đúng đủ điểm, nhiễu không trùng.
- [x] **36.3** Màn Soạn nhanh, cách vào "Dán danh sách từ" (tự nhận tab, ` - `, `|`, dấu phẩy; xem bảng đã tách), tick dạng câu (dạng chưa đủ điều kiện thì tắt và nêu lý do), màn xem lại một trang (bỏ câu, bốc lại nhiễu, đổi dạng tương thích, sửa chi tiết), "Thêm vào bài" đưa câu vào `ItemsEditor`. Kiểm chứng: E2E dán 8 từ, sinh 3 dạng, bỏ một câu, lưu bài; không tràn ngang 360–1440px. ✅ 2026-10-22: `QuickCompose.tsx` mở từ nút "Soạn nhanh" trong màn soạn câu (ẩn tạm hộp soạn để không lồng hai hộp thoại), có cả ba cách vào (dán danh sách, chọn từ có sẵn theo trình độ và chủ đề, dán câu). Máy tính dùng ⋯ (`RowMenu` nâng z-index lên 75 để nổi trên hộp thoại), điện thoại dùng thẻ có nút chữ. E2E `soan-nhanh.spec` 2 test (1440px: dán, tắt dạng, bỏ câu qua xác nhận, thêm và lưu, kiểm loại câu trong DB; 390px: chọn từ có sẵn, dán câu, không tràn ngang, nút 44px). `chuan.spec` 1440 và 390 đạt; `work.spec` phần bài tập, ngân hàng, trình độ đạt.
- [x] **36.4** Kho từ `vocab_items` (từ, từ loại, trình độ, chủ đề, nghĩa tiếng Việt, emoji, ảnh, âm thanh, nguồn, câu ví dụ). Nạp A1, A2 từ CEFR-J 1.5 kèm chủ đề, ghi nguồn. Cách vào "Chọn từ kho" theo trình độ và chủ đề. Từ giáo viên thêm chờ duyệt. Kiểm chứng: nạp lại không trùng; E2E chọn 8 từ A1 chủ đề Food rồi sinh bài. ✅ 2026-10-22: bảng `vocab_items` (khoá từ + chủ đề) nạp sẵn trong migration `0018_vocab_items` (200 từ khởi đầu có nghĩa, emoji; 2.132 từ A1, A2 CEFR-J 1.5, ghi nguồn ở `src/db/data/README.md`; câu lệnh sinh bằng `scripts/build-vocab-seed.ts`), migrate hai lần không trùng. `VocabPicker`: trình độ, chủ đề (chủ đề chưa có nghĩa gom vào "Chủ đề khác"), chọn 8 từ hay gặp; dán từ thì tự tra nghĩa trong kho; "Lưu vào kho chung" (giáo viên: chờ duyệt; từ CEFR-J chưa có nghĩa thì bổ sung nghĩa); người có quyền Cài đặt duyệt hoặc bỏ ở chip "Chờ duyệt". E2E: giáo viên chọn 8 từ Đồ ăn, sinh bài, lưu từ mới chờ duyệt; quản trị duyệt.
- [x] **36.5** Cách vào "Dán câu": tách câu, đánh dấu từ thuộc trình độ, sinh sắp xếp (lọc theo độ dài), điền chỗ trống (đục từ trong danh sách), đọc to. Kiểm chứng: unit tách câu và chọn từ đục; E2E dán đoạn 4 câu. ✅ 2026-10-22: xem trước từng câu đã dán (sắp xếp được hay không theo độ dài của trình độ, từ bị đục tô vàng, từ thuộc trình độ trong kho gạch chân). Unit tách câu và chọn từ đục (`quick-compose.test.ts`); E2E dán đoạn 4 câu, sinh sắp xếp, điền chỗ trống, đọc to.
- [x] **36.6** Ngân hàng câu có trình độ và chủ đề: cột mới cho `questions`, lọc theo trình độ, chủ đề, dạng, kỹ năng; chép nhiều câu một lần; câu sinh từ Soạn nhanh lưu được vào ngân hàng. Kiểm chứng: E2E lọc và chép 5 câu. ✅ 2026-10-22: cột `level`, `topic` cho `questions` (migration `0019_question_level_topic`); trang ngân hàng lọc theo trình độ, chủ đề, kỹ năng, dạng câu, có cột Trình độ; form sửa có ô trình độ và chủ đề; hộp "Thêm từ ngân hàng" lọc như trên (mặc định trình độ của lớp) và "Chọn tất cả"; Soạn nhanh có "Lưu vào ngân hàng" (trình độ của lớp, chủ đề gặp nhiều nhất). Sửa luôn lỗi ngân hàng làm mất nội dung các dạng câu P35 (E-070). Unit chép câu từ ngân hàng; E2E lưu 13 câu vào ngân hàng, lọc, chép tất cả vào bài, kiểm cặp ghép trong DB.
- [ ] **36.7** (người dùng và giáo viên) Điền nghĩa tiếng Việt và emoji cho khoảng 300–400 từ hay dạy nhất cho trẻ; chỉnh bảng tham số theo trình độ sau vài tuần dùng. Khi xong: đổi bộ học thử sang sinh bằng Soạn nhanh.

## P37. Bot Telegram theo kịch bản chi tiết

Nguồn: `docs/KICH-BAN-TELEGRAM.md` (2026-10-22). Người dùng thấy bot còn sơ sài. Rà lại thì nhiều ý của 34.17, 34.19, 34.20 đã đánh dấu xong nhưng chưa có trong mã (E-078), cách kết nối bằng số điện thoại để lộ thông tin của trẻ (E-076), và có endpoint gỡ lỗi trả một phần bot token (E-077). Mã chia thành `core.ts` (gửi tin, chống trùng), `leave.ts` (đơn nghỉ), `notify.ts` (sự kiện trong app), `cron.ts` (việc theo giờ), `prefs.ts` (phần thuần). Migration `0021_telegram_p37`: `telegram_chats.muted_kinds`, bảng `telegram_notification_log`, bảng `leave_requests`.

- [x] **37.1** Viết kịch bản chi tiết cho phụ huynh, giáo viên, quản trị, hệ thống: người nhận, giờ gửi, nội dung, nút, kiểm quyền, chống trùng, trường hợp lệch. ✅ 2026-10-22: `docs/KICH-BAN-TELEGRAM.md`.
- [x] **37.2** Kết nối bằng nút "Chia sẻ số điện thoại", chỉ nhận danh bạ của chính người gửi; gõ số tay không kết nối; số trùng nhiều hồ sơ thì không tự kết nối. Gỡ `GET /api/telegram/webhook`. ✅ 2026-10-22: E2E gõ số, danh bạ người khác đều không kết nối; danh bạ của chính mình thì kết nối.
- [x] **37.3** Đơn xin nghỉ lưu trong `leave_requests`: chọn con, chọn buổi chưa bắt đầu, lý do bằng nút hoặc gõ trong 15 phút, phụ huynh huỷ đơn chờ duyệt, xin lại thì mở lại đơn cũ; giáo viên duyệt một lần (người sau nhận "đã được X duyệt"), kiểm quyền điểm danh, cơ sở, buổi đúng lớp; `/donnghi`. Nút kiểu cũ vẫn chạy và kiểm quyền trước khi tạo đơn. ✅ 2026-10-22: E2E phụ huynh khác và kế toán không đổi được đơn, giáo viên duyệt ghi vắng, bấm lại không đổi, huỷ và xin lại.
- [x] **37.4** `/caidat`: bật tắt 7 loại tin, vẽ lại tin cài đặt bằng `editMessageText`. ✅ 2026-10-22: unit bàn phím và bật tắt; E2E tắt Điểm mới thì đổi điểm không gửi.
- [x] **37.5** Chống gửi trùng bằng `telegram_notification_log` (chat, loại, mã sự kiện); chỉ thử lại khi lỗi tạm thời; người dùng chặn bot thì ngừng chat. ✅ 2026-10-22: E2E chạy cron hai lần một tin; lưu điểm danh, chấm điểm lại y nguyên không gửi lại (E-079).
- [x] **37.6** Thông báo sự kiện: vắng, trễ, sửa lại có mặt; huỷ, khôi phục, đổi giờ hoặc phòng buổi học; bài mới; học sinh nộp bài; điểm mới (bảng chấm và chấm từng câu); cảnh báo vắng 3 buổi liên tiếp cho giáo viên và quản trị. ✅ 2026-10-22: E2E điểm danh vắng, sửa có mặt, cảnh báo 3 buổi, huỷ buổi ở màn Lịch học, bài mới, điểm mới. Khôi phục buổi, đổi giờ và học sinh nộp bài chưa có E2E riêng.
- [x] **37.7** Việc theo giờ (gọi cron mỗi giờ, tự kiểm giờ Việt Nam): nhắc lịch học có nút xin nghỉ buổi này, lịch dạy buổi sáng cho giáo viên, nhắc hạn bài, học phí trước hạn 3 ngày và quá hạn, nhắc chấm bài quá 2 ngày, báo cáo tuần Chủ nhật, báo cáo ngày 20 giờ. `?jobs=` chạy việc chỉ định, `?chat=` chỉ gửi cho một chat. ✅ 2026-10-22: unit giờ chạy, học phí, mã tuần; E2E nhắc hạn bài và tên việc lạ bị bỏ qua.
- [x] **37.8** Lệnh `/lich` ghi giáo viên, chủ đề, trạng thái đơn nghỉ; báo cáo ngày tính theo giờ Việt Nam, thêm bài nộp, bài chờ chấm, đơn chờ duyệt. ✅ 2026-10-22: typecheck; E2E lệnh tra cứu của phụ huynh đạt.
- [x] **37.9** E2E không gửi tin thật: chọn dữ liệu không có phụ huynh kết nối thật, cron giới hạn `?chat=`, thông báo chung trong test gửi theo lớp (E-081). ✅ 2026-10-22: sau khi chạy, chat thật không nhận tin mới.
- [ ] **37.10** (người dùng) Đặt lịch gọi `/api/cron/telegram` mỗi giờ trên bản deploy (cron-job.org hoặc Vercel Cron gói Pro), kèm `Authorization: Bearer <CRON_SECRET>`. Chưa đặt thì chỉ có thông báo sự kiện, không có nhắc theo giờ.
- [x] **37.11** Màn Đơn nghỉ trong app cho giáo vụ: danh sách, lọc theo lớp và trạng thái, duyệt hoặc từ chối, cùng quy tắc với bot. ✅ 2026-10-22: màn `/don-nghi` (menu Đào tạo, huy hiệu số đơn chờ), lọc trạng thái và lớp, duyệt hoặc từ chối (có xác nhận) dùng chung `applyLeaveDecision` với bot, thêm "Ghi đơn nghỉ" cho giáo vụ khi phụ huynh gọi điện (duyệt ngay, ghi vắng có phép). E2E `don-nghi.spec.ts` và luồng xin nghỉ trên bot xanh; ảnh 1440px và 390px không tràn.
- [ ] **37.12** Học bù: phụ huynh chọn buổi bù của lớp khác cùng trình độ khi con nghỉ có phép.
- [x] **37.13** Mã QR chuyển khoản (VietQR) trong tin nhắc học phí. ✅ 2026-10-23: Cài đặt có "Tài khoản nhận học phí" (ngân hàng, số tài khoản, tên chủ, xem thử mã QR; migration 0025). Mã VietQR (EMVCo, CRC16) tạo ngay trên máy chủ bằng thư viện `qrcode`, không gọi dịch vụ ngoài; nội dung "HP HS-xxxxx Tên" để đối chiếu sao kê. Nút Nhắc ở Học phí và lệnh /hocphi gửi ảnh QR kèm số tiền còn thiếu; hộp Ghi thu hiện mã QR để phụ huynh quét tại quầy. Unit `vietqr.test.ts`, E2E `vietqr.spec.ts` (Telegram nhận ảnh multipart, chat giả bị từ chối như dự kiến).
- [x] **37.14** Khảo sát hài lòng cuối khoá bằng nút bấm trên bot. ✅ 2026-10-23: bảng `course_surveys` (migration 0026); bot hỏi 1–5 sao rồi có học tiếp khoá sau không, mỗi phụ huynh mỗi khoá một lần; từ 3 sao trở xuống gửi bản sao cho quản trị; việc tự động `survey` (từ 10 giờ) gửi khi lớp vừa học xong buổi cuối trong 3 ngày; trang lớp có khung kết quả (điểm trung bình, số đã chấm, tỉ lệ học tiếp, danh sách cần liên hệ) và nút Gửi khảo sát có xác nhận. Nhắc học phí tự động cũng kèm ảnh mã QR. E2E `khao-sat.spec.ts` (người lạ bấm nút không ghi được), `vietqr.spec.ts` cron; ảnh 1440px và 390px không tràn.

## P38. Lịch nhiều giờ trong tuần, học sinh vào giữa khoá, mã học sinh 5 chữ số

Người dùng hỏi (2026-10-22): lớp học hai buổi mà giờ khác nhau thì nhập thế nào; phân biệt ngày khai giảng của lớp và ngày bắt đầu học của học sinh; vào giữa khoá thì chia học phí theo số buổi còn lại; mã học sinh dạng HS-12345.

- [x] 38.1 Giờ riêng cho từng ngày học (2026-10-22). Cột `classes.day_times` ("T3 18:00-19:30,T7 08:00-09:30", migration 0022). Form tạo lớp: chọn ngày nào thì ngày đó tự có một dòng giờ, không cần tích; dòng chưa sửa đi theo giờ vừa nhập; giờ khác nhau thì form tự nêu ra, giờ kết thúc sai báo ngay dưới dòng. Form sửa lớp sửa được giờ từng ngày, các buổi chưa học và chưa bắt đầu của ngày đó dời sang giờ mới. Mô tả lịch: "T3 18:00–19:30 · T7 08:00–09:30", lớp cùng giờ giữ kiểu cũ. Lớp cũ (cột rỗng) chạy như trước. Kiểm chứng: unit `day-times.test.ts`, E2E `gio-hoc-phi.spec.ts` (đọc giờ từng buổi trong DB), kiểm 360, 375, 1440px không tràn ngang.
- [x] 38.2 Ngày khai giảng của lớp và ngày bắt đầu học của học sinh (2026-10-22). Form học sinh có "Ngày bắt đầu học *" ngay sau lớp, gợi ý ghi ngày khai giảng của lớp (buổi đầu tiên); khung thông tin lớp ghi học phí lớp, tổng buổi và ngày khai giảng.
- [x] 38.3 Học phí theo số buổi còn lại (2026-10-22). Cột `students.tuition_fee` (rỗng: theo học phí lớp). Học phí lớp ÷ số buổi không huỷ × số buổi từ ngày bắt đầu học, làm tròn 1.000đ (`proratedFee`). Form thêm học sinh tự điền số gợi ý cho đến khi người nhập tự sửa, có nút "Dùng số này". Công nợ ở Học sinh, Học phí, hồ sơ, nhắc học phí và bot Telegram dùng học phí riêng khi có. Kiểm chứng: unit, E2E (DB lưu đúng số, màn Học phí hiện đúng số).
- [x] 38.4 Mã học sinh 5 chữ số HS-00001 (2026-10-22). Mọi nơi hiển thị dùng `studentCode`; tìm kiếm ở Học sinh và Học phí nhận cả mã cũ HS-0012; đăng nhập học sinh theo mã (P28) đọc id nên nhận cả hai dạng. Kiểm chứng: unit, E2E tìm bằng mã cũ ra mã mới.

## P39. Xếp lịch dễ cho giáo vụ

Người dùng yêu cầu 2026-10-22: giáo vụ, quản trị tự tạo lớp và sắp lịch học phải dễ.

- [x] **39.1** Form tạo lớp: ô giờ kiểu 24 giờ (gõ "1830" thành "18:30", không còn "06:30 CH"), đổi giờ bắt đầu thì giờ kết thúc dời theo giữ độ dài ca, hiện độ dài ca; học phí hiện dấu chấm ngăn cách; chia bốn nhóm có tiêu đề. ✅ 2026-10-22: unit `schedule-input.test.ts`; E2E `xep-lich.spec`.
- [x] **39.2** Xem trước lịch khi tạo lớp (số buổi, ngày đầu, ngày cuối, vài buổi đầu) và chặn trùng giờ với lớp khác của cùng giáo viên hoặc cùng phòng trong cơ sở (`src/lib/queries/schedule-conflicts.ts`), báo gọn "đang dạy lớp X 09:00–11:00 các ngày …". ✅ 2026-10-22: E2E tạo lớp trùng bị chặn, đổi giờ thì tạo được.
- [x] **39.3** Màn Lịch học có nút "Thêm buổi" (học bù, học thêm): chọn lớp thì giáo viên, phòng điền sẵn; kiểm trùng ngay khi nhập; số buổi của lớp đánh lại theo ngày. Sửa một buổi cũng chặn trùng giáo viên, phòng. ✅ 2026-10-22: E2E thêm buổi bù, kiểm số buổi trong DB; ảnh 1440px và 390px.
- [x] **39.4** Xếp lại lịch lớp đã tạo (nút ở trang lớp và menu ⋯): đổi ngày khai giảng, tổng số buổi, ngày học, ca. Buổi đã học, đã huỷ giữ nguyên; buổi chưa học thay bằng lịch mới, có xem trước và chặn trùng (bỏ qua chính lớp). Tổng quan: ô Công nợ quá hạn chỉ cộng nợ đã quá hạn. ✅ 2026-10-22: E2E xep-lich (xếp lại 5 buổi, kiểm DB), gio-hoc-phi xanh; xem form ở 1440px và 390px không tràn.

## P40. Thao tác dễ cho giáo vụ, admin (rà soát 2026-10-22)

Rà soát theo luồng thật khi nhập lớp GS 02 (ESL Mầm Xanh). Mỗi mục làm cả web và điện thoại, kiểm 390px và 1440px.

- [x] **40.1** Ngày sinh không bắt buộc: cột `students.dob` cho phép trống (migration mới). Form thêm, sửa học sinh và file nhập đều để trống được; hồ sơ hiện "Chưa có ngày sinh". Không có ngày sinh thì coi là trẻ em khi xin đồng ý ghi âm. Nhập file: không có Mã HS và ngày sinh thì tìm học sinh cùng tên trong cùng lớp. ✅ 2026-10-22: migration 0024 (dob bỏ NOT NULL) đã áp dụng; unit import và consent (null ngày sinh cần trẻ đồng ý); E2E thêm học sinh không ngày sinh, DB lưu null; chạy thử file GS 02 gốc: 10 học sinh khớp theo tên trong lớp, 0 lỗi.
- [x] **40.2** Nhập file dễ hơn: ô SĐT phụ huynh có nhiều số thì lấy số đầu, số còn lại ghi vào ghi chú học sinh. Trợ giảng trùng giáo viên chủ nhiệm thì bỏ ô trợ giảng. Cả hai báo ở cột Ghi chú của bảng xem trước, không chặn nhập. ✅ 2026-10-22: unit 4 dạng ô hai số và trợ giảng trùng; chạy thử file gốc 0 lỗi, ghi chú hiện đúng dòng.
- [x] **40.3** Trang lớp có nút "Thêm học sinh": mở form thêm học sinh, chọn sẵn lớp đó. ✅ 2026-10-22: E2E xep-lich thêm học sinh từ trang lớp, lớp chọn sẵn; xem form ở 1440px.
- [x] **40.4** Học sinh mới không ghi ngày bắt đầu học thì lấy ngày buổi đầu của lớp nếu lớp chưa khai giảng, không lấy ngày nhập (nhập file và form). Hạn đóng học phí tính đúng theo ngày này. ✅ 2026-10-22: E2E ngày bắt đầu học = buổi đầu lớp chưa khai giảng (09/03/2027); nhập file dùng cùng quy tắc.
- [x] **40.5** Rà UI/UX năm màn Học sinh, Giáo viên, Phụ huynh, Lớp học, Lịch học (1440px, 390px). Sửa: Phụ huynh lọc theo cơ sở đang xem (trước hiện lẫn phụ huynh của cơ sở khác); Lịch tuần cuộn trong khung, hàng ngày dính trên, tự cuộn tới buổi sắp học hôm nay hoặc giờ đông lớp, tô cột hôm nay; bảng chọn khoảng ngày không đóng khi lưới tự cuộn; Giáo viên có cột Vai trò, tên lớp và SĐT là liên kết, SĐT nhóm 4-3-3; Học sinh 20 em mỗi trang, ô học phí riêng có dấu chấm. ✅ 2026-10-23: E2E nhóm read 50/50 (sau khi sửa lich.spec), students và catalog 12/12; không tràn ngang ở 390 và 1440px.
- [x] **40.6** Form học sinh chia ba nhóm (Học sinh, Lớp và học phí, Phụ huynh), họ tên lên đầu, trạng thái mặc định Đang học. Form thêm phụ huynh chọn được con ngay (không bắt buộc, kèm quan hệ). Thẻ phụ huynh trên điện thoại: "Gán học sinh" thành liên kết dưới danh sách con, hàng nút còn Sửa, Xoá, Telegram (DESIGN.md mục 74, 155 đã cập nhật). ✅ 2026-10-23: E2E `phu-huynh-con.spec.ts`; students, catalog 12/12; gio-hoc-phi, xep-lich, chuan, mobile 6/6; ảnh 1440px và 390px.
- [x] **40.7** Rà UI/UX các màn còn lại (Tổng quan, Điểm danh, Bài tập, Bài giảng, Lịch sử học tập, Học phí, Báo cáo, Tin nhắn, Cơ sở, Cài đặt, Nhập dữ liệu, Tài khoản) ở 1440px và 390px. Sửa: Điểm danh bỏ avatar, tên đủ không cắt, ba nút Có mặt/Trễ/Vắng có nền và viền rõ; Học phí cột Thao tác đủ rộng (nút không gãy dòng), tên học sinh là liên kết; Tài khoản dùng PageHeader chung, ô trống không còn dấu gạch; Lịch sử học tập bỏ "00:00" ở sự kiện chỉ có ngày, tên học sinh là liên kết; lịch tuần không tự cuộn đè khi người dùng đã cuộn. Nâng cấp Next.js 16.4.2. ✅ 2026-10-23: toàn bộ E2E 87/87, unit 273/273, build thành công; không tràn ngang ở 12 màn × 2 cỡ.

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
| D20 | Mỗi ngày học của lớp có giờ riêng, nhập bằng một dòng giờ cho mỗi ngày đã chọn (không có ô tích "giờ khác nhau"). Học sinh vào giữa khoá đóng học phí lớp ÷ số buổi × số buổi còn lại, làm tròn 1.000đ, người nhập sửa được. | Người dùng chốt ngày 2026-10-22 (P38). |
| D19 | Bảng hiện từ 768px khi có tối đa 6 cột, từ 1200px khi nhiều cột hơn. Dưới mốc đó hiện thẻ. | Phụ huynh và Giáo viên cần hiển thị nhiều dữ liệu hơn trên màn vừa. |

## Việc cần người dùng làm

1. Xác nhận tab thứ tư trên điện thoại (D5).
2. Đổi mật khẩu user `postgres`, hiện là `admin`, quá yếu cho dữ liệu thật. Đổi bằng `ALTER USER postgres WITH PASSWORD '...';` trong psql.
3. **Trước khi đưa lên máy chủ thật:** xoá đăng nhập nhanh theo vai trò (tạm thời): hàm `devQuickLoginAction` trong `src/app/dang-nhap/actions.ts`, nút trong `src/components/auth/LoginForm.tsx`, prop trong `src/app/dang-nhap/page.tsx`, và kịch bản E2E "đăng nhập nhanh" trong `e2e/auth.spec.ts`. Hàm đã tự tắt khi `NODE_ENV=production`, nhưng vẫn nên xoá.
4. Thêm giới hạn số lần đăng nhập sai trước khi dùng ngoài mạng nội bộ (xem `README.md`). Chức năng tự đổi mật khẩu đã có ở P30.
