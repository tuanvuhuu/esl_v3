# Nhật ký lỗi và bài học

Mỗi lỗi gặp phải được ghi ở đây, theo mẫu dưới đây. Trước khi làm việc tương tự, đọc các mục liên quan.

## Mẫu

```
## E-XXX · Tiêu đề ngắn
- Ngày:
- Khu vực: (CSS / DB / Next.js / test / công cụ / quy trình)
- Triệu chứng:
- Nguyên nhân:
- Cách sửa:
- Quy tắc phòng ngừa: (viết thành việc cần làm, kiểm tra được)
- Đã áp dụng ở: (file hoặc task)
```

---

## E-001 · Trình duyệt tự động không mở được file `file://`
- Ngày: 2026-10-13 (giai đoạn bản mẫu)
- Khu vực: công cụ kiểm thử
- Triệu chứng: Playwright báo bị chặn khi mở đường dẫn `file:///...`.
- Nguyên nhân: Trình duyệt tự động chặn giao thức `file:` trong môi trường này.
- Cách sửa: Chạy máy chủ tĩnh `python -m http.server <cổng>` trong thư mục dự án, rồi mở `http://localhost:<cổng>/...`.
- Quy tắc phòng ngừa: Mọi kiểm thử trình duyệt đi qua `http://localhost`. Dùng máy chủ của dự án (`npm run dev`) khi đã có Next.js.
- Đã áp dụng ở: kiểm thử bản mẫu.

## E-002 · Đổi kích thước màn hình rồi chỉ đổi hash, giao diện không cập nhật
- Ngày: 2026-10-13
- Khu vực: kiểm thử
- Triệu chứng: Sau `setViewportSize`, số đo vẫn là của kích thước cũ, kết quả kiểm tra sai.
- Nguyên nhân: Điều hướng chỉ đổi phần hash (`#/route`) không tải lại trang, nên CSS và layout không tính lại.
- Cách sửa: Luôn gọi `page.reload()` sau mỗi lần đổi kích thước.
- Quy tắc phòng ngừa: Mọi script đo layout gồm `setViewportSize` → `goto` → `reload` → đo.
- Đã áp dụng ở: mọi bước kiểm thử bản mẫu.

## E-003 · Hai quy tắc CSS cùng độ ưu tiên, quy tắc sau ghi đè quy tắc trước
- Ngày: 2026-10-13
- Khu vực: CSS
- Triệu chứng: Nút đóng ngăn kéo hiện trên máy tính, dù quy tắc `display: none` đã viết.
- Nguyên nhân: Quy tắc `.icon-btn { display: grid }` nằm sau và có cùng độ ưu tiên với `.side-close { display: none }`.
- Cách sửa: Viết selector cụ thể hơn (`.side .side-close`).
- Quy tắc phòng ngừa: Khi ẩn một phần tử đã có class chung (`icon-btn`, `btn`), dùng selector lồng trong khối của nó. Kiểm tra lại bằng `getComputedStyle` sau khi sửa.
- Đã áp dụng ở: bản mẫu, `student-mockup.html`.

## E-004 · Ảnh chụp toàn trang làm phần tử cố định nằm sai chỗ
- Ngày: 2026-10-13
- Khu vực: kiểm thử
- Triệu chứng: Thanh tab dưới đáy và ngăn kéo ẩn hiện giữa ảnh toàn trang.
- Nguyên nhân: Phần tử `position: fixed` được vẽ theo khung nhìn, không theo vị trí trong trang.
- Cách sửa: Dùng số đo `getBoundingClientRect` và ảnh chụp khung nhìn hoặc vùng cắt (`clip`), không dựa vào ảnh toàn trang.
- Quy tắc phòng ngừa: Kết luận về bố cục phải dựa trên số đo, ảnh chụp chỉ để xác nhận.
- Đã áp dụng ở: mọi kiểm thử giao diện.

## E-005 · Kiểm tra tràn ngang báo lỗi giả
- Ngày: 2026-10-13
- Khu vực: kiểm thử
- Triệu chứng: Thẻ tấn công (carousel) cuộn ngang bị báo là tràn.
- Nguyên nhân: Vùng cuộn ngang có chủ đích được tính vào kiểm tra.
- Cách sửa: Loại trừ có chủ đích vùng cuộn đã biết, ghi chú trong script.
- Quy tắc phòng ngừa: Kiểm tra tràn ngang chỉ so `document.documentElement.scrollWidth` với `clientWidth`. Vùng cuộn có chủ đích phải được liệt kê rõ.
- Đã áp dụng ở: script kiểm tra bản mẫu.

## E-006 · Chữ gợi ý nhỏ hơn ô nhập làm lệch dòng
- Ngày: 2026-10-13
- Khu vực: CSS
- Triệu chứng: Chữ gợi ý trong ô tìm kiếm điện thoại không thẳng hàng với icon kính lúp.
- Nguyên nhân: Chiều cao dòng của ô nhập theo cỡ chữ 16px, chữ gợi ý 12px nằm lệch trên đường cơ sở.
- Cách sửa: Đặt `line-height` cố định cho ô nhập (20px).
- Quy tắc phòng ngừa: Khi đổi cỡ chữ của `::placeholder` hoặc phần con, đặt `line-height` tường minh trên phần tử cha.
- Đã áp dụng ở: `.m-search input`.

## E-007 · Quy tắc máy tính làm co phần tử trên điện thoại
- Ngày: 2026-10-13
- Khu vực: CSS responsive
- Triệu chứng: Ba nút thao tác trong thẻ điện thoại dồn về bên phải và không kéo giãn.
- Nguyên nhân: Quy tắc `justify-self: end` của bản máy tính vẫn áp dụng cho phần tử lưới trên điện thoại.
- Cách sửa: Thêm `justify-self: stretch` trong khối điện thoại.
- Quy tắc phòng ngừa: Khi một quy tắc máy tính đặt căn lề (`justify-self`, `align-self`, `margin`), khối điện thoại phải ghi đè tường minh.
- Đã áp dụng ở: `.c-acts`.

## E-008 · Ô nhập dưới 16px làm iOS tự phóng to
- Ngày: 2026-10-13
- Khu vực: CSS / thiết bị di động
- Triệu chứng: Khi bấm vào ô nhập trên iPhone, trang phóng to.
- Nguyên nhân: iOS phóng to mọi ô nhập có cỡ chữ dưới 16px.
- Cách sửa: Ô nhập trên điện thoại dùng token `--fs-input: 16px`.
- Quy tắc phòng ngừa: Không đặt cỡ chữ ô nhập dưới 16px trên điện thoại. Ghi chú ngoại lệ này trong DESIGN.md.
- Đã áp dụng ở: `docs/DESIGN.md` mục 2.

## E-009 · Bấm nút trong dòng mở luôn hồ sơ (sự kiện nổi bọt)
- Ngày: 2026-10-13
- Khu vực: JavaScript
- Triệu chứng: Bấm Sửa hoặc Xoá trong dòng cũng mở hồ sơ học sinh.
- Nguyên nhân: Trình xử lý click của cả dòng nhận sự kiện từ nút con.
- Cách sửa: Trong trình xử lý dòng, bỏ qua khi `e.target.closest('[data-act], .more-btn, .row-menu')` khớp. Phím Enter/Space cũng áp dụng cùng điều kiện.
- Quy tắc phòng ngừa: Mọi hàng có nút thao tác phải có guard này ở cả `click` và `keydown`.
- Đã áp dụng ở: bảng học sinh, bản mẫu.

## E-010 · Locator kiểm thử chọn nhầm phần tử của màn đang ẩn
- Ngày: 2026-10-13
- Khu vực: kiểm thử
- Triệu chứng: `page.click` chờ mãi vì phần tử được chọn đang ẩn (ví dụ tiêu đề màn Tổng quan khi đang ở màn Cài đặt).
- Nguyên nhân: Selector chung như `h1` hoặc `.page-sub` khớp với phần tử của nhiều màn.
- Cách sửa: Giới hạn selector trong màn đang hiện (`#screen-cai-dat .page-sub`).
- Quy tắc phòng ngừa: Mọi selector kiểm thử đặt trong container của màn hoặc dialog đang mở.
- Đã áp dụng ở: mọi kịch bản kiểm thử bản mẫu.

## E-011 · Locator nhiều kết quả do phần tử ẩn cùng tồn tại trong DOM
- Ngày: 2026-10-13
- Khu vực: kiểm thử
- Triệu chứng: `strict mode violation`: một nút Sửa ở bản máy tính (ẩn) và một nút trong menu (hiện) cùng khớp.
- Nguyên nhân: Hai nhánh giao diện (web và điện thoại) đều có trong DOM, chỉ khác `display`.
- Cách sửa: Chọn trong container hiện (`.row-menu [data-act="edit"]`).
- Quy tắc phòng ngừa: Khi giao diện có nhiều nhánh theo breakpoint, kiểm thử chọn theo container đang hiện, không chọn toàn trang.
- Đã áp dụng ở: kịch bản kiểm thử danh sách tài khoản.

## E-012 · Cảnh báo "file đã đổi trên đĩa" khi sửa nhiều lần liên tiếp
- Ngày: 2026-10-13
- Khu vực: quy trình
- Triệu chứng: Công cụ báo file đã thay đổi trên đĩa sau khi chạy script ghi file.
- Nguyên nhân: Script ghi file bên ngoài công cụ chỉnh sửa, công cụ không nhận ra thay đổi.
- Cách sửa: Đọc lại đúng đoạn cần sửa trước khi chỉnh tiếp. Sau mỗi đợt sửa, kiểm tra bằng grep các chuỗi đã đổi.
- Quy tắc phòng ngừa: Sau mỗi đợt sửa nhiều chỗ, grep xác nhận thay đổi đã ghi đúng, rồi mới tiếp tục.
- Đã áp dụng ở: mọi đợt sửa bản mẫu.

## E-013 · `npm install` xung đột phụ thuộc với vitest
- Ngày: 2026-10-13
- Khu vực: công cụ / npm
- Triệu chứng: `npm install -D vitest` báo ERESOLVE, không cài được.
- Nguyên nhân: Phiên bản vitest mới nhất yêu cầu phụ thuộc không khớp với cây phụ thuộc hiện có (`@types/node` 20).
- Cách sửa: Cài `vitest@^3` (đã kiểm tra `npm ls` sạch).
- Quy tắc phòng ngừa: Khi ERESOLVE, cài phiên bản chính trước đó đã được kiểm chứng. Không dùng `--force` hay `--legacy-peer-deps` mà không ghi lại.
- Đã áp dụng ở: `package.json`.

## E-014 · Next.js 16 khác với kiến thức cũ
- Ngày: 2026-10-13
- Khu vực: Next.js
- Triệu chứng: Nguy cơ viết theo API cũ (ví dụ cách gọi cache, cấu hình).
- Nguyên nhân: Phiên bản đi kèm có thay đổi lớn, tài liệu nằm trong `node_modules/next/dist/docs/`.
- Cách sửa: Đọc tài liệu phù hợp trước khi viết (`01-app/01-getting-started/07-mutating-data.md` cho Server Actions).
- Quy tắc phòng ngừa: Trước khi viết mã Next.js, mở tài liệu tương ứng trong `node_modules/next/dist/docs/`. Ghi lại API đã dùng nếu khác mặc định.
- Đã áp dụng ở: `CLAUDE.md` mục 2.

## E-015 · Vite và Next.js không đi chung một dự án
- Ngày: 2026-10-13
- Khu vực: kiến trúc
- Triệu chứng: Yêu cầu "vite, tailwind, nextjs" cùng lúc không khớp với một cấu trúc dự án.
- Nguyên nhân: Next.js có bộ bundler và router riêng. Thêm Vite chỉ tạo thêm một hệ build thứ hai.
- Cách sửa: Chọn Next.js làm khung. Ghi quyết định D1 trong PLAN.md.
- Quy tắc phòng ngừa: Trước khi thêm công cụ build, kiểm tra xem framework đã có sẵn chức năng đó chưa.
- Đã áp dụng ở: `PLAN.md` D1.

## E-017 · File `.env.local` có BOM làm Node không đọc được biến
- Ngày: 2026-10-13
- Khu vực: DB / công cụ
- Triệu chứng: `npm run db:migrate` báo "Thiếu DATABASE_URL" dù file `.env.local` đã có dòng `DATABASE_URL=...`.
- Nguyên nhân: `Set-Content -Encoding utf8` trên Windows PowerShell 5.1 ghi BOM (`EF BB BF`) ở đầu file, làm tên biến đầu tiên thành `\uFEFFDATABASE_URL`.
- Cách sửa: Ghi lại file bằng `[System.IO.File]::WriteAllText(path, text, New-Object System.Text.UTF8Encoding($false))`.
- Quy tắc phòng ngừa: Trên Windows PowerShell 5.1, mọi file cấu hình ghi bằng .NET với UTF-8 không BOM. Sau khi tạo file, kiểm tra 3 byte đầu không phải `EF BB BF`.
- Đã áp dụng ở: `.env.local` (tạo và kiểm tra thủ công).

## E-018 · `psql` không có trong PATH sau khi cài PostgreSQL
- Ngày: 2026-10-13
- Khu vực: DB / công cụ
- Triệu chứng: Gõ `psql` báo không nhận lệnh, dù PostgreSQL đã cài và đang chạy.
- Nguyên nhân: Bộ cài Windows không thêm `bin` vào PATH của phiên hiện tại.
- Cách sửa: Dùng đường dẫn đầy đủ `C:\Program Files\PostgreSQL\18\bin\psql.exe`, hoặc mở "SQL Shell (psql)" từ Start menu.
- Quy tắc phòng ngừa: Mọi lệnh DB trong script dùng đường dẫn tuyệt đối tới `psql.exe`, không giả định PATH. Ghi phiên bản (18) trong tài liệu khi có thay đổi.
- Đã áp dụng ở: các lệnh kiểm tra DB và tạo user.

## E-016 · Ô tìm kiếm điện thoại bị cắt chữ khi thêm nút
- Ngày: 2026-10-13
- Khu vực: CSS responsive
- Triệu chứng: Chữ gợi ý "Tìm tên, mã HS, SĐT" bị cắt còn "Tìm tên, mã H" sau khi thêm nút Thêm mới cùng hàng.
- Nguyên nhân: Ô tìm kiếm chỉ còn khoảng 92px trên màn 390px.
- Cách sửa: Rút gọn chữ gợi ý trên điện thoại thành "Tìm học sinh". Bản máy tính giữ nguyên.
- Quy tắc phòng ngừa: Trước khi thêm phần tử vào một hàng nhỏ, đo chiều rộng còn lại và kiểm tra nội dung không bị cắt.
- Đã áp dụng ở: thanh tìm kiếm điện thoại.

## E-019 · Server Component truyền hàm (icon) sang Client Component
- Ngày: 2026-10-13
- Khu vực: Next.js
- Triệu chứng: Nguy cơ lỗi "Functions cannot be passed directly to Client Components" khi truyền cấu hình menu có icon là component.
- Nguyên nhân: Props từ Server Component sang Client Component phải tuần tự hoá được, hàm và component không tuần tự hoá được.
- Cách sửa: Cấu hình menu dùng khoá chuỗi (`icon: 'users'`), client ánh xạ sang icon thật ở `src/components/shell/nav-icons.ts`.
- Quy tắc phòng ngừa: Props truyền từ server sang client chỉ gồm dữ liệu thuần (chuỗi, số, boolean, mảng, object thuần). Không truyền hàm, icon, Date có phương thức, class instance.
- Đã áp dụng ở: `src/lib/nav.ts`, `src/components/shell/nav-icons.ts`.

## E-020 · Hydration mismatch sau khi sửa component (cache build cũ)
- Ngày: 2026-10-13
- Khu vực: Next.js / công cụ
- Triệu chứng: Trình duyệt báo "Hydration failed": HTML server không có mục menu vừa thêm, trong khi client có.
- Nguyên nhân: Bản server của máy chủ phát triển còn dùng module cũ sau khi sửa file. Lỗi chỉ xuất hiện ở server, client đã đúng.
- Cách sửa: Dừng máy chủ, xoá thư mục `.next`, chạy lại `npm run dev -- -p 3100`, rồi tải lại trang và kiểm tra lỗi console.
- Quy tắc phòng ngừa: Sau khi sửa nhiều file hoặc thêm mục ở component dùng chung, khởi động lại máy chủ phát triển trước khi kết luận lỗi hydration. Nếu lỗi còn sau khi khởi động lại mới là lỗi thật.
- Đã áp dụng ở: sửa `Sidebar.tsx` (mục Tổng quan).

## E-021 · Lint báo gọi setState trong effect (đọc localStorage)
- Ngày: 2026-10-13
- Khu vực: React / lint
- Triệu chứng: `react-hooks/set-state-in-effect` báo lỗi ở `ThemeMenu` và `Sidebar`.
- Nguyên nhân: Đọc localStorage rồi gọi setState trong `useEffect` gây render lặp.
- Cách sửa: Dùng `useSyncExternalStore` qua hook `src/lib/use-local-storage.ts`, giá trị server là fallback nên không lệch khi hydrate.
- Quy tắc phòng ngừa: Trạng thái lưu ở trình duyệt (theme, menu gập, bộ lọc) đọc bằng `useLocalStorage`, không gọi setState trong effect.
- Đã áp dụng ở: `ThemeMenu.tsx`, `Sidebar.tsx`.

## E-022 · Class động của Tailwind không được sinh ra
- Ngày: 2026-10-13
- Khu vực: CSS / Tailwind
- Triệu chứng: Chuỗi như `max-[1199px]:${open ? '' : 'hidden'}` không tạo class, menu không ẩn đúng.
- Nguyên nhân: Tailwind chỉ nhận diện class viết đủ trong mã nguồn, không nhận class ghép chuỗi lúc chạy.
- Cách sửa: Viết đủ từng class đầy đủ rồi chọn bằng điều kiện (`open ? 'flex' : 'hidden'`).
- Quy tắc phòng ngừa: Mọi class Tailwind phải xuất hiện nguyên văn trong mã nguồn. Không ghép tiền tố hoặc tên biến vào class.
- Đã áp dụng ở: `FeatureSheet.tsx`.

## E-023 · Windows PowerShell 5.1 không có `-LiteralPath` trên `New-Item`
- Ngày: 2026-10-13
- Khu vực: công cụ
- Triệu chứng: `New-Item : A parameter cannot be found that matches parameter name 'LiteralPath'`, thư mục không được tạo.
- Nguyên nhân: `New-Item` trên PowerShell 5.1 chỉ có `-Path`.
- Cách sửa: Dùng `New-Item -ItemType Directory -Force -Path $dir`.
- Quy tắc phòng ngừa: Trên Windows PowerShell 5.1, kiểm tra tham số trước khi dùng cmdlet lạ. Đường dẫn có ngoặc đơn như `(app)` vẫn dùng được với `-Path`.
- Đã áp dụng ở: tạo trang tạm `src/app/(app)/*`.

## E-024 · Trùng lặp mã sinh buổi học giữa seed và logic nghiệp vụ
- Ngày: 2026-10-13
- Khu vực: DB / kiến trúc
- Triệu chứng: Logic sinh buổi học nằm trong `seed.ts`, sẽ phải viết lại khi làm giao diện lịch học.
- Nguyên nhân: Viết nhanh trong script seed thay vì tách hàm thuần.
- Cách sửa: Tách thành `src/lib/schedule.ts` có unit test, seed gọi hàm này.
- Quy tắc phòng ngừa: Logic nghiệp vụ (sinh buổi, tính tiền, quyền, lịch sử) đặt ở `src/lib/` dạng hàm thuần có test, không để trong script hay component.
- Đã áp dụng ở: `src/lib/schedule.ts`, `src/db/seed.ts`.

## E-025 · Truy vấn DB làm trang bị chặn khi prerender (cacheComponents)
- Ngày: 2026-10-13
- Khu vực: Next.js / DB
- Triệu chứng: Console báo "Route /hoc-sinh: Next.js encountered uncached data during prerendering ... connection() accessed outside of <Suspense>".
- Nguyên nhân: `next.config.ts` bật `cacheComponents: true`. Truy vấn DB trực tiếp trong page không nằm trong Suspense nên không stream được.
- Cách sửa: Đưa phần đọc dữ liệu vào một async component con, bọc `<Suspense fallback={...}>` trong page. Có khung chờ (skeleton) để người dùng thấy trang ngay.
- Quy tắc phòng ngừa: Mọi page đọc DB phải có dạng `Page` (đồng bộ, chỉ bọc Suspense) + `PageData` (async, đọc `searchParams`/`params` và truy vấn). Không gọi DB trực tiếp trong `Page`.
- Đã áp dụng ở: `src/app/(app)/hoc-sinh/page.tsx`, `src/app/(app)/hoc-sinh/[id]/page.tsx`.

## E-026 · usePathname trong Client Component ngoài Suspense
- Ngày: 2026-10-13
- Khu vực: Next.js
- Triệu chứng: "Next.js encountered URL data usePathname() in a Client Component outside of <Suspense>" ở route động.
- Nguyên nhân: Khung ứng dụng (sidebar, tab bar) dùng `usePathname`, nằm trong layout nên prerender gặp dữ liệu URL.
- Cách sửa: Bọc `<ShellFrame>` trong `<Suspense fallback={null}>` ở `src/app/(app)/layout.tsx`.
- Quy tắc phòng ngừa: Client Component dùng `usePathname`, `useSearchParams` hoặc `useParams` phải nằm dưới Suspense ở mọi layout.
- Đã áp dụng ở: `src/app/(app)/layout.tsx`.

## E-028 · Form React 19 tự reset ô nhập sau khi gửi có lỗi
- Ngày: 2026-10-13
- Khu vực: React / form
- Triệu chứng: Gửi form thiếu trường, báo lỗi xong thì các ô bị xoá trắng, người dùng phải nhập lại.
- Nguyên nhân: Với `<form action={fn}>`, React 19 reset các ô không controlled sau khi action chạy xong, kể cả khi kết quả là lỗi.
- Cách sửa: Dùng `onSubmit` gọi `e.preventDefault()`, lấy `new FormData(e.currentTarget)`, rồi gọi `formAction(formData)` bên trong `startTransition`.
- Quy tắc phòng ngừa: Mọi form có validate phía server dùng mẫu này. Kiểm tra bằng cách gửi form có lỗi và xác nhận ô còn giá trị.
- Đã áp dụng ở: `StudentForm.tsx`, `AccountForm.tsx`.
- Đã kiểm chứng (2026-10-13): trên `AccountForm`, mời trùng email báo lỗi và ô họ tên còn giá trị. `StudentForm` dùng cùng mẫu nhưng chưa kiểm trên trình duyệt.

## E-027 · Huy hiệu "Issues" của máy chủ phát triển giữ lỗi cũ
- Ngày: 2026-10-13
- Khu vực: công cụ / Next.js
- Triệu chứng: Góc dưới trái vẫn hiện "2 Issues" sau khi đã sửa lỗi, và log có dòng lỗi cũ.
- Nguyên nhân: Máy chủ phát triển giữ danh sách lỗi của phiên trước. Trình duyệt tải lại không xoá danh sách này.
- Cách sửa: Dừng máy chủ, xoá `.next`, chạy lại `npm run dev -- -p 3100`. Sau đó tải trang và kiểm tra console và log lại.
- Quy tắc phòng ngừa: Khi kiểm tra lỗi, đối chiếu thời điểm dòng log với thời điểm sửa code. Nếu lỗi trong log cũ hơn lần sửa, khởi động lại máy chủ trước khi kết luận.
- Đã áp dụng ở: phiên kiểm tra module học sinh.

## E-029 · new Date() trong trang đọc DB làm lỗi khi prerender
- Ngày: 2026-10-13
- Khu vực: Next.js
- Triệu chứng: Console báo "Route /lich-hoc: encountered the unstable value new Date() while prerendering" dù dữ liệu đã nằm trong Suspense.
- Nguyên nhân: Hàm lấy ngày hôm nay (todayKeyVN) và thời điểm hiện tại chạy trước khi có yêu cầu thật. Next coi đó là giá trị không ổn định khi prerender.
- Cách sửa: Gọi await connection() (từ next/server) đầu tiên trong component dữ liệu, trước mọi new Date().
- Quy tắc phòng ngừa: Mọi component dữ liệu gọi new Date(), Date.now() hay todayKeyVN() phải có await connection() trước đó. Kiểm bằng cách mở trang trên máy chủ dev và đọc console, không được có lỗi "unstable value".
- Đã áp dụng ở: lich-hoc, diem-danh, hoc-phi, bao-cao, tong-quan, tinh-nang (src/app/(app)).

## E-030 · Date.now() trong component bị lint báo không thuần
- Ngày: 2026-10-13
- Khu vực: React / lint
- Triệu chứng: react-hooks/purity báo "Cannot call impure function during render" ở bai-tap/page.tsx khi truyền Date.now() vào truy vấn.
- Nguyên nhân: Gọi hàm không thuần trong thân component. Lint bắt đúng vấn đề này.
- Cách sửa: Đưa việc lấy thời gian vào bên trong hàm truy vấn (listAssignmentsOfClass tự gọi Date.now()), component không truyền thời gian xuống.
- Quy tắc phòng ngừa: Trong thân component không gọi Date.now(), Math.random(), new Date(). Đặt trong hàm truy vấn hoặc hàm thuần. Chạy npm run lint sau mỗi trang mới.
- Đã áp dụng ở: src/lib/queries/assignments.ts, src/app/(app)/bai-tap/page.tsx.

## E-031 · Truyền mảng vào sql của Drizzle thành nhiều tham số
- Ngày: 2026-10-13
- Khu vực: DB / Drizzle
- Triệu chứng: Truy vấn "= ANY(mảng)" lỗi khi thử báo cáo theo nhiều tháng.
- Nguyên nhân: Drizzle mở rộng mảng JS thành danh sách tham số ($1, $2, ...), không gửi một mảng PostgreSQL.
- Cách sửa: Dùng IN (sql.join(mảng.map((x) => sql`${x}`), sql`, `)).
- Quy tắc phòng ngừa: Không truyền mảng trực tiếp vào sql template. Dùng sql.join cho danh sách, hoặc query builder có inArray.
- Đã áp dụng ở: src/lib/queries/tuition.ts (getRevenueReport).

## E-032 · zod 4: refine không đổi kiểu, không có innerType
- Ngày: 2026-10-13
- Khu vực: zod / validation
- Triệu chứng: classScheduleSchema.innerType() không tồn tại, typecheck lỗi.
- Nguyên nhân: innerType() là API của zod 3 (ZodEffects). Trong zod 4, refine trả về cùng kiểu object.
- Cách sửa: Khai báo phần shape thành hằng, dùng z.object({ ...shape }).refine(...).
- Quy tắc phòng ngừa: Với zod 4 không dùng innerType, ZodEffects. Tách shape thành hằng khi cần ghép hai schema.
- Đã áp dụng ở: src/lib/validation/class.ts.

## E-033 · Gọi notify (setState) ngay trong lúc render
- Ngày: 2026-10-13
- Khu vực: React
- Triệu chứng: Có nguy cơ vòng lặp render khi cập nhật thông báo trong thân component (form cài đặt).
- Nguyên nhân: Viết "if (state.ok) notify(...)" trong thân component. Cập nhật state trong lúc render là sai.
- Cách sửa: Hiện thông báo từ state trực tiếp trong JSX (role="status"), không gọi setState.
- Quy tắc phòng ngừa: Không gọi setState ngoài event handler, effect hay action.
- Đã áp dụng ở: src/components/settings/SettingsForm.tsx.

## E-034 · Form tạo bài tập mặc định chọn lớp đầu tiên
- Ngày: 2026-10-13
- Khu vực: giao diện / quy trình
- Triệu chứng: Tạo bài tập khi đang xem lớp K14 nhưng bài được lưu vào GT-A1, nên không hiện trong danh sách.
- Nguyên nhân: Giá trị mặc định lấy classes[0] thay vì lớp đang chọn trên URL.
- Cách sửa: Truyền defaultClassId từ trang xuống form.
- Quy tắc phòng ngừa: Form tạo bản ghi trong một ngữ cảnh (lớp, học sinh, tháng) mặc định lấy đúng ngữ cảnh đang xem.
- Đã áp dụng ở: src/components/assignments/AssignmentForm.tsx, AssignmentsView.tsx.

## E-035 · Object.fromEntries(formData) làm mất giá trị lặp của checkbox
- Ngày: 2026-10-13
- Khu vực: form / server action
- Triệu chứng: Chọn nhiều ngày học (T2, T4, T6) nhưng lớp chỉ lưu một ngày.
- Nguyên nhân: Object.fromEntries giữ giá trị cuối cùng của mỗi tên, bỏ các giá trị trước.
- Cách sửa: Lấy riêng bằng formData.getAll('weekdays') và ghép vào object trước khi validate.
- Quy tắc phòng ngừa: Ô nhiều lựa chọn (checkbox cùng tên) luôn đọc bằng getAll.
- Đã áp dụng ở: src/app/(app)/lop-hoc/actions.ts (readForm).

## E-036 · Trang Tài khoản & quyền thiếu kiểm tra quyền
- Ngày: 2026-10-13
- Khu vực: bảo mật / quyền (task 9.2)
- Triệu chứng: Kế toán mở được /tai-khoan và thấy danh sách tài khoản, dù mục menu đã ẩn.
- Nguyên nhân: Trang chỉ ẩn menu, không kiểm tra quyền trên server ở cấp trang. Chỉ action có kiểm tra quyền.
- Cách sửa: Thêm kiểm tra accounts.manage ở đầu trang, trả về NoAccess. Ma trận quyền chỉ quản trị đổi được (requireAdmin trong action).
- Quy tắc phòng ngừa: Mỗi trang có dữ liệu phải kiểm tra quyền ở cấp trang và cấp action. Kiểm bằng kịch bản đầu cuối đăng nhập bằng tài khoản không có quyền và mở trực tiếp URL.
- Đã áp dụng ở: src/app/(app)/tai-khoan/page.tsx, tai-khoan/actions.ts; kiểm bằng e2e/auth.spec.ts.

## E-037 · Layout đọc cookie và DB ngoài Suspense làm lỗi build
- Ngày: 2026-10-13
- Khu vực: Next.js / build
- Triệu chứng: npm run build lỗi "Route /bai-tap: uncached or runtime data during prerendering", build dừng.
- Nguyên nhân: (app)/layout.tsx gọi connection(), cookies() và DB ngoài Suspense. Mọi trang con bị kéo theo.
- Cách sửa: Chuyển phần đọc dữ liệu vào component AppShell và bọc layout bằng Suspense fallback null.
- Quy tắc phòng ngừa: Layout không được await gì dùng request-time API. Mọi truy cập cookie, DB, connection() đặt trong component con bọc Suspense. Chạy npm run build trước khi báo xong.
- Đã áp dụng ở: src/app/(app)/layout.tsx.

## E-038 · Selector kiểm thử trùng do nhãn lặp
- Ngày: 2026-10-13
- Khu vực: kiểm thử
- Triệu chứng: getByRole('link', { name: 'Phụ huynh' }) khớp hai phần tử trong hồ sơ, getByRole('searchbox') khớp hai ô tìm kiếm.
- Nguyên nhân: Tab có liên kết cùng tên với nút "Xem tất cả", và ô tìm kiếm toàn cục trùng nhãn với ô của trang.
- Cách sửa: Giới hạn selector trong container (navigation "Mục hồ sơ"), dùng exact, hoặc đặt tên nhãn khác nhau.
- Quy tắc phòng ngừa: Kịch bản đầu cuối chọn phần tử trong container của màn đang mở. Trước khi báo lỗi, đếm số phần tử khớp.
- Đã áp dụng ở: e2e/*.spec.ts.

## E-039 · role="alert" và role="status" của Next.js trùng với thông báo thật
- Ngày: 2026-10-13
- Khu vực: kiểm thử
- Triệu chứng: getByRole('alert') khớp cả khung thông báo điều hướng của Next.js (rỗng) và thông báo lỗi thật. Lấy phần tử status cuối cùng là phần tử sai.
- Nguyên nhân: Next.js có sẵn role="alert" ẩn. Có thể có nhiều vùng role="status".
- Cách sửa: Lọc theo nội dung (filter hasText), không lấy .last().
- Quy tắc phòng ngừa: Tìm thông báo theo nội dung, không theo vị trí. Helper statusToast(page, text) là điểm dùng chung.
- Đã áp dụng ở: e2e/helpers.ts, e2e/auth.spec.ts.

## E-040 · Trình duyệt của Playwright chưa được cài trên máy
- Ngày: 2026-10-13
- Khu vực: công cụ
- Triệu chứng: npx playwright test không tìm được trình duyệt.
- Nguyên nhân: Chưa chạy npx playwright install. Máy đã có Chromium trong ms-playwright nhưng Playwright không tự tìm.
- Cách sửa: Đặt E2E_CHROME_PATH trỏ tới chrome.exe có sẵn. playwright.config.ts đã đọc biến này. Nếu chưa có, chạy npx playwright install chromium.
- Quy tắc phòng ngừa: Ghi cách cài trình duyệt trong README. Không commit đường dẫn máy cá nhân.
- Đã áp dụng ở: playwright.config.ts, README.md.

## E-041 · Sheet Tính năng có role="dialog" ẩn làm kiểm thử chọn nhầm
- Ngày: 2026-10-13
- Khu vực: kiểm thử
- Triệu chứng: document.querySelector('[role="dialog"]') trả về sheet Tính năng đang ẩn thay vì form đang mở.
- Nguyên nhân: FeatureSheet luôn có trong DOM với role="dialog", chỉ ẩn bằng class.
- Cách sửa: Chọn hộp thoại theo aria-labelledby (ví dụ [role="dialog"][aria-labelledby="assignment-create-title"]).
- Quy tắc phòng ngừa: Mọi kịch bản chọn hộp thoại theo aria-labelledby hoặc tiêu đề, không dùng [role="dialog"] chung.
- Đã áp dụng ở: e2e/helpers.ts (dialogById).

## E-042 · Dev server báo "Could not validate instant" khi chuyển hướng đăng nhập
- Ngày: 2026-10-13
- Khu vực: Next.js (chưa xác minh nguyên nhân)
- Triệu chứng: Log dev có dòng "Could not validate instant ... NEXT_REDIRECT" ở /, /tong-quan, /hoc-sinh khi chưa đăng nhập.
- Nguyên nhân: Chưa xác minh. Có khả năng do redirect() trong layout được đánh giá khi xác thực hiển thị tức thời. Build vẫn thành công và chức năng đúng.
- Cách xử lý tạm: Không thay đổi. Theo dõi nếu xuất hiện trong build hoặc khi đăng nhập thật.
- Quy tắc phòng ngừa: Ghi nguyên văn cảnh báo khi gặp. Chỉ kết luận sau khi đối chiếu với npm run build và kiểm thử đầu cuối.
- Đã áp dụng ở: ghi nhận chung, chưa có thay đổi mã.

## E-043 · CSS mới thêm vào globals.css không có trong bản đang phục vụ (dev server)
- Ngày: 2026-10-13
- Khu vực: CSS / máy chủ phát triển (tái diễn E-020, E-027)
- Triệu chứng: Thêm class `.scroll-quiet` vào `globals.css`, kiểm tra trên trình duyệt thì thanh cuộn vẫn hiện và `getComputedStyle` trả về `auto`. Tải file CSS mà trang đang dùng thì không thấy rule mới.
- Nguyên nhân: Máy chủ phát triển giữ bản CSS biên dịch cũ sau khi sửa `globals.css`, nên rule mới không được phục vụ.
- Cách sửa: Dừng máy chủ, xoá `.next`, chạy lại `npm run dev -- -p 3100`. Sau đó kiểm tra rule đã có trong CSS được phục vụ.
- Quy tắc phòng ngừa: Sau khi sửa `globals.css` mà kiểm tra trình duyệt không khớp, lấy file CSS của trang (link rel="stylesheet") và tìm tên rule. Nếu không có, khởi động lại máy chủ trước khi kết luận sai về code.
- Đã áp dụng ở: thêm `.scroll-quiet` và đổi bậc chữ trong `globals.css`.

## E-044 · Chữ trông mờ do ép khử răng cưa grayscale
- Ngày: 2026-10-14
- Khu vực: CSS / kết xuất phông
- Triệu chứng: Người dùng (Windows) thấy chữ "mờ mờ", mảnh, nhất là chữ phụ và chữ nhỏ.
- Nguyên nhân: `body { -webkit-font-smoothing: antialiased }` và class `antialiased` ở `<html>` ép khử răng cưa grayscale, làm chữ mảnh hơn. Trên Windows, bỏ nó đi để trình duyệt dùng ClearType (khử răng cưa subpixel) cho chữ nét, đậm hơn. Ngoài ra `--muted #958D7C` trên nền trắng tương phản thấp (~3.2:1, dưới AA) nên chữ phụ trông nhạt.
- Cách sửa: Bỏ `-webkit-font-smoothing: antialiased` ở `body` và class `antialiased` ở `<html>`. Làm đậm `--muted` thành `#7C7462` (~4.3:1) và `--ink-2` thành `#544E40` ở chế độ sáng.
- Quy tắc phòng ngừa: Không ép `-webkit-font-smoothing: antialiased` toàn trang. Màu chữ phụ trên nền sáng phải đạt tương phản tối thiểu ~4.3:1.
- Đã áp dụng ở: `globals.css` (body, `--muted`, `--ink-2`), `layout.tsx` (bỏ class `antialiased`).

## E-045 · Bảng dữ liệu không hiện trên máy tính vì lớp breakpoint được ghép lúc chạy
- Ngày: 2026-10-14
- Khu vực: Tailwind / bảng dùng chung (`src/components/ui/datagrid.tsx`)
- Triệu chứng: Sau khi chuyển danh sách sang bảng dùng chung, máy tính không hiện bảng và không hiện thẻ. Trang Học phí chỉ còn chip và ô tìm kiếm. Trang Học sinh cũng mất bảng. Chụp snapshot thấy vùng nội dung trống. Không có lỗi console.
- Nguyên nhân: Lớp hiển thị được ghép từ biến: `${bp}:block` với `bp = 'min-[1200px]'`. Tailwind quét mã nguồn theo tên lớp nguyên văn, nên không tạo CSS cho `min-[1200px]:block`. Bảng luôn bị `hidden`. Thẻ dùng `min-[1200px]:hidden` có sẵn ở chỗ khác nên bị ẩn trên máy tính, và cả hai đều trống.
- Cách sửa: Viết nguyên văn mọi lớp theo breakpoint trong các hằng `TABLE_SHOW`, `TABLE_SHOW_FILL`, `BODY_FILL`, `CARDS_HIDE_ABOVE` (mỗi mốc một chuỗi đầy đủ). Không ghép chuỗi lúc chạy.
- Quy tắc phòng ngừa: Lớp Tailwind phải xuất hiện nguyên văn trong mã nguồn. Không dựng `min-[...]:` hay `md:` từ biến. Kiểm tra bằng cách đo `getComputedStyle(el).display` ở đúng breakpoint sau khi đổi, không chỉ nhìn code.
- Đã áp dụng ở: `datagrid.tsx`. Kiểm tra lại: `e2e/work.spec.ts` (học phí), `e2e/students.spec.ts`, ảnh chụp `/hoc-sinh` và `/hoc-phi` ở 1440px.

## E-046 · Kiểm thử đầu cuối dựa vào vai trò của giao diện cũ (tab, bảng, ô chọn buổi)
- Ngày: 2026-10-14
- Khu vực: E2E (`e2e/work.spec.ts`, `e2e/students.spec.ts`)
- Triệu chứng: Sau khi đổi Điểm danh sang dải buổi và lưới thẻ, ba kịch bản điểm danh lỗi: không tìm thấy ô "Chọn buổi học", không đếm được dòng bảng, không tìm thấy chữ "Có mặt N". Mục hồ sơ học sinh báo không có vùng navigation "Mục hồ sơ" khi đổi sang chip tab.
- Nguyên nhân: Kiểm thử gắn vào cấu trúc DOM và vai trò của giao diện cũ. Mục hồ sơ là liên kết, không phải tab, nên dùng `role="tab"` là sai ngữ nghĩa.
- Cách sửa: Mục hồ sơ dùng `<nav aria-label="Mục hồ sơ">` với chip liên kết (không có vai trò tab). Kiểm thử điểm danh chọn buổi bằng tab có ngày trong tên, đếm thẻ có `role="group"` tên "Điểm danh ...". Đoạn chữ "Có mặt N" nằm trong một phần tử nên khớp được.
- Quy tắc phòng ngừa: Khi đổi giao diện, kiểm tra kịch bản E2E theo vai trò và tên hiển thị, sửa test cùng lúc với code. Với liên kết dùng `navigation` + `link`, không đổi sang `tab` nếu nội dung là đường dẫn.
- Đã áp dụng ở: `StudentProfile.tsx`, `e2e/work.spec.ts`.

## E-047 · Thanh cuộn của bảng trong màn lớn trước đây đè lên tiêu đề cột
- Ngày: 2026-10-14
- Khu vực: Bảng dùng chung (`datagrid.tsx`)
- Triệu chứng: Khi bảng có nhiều dòng và được cố định chiều cao (`fill`), tiêu đề cột cuộn đi mất.
- Nguyên nhân: Chỉ thân bảng có `overflow-y-auto` nhưng tiêu đề không dính; khi đặt tiêu đề ngoài vùng cuộn thì mất định vị.
- Cách sửa: Tiêu đề cột nằm trong vùng cuộn của bảng với `sticky top-0 z-10 bg-surface`. Vùng cuộn đặt ở `role="table"` để sticky bám đúng khung.
- Quy tắc phòng ngừa: Tiêu đề dính luôn nằm cùng vùng cuộn với các dòng dữ liệu.
- Đã áp dụng ở: `datagrid.tsx`.

## E-048 · Chữ khối buổi bị cắt khi hai buổi trùng giờ (lịch tuần)
- Ngày: 2026-10-14
- Khu vực: Lịch học (`src/components/schedule/ScheduleView.tsx`)
- Triệu chứng: Khi hai buổi trùng giờ, mỗi khối chỉ rộng khoảng 55–65px. Giờ "17:00–18:00", tên lớp, giáo viên và nhãn trạng thái bị cắt bằng dấu ba chấm. Nhãn "Sắp học" bị đẩy ra ngoài khối. Buổi dưới 90 phút còn bị ẩn giáo viên và trạng thái, nên thông tin mất hẳn.
- Nguyên nhân: Mọi dòng trong khối dùng `truncate`. Chiều cao một giờ 56px quá thấp cho bốn dòng. Nhãn trạng thái là `Pill` có đệm nên rộng hơn làn. Lưới có chiều rộng tối thiểu 760px nên làn còn hẹp hơn nữa.
- Cách sửa: Bỏ `truncate`, cho chữ xuống dòng (`break-words`). Trạng thái thành chấm màu kèm chữ. Bỏ ngưỡng 90 phút, buổi nào cũng hiện đủ thông tin. Chiều cao một giờ 96px (`--cal-hour-h`). Lưới rộng tối thiểu 1100px, dưới mốc đó cuộn ngang trong khung. Làn cách nhau 4px.
- Quy tắc phòng ngừa: Không cắt bằng `truncate` những nội dung cần đọc (giờ, tên lớp, trạng thái). Khi xếp khối theo giờ, tính trước chiều rộng làn khi hai buổi trùng giờ và chiều cao cần cho các dòng chữ. Đo `scrollHeight` và `scrollWidth` của từng khối ở 1440, 1366 và 1024px.
- Đã áp dụng ở: `ScheduleView.tsx` (`CalendarBlock`, lưới), `globals.css` (`--cal-hour-h`). Kiểm tra bằng spec tạm đo mọi khối: không còn khối nào vượt, đã xoá spec sau khi đo.

## E-049 · Đổi `--cal-hour-h` trong globals.css không có hiệu lực cho đến khi khởi động lại dev server (tái diễn E-043)
- Ngày: 2026-10-14
- Khu vực: CSS / máy chủ phát triển
- Triệu chứng: Đổi `--cal-hour-h` từ 3.5rem sang 5.5rem, tải lại trang vẫn đo được giờ cao 56px. Lưới vẫn theo giá trị cũ dù file đã sửa.
- Nguyên nhân: Giống E-043. Máy chủ phát triển không phục vụ token mới trong `globals.css`. Token được đọc qua `calc(... * var(--cal-hour-h))` nên lỗi nằm ẩn trong vị trí các khối.
- Cách sửa: Dừng máy chủ, xoá `.next`, chạy lại `npm run dev -- -p 3100`. Trước khi đo khối, kiểm tra giá trị token của trang bằng `getComputedStyle(document.documentElement).getPropertyValue('--cal-hour-h')`.
- Quy tắc phòng ngừa: Sau mỗi lần đổi token trong `globals.css`, khởi động lại máy chủ rồi đọc lại token bằng `getPropertyValue` trước khi tin kết quả đo. Không kết luận về bố cục khi chưa xác nhận token đã đổi.
- Đã áp dụng ở: lịch học, sau hai lần khởi động lại máy chủ trong phiên 2026-10-14.

## E-050 · E2E lịch chờ nút theo tên cũ đến hết thời gian của test sau khi đổi giao diện
- Ngày: 2026-10-14
- Khu vực: E2E (`e2e/lich.spec.ts`, `e2e/work.spec.ts`)
- Triệu chứng: Lần chạy đầy đủ kéo dài trên 10 phút. Các test lịch chờ `getByRole('button', { name: 'Chọn ngày' })` đến hết thời gian của test rồi lỗi, trong khi trang vẫn hiển thị đúng ở trình duyệt.
- Nguyên nhân: Nút đổi sang "Chọn khoảng ngày, đang xem …" và cách chọn đổi sang hai lần bấm, nhưng file test không được sửa cùng lúc nên test vẫn tìm tên cũ và không bao giờ khớp.
- Cách sửa: Viết lại `e2e/lich.spec.ts` theo giao diện mới (hai lần bấm, nút hiện khoảng, bảng trong màn hình, chọn nhiều lớp). Đổi tên link trong `e2e/work.spec.ts` thành "Khoảng sau".
- Quy tắc phòng ngừa: Khi đổi nhãn, tên nút hoặc luồng thao tác của giao diện, sửa test E2E trong cùng một thay đổi. Chạy riêng file E2E liên quan trước khi chạy toàn bộ, để lỗi lộ ra sớm thay vì chờ hết thời gian từng test.
- Đã áp dụng ở: `e2e/lich.spec.ts`, `e2e/work.spec.ts`.

## E-051 · Ô tìm trên thanh đầu giữ chữ cũ ("null") khi sang trang khác
- Ngày: 2026-10-14
- Khu vực: Thanh trên cùng (`src/components/shell/AppBar.tsx`)
- Triệu chứng: Người dùng gõ "null" vào ô tìm trên thanh đầu, tìm thì sang trang Học sinh. Sang trang khác bằng thanh bên, chữ "null" vẫn nằm trong ô tìm.
- Nguyên nhân: Ô tìm là trạng thái của `AppBar`, nằm trong layout nên không được tạo lại khi đổi trang. Trạng thái không gắn với `?q=` trên URL nên không bao giờ được xoá.
- Cách sửa: Ô tìm lấy giá trị từ `?q=` khi đang ở `/hoc-sinh`, ở trang khác thì trống. Đồng bộ ngay trong lúc render khi URL đổi, không dùng setState trong effect (lint `react-hooks/set-state-in-effect` báo lỗi).
- Quy tắc phòng ngừa: Trạng thái đặt trong layout phải được đồng bộ với URL hoặc xoá khi đổi trang. Không để ô tìm toàn cục giữ chữ của trang trước. Có test E2E cho việc chữ còn lại hay không khi sang trang khác (`e2e/topbar.spec.ts`).
- Đã áp dụng ở: `src/components/shell/AppBar.tsx`, `e2e/topbar.spec.ts`, DESIGN mục 4.

## E-052 · Bảng thông báo tràn khỏi mép trái trên điện thoại
- Ngày: 2026-10-14
- Khu vực: Chuông thông báo (`src/components/shell/NotificationBell.tsx`)
- Triệu chứng: Trên 390px, bảng thông báo căn phải theo nút chuông nhưng nút nằm giữa thanh (còn ô tìm và các biểu tượng bên phải). Bảng bị tràn mép trái, mất chữ đầu dòng.
- Nguyên nhân: Bảng đặt `absolute right-0` trong thanh đầu. Thanh đầu có `backdrop-blur`, nên định vị cố định bên trong thanh cũng không tham chiếu màn hình được.
- Cách sửa: Đưa bảng ra `document.body` bằng portal. Đặt top, left, width tính từ vị trí nút và kẹp trong màn hình với mép 16px.
- Quy tắc phòng ngừa: Bảng nổi trong thanh có backdrop-filter thì dùng portal và tính vị trí theo nút, không dùng `right-0` cho nút nằm giữa thanh. Kiểm tra bảng ở 390px sau khi đổi, không chỉ ở 1440px.
- Đã áp dụng ở: `src/components/shell/NotificationBell.tsx`.

## E-053 · Số học sinh vắng bị chặn ở 8, chuông và Tổng quan đếm thiếu
- Ngày: 2026-10-14
- Khu vực: Truy vấn `listFrequentAbsentees` (`src/lib/queries/dashboard.ts`), dùng cho Tổng quan và chuông thông báo.
- Triệu chứng: Khi có hơn 8 học sinh đủ điều kiện vắng từ hai buổi trở lên trong 7 ngày, Tổng quan và chuông đều chỉ ghi 8. Tiêu đề "Cần chú ý (N)" cũng thiếu cùng số đó.
- Nguyên nhân: Truy vấn có `LIMIT 8` để cắt danh sách hiển thị. Số đếm lấy từ `absentees.length` của chính danh sách đã cắt, nên bị chặn theo. Bài E2E so khớp chuông với Tổng quan vẫn qua vì hai bên cùng bị chặn, nên không bắt được lỗi này.
- Cách sửa: Bỏ `LIMIT 8` khỏi truy vấn để hàm trả về đủ. Tổng quan tự cắt 8 dòng khi hiển thị (`absentees.slice(0, 8)`), bố cục giữ như cũ. Chuông cắt 5 dòng mỗi nhóm và có "Xem tất cả N mục".
- Quy tắc phòng ngừa: Truy vấn trả về đủ dữ liệu, chỗ hiển thị tự cắt. Không đặt LIMIT trong truy vấn rồi lấy số đếm từ đó. Khi số đếm đi vào tiêu đề hoặc chuông, kiểm tra nó không lấy từ danh sách đã cắt.
- Đã áp dụng ở: `src/lib/queries/dashboard.ts`, `src/app/(app)/tong-quan/page.tsx`.

## E-054 · E2E không chạy được vì thiếu trình duyệt Playwright bản 1248
- Ngày: 2026-10-14
- Khu vực: Kiểm thử đầu cuối (`npm run test:e2e`) trên máy này
- Triệu chứng: 33 kịch bản lỗi ngay khi mở trình duyệt với thông báo `browserType.launch: Executable doesn't exist at ...chromium_headless_shell-1248...`. 10 kịch bản không chạy. Không có lỗi nào trong mã.
- Nguyên nhân: Cache Playwright trên máy chỉ có bản 1234, còn bản Playwright đang dùng cần bản 1248. Biến `E2E_CHROME_PATH` không được đặt.
- Cách sửa: Đặt `E2E_CHROME_PATH` trỏ tới Chrome đã cài (`C:/Program Files/Google/Chrome/Application/chrome.exe`), hoặc chạy `npx playwright install chromium`.
- Quy tắc phòng ngừa: Trước khi đọc kết quả E2E, kiểm tra log có dòng `N passed` và `EXIT=0`. Lệnh `echo` sau lệnh test luôn trả về 0, nên mã thoát của tác vụ nền không đủ để kết luận. Nếu mọi kịch bản lỗi cùng một lỗi trình duyệt thì đó là môi trường, không phải mã.
- Đã áp dụng ở: lần chạy E2E sau đó, với `E2E_CHROME_PATH`.

## E-055 · Kiểm thử bộ chọn cơ sở đọc cookie trước khi máy chủ ghi xong
- Ngày: 2026-10-14
- Khu vực: `e2e/co-so.spec.ts`
- Triệu chứng: Sau khi chọn "Tất cả cơ sở", ô hiện đúng ngay. Tải lại trang thì ô quay về "Cơ sở chính".
- Nguyên nhân: Ô đổi ngay nhờ `useOptimistic`, còn action đặt cookie chạy sau trên máy chủ. Lệnh tải lại đến trước khi trình duyệt nhận cookie mới. Máy chủ vẫn đúng: log có `setCampusAction("all")` chạy thành công.
- Cách sửa: Trong kịch bản, chờ cookie `esl-campus` có giá trị `all` rồi mới tải lại.
- Quy tắc phòng ngừa: Với lựa chọn lưu bằng cookie hoặc server action, kiểm thử chờ kết quả thật (cookie, dữ liệu) trước khi tải lại. Ô đổi ngay không chứng minh là đã lưu.
- Đã áp dụng ở: `e2e/co-so.spec.ts`.

## E-056 · Migration thêm cột bắt buộc vào bảng đã có dữ liệu
- Ngày: 2026-10-14
- Khu vực: Migration 0003 (cơ sở) và 0004 (giáo viên - cơ sở) trong `src/db/migrations`
- Triệu chứng: `drizzle-kit generate` sinh `ALTER TABLE classes ADD COLUMN campus_id integer NOT NULL;`. Trên bảng đã có lớp, câu lệnh này lỗi vì không có giá trị mặc định.
- Nguyên nhân: Drizzle chỉ sinh DDL theo schema, không biết phải gán dữ liệu cũ trước khi đặt NOT NULL.
- Cách sửa: Sửa file SQL trước khi áp dụng (file chưa áp dụng nên được phép). Tạo cơ sở mặc định, thêm cột cho phép NULL, gán mọi lớp vào cơ sở đầu tiên, rồi mới đặt NOT NULL. Migration 0004 gán mọi giáo viên hiện có vào cơ sở đầu tiên bằng `INSERT ... SELECT`. Kiểm tra sau khi áp dụng: số liên kết bằng số giáo viên, không có giáo viên nào thiếu cơ sở.
- Quy tắc phòng ngừa: Mỗi lần generate, đọc SQL trước. Cột NOT NULL mới trên bảng có dữ liệu phải có bước gán giá trị trước. Không sửa migration đã áp dụng (CLAUDE.md mục 4).
- Đã áp dụng ở: `src/db/migrations/0003_co_so_mot_nhieu_lop.sql`, `src/db/migrations/0004_giao_vien_nhieu_co_so.sql`.

## E-057 · Esc trong ô chọn đặt trong hộp thoại làm đóng cả hộp thoại
- Ngày: 2026-10-14
- Khu vực: `src/components/ui/SelectPanel.tsx`, `src/components/ui/Modal.tsx`
- Triệu chứng: Mở ô chọn có tìm (ví dụ "Học sinh *" trong hộp thoại Gán học sinh), bấm một mục rồi nhấn Esc. Ô chọn đóng, nhưng cả hộp thoại cũng đóng và mất lựa chọn. E2E treo chờ nút Gán học sinh đã biến mất.
- Nguyên nhân: Ô chọn xử lý Esc bằng `stopPropagation`, nhưng Modal lắng nghe Esc trên `document`. Trang này gắn sự kiện React ở `document`, nên hai trình lắng nghe cùng một nút và `stopPropagation` không chặn được Modal.
- Cách sửa: Ô chọn gọi `preventDefault` khi xử lý Esc. Modal chỉ đóng khi Esc chưa được xử lý (`!e.defaultPrevented`).
- Quy tắc phòng ngừa: Khi một thành phần con xử lý Esc, gọi `preventDefault` (không chỉ `stopPropagation`). Modal và các lớp nghe Esc trên `document` phải kiểm tra `defaultPrevented`. Kiểm thử hộp thoại có ô chọn phải thử Esc hai lần: lần đầu chỉ đóng ô chọn, lần sau mới đóng hộp thoại.
- Đã áp dụng ở: `src/components/ui/SelectPanel.tsx`, `src/components/ui/Modal.tsx`, `e2e/catalog.spec.ts` (kịch bản gán học sinh).

## E-058 · Bảng phụ huynh cắt nút ⋯ ở 1200–1440px và tiêu đề không dính khi cuộn
- Ngày: 2026-10-14
- Khu vực: `src/components/ui/datagrid.tsx`, trang Phụ huynh
- Triệu chứng: Với 3 cột học sinh ở 1200px, bảng rộng 1022px trong khung 944px. Nút ⋯ nằm ngoài khung (mép phải x=1254, khung chỉ đến 1176), nên không bấm được. Khi cuộn trang, tiêu đề cột trôi khỏi màn hình (lệch -692px).
- Nguyên nhân: Khung bảng đặt `overflow-hidden`, nên phần tràn bị cắt và không có thanh cuộn ngang. Tiêu đề chỉ dính khi bật `fill`, mà trang này chưa bật.
- Cách sửa: `DataGrid` không `fill` cuộn ngang trong khung (`overflow-x-auto` trên thân bảng). Trang Phụ huynh bật `fill` và chia trang 10 người mỗi trang.
- Quy tắc phòng ngừa: Đo bảng với số cột tối đa và ít nhất 50 dòng ở 1200px, không chỉ ở 1440px. Khung có `overflow-hidden` phải có cách cuộn ngang cho nội dung tràn. Tiêu đề dính chỉ hoạt động khi thân bảng là vùng cuộn.
- Đã áp dụng ở: `src/components/ui/datagrid.tsx`, `src/components/parents/ParentList.tsx`, `src/components/ui/controls.tsx` (phân trang), `e2e/catalog.spec.ts` (kịch bản chia trang).

## E-059 · Chân phân trang bảng Phụ huynh hiện trên thẻ điện thoại
- Ngày: 2026-10-14
- Khu vực: `src/components/parents/ParentList.tsx`
- Triệu chứng: Ở 390px, dòng "Trang 1 / 7" và các số trang hiện ngay trên thẻ phụ huynh, dãy số tràn và cắt số "7" ở mép phải. Trang Học sinh không bị. Phát hiện khi đo (`pagerBottom` 335px, phân trang vẫn hiện) và xem ảnh chụp ở 390px sau đợt đổi đầu trang.
- Nguyên nhân: `DataGrid` đặt `footer` ngoài khung bảng và không ẩn theo mốc của bảng. Trang Phụ huynh truyền `Pagination` trần, còn trang Học sinh bọc chân bảng bằng `hidden min-[768px]:block`.
- Cách sửa: Bọc chân bảng bằng `footerShow`, cùng mốc với bảng: `hidden min-[1200px]:block` khi có nhiều cột học sinh, `hidden min-[768px]:block` khi chỉ có một cột. Đo lại ở 390px: phân trang không hiện.
- Quy tắc phòng ngừa: Chân bảng (phân trang, ghi chú) phải có cùng mốc hiện với bảng. Mỗi lần đổi bảng, đo ở 390px xem có phần nào của bảng hoặc chân bảng hiện trên thẻ không.
- Đã áp dụng ở: `src/components/parents/ParentList.tsx`.

## E-060 · Tên học sinh xuống dòng làm nút cao 42px, chuẩn giao diện báo lỗi
- Ngày: 2026-10-14
- Khu vực: `src/components/parents/ParentList.tsx`, `e2e/chuan.spec.ts`
- Triệu chứng: Sau khi tên học sinh hiện đủ (không cắt), `chuan.spec.ts` ở 1440px báo 7 nút trên /phu-huynh cao 42px, ví dụ "Dương Nhật Nam Bố". Chuẩn là 32px hoặc 36px.
- Nguyên nhân: Nút tên học sinh chứa chữ có thể xuống hai dòng nên cao theo chữ. Bộ đo chỉ bỏ qua `data-card`, chưa có chỗ cho liên kết trong ô.
- Cách sửa: Thêm `data-link="true"` cho nút tên học sinh. `chuan.spec.ts` bỏ qua `data-link` như `data-card`. Nút điều khiển (+ Thêm, Sửa, ⋯) vẫn được đo đủ. Ghi quy tắc vào DESIGN mục 8.
- Quy tắc phòng ngừa: Nút có chữ có thể xuống dòng thì đặt `data-link`; nút điều khiển luôn 32px. Khi đổi chữ sang nhiều dòng, chạy `chuan.spec` trước khi báo xong.
- Đã áp dụng ở: `src/components/parents/ParentList.tsx`, `e2e/chuan.spec.ts`, `docs/DESIGN.md`.

## E-061 · Cột Thao tác bị đẩy khỏi khung khi bảng cuộn ngang, menu ⋯ dòng cuối bị cắt
- Ngày: 2026-10-14
- Khu vực: `src/components/ui/datagrid.tsx`, `src/components/ui/RowMenu.tsx`, `src/components/parents/ParentList.tsx`
- Triệu chứng: Ở 1200–1439px, bảng Phụ huynh cuộn ngang. Khi cuộn sang phải, nút ⋯ sát mép khung hoặc ra ngoài. Menu ⋯ của dòng cuối vẽ xuống dưới khung bảng: đáy menu 909px, đáy khung 840px, màn hình 900px, nên không xem được các mục.
- Nguyên nhân: (1) Cột Thao tác là cột cuối nên bị đẩy ra ngoài khi bảng cuộn ngang. (2) Menu của RowMenu là absolute trong khung cuộn, nên bị cắt ở đáy khung; dòng cuối mở xuống thì vượt khỏi khung.
- Cách sửa: DataGrid có `stickyEnd`: cột cuối dính mép phải (`sticky right-0`, lề 16px), và dòng có `minWidth` bằng tổng cột để ô dính có khung bám. RowMenu vẽ menu bằng portal lên body, định vị theo nút, mở lên khi thiếu chỗ bên dưới, đóng khi cuộn hoặc đổi cỡ màn hình. Cột Ghi chú giảm min từ 110px xuống 104px để bảng vẫn vừa 1440px.
- Quy tắc phòng ngừa: Bảng cuộn ngang có cột thao tác ở cuối thì đặt `stickyEnd`. Menu trong khung cuộn phải vẽ bằng portal, không absolute trong khung. Đo menu của dòng cuối ở màn hình cao 900px: đáy menu không được vượt màn hình.
- Đã áp dụng ở: `src/components/ui/datagrid.tsx`, `src/components/ui/RowMenu.tsx`, `src/components/parents/ParentList.tsx`.

## E-062 · Thông báo sau khi lưu biến mất vì trang làm mới dựng lại cây giao diện
- Ngày: 2026-10-15
- Khu vực: Giao diện (`src/components/ui/Toast.tsx`), các màn gọi `router.refresh()` sau khi lưu
- Triệu chứng: Lưu câu hỏi bài tập xong, thông báo "Đã lưu 3 câu hỏi" hiện rồi mất. Kịch bản E2E "bài tập có câu hỏi" lúc đạt lúc không. Theo dõi DOM bằng MutationObserver: sau khi lưu, phần tử tiêu đề của trang bị gỡ và dựng lại, và thông báo mất theo.
- Nguyên nhân: Thông báo giữ trong state của `useToast` ở component chứa dữ liệu. `router.refresh()` làm dựng lại cây giao diện đó, nên state mất.
- Cách sửa: Trạng thái thông báo giữ ở mức module bằng `useSyncExternalStore`. Thông báo vẫn còn sau khi trang làm mới.
- Quy tắc phòng ngừa: Thông báo sau khi lưu phải sống qua `router.refresh()`. Không để thông báo trong state của component có dữ liệu được làm mới. Kiểm tra: sau khi lưu, thông báo còn hiện sau 500ms và sau khi trang làm mới.
- Đã áp dụng ở: `src/components/ui/Toast.tsx`.

## E-063 · Tên tài liệu gõ trong lúc tải tệp bị ghi đè bằng tên tệp
- Ngày: 2026-10-15
- Khu vực: Giao diện (`src/components/lessons/MaterialsPanel.tsx`)
- Triệu chứng: Chọn tệp tài liệu, gõ tên "Bảng từ vựng" trong lúc tệp đang tải lên. Khi tải xong, tên bị đổi thành "tu-vung.txt" và tài liệu lưu với tên tệp.
- Nguyên nhân: Hàm tải tệp đọc `title` từ closure lúc bắt đầu tải (còn rỗng), nên `if (!title) setTitle(r.name)` ghi đè tên gõ sau đó.
- Cách sửa: `setTitle((prev) => (prev.trim() === '' ? r.name : prev))`.
- Quy tắc phòng ngừa: Khi cập nhật state sau một `await`, dùng hàm cập nhật `(prev) => …` thay vì giá trị đọc từ closure lúc bắt đầu. Kịch bản E2E phải gõ tên trong lúc tải tệp để bắt lỗi này.
- Đã áp dụng ở: `src/components/lessons/MaterialsPanel.tsx`.

## E-064 · Build trên Vercel thất bại vì thiếu DATABASE_URL khi thu thập cấu hình route
- Ngày: 2026-10-16
- Khu vực: Next.js (build), CSDL (`src/db/client.ts`)
- Triệu chứng: Vercel build nhánh main (commit 34a7253) lỗi: "Failed to collect configuration for /logout ... Thiếu DATABASE_URL". Tái hiện ở máy: chuyển `.env.local` đi rồi `next build` cũng lỗi (lần này ở `/api/files/[id]`).
- Nguyên nhân: `src/db/client.ts` tạo pool và ném lỗi ngay khi module được nạp, nếu thiếu `DATABASE_URL`. Route `/logout` import `lib/session` → `db/client`. Khi build, Next nạp module của route để thu thập cấu hình, nên build cần có chuỗi kết nối.
- Cách sửa: Tạo pool và drizzle ở lần dùng đầu tiên (`getPool`, `getDb`), bọc bằng `lazy` (Proxy). Build không cần CSDL. Lúc chạy, nếu thiếu cấu hình vẫn báo lỗi rõ ràng.
- Quy tắc phòng ngừa: Module dùng chung (CSDL, biến môi trường) không được ném lỗi khi nạp module, chỉ ném khi thực sự dùng. Trước khi báo deploy xong: tạm chuyển `.env.local` đi rồi chạy `next build` để tái hiện điều kiện của Vercel, rồi khôi phục. Runtime trên Vercel vẫn cần `DATABASE_URL` và `SESSION_SECRET` đặt trong cấu hình dự án.
- Đã áp dụng ở: `src/db/client.ts`.

## E-065 · Seed lỗi trên DB mới vì cơ sở mặc định đã có sẵn từ migration
- Ngày: 2026-10-16
- Khu vực: CSDL (`src/db/seed.ts`, migration `0003_co_so_mot_nhieu_lop.sql`)
- Triệu chứng: Chạy `npm run db:migrate` rồi `npm run db:seed` trên database trống (esl_center trên Neon). Seed báo `duplicate key value violates unique constraint "campuses_name_key"` với "Cơ sở chính".
- Nguyên nhân: Migration 0003 chèn sẵn dòng "Cơ sở chính" để gán dữ liệu cũ. Seed chỉ kiểm tra bảng `students` và `teachers` có trống không, rồi insert campus bằng insert thường. Trên DB đã seed bằng `--reset` thì bảng `campuses` bị TRUNCATE trước nên không gặp lỗi, nên lỗi chỉ lộ ra trên DB mới.
- Cách sửa: Insert campus dùng `onConflictDoUpdate({ target: campuses.name })`, cập nhật địa chỉ mẫu nếu đã có. Transaction seed vẫn rollback khi lỗi nên không để dữ liệu dở.
- Quy tắc phòng ngừa: Seed phải chạy được trên DB vừa migrate, không chỉ trên DB đã reset. Khi migration chèn dữ liệu nền, seed dùng upsert theo khoá tự nhiên hoặc bỏ qua bản ghi đó. Kiểm tra: `migrate` rồi `db:seed` trên DB trống phải chạy được, và chạy `db:seed` lần hai phải báo bỏ qua.
- Đã áp dụng ở: `src/db/seed.ts`.

## E-066 · Migration viết tay không có trong journal nên `db:migrate` bỏ qua
- Ngày: 2026-10-19
- Khu vực: CSDL (`src/db/migrations/0016_online_exercise_types.sql`)
- Triệu chứng: Commit P35 có file `0016_online_exercise_types.sql` nhưng `__drizzle_migrations` chỉ có 15 bản. DB dev chạy được vì đã chạy tay; DB khác (Vercel, máy mới) sẽ thiếu cột và bảng mới.
- Nguyên nhân: File SQL viết tay, không chạy `npm run db:generate`, nên không có dòng trong `meta/_journal.json` và không có snapshot. Drizzle chỉ chạy migration có trong journal.
- Cách sửa: Chạy `db:generate -- --name=online_exercise_types` để có journal và snapshot, giữ nội dung SQL viết tay (có IF NOT EXISTS nên chạy lại trên DB đã có vẫn được), rồi `db:migrate`.
- Quy tắc phòng ngừa: Mọi migration phải sinh bằng `db:generate`. Trước khi commit, kiểm tra số file `.sql` bằng số dòng trong `_journal.json`.
- Đã áp dụng ở: `src/db/migrations/meta/_journal.json`, `meta/0016_snapshot.json`.

## E-067 · Nộp bài lỗi khi ghép đôi đúng một phần vì điểm lẻ ghi vào cột số nguyên
- Ngày: 2026-10-19
- Khu vực: Chấm điểm (`src/lib/assignment-scoring.ts`)
- Triệu chứng: Bài chỉ có câu tự chấm, câu ghép đôi đúng 1/3 cặp: tổng điểm 0.67, ghi vào `assignment_submissions.score` (integer) thì PostgreSQL từ chối, học sinh thấy "Không nộp được bài".
- Nguyên nhân: Ghép đôi tính điểm theo tỷ lệ cặp đúng, `storedScore` trả nguyên tổng lẻ.
- Cách sửa: `storedScore` làm tròn trước khi lưu. Unit test câu 2 điểm đúng 1/3 cặp lưu 1.
- Quy tắc phòng ngừa: Điểm tính ra số lẻ phải làm tròn trước khi ghi vào cột số nguyên. Unit test chấm điểm luôn có trường hợp điểm lẻ.
- Đã áp dụng ở: `src/lib/assignment-scoring.ts`, `tests/unit/assignment-scoring.test.ts`.

## E-068 · Màn soạn câu mới làm mất hai dạng câu cũ
- Ngày: 2026-10-19
- Khu vực: Giao diện (`src/components/assignments/ItemDraftCard.tsx`)
- Triệu chứng: Sau P35, lưới chọn dạng câu không còn "Trả lời viết" và "Nộp tệp"; giáo viên không tạo được câu viết. E2E `work.spec` tìm ô chọn "Loại của câu" không thấy.
- Nguyên nhân: Ô chọn loại câu (theo `ITEM_TYPES`) được thay bằng lưới thẻ có danh sách riêng, danh sách này bỏ sót hai dạng cũ, và lưới không có tên cho trình đọc màn hình.
- Cách sửa: Thêm lại hai dạng; lưới là `radiogroup` tên "Loại của câu n", mỗi thẻ là `radio`; cập nhật `work.spec`.
- Quy tắc phòng ngừa: Thay một ô chọn bằng giao diện khác thì giữ đủ mọi giá trị cũ và giữ tên truy cập; chạy E2E của màn đó trước khi commit.
- Đã áp dụng ở: `src/components/assignments/ItemDraftCard.tsx`, `e2e/work.spec.ts`.

## E-069 · Không lưu được câu hỏi khi để trống ô tiếng Việt hoặc ô nguồn
- Ngày: 2026-10-19
- Khu vực: Giao diện và validate (`src/components/assignments/item-draft.ts`, `src/lib/validation/assignment.ts`)
- Triệu chứng: Bấm lưu câu hỏi trong bài hoặc ngân hàng, hộp thoại báo "Invalid input: expected string, received null". E2E `work.spec` 6 test soạn câu không thấy thông báo "Đã lưu".
- Nguyên nhân: `draftToInput` gửi `null` cho `promptVi`, `referenceText`, `sourceLicense`, `maxSeconds` khi ô trống, còn schema zod chỉ nhận chuỗi (`.default('')` chỉ áp khi thiếu trường, không áp cho `null`).
- Cách sửa: Gửi chuỗi đã cắt khoảng trắng và `maxSeconds` mặc định 15. Unit test: câu mới để trống các ô phụ qua được `itemFormSchema`.
- Quy tắc phòng ngừa: Dữ liệu gửi từ form phải khớp đúng schema của máy chủ. Mỗi hàm chuyển form sang dữ liệu gửi đi có unit test chạy qua schema zod tương ứng.
- Đã áp dụng ở: `src/components/assignments/item-draft.ts`, `tests/unit/item-draft.test.ts`.

## E-070 · Ngân hàng câu hỏi làm mất nội dung của các dạng câu P35
- Ngày: 2026-10-22
- Khu vực: Ngân hàng câu hỏi (`src/app/(app)/ngan-hang-cau-hoi/actions.ts`, `src/lib/queries/question-bank.ts`)
- Triệu chứng: Lưu câu chọn tranh, ghép đôi, sắp xếp, điền chỗ trống, nói vào ngân hàng rồi chép sang bài thì câu mất đáp án, mất cặp ghép, mất câu chuẩn, mất hướng dẫn tiếng Việt. Câu chép sang bài không chấm được.
- Nguyên nhân: Khi thêm dạng câu ở P35, bảng `questions` và `question_pairs` đã có cột mới nhưng action lưu chỉ ghi đề, đoạn đọc, điểm, âm thanh; đáp án chỉ ghi khi dạng là `choice`; truy vấn đọc ngân hàng không đọc các cột mới.
- Cách sửa: Hàm `writeQuestion` ghi đủ mọi trường, đáp án cho chọn tranh và trắc nghiệm, cặp ghép cho ghép đôi, kiểm mọi tệp được trỏ tới; truy vấn đọc đủ trường và cặp ghép. Unit chép câu ghép đôi và sắp xếp từ ngân hàng; E2E lưu từ Soạn nhanh vào ngân hàng rồi chép vào bài, kiểm cặp ghép trong DB.
- Quy tắc phòng ngừa: Thêm cột cho câu hỏi thì sửa cùng lúc mọi nơi ghi và đọc câu: bài tập, ngân hàng, chép qua lại. Có test đi hết vòng lưu → đọc → chép cho từng dạng câu mới.
- Đã áp dụng ở: `src/app/(app)/ngan-hang-cau-hoi/actions.ts`, `src/lib/queries/question-bank.ts`, `tests/unit/item-draft.test.ts`, `e2e/soan-nhanh.spec.ts`.

## E-071 · Tải tệp qua server action quá 1 MB thì lỗi; bước xác nhận tải thẳng không kiểm loại tệp
- Ngày: 2026-10-22
- Khu vực: Tải tệp (`src/lib/storage.ts`, các màn soạn câu, tài liệu bài giảng, chấm bài, khu học sinh)
- Triệu chứng: Mọi nút tải tệp gửi tệp qua server action, mà server action của Next.js mặc định chỉ nhận 1 MB, nên ảnh, âm thanh hoặc bài nộp lớn hơn bị lỗi dù máy chủ cho tới 10–25 MB. Bước xác nhận tải thẳng (`completeDirectUpload`, P34) ghi loại tệp do trình duyệt khai mà không kiểm, không kiểm cỡ tệp thật. Màn soạn cho chọn ảnh WebP, GIF nhưng máy chủ từ chối.
- Nguyên nhân: Đường tải thẳng lên kho tệp có từ P34 nhưng chưa màn nào dùng; khi viết bước xác nhận chỉ kiểm khoá tệp.
- Cách sửa: Hàm `uploadFile` ở `src/lib/upload-client.ts` (xin link có chữ ký, PUT thẳng, xác nhận; chưa cấu hình kho tệp thì qua máy chủ) dùng cho mọi nút tải tệp (`uploadAsStaff`, `uploadAsStudent`). `completeDirectUpload` kiểm loại tệp theo `ALLOWED_TYPES` và cỡ tệp thật, quá cỡ thì xoá. Thêm `image/webp`, `image/gif`. Ghi âm cắt tham số MIME (`audio/webm;codecs=opus` thành `audio/webm`) trước khi tải.
- Quy tắc phòng ngừa: Tệp người dùng tải lên không đi qua server action. Giá trị trình duyệt gửi lên (loại tệp, cỡ) phải kiểm lại ở máy chủ trên dữ liệu thật. Danh sách loại tệp ở giao diện (`upload-types.ts`) và máy chủ (`ALLOWED_TYPES`) phải khớp nhau.
- Đã áp dụng ở: `src/lib/storage.ts`, `src/lib/upload-client.ts`, `src/app/(student)/cua-toi/actions.ts`, `ItemDraftCard.tsx`, `MaterialsPanel.tsx`, `AnswerDialog.tsx`, `StudentAssignmentForm.tsx`, `InteractiveExercisePlayer.tsx`.

## E-072 · Tài khoản nào đã kết nối Telegram cũng duyệt được đơn nghỉ của mọi học sinh
- Ngày: 2026-10-22
- Khu vực: Bot Telegram (`src/lib/telegram/service.ts`, `approveLeaveRequest`, `denyLeaveRequest`)
- Triệu chứng: Nút "Đồng ý duyệt" và "Từ chối" (callback_data `leave_appr:<studentId>:<sessionId>`, `leave_deny:...`) chỉ kiểm chat có gắn tài khoản. Kế toán, giáo viên cơ sở khác, hoặc ai sửa callback_data đều ghi được vắng vào sổ điểm danh và gửi tin cho phụ huynh, kể cả với buổi học không thuộc lớp của học sinh.
- Nguyên nhân: Hàm xử lý callback tin vào dữ liệu trong nút bấm, coi việc nút chỉ được gửi cho giáo viên phụ trách là đủ. callback_data do phía Telegram gửi lại nên có thể bị sửa, và webhook không qua `requirePermission` hay `require*Access` vì không có phiên đăng nhập.
- Cách sửa: Hàm `canDecideLeave` kiểm lại mỗi lần bấm: tài khoản còn hoạt động, có quyền `attendance.record` theo `role_permissions` (quản trị có mọi quyền), có dòng `account_campuses` ở cơ sở của lớp (quản trị không cần), và buổi học thuộc đúng lớp của học sinh. Không đủ thì trả lời callback "Bạn không có quyền duyệt đơn này" và không đổi dữ liệu. E2E gửi callback giả từ kế toán, giáo viên khác cơ sở, buổi của lớp khác, id không phải số; kiểm sổ điểm danh và tin gửi không đổi, rồi giáo viên đủ điều kiện duyệt được.
- Quy tắc phòng ngừa: Mọi hành động qua webhook hoặc callback (không có phiên đăng nhập) phải tự kiểm quyền, cơ sở và quan hệ giữa các id ngay trên máy chủ, theo đúng quy tắc của server action tương ứng. Không tin id trong callback_data, URL hay nút bấm.
- Đã áp dụng ở: `src/lib/telegram/service.ts`, `e2e/work.spec.ts`.

## E-073 · Màn Phụ huynh thiếu Gán học sinh, sửa ghi chú tại ô và thẻ sửa quan hệ; test lớp học ghi cứng ngày
- Ngày: 2026-10-22
- Khu vực: Màn Phụ huynh (`src/components/parents/ParentList.tsx`), E2E `e2e/catalog.spec.ts`
- Triệu chứng: Ba bài trong `catalog.spec` hỏng: không thấy mục menu "Gán học sinh", không thấy nút "Sửa ghi chú", và không thấy "Buổi 1 · 19/10/2026" ở trang lớp. Project `work` phụ thuộc `catalog` nên khi chạy cả bộ thì toàn bộ E2E của `work` bị bỏ qua.
- Nguyên nhân: Commit P22–P29 đã viết `ParentAssignForm`, `InlineText`, `ChildEditor`, các server action và test, nhưng `ParentList` chưa gắn các component này, nên tính năng chưa từng có trên màn. Bài tạo lớp ghi cứng ngày khai giảng 19/10/2026; ngày đó qua rồi thì buổi 1 không còn trong "Buổi học sắp tới".
- Cách sửa: `ParentList` có mục ⋯ "Gán học sinh" (và nút đầy chiều rộng trên thẻ điện thoại), cột Ghi chú sửa tại ô, chip học sinh mở thẻ sửa quan hệ hoặc gỡ liên kết, và nút "+ Thêm" hiện khi rê chuột hoặc Tab vào. Bài tạo lớp lấy ngày khai giảng là thứ Hai tuần sau. Cả 10 bài `catalog.spec` đạt; kiểm không tràn ngang ở 360, 390, 768, 1024, 1440px.
- Quy tắc phòng ngừa: Component viết xong phải được dùng ở màn trước khi commit; test E2E của tính năng phải chạy đạt trong cùng commit, không commit test cho giao diện chưa có. Test E2E không ghi cứng ngày tương lai: tính ngày theo hôm nay.
- Đã áp dụng ở: `src/components/parents/ParentList.tsx`, `e2e/catalog.spec.ts`.
