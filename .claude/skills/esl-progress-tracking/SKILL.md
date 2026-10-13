---
name: esl-progress-tracking
description: Dùng khi hoàn thành một task trong PLAN.md của dự án ESL Center, hoặc khi cần cập nhật tiến độ. Đánh dấu task, ghi ngày và cách kiểm chứng, cập nhật dòng tiến độ tổng.
---

# Theo dõi tiến độ ESL Center

Nguồn sự thật cho tiến độ là `PLAN.md` ở thư mục gốc dự án.

## Khi nào đánh dấu một task

Chỉ đánh dấu `[x]` khi đã kiểm chứng. Cách kiểm chứng tuỳ loại việc:

| Loại việc | Kiểm chứng tối thiểu |
|---|---|
| Mã TypeScript | `npm run typecheck` sạch |
| Logic có quy tắc | Test vitest chạy và xanh |
| Giao diện | Kiểm tra trình duyệt đúng breakpoint, không tràn ngang, không mất thông tin |
| Schema, migration | `npm run db:generate` thành công, và `db:migrate` thành công nếu có DB |
| Server action | Test hoặc chạy thử trên DB thật, kèm kết quả ghi lại |

Nếu chưa kiểm chứng được (ví dụ chưa có DB), giữ `[ ]` và ghi lý do vào task.

## Các bước

1. Mở `PLAN.md`, tìm đúng mã task (ví dụ `3.4`).
2. Đổi `- [ ]` thành `- [x]`. Thêm ngày và kết quả kiểm chứng ngắn trong ngoặc nghiêng.
3. Đếm lại số task `[x]` trên tổng số task. Cập nhật dòng `Tiến độ tổng` ở đầu file.
4. Nếu task bị chặn, sửa trạng thái ở đầu file cho đúng, và ghi lý do trong task.
5. Nếu phát sinh task mới, thêm vào đúng phase với mã kế tiếp, không đánh số lại task cũ.

## Mẫu dòng đã làm

```
- [x] **3.4** Thêm học sinh: Server Action, zod, lỗi hiện trong ô. *(2026-10-14, typecheck sạch, test add-student.test.ts xanh)*
```

## Không làm

- Không đánh dấu task đã xong khi chỉ mới viết mã.
- Không đổi mã task đã có.
- Không xoá task đã làm. Chuyển thành `[x]`.
