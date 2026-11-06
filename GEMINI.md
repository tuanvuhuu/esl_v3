# Project Rules — ESL_V3 (`esl-center`)

## Quy tắc thao tác Cơ sở dữ liệu (Database)
- Đối với dự án `e:\0000. ESL\ESL_V3` (`esl-center`), cho phép Agent toàn quyền thực thi các câu lệnh đọc/ghi cơ sở dữ liệu (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `CREATE`, migrate, seed, import dữ liệu và tạo tài khoản).

## Quy tắc Phân quyền & Cơ sở (`RBAC` & `campus_admin`)
- Vai trò `admin` (**Quản trị**): toàn quyền quản lý trên mọi cơ sở (`getAllowedCampusIds()` trả về `null`).
- Vai trò `campus_admin` (**Admin đơn vị**): có đầy đủ 13/13 quyền chức năng (`ALL_PERMISSIONS`, bao gồm `reports.view` — Báo cáo doanh thu, `tuition.manage`, `accounts.manage`, `settings.manage`...) nhưng phạm vi dữ liệu chỉ giới hạn trong đúng các đơn vị/cơ sở được gán tại `account_campuses`.

## Quy tắc Server / Client Components (Next.js App Router)
- **Tuyệt đối không truyền hàm (`function`) từ Server Component sang Client Component**: Các thành phần có `'use client'` (như `DataGrid`, `Btn`, `SelectPanel`, `Modal`, `Sheet`...) không được nhận các prop dạng hàm (`rowKey`, `cell`, `card`, `sortValue`, `onClick`, hoặc icon component function `leadingVisual={Icon}`) trực tiếp từ Server Component (`src/app/**/page.tsx`, `layout.tsx`).
- Khi cần dùng `DataGrid` hoặc sự kiện tương tác trong trang, bắt buộc tách phần đó thành một Client Component (`'use client'`) và chỉ truyền dữ liệu thuần (serializable props) từ Server Component sang.

## Quy tắc Kiểm tra & Git
- Sau khi hoàn thành mỗi yêu cầu chỉnh sửa code, luôn kiểm tra lỗi (`tsc`/`lint`), commit và `git push origin main` ngay lập tức.

