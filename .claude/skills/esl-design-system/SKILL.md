---
name: esl-design-system
description: Dùng khi viết hoặc sửa giao diện của ESL Center (màu, cỡ chữ, nút, thẻ, bảng, form, menu, khung màn hình sáng tối). Áp dụng token và các quy tắc thao tác đã chốt trong docs/DESIGN.md.
---

# Thiết kế giao diện ESL Center

Nguồn chuẩn là `docs/DESIGN.md`. Skill này tóm tắt những điều phải làm đúng khi viết UI.

## 1. Token, không số cố định

- Màu, cỡ chữ, khoảng cách lấy từ biến CSS trong `src/app/globals.css`.
- Cỡ chữ: `--fs-2xs`, `--fs-xs`, `--fs-sm`, `--fs-base`, `--fs-md`, `--fs-lg`, `--fs-xl`, `--fs-2xl`, `--fs-3xl`, `--fs-h1`, `--fs-display`, `--fs-input`.
- Điện thoại (dưới 768px) đổi giá trị token ở một chỗ. Không ghi đè từng selector.
- Ô nhập điện thoại luôn 16px (`--fs-input`).

## 2. Khung màn hình

- 1200px trở lên: sidebar cố định, bảng học sinh 7 cột.
- 768 đến 1199px: menu là ngăn kéo (nút ≡), danh sách học sinh 2 dòng.
- Dưới 768px: tab bar dưới đáy, thẻ học sinh, bộ lọc là sheet, hồ sơ và form toàn màn hình.

## 3. Thanh trên cùng

- Web: tìm kiếm (phím `/`), chuông, nút giao diện (icon trơn có mũi tên, mở menu Sáng, Tối, Theo hệ thống), icon người dùng.
- Menu người dùng không có mục giao diện.
- Điện thoại: logo, icon tìm kiếm, chuông, nút giao diện tròn 40px, icon người dùng.

## 4. Thao tác thêm, sửa, xoá

| Vị trí | Quy tắc |
|---|---|
| Dòng bảng học sinh (web) | Một nút ⋯ mở menu: Xem hồ sơ, Sửa, Xoá |
| Dòng tài khoản (web) | Một nút ⋯ mở menu: Sửa, Xoá |
| Thẻ học sinh (điện thoại) | Hàng 3 nút có chữ: Xem, Sửa, Xoá, đều nhau |
| Dòng tài khoản (điện thoại) | Cụm icon Sửa và Xoá |
| Chân thẻ lớp và giáo viên | Nút chính + icon Sửa + icon Xoá (còn mở, xem PLAN.md) |
| Chân hồ sơ học sinh | Chỉ có Nhắc học phí |
| Icon xoá | Luôn có viền đỏ nhạt |
| Xoá | Luôn qua hộp xác nhận. Nút Huỷ focus mặc định. Bị chặn thì chỉ có Đã hiểu |

Nút ⋯ và danh sách dùng chung một bộ: `.more-btn` và `.row-menu`. Đóng khi chọn mục, bấm ra ngoài, hoặc Esc.

## 5. Form

- Thêm và sửa dùng chung một form cho mỗi thực thể.
- Lỗi hiện ngay trong ô, ô sai có viền đỏ.
- Form học sinh: một cột trên điện thoại, nhiều cột trên máy tính.

## 6. Kiểm tra trước khi báo xong

- Không tràn ngang ở 360, 390, 768, 1024, 1440px.
- Không mất thông tin (không cắt chữ, không ẩn nội dung quan trọng).
- Nút xoá có viền, nút có chữ không bị cắt.
- Đổi giao diện sáng và tối đều đọc được.

Xem thêm `docs/ERROR-LOG.md` các mục E-006, E-007, E-008 trước khi sửa CSS responsive.
