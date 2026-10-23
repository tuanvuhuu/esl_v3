# Thiết kế: ESL Center

File này là nguồn chuẩn cho giao diện. Khi sửa giao diện, đọc file này trước. Cỡ chữ, màu và khoảng cách đều lấy từ biến CSS, không ghi số cố định.

## 1. Màu và giao diện sáng, tối

- Biến màu nằm trong `:root` (sáng) và `:root[data-theme="dark"]` (tối).
- Màu chủ đạo mặc định: vàng tươi `--primary #FFC933`, vàng đậm `--primary-deep #EDA400`. Màu tích cực `--accent #159E5E`. Bảng màu chế độ sáng dùng tông tươi (bão hoà cao) để nổi trên nền trắng; màu trạng thái (mint/lav/butter/blush) cũng bão hoà hơn, chữ `*-ink` giữ đủ tương phản.
- Nền trắng `--bg #FFFFFF` (chế độ sáng), chữ `--ink #2F2A1F`, chữ phụ `--ink-2 #4A4538` và `--muted #6E6755` (khoảng 5,6:1 trên nền trắng, đạt AA). Không ép `-webkit-font-smoothing: antialiased` để Windows dùng ClearType cho chữ nét. Thẻ `--surface` trắng, tách nền nhờ `shadow-card` (gồm viền 1px `--line` và bóng đổ). Dòng rê chuột `--row-hover #FBF8F1` (kem nhạt). Chế độ tối giữ nền `#17130E`.
- Màu chủ đề (accent): người dùng chọn được màu nhấn khác ngoài vàng mật — xanh lá, xanh dương, tím, hồng — qua menu Giao diện ở thanh trên. Mỗi màu đặt lại `--primary`, `--primary-deep`, `--primary-soft`, `--on-primary` qua `data-accent` trong `globals.css` (có bản sáng và tối). Mặc định là vàng mật (không có `data-accent`).
- Màu trạng thái (mint, lav, butter, blush) giữ nguyên, không đổi theo màu chủ đề.
- Bảng học sinh (máy tính): nhãn trạng thái và học phí giữ màu vì mang nghĩa. Bảng học sinh và phụ huynh không dùng avatar: mỗi thông tin một cột riêng. Dữ liệu bấm được mở trang hoặc hộp thoại (tên học sinh, số điện thoại gọi được, nút + Thêm) có chữ xanh dương gạch chân, không đậm, màu `--link`. Nhãn quan hệ (Bố, Mẹ, Người giám hộ) có màu `--relation` tím, chữ không đậm. Ô trống không có dấu gạch ngang; gợi ý như "Thêm email" hay "+ Thêm" chỉ hiện khi rê chuột hoặc bấm Tab vào ô. Thanh tiến độ (`ProgressBar`, mọi nơi dùng) tô theo mốc: dưới 25% đỏ nhạt (`blush-ink`), 25–49% vàng đất (`butter-ink`), 50–74% vàng (`primary-deep`), từ 75% xanh (`accent`). Chuyên cần chỉ đổi màu khi dưới 75%.
- Nhãn nhỏ (nhãn trạng thái, tiêu đề cột bảng, nhãn KPI) và số chuyên cần trong bảng dùng trọng lượng 400 (`font-normal`). Không dùng bold ở những chỗ này.
- Font: Be Vietnam Pro (`next/font/google`, có tiếng Việt, biến `--font-be-vietnam`). Chọn ngày 2026-10-14 vì chữ đậm và rõ hơn Plus Jakarta ở cỡ nhỏ. Cột "Chuyên cần" của bảng học sinh rộng 76px để không xuống dòng.
- Chế độ: sáng, tối, theo hệ thống. Lưu ở `localStorage` với khoá `esl-theme`; màu chủ đề ở khoá `esl-accent`. Cả hai được đặt trước khi trang vẽ (script trong `layout.tsx`) để không nháy.

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

- **Web (từ 768px):** ô tìm kiếm (phím `/`), bộ chọn cơ sở, chuông, nút giao diện (icon trơn có mũi tên, mở menu Sáng, Tối, Theo hệ thống), icon người dùng. Bộ chọn cơ sở là ô chung `SelectPanel` (`variant="bar"`): icon toà nhà, tên cơ sở từ 1200px, dưới 1200px chỉ có icon. Bảng có "Tất cả cơ sở" và từng cơ sở; chọn xong là mọi màn lọc theo cơ sở đó (mục 10). Ô tìm chỉ hiện chữ ở trang Học sinh (đọc từ `?q=`); sang trang khác thì ô trống, không giữ chữ cũ. Chuông thông báo hiện số việc cần chú ý theo quyền, cùng nguồn và cùng số với Cần chú ý ở Tổng quan. Bấm chuông mở bảng, bấm một việc để mở trang đó; bảng đóng khi bấm ra ngoài, nhấn Esc hoặc đổi trang.
  - Menu người dùng: tên và vai trò, Hồ sơ cá nhân (sắp có), Cài đặt (nếu có quyền), Đăng xuất. Không có mục giao diện.
- **Điện thoại:** logo E và tên, icon tìm kiếm, icon cơ sở (44px, bấm mở danh sách cơ sở), chuông, nút giao diện tròn 40px, icon người dùng.

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
| Lớp học | "Tạo lớp học" (chọn cơ sở, giáo viên chủ nhiệm, trợ giảng, giáo viên nước ngoài; mỗi ngày học một dòng giờ riêng; sinh sẵn các buổi học) | Web: ⋯ → Xem chi tiết, Sửa, Xoá. Điện thoại: nút có chữ trên thẻ. | Như Sửa. Bị chặn khi lớp còn học sinh hoặc đã có điểm danh. Mã lớp chỉ cần duy nhất trong một cơ sở. |
| Giáo viên | "Thêm giáo viên" (chọn vai trò: giáo viên, giáo viên nước ngoài hoặc trợ giảng; một hoặc nhiều cơ sở dạy) | Web: ⋯ → Sửa, Xoá. Điện thoại: nút có chữ trên thẻ. | Như Sửa. Bị chặn khi còn lớp đang dạy. |
| Phụ huynh | Web: "Thêm phụ huynh" ở hàng tìm kiếm, bên phải. Điện thoại: "Thêm mới" cạnh ô tìm. | Web: ⋯ → Gán học sinh, Sửa, Xoá. Điện thoại: liên kết "+ Gán học sinh" dưới danh sách con; Sửa, Xoá, Telegram cạnh nhau. | Xoá phụ huynh chỉ gỡ liên kết, học sinh vẫn được giữ. |
| Cơ sở | "Thêm cơ sở" (Hệ thống, cần quyền cài đặt) | Web: ⋯ → Sửa, Xoá. Điện thoại: nút có chữ trên thẻ. | Như Sửa. Bị chặn khi cơ sở còn lớp hoặc còn giáo viên dạy, và khi là cơ sở cuối cùng. |
| Tài khoản | "Mời thành viên" | Web: ⋯ → Sửa, Khoá hoặc Mở khoá, Xoá. Điện thoại: icon bút. | Web: ⋯ → Xoá. Điện thoại: icon thùng rác. Tài khoản quản trị bị vô hiệu hoá nút xoá. |
| Bài tập | "Thêm bài tập" (trong lớp đang xem); trong bài: "Soạn câu hỏi" | Web: ⋯ → Chấm điểm, Sửa, Xoá. Điện thoại: nút có chữ. | Như Sửa, kèm bài nộp, có xác nhận. |
| Buổi học | Sinh tự động khi tạo lớp | Web và điện thoại: bấm buổi trên lịch, sửa ngày, giờ, giáo viên, phòng, chủ đề. | Không xoá. Huỷ buổi bắt buộc có lý do, khôi phục được. |
| Học phí | Không có, hoá đơn tự sinh theo lớp | "Ghi thu" trên hoá đơn còn nợ | Không có |
| Điểm danh, Báo cáo, Cài đặt | Không có bản ghi để thêm hay xoá | | |

**Quy tắc chung:**

- Xoá luôn qua hộp xác nhận. Nút Huỷ được focus mặc định. Khi bị chặn, hộp chỉ có nút "Đã hiểu" và nêu lý do.
- Thẻ lớp và giáo viên trên web dùng nút ⋯, không còn icon Sửa và Xoá ở chân thẻ (mục này đã đóng).
- Form thêm và sửa: lỗi hiện ngay trong ô, ô sai có viền đỏ. Form giữ dữ liệu đã nhập khi có lỗi (xem `docs/ERROR-LOG.md`, E-028).
- Nút trong dòng không được mở hồ sơ. Các phần tử có `[data-act]`, `.more-btn` hoặc `.row-menu` bị bỏ qua khi click ở bảng.
- Nút ⋯ (`.more-btn`) và danh sách (`.row-menu`) đóng khi chọn một mục, bấm ra ngoài, hoặc nhấn Esc.

## 8. Chuẩn kích thước và bộ thành phần dùng chung

Chuẩn lấy từ trang `/hoc-sinh` (quyết định D16). Mọi trang dùng đúng chuẩn này, không viết kích thước riêng trong từng màn. Kích thước đọc từ token trong `globals.css`, thành phần dùng chung nằm trong `src/components/ui`.

**Token** (`:root` trong `globals.css`):

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--ctl-h` | 32px | nút chữ, ô nhập, ô chọn, chip, nút phân trang, trên máy tính |
| `--ctl-h-touch` | 44px | ô và nút trên điện thoại |
| `--chip-h-touch` | 36px | chip trên điện thoại |
| `--icon-h` | 36px | nút icon và nút ⋯ trên máy tính |
| `--icon-h-touch` | 44px | nút icon trên điện thoại |
| `--radius-ctl` | 12px | nút, ô nhập, ô chọn, nhãn nền |
| `--radius-panel` | 24px | thẻ, bảng, khung, hộp thoại |
| `--cal-hour-h` | 96px | một giờ trên lưới lịch tuần, đủ chỗ cho giờ, lớp, giáo viên và trạng thái khi hai buổi trùng giờ |

**Thành phần dùng chung** (`src/components/ui`):

- `Btn` (`variant`: `primary` | `ghost` | `danger`, `block`): nút chữ, chữ đậm, cao `--ctl-h`. Hằng số `BTN_BASE`, `BTN_PRIMARY`, `BTN_GHOST`, `BTN_DANGER` dùng khi cần gắn class vào thẻ liên kết.
- `ActIcon` (`danger`): nút chỉ có icon, 36px. `RowMenu`: nút ⋯ cùng cỡ, mở menu có icon. Menu vẽ trên body nên không bị khung bảng cắt; mở lên nếu thiếu chỗ bên dưới; đóng khi cuộn hoặc đổi cỡ màn hình.
- `Chip` (`selected`, `count`, `href`, `tab`), `ChipGroup` (`tabs`), `Tag` (nhãn dữ liệu có liên kết).
- `TextInput`, `CTL_FIELD`: ô nhập cùng khung.
- Ô chọn co theo chữ (prop `auto`): dùng cho ô chọn trên thanh lọc, như chọn lớp ở Bài tập và Điểm danh. Ô không có chiều rộng tối thiểu và không kéo rộng theo khung. Ô trong form dùng `block` (rộng hết khung). Ô không `block` và không `auto` co theo nội dung, tối thiểu 10rem.
- `SelectPanel` (`SelectPanel.tsx`): mọi ô chọn (combo) trong app, không dùng thẻ `<select>` nữa. Bấm mở bảng có ô tìm (khi hơn sáu lựa chọn) và danh sách có dấu chọn. Chọn một (mặc định) thì bảng đóng sau khi chọn; `multiple` cho chọn nhiều, mỗi mục có ô đánh dấu, bảng vẫn mở. Có `name` để gửi form qua ô ẩn; `defaultValue` (ô tự giữ) hoặc `value` + `onChange` (ô do bên ngoài điều khiển). Phím: mũi tên lên xuống, Enter chọn, Esc đóng và không đóng hộp thoại cha. Bộ lọc danh sách (lớp, giáo viên, học phí, loại lịch sử, vai trò, trạng thái) dùng `multiple`: trên URL viết `cls=1,2`, danh sách rỗng nghĩa là không lọc. Ô điều hướng (chọn lớp xem điểm danh, bài tập) và form vẫn chọn một. Ô hiện giá trị ngay khi chọn (`useOptimistic`), nên chọn liên tiếp không mất mục. `variant="bar"`: nút gọn trên thanh trên cùng, 36px (44px trên điện thoại), chỉ hiện tên từ 1200px, bảng căn theo mép phải. Tên đọc được của nút là `Cơ sở: <tên đang chọn>`.
- `Field`, `inputClass`, `textareaClass`, `FORM_BTN_CANCEL`, `FORM_BTN_SUBMIT` (`Field.tsx`): form dùng đúng các thành phần trên.
- `FormFooter` (`Field.tsx`): hàng nút cuối form (phụ bên trái, chính bên phải, điện thoại hai nút bằng nhau). `FileInput` (`Field.tsx`): ô chọn tệp, loại tệp lấy từ `src/lib/upload-types.ts` (`UPLOAD_ACCEPT`, `AUDIO_ACCEPT`).
- `Alert` (`primitives.tsx`): thông báo lỗi (`role=alert`) hoặc đã xong (`tone="ok"`, `role=status`). Khối đặt đầu form, `inline` đặt dưới ô hoặc trong dòng. `Notice` (`surfaces.tsx`): ghi chú nền nhạt (đoạn đọc, mô tả, thông báo trống).
- `SubmissionPill` (`components/assignments`): trạng thái nộp bài (chưa nộp, đã nộp, đã chấm), dùng ở chấm bài và khu học sinh.
- `Pagination`: "Trang x / y" và ô số cùng cỡ `--ctl-h`.
- `DataGrid` (`datagrid.tsx`): bảng dữ liệu. Tiêu đề cột 400, dính khi cuộn, dòng cao 44px, rê chuột có nền. Bảng hiện từ mốc `from` (`md` = 768px khi ít cột, `xl` = 1200px khi nhiều cột, quyết định D17). Dưới mốc đó hiện thẻ (`card`) hoặc không hiện gì khi không truyền `card`. Thân bảng có thể `fill` để tự cuộn trong màn hình, tiêu đề cột dính khi cuộn. Bảng không `fill` cuộn ngang trong khung khi thiếu chỗ, để các cột ở mép phải (nút ⋯) không bị cắt. Bảng có `stickyEnd` (Phụ huynh) thì cột cuối (Thao tác) dính ở mép phải khi cuộn ngang, cách mép 16px; dòng có độ rộng tối thiểu bằng tổng cột để ô dính có chỗ bám.
- `Panel` (khung lớn, có tiêu đề, `padded={false}` cho bảng và ô trống), `Card` (thẻ trong lưới, `as="section"` khi cần tên vùng), `EmptyPanel` (trang trống): đều bo 24px, bóng có viền mảnh (`--shadow`), không có viền riêng.
- `PageHeader` (`titleOnTopbar={false}` khi trang không có thanh trên cùng, như khu học sinh).
- `Modal`, `Sheet`, `ConfirmDialog`: hộp thoại. Đóng bằng `ActIcon`, nút dưới dùng `Btn`.

**Quy tắc:**

- Lớp hiển thị theo breakpoint (`min-[768px]:block`, `min-[1200px]:hidden`...) phải viết nguyên văn trong mã nguồn. Không ghép chuỗi lúc chạy (`${bp}:block`), vì Tailwind không tạo CSS cho lớp không thấy nguyên văn. Lỗi này đã gặp, xem E-045.
- Nhãn không đậm: nhãn trạng thái, tiêu đề cột, nhãn form, số trong bảng dùng 400. Tiêu đề trang và giá trị KPI vẫn đậm.
- Không viết lại khung, thông báo, chân form, ô chọn tệp, nhãn trạng thái, nút lọc hay thẻ trong một màn. Dùng thành phần chung ở trên. Muốn khác thì đổi thành phần chung, không đổi riêng một màn.
- Nút chữ đậm (`font-bold`), chip và ô chọn 600, ô nhập và nội dung 400.
- Ô nhập trên điện thoại giữ 16px (`--fs-input`).
- Kiểm tra tự động: `e2e/chuan.spec.ts` đo mọi nút, ô, chip cao đúng chuẩn, khung có bóng bo 24px, tiêu đề cột và nhãn không đậm, ở 1440px và 390px trên 16 trang. Không đo thẻ dữ liệu (`data-card`) và liên kết trong ô (`data-link`): tên học sinh có thể xuống dòng nên cao theo chữ.

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
- **Lịch học:** lịch theo tuần. Web: bảng bảy cột theo ngày. Lưới rộng tối thiểu 1100px, dưới mốc đó cuộn ngang trong khung. Khối buổi luôn hiện đủ giờ, lớp, giáo viên, phòng và trạng thái (chấm màu kèm chữ). Buổi trùng giờ chia làn và chữ xuống dòng, không cắt. Điện thoại: danh sách dọc theo ngày. Lọc theo nhiều lớp và nhiều giáo viên (URL `cls=1,2`). Thanh điều hướng gộp một chỗ (`RangeNav`): nút `<` bên trái, nút khoảng ngày ở giữa, nút `>` bên phải; không có nút Tuần này. Bấm ngày đầu rồi ngày cuối để chọn khoảng; khoảng đang xem hiện trên nút (ví dụ 19–25/10), ngày trong khoảng tô nhạt, hai đầu tô đậm. Lưới hiện đúng các ngày trong khoảng (tối đa 7 cột); khoảng dài hơn một tuần hiện danh sách theo ngày. `<` và `>` lùi, tiến đúng độ dài khoảng và giữ bộ lọc. Ngày và khoảng nằm trên URL (`w`, `to`). Buổi huỷ có gạch ngang và lý do. Buổi đã học chỉ xem được.
- **Điểm danh:** chọn lớp và buổi. Web: bảng với ba nút trạng thái. Điện thoại: thẻ với ba nút bằng nhau. "Có mặt cả lớp". Chỉ điểm danh được buổi đã bắt đầu. Lần lưu đầu tiên chuyển buổi sang đã học và cộng số buổi cho học sinh.
- **Học phí:** hoá đơn theo học sinh. Lọc đã đóng, còn nợ, chưa đóng, quá hạn. Hạn đóng là ngày đến hạn trong Cài đặt, tính cho tháng sau tháng khai giảng. Ghi thu không vượt số còn nợ. Nhắc đóng ghi vào nhật ký (chưa gửi tin nhắn).
- **Báo cáo doanh thu:** tổng và số khoản thu của tháng, biểu đồ sáu tháng gần nhất, bảng theo lớp. Tháng nằm trên URL (`?m=`).
- **Cài đặt:** thông tin trung tâm, quy định học phí (ngày đến hạn 1–28, phí trễ hạn), thông báo. Lưu một lần cho cả ba nhóm.
- **Bài tập:** chọn lớp, danh sách bài theo lớp có số đã nộp và cờ quá hạn. Bài chưa có câu: chấm điểm trên web là bảng nhập nhanh, điện thoại là từng học sinh một với nút "Đã nộp" và ô điểm. Bài có câu hỏi (P22): nút "Soạn câu hỏi" thêm câu với kỹ năng (nghe, nói, đọc, viết), loại (trắc nghiệm tự chấm, trả lời viết, nộp tệp), điểm, đề, đoạn đọc và âm thanh. Điểm tối đa của bài là tổng điểm các câu. Bảng chấm hiện tổng điểm, trạng thái và điểm theo kỹ năng; "Chấm bài" mở từng câu của học sinh, chấm điểm và nhận xét. Tệp lưu trên ổ đĩa máy chủ (`storage/uploads`), tải qua `/api/files/[id]` cần quyền xem học sinh.
- **Lịch sử học tập:** gộp từ điểm danh (vắng, trễ), bài đã chấm, khoản thu, sự kiện học tập và đổi lớp. Lọc theo lớp và loại trên URL.
- **Phụ huynh:** mỗi phụ huynh một dòng. Sửa tại ô (từ 1200px, khi có quyền quản lý): bấm tên, email, số điện thoại hoặc ghi chú để sửa tại chỗ. Enter hoặc Ctrl+Enter (ghi chú) lưu, Esc huỷ, rời ô cũng lưu. Lỗi hiện ngay dưới ô và ô vẫn mở. Bấm tên học sinh để mở thẻ sửa: đổi quan hệ (lưu ngay), đặt liên hệ chính, hoặc gỡ liên kết (có xác nhận). Ô học sinh trống đầu tiên có "+ Thêm" để gán học sinh; chữ này hiện khi rê chuột hoặc bấm Tab vào ô, và bấm vào ô là mở gán học sinh. Trên bảng (từ 1200px), mỗi học sinh một cột: Học sinh 1, Học sinh 2, … Số cột theo phụ huynh có nhiều con nhất, tối đa 4. Ô dư ghi "+N học sinh khác". Mỗi ô: tên đủ, không đậm, xuống dòng khi dài (xanh gạch chân; bấm mở thẻ sửa, liên kết tới hồ sơ nằm trong thẻ), quan hệ màu tím, và dấu tích nếu là liên hệ chính. Dưới 1200px: thẻ không avatar (tên, số điện thoại gọi được, email, danh sách học sinh căn thành cột với tên liên kết tới hồ sơ, ghi chú), liên kết "+ Gán học sinh" ngay dưới danh sách con (đổi ngày 2026-10-23 cho thẻ gọn), hàng nút Sửa, Xoá, Telegram cạnh nhau. Form thêm phụ huynh chọn được con ngay (không bắt buộc). Gán học sinh có sẵn từ menu: chọn nhiều học sinh cùng lúc (có ô tìm), chọn quan hệ, tuỳ chọn đặt liên hệ chính. Học sinh đã liên kết được bỏ qua và báo lại. Học sinh lấy từ mọi cơ sở, vì phụ huynh dùng chung. Bảng chia trang 10 người mỗi trang. Phân trang nằm dưới bảng và ẩn cùng mốc với bảng. Thân bảng cuộn trong khung và tiêu đề dính. Các cột: Họ tên, Email, Số điện thoại, Học sinh 1 đến N, Ghi chú, Thao tác; không có avatar. Với bốn cột học sinh, bảng vừa khít ở 1440px. Từ 1200px đến dưới 1440px bảng cuộn ngang trong khung, nút ⋯ nằm ở cuối bảng. Máy tính bảng (768–1199px) hiện thẻ theo trang, phân trang dưới thẻ. Điện thoại hiện thẻ, bấm "Xem thêm" để tiếp (10 người mỗi lần).
- **Đăng nhập:** một form email và mật khẩu, căn giữa. Lỗi chung khi sai, không cho biết email có tồn tại hay không.
- **Lớp học (ba vị trí, P20):** mỗi lớp có giáo viên chủ nhiệm (vai trò Giáo viên), trợ giảng và giáo viên nước ngoài; đủ ba mới lưu được lớp. Người được chọn đúng vai trò và dạy ở cơ sở của lớp. Thẻ lớp và trang chi tiết ghi đủ ba vị trí. Đổi vai trò của một người bị chặn khi còn lớp giữ vị trí của vai trò cũ. Buổi học chỉ do giáo viên chủ nhiệm hoặc giáo viên nước ngoài dạy.
- **Giờ học từng ngày (P38):** chọn ngày học nào thì ngày đó tự có một dòng "T3 [bắt đầu] – [kết thúc]" (không có ô tích "giờ khác nhau"). Dòng chưa sửa đi theo giờ vừa nhập, nên lớp cùng giờ chỉ nhập một lần. Khi các ngày khác giờ, ô ghi chú dưới các dòng nêu lại từng ngày để người nhập kiểm. Giờ kết thúc không sau giờ bắt đầu thì báo ngay dưới dòng. Máy tính: hai dòng một hàng; điện thoại: mỗi dòng một hàng, ô giờ chia đều, vừa 360px. Form sửa lớp có cùng các dòng (không thêm bớt ngày); đổi giờ thì các buổi sắp tới của ngày đó dời giờ. Mô tả lịch: "T2 · T4 · T6 · 18:30–20:30" khi cùng giờ, "T3 18:00–19:30 · T7 08:00–09:30" khi khác giờ.
- **Học sinh vào giữa khoá (P38):** form học sinh có "Ngày bắt đầu học" ngay sau lớp (gợi ý ghi ngày khai giảng của lớp) và "Học phí của học sinh". Khi còn ít buổi hơn tổng buổi, khung vàng ghi "Từ dd/mm còn x/y buổi: học phí ÷ y × x ≈ số", có nút "Dùng số này". Thêm mới thì ô tự điền số gợi ý cho đến khi người nhập tự sửa. Mã học sinh hiển thị HS-00001.
- **Cơ sở (1 cơ sở - nhiều lớp):** mỗi lớp thuộc đúng một cơ sở. Học sinh, buổi học, điểm danh, bài tập, học phí và lịch sử học tập đi theo lớp. Cơ sở đang xem chọn ở thanh trên cùng, lưu trong cookie của trình duyệt, mặc định là cơ sở đầu tiên. Cơ sở đang xem lọc: Tổng quan, chuông, số trên menu, Học sinh, Lớp học, Lịch học, Điểm danh, Bài tập, Lịch sử học tập, Học phí, Báo cáo doanh thu. Giáo viên dạy một hoặc nhiều cơ sở (liên kết nhiều - nhiều): danh sách giáo viên lọc theo cơ sở đang xem, form lớp chỉ cho chọn giáo viên dạy ở cơ sở của lớp, đổi cơ sở của lớp thì bỏ giáo viên không dạy ở cơ sở mới. Phụ huynh, tài khoản và cài đặt dùng chung. Trợ giảng (vai trò của nhân sự, P20) và bài giảng (chưa xây dựng) cũng có thể thuộc một hoặc nhiều cơ sở, theo cùng kiểu liên kết nhiều - nhiều (PLAN D7). "Tất cả cơ sở" thì không lọc. Form tạo và sửa lớp có ô Cơ sở. Form thêm và sửa học sinh đặt Cơ sở và Lớp học lên đầu form, mỗi ô một cột, rồi đến thông tin học sinh. Ô Lớp học chỉ hiện lớp của cơ sở đã chọn, mặc định là cơ sở đang xem. Đổi cơ sở thì bỏ lớp không thuộc cơ sở mới. Màn Cơ sở nằm ở Hệ thống, cần quyền cài đặt.

## 11. Việc còn mở

- Tab thứ tư trên điện thoại là Điểm danh. Cần người dùng xác nhận (D5 trong `PLAN.md`).
- Thông báo (chuông) chưa có nội dung. Chưa có kênh gửi tin nhắn hay email.
- Hồ sơ cá nhân trong menu người dùng chưa có màn hình.
- Dữ liệu là PostgreSQL. Dữ liệu mẫu nạp bằng `npm run db:seed`.
