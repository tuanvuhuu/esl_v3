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
