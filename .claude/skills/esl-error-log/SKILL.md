---
name: esl-error-log
description: Dùng khi gặp lỗi trong dự án ESL Center (CSS, DB, Next.js, kiểm thử, npm, quy trình), hoặc trước khi làm việc tương tự một việc đã từng lỗi. Ghi lỗi vào docs/ERROR-LOG.md theo mẫu và áp dụng quy tắc phòng ngừa.
---

# Nhật ký lỗi ESL Center

Mọi lỗi gặp phải phải được ghi vào `docs/ERROR-LOG.md`. Mục đích là không để cùng một lỗi xảy ra lần hai.

## Khi nào ghi

- Lệnh thất bại mà nguyên nhân không hiển nhiên.
- Kết quả kiểm thử sai vì chính cách kiểm thử.
- Giao diện đúng trên một breakpoint nhưng vỡ trên breakpoint khác.
- Migration, server action, hoặc truy vấn DB cho kết quả không như mong đợi.
- Một cách làm đã thử bị bỏ, và có bài học rõ ràng.

Lỗi do gõ nhầm một ký tự và sửa ngay không cần ghi.

## Mẫu

```
## E-0XX · Tiêu đề ngắn
- Ngày:
- Khu vực: (CSS / DB / Next.js / test / công cụ / quy trình)
- Triệu chứng:
- Nguyên nhân:
- Cách sửa:
- Quy tắc phòng ngừa: (viết thành việc cần làm, kiểm tra được)
- Đã áp dụng ở:
```

Đánh số tiếp theo từ mã lớn nhất hiện có. Không đổi số của mục cũ.

## Trước khi làm việc tương tự

Đọc `docs/ERROR-LOG.md`, tìm theo khu vực. Áp dụng quy tắc phòng ngừa đã ghi. Nếu quy tắc không còn đúng, cập nhật mục đó, không tạo mục trùng.

## Quy tắc viết

- Quy tắc phòng ngừa phải là hành động cụ thể, kiểm tra được. Ví dụ: "Sau `setViewportSize` phải gọi `reload`" tốt hơn "cẩn thận khi đổi màn hình".
- Ghi đúng nguyên nhân đã xác minh. Nếu chưa rõ, ghi "chưa xác minh" và nêu cách kiểm tra.
- Liên kết tới file hoặc task đã áp dụng.
