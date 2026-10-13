---
name: esl-postgres-drizzle
description: Dùng khi thay đổi schema, sinh hoặc áp dụng migration, viết truy vấn hay seed dữ liệu cho ESL Center với PostgreSQL và Drizzle ORM.
---

# PostgreSQL và Drizzle trong ESL Center

## Cấu trúc

- `src/db/schema.ts`: nguồn chuẩn cho bảng, enum, khoá, chỉ mục.
- `src/db/client.ts`: pool `pg` và đối tượng `db`. Chỉ import trên server.
- `src/db/migrate.ts`: chạy migration.
- `src/db/migrations/`: file SQL và snapshot sinh tự động. Không sửa tay.
- `drizzle.config.ts`: cấu hình drizzle-kit.

## Lệnh

```
npm run db:generate   # sinh migration SQL từ schema, không cần DB
npm run db:migrate    # áp dụng migration vào DB trong DATABASE_URL (.env.local)
npm run db:studio     # mở giao diện xem DB
```

`DATABASE_URL` đặt trong `.env.local` (sao chép từ `.env.example`). Không commit file này.

## Thay đổi schema

1. Sửa `src/db/schema.ts`.
2. Chạy `npm run db:generate`. Đọc file SQL sinh ra, kiểm tra đúng ý.
3. Chạy `npm run typecheck`.
4. Nếu có DB, chạy `npm run db:migrate` và kiểm tra bảng bằng `db:studio`.
5. Commit cả schema và file migration (khi người dùng yêu cầu commit).

## Quy tắc không được vi phạm

- Không sửa hoặc xoá file migration đã áp dụng. Muốn đổi, tạo migration mới.
- Tiền là số nguyên VND. Không dùng `real` hay `numeric` cho tiền trong schema hiện tại.
- Mã học sinh hiển thị `HS-0001` được tạo từ `students.id` khi đọc, không lưu thêm.
- Khoá ngoại có `onDelete` rõ ràng. Dữ liệu tham chiếu (lớp, giáo viên) dùng `restrict`, dữ liệu phụ (điểm danh, thu học phí của học sinh) dùng `cascade`.
- Truy vấn dùng query builder hoặc tham số hoá. Không nối chuỗi SQL.
- Ghi nhiều dòng liên quan (ví dụ thêm học sinh kèm khoản thu đầu) trong một transaction.

## Truy vấn

- Đọc danh sách học sinh: join `classes` và tổng hợp `tuition_payments` bằng subquery hoặc `groupBy`, không lặp truy vấn trong vòng lặp.
- Phân trang: `limit` và `offset`, cộng thêm một `count` riêng.
- Tìm kiếm không dấu: chuẩn hoá chuỗi tìm kiếm trước bằng `src/lib/text.ts` (sẽ tạo ở task 1.5), so với cột đã chuẩn hoá hoặc dùng `unaccent` nếu extension có sẵn.

## Seed

- Seed dùng dữ liệu bản mẫu, chạy một lần trên DB trống. Xác nhận bảng rỗng trước khi chèn.
- Seed không chạy tự động khi migrate.

## Khi không có DB

Schema, migration và truy vấn vẫn viết và kiểm tra được bằng `npm run typecheck` và `npm run db:generate`. Ghi rõ trong PLAN.md việc nào chưa chạy trên DB thật.
