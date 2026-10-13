# Thiết kế: ESL Center

File này là nguồn chuẩn cho giao diện. Khi sửa giao diện, đọc file này trước. Cỡ chữ, màu và khoảng cách đều lấy từ biến CSS, không ghi số cố định.

## 1. Màu và giao diện sáng, tối

- Biến màu nằm trong `:root` (sáng) và `:root[data-theme="dark"]` (tối).
- Màu chủ đạo: vàng mật `--primary #FFD976`, vàng đậm `--primary-deep #F0B73A`.
- Nền kem `--bg #FBF8F1`, chữ `--ink #2F2A1F`, chữ phụ `--muted #958D7C`.
- Không dùng cam, xanh dương, hồng hay tím.
- Font: Plus Jakarta Sans.
- Chế độ: sáng, tối, theo hệ thống. Lưu ở `localStorage` với khoá `esl-theme`.

## 2. Thang cỡ chữ `--fs-*`

| Biến | Máy tính (1200–1679) | Máy tính rộng (≥1680) | Máy tính bảng (768–1199) | Điện thoại (<768) |
|---|---|---|---|---|
| `--fs-2xs` | 10 | 11 | 10 | 10 |
| `--fs-xs` | 11 | 12 | 11 | 11 |
| `--fs-sm` | 12 | 13 | 12 | 12 |
| `--fs-base` | 13 | 14 | 13 | 13 |
| `--fs-md` | 14 | 15 | 14 | 14 |
| `--fs-lg` | 15 | 16 | 15 | 15 |
| `--fs-xl` | 16 | 18 | 16 | 16 |
| `--fs-2xl` | 20 | 22 | 20 | 18 |
| `--fs-3xl` | 24 | 28 | 24 | 20 |
| `--fs-h1` | 26 | 30 | 26 | 22 |
| `--fs-display` | 56 | 60 | 44 | 40 |
| `--fs-input` | 15 | 16 | 15 | 16 |

- Quy tắc: không viết `font-size: 13px`, luôn dùng biến (token `text-base`, `text-2xs`...).
- Ô nhập trên điện thoại giữ 16px để iOS không tự phóng to khi bấm vào. Đây là ngoại lệ có chủ đích.
- Muốn đổi cỡ chữ điện thoại thì chỉ sửa khối `@media (max-width: 767px)` trong `:root`.

## 3. Khung màn hình

- **Từ 1200px:** thanh bên cố định 208px. Thanh trên và menu đứng yên, nội dung cuộn trong khung chính (đổi trang thì về đầu). Bảng học sinh là 7 cột, vừa màn hình: thân bảng tự cuộn, tiêu đề cột dính, phân trang luôn thấy.
- **768–1199px:** menu thành ngăn kéo (nút ≡). Học sinh là thẻ.
- **Dưới 768px:** thanh tab dưới đáy, học sinh là thẻ, bộ lọc là bảng trượt từ đáy (`Sheet`), hồ sơ và form mở toàn màn hình.
- Hồ sơ học sinh trên máy tính mở trong ngăn kéo bên phải (`?h=<id>`), danh sách vẫn hiện bên trái. Điện thoại mở trang riêng (`/hoc-sinh/<id>`).
- Menu bên trái (máy tính và ngăn kéo) có ô "Tìm kiếm chức năng" ở đầu. Gõ không dấu vẫn ra mục có dấu, và chỉ hiện các mục khớp. Mục đang mở có nền vàng nhạt và vạch vàng đậm bên trái. Thanh cuộn của menu chỉ hiện khi rê chuột vào (class `scroll-quiet`).

## 4. Thanh trên cùng

- **Web (từ 768px):** ô tìm kiếm (phím `/`), chuông, nút giao diện (icon trơn có mũi tên, mở menu Sáng, Tối, Theo hệ thống), icon người dùng.
  - Menu người dùng: tên và vai trò, Hồ sơ cá nhân (sắp có), Cài đặt (nếu có quyền), Đăng xuất. Không có mục giao diện.
- **Điện thoại:** logo E và tên, icon tìm kiếm, chuông, nút giao diện tròn 40px, icon người dùng.

## 5. Điều hướng điện thoại

- Thanh tab: Tổng quan · Học sinh · [nút tròn] · Điểm danh · Cài đặt. Tab nào không có quyền thì ẩn.
- Nút tròn có icon lưới, mở sheet "Tính năng" với các nhóm icon. Mỗi icon có huy hiệu số việc chờ (từ DB). Chạm vào một icon sẽ mở màn tương ứng. Có liên kết "Xem tất cả" tới trang Tính năng.
- Tab Điểm danh thay cho tab Tính năng. Đây là lựa chọn tạm khi chưa có chỉ đạo, cần người dùng xác nhận.

## 6. Màn Học sinh và hồ sơ

- Hàng đầu điện thoại: ô tìm kiếm (placeholder "Tìm học sinh"), nút Bộ lọc (mở `Sheet`), nút Thêm mới. Cả ba cao 40px, cùng một hàng.
- Mỗi học sinh là một thẻ theo lưới: tên và trạng thái, lớp, tiến độ, chuyên cần và học phí, hàng nút.
- Hàng nút gồm Xem, Sửa, Xoá: ba nút đều nhau, có icon và chữ, cao 44px.
- Máy tính: dòng bảng có nút ⋯ (Xem hồ sơ, Sửa, Xoá). Tên học sinh cũng mở hồ sơ trong ngăn kéo.
- Hồ sơ có ba tab, đổi bằng `?tab=`: **Tổng quan** (khoá học, học phí và lịch sử thu, chuyên cần, bài tập, liên hệ chính, ghi chú), **Phụ huynh** (gọi, đặt liên hệ chính, gỡ liên kết có xác nhận, thêm phụ huynh), **Học tập** (dòng thời gian, thêm ghi chú).
- Hồ sơ **không có Sửa hay Xoá**. Chân hồ sơ chỉ có Nhắc học phí.

## 7. Thêm, sửa, xoá theo từng màn

| Màn | Thêm | Sửa | Xoá |
|---|---|---|---|
| Học sinh | Web: "Thêm học sinh" ở đầu trang. Điện thoại: "Thêm mới" cạnh Bộ lọc. | Web: ⋯ → Xem hồ sơ, Sửa, Xoá. Điện thoại: nút có chữ trên thẻ. | Như Sửa. |
| Lớp học | "Tạo lớp học" (sinh sẵn các buổi học) | Web: ⋯ → Xem chi tiết, Sửa, Xoá. Điện thoại: nút có chữ trên thẻ. | Như Sửa. Bị chặn khi lớp còn học sinh hoặc đã có điểm danh. |
| Giáo viên | "Thêm giáo viên" | Web: ⋯ → Sửa, Xoá. Điện thoại: nút có chữ trên thẻ. | Như Sửa. Bị chặn khi còn lớp đang dạy. |
| Phụ huynh | "Thêm phụ huynh" | Web: ⋯ → Sửa, Xoá. Điện thoại: nút có chữ trên thẻ. | Xoá phụ huynh chỉ gỡ liên kết, học sinh vẫn được giữ. |
| Tài khoản | "Mời thành viên" | Web: ⋯ → Sửa, Khoá hoặc Mở khoá, Xoá. Điện thoại: icon bút. | Web: ⋯ → Xoá. Điện thoại: icon thùng rác. Tài khoản quản trị bị vô hiệu hoá nút xoá. |
| Bài tập | "Thêm bài tập" (trong lớp đang xem) | Web: ⋯ → Chấm điểm, Sửa, Xoá. Điện thoại: nút có chữ. | Như Sửa, kèm bài nộp, có xác nhận. |
| Buổi học | Sinh tự động khi tạo lớp | Web và điện thoại: bấm buổi trên lịch, sửa ngày, giờ, giáo viên, phòng, chủ đề. | Không xoá. Huỷ buổi bắt buộc có lý do, khôi phục được. |
| Học phí | Không có, hoá đơn tự sinh theo lớp | "Ghi thu" trên hoá đơn còn nợ | Không có |
| Điểm danh, Báo cáo, Cài đặt | Không có bản ghi để thêm hay xoá | | |

**Quy tắc chung:**

- Xoá luôn qua hộp xác nhận. Nút Huỷ được focus mặc định. Khi bị chặn, hộp chỉ có nút "Đã hiểu" và nêu lý do.
- Thẻ lớp và giáo viên trên web dùng nút ⋯, không còn icon Sửa và Xoá ở chân thẻ (mục này đã đóng).
- Form thêm và sửa: lỗi hiện ngay trong ô, ô sai có viền đỏ. Form giữ dữ liệu đã nhập khi có lỗi (xem `docs/ERROR-LOG.md`, E-028).
- Nút trong dòng không được mở hồ sơ. Các phần tử có `[data-act]`, `.more-btn` hoặc `.row-menu` bị bỏ qua khi click ở bảng.
- Nút ⋯ (`.more-btn`) và danh sách (`.row-menu`) đóng khi chọn một mục, bấm ra ngoài, hoặc nhấn Esc.

## 8. Nút và kích thước

- `.btn` (thành phần `Btn`): cao 40px trên web, 44px trên điện thoại.
  - `primary`: nền vàng.
  - `ghost`: viền.
  - `danger`: viền đỏ nhạt.
- `.act` (thành phần `ActIcon`): 38px trên web, 44px trên điện thoại. Icon xoá luôn có viền đỏ nhạt.
- `.more-btn`: 38px, chỉ hiện trên web.
- Nút Thêm mới và Bộ lọc trên điện thoại: 40px.

## 9. Màn Tài khoản & quyền

- Chỉ người có quyền `accounts.manage` mới vào được. Người khác thấy màn báo không có quyền.
- Ba tab: Người dùng, Phân quyền, Nhật ký. Chọn tab bằng `?tab=`.
- Người dùng, web (từ 768px): bảng có cột Thành viên, Vai trò, Liên kết, Đăng nhập gần nhất, Trạng thái, và nút ⋯. Cột đăng nhập hiện "Chưa đăng nhập" khi tài khoản chưa đăng nhập lần nào.
- Người dùng, điện thoại: thẻ có tên, email, vai trò, tên giáo viên liên kết, và hai icon Sửa, Xoá.
- Phân quyền, web: ma trận 4 vai trò × 13 quyền, mỗi ô là một ô đánh dấu. Ô `accounts.manage` và `settings.manage` của quản trị bị khoá. Chỉ quản trị được đổi ma trận, người khác chỉ xem.
- Phân quyền, điện thoại: chọn vai trò ở trên, rồi bật tắt từng quyền bằng công tắc.
- Nhật ký, web: bảng Thời điểm, Thao tác, Nội dung, Người thực hiện. Nội dung xuống dòng, không cắt chữ. Điện thoại: danh sách.

## 10. Các màn khác

- **Tổng quan:** bốn thẻ số liệu (đang học, học thử, chuyên cần 30 ngày, công nợ quá hạn hoặc sắp hết buổi), mục "Cần chú ý" (công nợ quá hạn, vắng từ hai buổi trở lên trong 7 ngày, bài tập quá hạn), buổi học hôm nay, lớp đang học. Mỗi mục chỉ hiện khi có quyền.
- **Tính năng:** lưới mọi màn hình theo nhóm, có huy hiệu đếm số việc chờ. Mục không có quyền thì ẩn.
- **Lịch học:** lịch theo tuần. Web: bảng bảy cột theo ngày, cuộn ngang trong khung khi màn hẹp. Điện thoại: danh sách dọc theo ngày. Lọc theo lớp và giáo viên. Buổi huỷ có gạch ngang và lý do. Buổi đã học chỉ xem được.
- **Điểm danh:** chọn lớp và buổi. Web: bảng với ba nút trạng thái. Điện thoại: thẻ với ba nút bằng nhau. "Có mặt cả lớp". Chỉ điểm danh được buổi đã bắt đầu. Lần lưu đầu tiên chuyển buổi sang đã học và cộng số buổi cho học sinh.
- **Học phí:** hoá đơn theo học sinh. Lọc đã đóng, còn nợ, chưa đóng, quá hạn. Hạn đóng là ngày đến hạn trong Cài đặt, tính cho tháng sau tháng khai giảng. Ghi thu không vượt số còn nợ. Nhắc đóng ghi vào nhật ký (chưa gửi tin nhắn).
- **Báo cáo doanh thu:** tổng và số khoản thu của tháng, biểu đồ sáu tháng gần nhất, bảng theo lớp. Tháng nằm trên URL (`?m=`).
- **Cài đặt:** thông tin trung tâm, quy định học phí (ngày đến hạn 1–28, phí trễ hạn), thông báo. Lưu một lần cho cả ba nhóm.
- **Bài tập:** chọn lớp, danh sách bài theo lớp có số đã nộp và cờ quá hạn. Chấm điểm: web là bảng nhập nhanh, điện thoại là từng học sinh một với nút "Đã nộp" và ô điểm.
- **Lịch sử học tập:** gộp từ điểm danh (vắng, trễ), bài đã chấm, khoản thu, sự kiện học tập và đổi lớp. Lọc theo lớp và loại trên URL.
- **Đăng nhập:** một form email và mật khẩu, căn giữa. Lỗi chung khi sai, không cho biết email có tồn tại hay không.

## 11. Việc còn mở

- Tab thứ tư trên điện thoại là Điểm danh. Cần người dùng xác nhận (D5 trong `PLAN.md`).
- Thông báo (chuông) chưa có nội dung. Chưa có kênh gửi tin nhắn hay email.
- Hồ sơ cá nhân trong menu người dùng chưa có màn hình.
- Dữ liệu là PostgreSQL. Dữ liệu mẫu nạp bằng `npm run db:seed`.
