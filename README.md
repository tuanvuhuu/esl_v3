# ESL Center

Hệ thống quản lý trung tâm tiếng Anh: học sinh, phụ huynh, giáo viên, lớp học, lịch học theo buổi, điểm danh, học phí, bài tập, lịch sử học tập, tài khoản và phân quyền. Giao diện có bản máy tính và bản điện thoại.

Tài liệu nội bộ: `CLAUDE.md` (quy tắc), `PLAN.md` (kế hoạch và tiến độ), `docs/DESIGN.md` (thiết kế), `docs/ERROR-LOG.md` (nhật ký lỗi).

## Yêu cầu

- Node.js 20 trở lên (đã kiểm tra với Node 24).
- PostgreSQL 18 (đã kiểm tra trên Windows, cài bản chính thức của EDB).

## Cài đặt lần đầu

1. Cài thư viện:

   ```bash
   npm install
   ```

2. Tạo database và user cho ứng dụng trong PostgreSQL (dùng `psql` hoặc pgAdmin), ví dụ database `esl_center`, user `esl`.

3. Tạo file `.env.local` từ `.env.example` và điền:
   - `DATABASE_URL`: chuỗi kết nối tới database vừa tạo.
   - `SESSION_SECRET`: khoá ký cookie, ít nhất 32 ký tự. Tạo bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

   File `.env.local` nằm trong `.gitignore`, không được commit.

4. Áp dụng migration và nạp dữ liệu mẫu:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Đặt mật khẩu cho tài khoản mẫu (chỉ dùng khi dev):

   ```bash
   ESL_NEW_PASSWORD=<mật khẩu dev, tối thiểu 10 ký tự> npm run db:set-password -- --all-missing
   ```

   Lệnh này đặt cùng một mật khẩu cho mọi tài khoản chưa có mật khẩu. Đặt riêng cho một tài khoản: thay `--all-missing` bằng email của tài khoản đó.

## Chạy trên máy dev

```bash
npm run dev -- -p 3100
```

Mở `http://localhost:3100`. Đăng nhập bằng một tài khoản mẫu (xem bảng tài khoản trong `PLAN.md`, mật khẩu đặt ở bước 5).

Lưu ý: nếu máy chủ báo lỗi lạ sau khi sửa nhiều file, dừng máy chủ, xoá thư mục `.next`, rồi chạy lại (xem `docs/ERROR-LOG.md`, E-020).

## Lệnh thường dùng

| Lệnh | Tác dụng |
|---|---|
| `npm run dev -- -p 3100` | Chạy máy chủ dev |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run lint` | Kiểm tra lint |
| `npm run test` | Chạy unit test (vitest) |
| `npm run build` | Build sản phẩm (dừng máy chủ dev trước, vì dùng chung `.next`) |
| `npm run db:generate` | Sinh migration từ `src/db/schema.ts` |
| `npm run db:migrate` | Áp dụng migration |
| `npm run db:seed` | Nạp dữ liệu mẫu (DB trống) |
| `npm run db:seed:reset` | Xoá toàn bộ dữ liệu và nạp lại mẫu. Chỉ dùng khi dev, bị chặn khi `NODE_ENV=production` |
| `npm run db:set-password` | Đặt mật khẩu cho một tài khoản hoặc các tài khoản chưa có |
| `npm run db:studio` | Mở công cụ xem database |

## Kiểm thử đầu cuối (Playwright)

Bộ kiểm thử nằm trong `e2e/`. Mật khẩu tài khoản mẫu được đọc từ `DEV_PASSWORD` trong `.env.local`, nên đặt biến này trước khi chạy (xem `.env.example`).

Trình duyệt: nếu máy đã có Chromium, trỏ tới file thực thi bằng `E2E_CHROME_PATH`. Nếu không, cài trình duyệt của Playwright:

```bash
npx playwright install chromium
```

Chạy:

```bash
npm run test:e2e
```

Bộ kiểm thử tự khởi động máy chủ dev trên cổng 3100 nếu chưa chạy. Mỗi kịch bản tự tạo dữ liệu thử và xoá sau khi chạy.

## Triển khai

1. Đặt biến môi trường trên máy chủ: `DATABASE_URL`, `SESSION_SECRET`. Không đặt `DEV_PASSWORD` trên máy chủ thật.
2. Chạy migration trên database thật: `npm run db:migrate`. Không chạy `db:seed` và `db:seed:reset` trên dữ liệu thật.
3. Tạo tài khoản quản trị đầu tiên bằng `npm run db:set-password -- <email>` với `ESL_NEW_PASSWORD` là mật khẩu thật, sau đó đăng nhập và tạo các tài khoản khác trong màn Tài khoản & quyền.
4. Build và chạy:

   ```bash
   npm run build
   npm run start
   ```

5. Đặt máy chủ sau HTTPS. Cookie phiên đặt cờ `secure` khi `NODE_ENV=production`, nên phải có HTTPS thì đăng nhập mới hoạt động trên trình duyệt.

Ghi chú bảo mật:
- Mật khẩu băm bằng scrypt của Node, cookie phiên httpOnly và có chữ ký HMAC.
- Tài khoản bị khoá không đăng nhập được, và phiên đang mở cũng mất hiệu lực ở lần đọc tiếp theo.
- Chưa có giới hạn số lần đăng nhập sai. Nên bổ sung trước khi đưa ra ngoài mạng nội bộ.
- Chưa có chức năng tự đổi mật khẩu. Quản trị đặt lại bằng công cụ dòng lệnh ở trên.

## Sao lưu và khôi phục cơ sở dữ liệu (P34.26)

### 1. Sao lưu tự động lên Google Drive

Chạy lệnh sao lưu thủ công hoặc đặt cron chạy hằng ngày:

```bash
npm run db:backup
```

- Toàn bộ cơ sở dữ liệu được dump, nén gzip và tải lên thư mục `backups/daily` trên Google Drive của trung tâm.
- Ngày đầu tiên mỗi tháng (hoặc khi chạy với cờ `--monthly`), một bản sẽ được lưu thêm vào `backups/monthly`.
- Hệ thống áp dụng chính sách duy trì: giữ 30 bản daily và 12 bản monthly (tự động xoá các bản cũ hơn).
- Nếu sao lưu gặp sự cố, hệ thống tự động gửi tin cảnh báo khẩn cấp tới Super Admin qua bot Telegram.

### 2. Hướng dẫn khôi phục dữ liệu

Khi cần khôi phục dữ liệu từ bản sao lưu `esl_center_backup_YYYY-MM-DD_HHMMSS.sql.gz` tải từ Google Drive:

1. **Khôi phục trực tiếp qua lệnh CLI:**
   - **Linux / macOS:**
     ```bash
     gzip -d -c esl_center_backup_YYYY-MM-DD_HHMMSS.sql.gz | psql "$DATABASE_URL"
     ```
   - **Windows PowerShell:**
     ```powershell
     # Giải nén file .gz thành .sql bằng tar tích hợp sẵn trên Windows:
     tar -xzf esl_center_backup_YYYY-MM-DD_HHMMSS.sql.gz
     # Nạp file SQL vào PostgreSQL:
     psql -d "$env:DATABASE_URL" -f esl_center_backup_YYYY-MM-DD_HHMMSS.sql
     ```

2. **Kiểm tra tính toàn vẹn sau khi khôi phục:**
   - Đăng nhập kiểm tra số lượng học sinh, lớp học và các tài khoản người dùng:
     ```bash
     npm run test:recent
     ```

## Lưu trữ tệp cũ sang Google Drive (P34.25)

Chạy script định kỳ (hằng tháng hoặc qua cron):

```bash
# Kiểm tra trước danh sách tệp sẽ chuyển (không thay đổi dữ liệu)
npm run files:archive -- --dry-run

# Thực hiện chuyển đổi tệp cũ quá 90 ngày sang Google Drive
npm run files:archive
```

- Tự động quét và chuyển các tệp âm thanh ghi âm, bài nộp học sinh của các bài đã chấm quá 90 ngày từ Supabase Storage sang Google Drive của trung tâm.
- Đảm bảo an toàn: Tải lên Google Drive $\rightarrow$ Kiểm tra kích thước byte khớp tuyệt đối $\rightarrow$ Cập nhật `storage_location = 'drive'` trong database $\rightarrow$ Mới xoá tệp trên Supabase Storage.
- Mọi liên kết xem/nghe lại tệp từ giao diện giáo viên và học sinh vẫn hoạt động bình thường, dữ liệu được truyền phát mượt mà từ Google Drive.

## Cấu trúc thư mục

- `src/app/` các route (App Router). Nhóm `(app)` là khung ứng dụng có đăng nhập.
- `src/lib/` hàm thuần và truy vấn DB (`queries/`), kiểm tra dữ liệu (`validation/`), xác thực (`auth/`).
- `src/components/` giao diện dùng chung (`ui/`) và theo module.
- `src/db/` schema, migration, seed, công cụ dòng lệnh.
- `tests/unit/` unit test. `e2e/` kiểm thử đầu cuối.
