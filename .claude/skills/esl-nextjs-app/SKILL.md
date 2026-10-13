---
name: esl-nextjs-app
description: Dùng khi viết mã Next.js trong dự án ESL Center: route, layout, Server và Client Component, Server Actions, cache, cấu hình. Nhắc đọc tài liệu đi kèm đúng phiên bản.
---

# Next.js trong ESL Center

## Trước khi viết mã

Phiên bản Next.js trong dự án có thay đổi so với kiến thức chung. Đọc tài liệu tương ứng trong `node_modules/next/dist/docs/` trước khi viết. Các mục hay dùng:

- `01-app/01-getting-started/03-layouts-and-pages.md`: route và layout.
- `01-app/01-getting-started/05-server-and-client-components.md`: ranh giới server và client.
- `01-app/01-getting-started/06-fetching-data.md`: đọc dữ liệu.
- `01-app/01-getting-started/07-mutating-data.md`: Server Actions, `refresh`, `revalidatePath`, `redirect`.
- `01-app/01-getting-started/08-caching.md` và `09-revalidating.md`: cache.

Nếu một API không có trong tài liệu, không đoán. Kiểm tra trong `node_modules` hoặc ghi chú trong PLAN.md.

## Cấu trúc đề xuất

```
src/app/
  layout.tsx              # khung gốc, font, token giao diện, script chống nháy giao diện
  (app)/                  # nhóm route có khung ứng dụng (sidebar, appbar, tab bar)
    layout.tsx
    page.tsx              # Tổng quan
    hoc-sinh/page.tsx
    lop-hoc/page.tsx
    giao-vien/page.tsx
    diem-danh/page.tsx
    hoc-phi/page.tsx
    bao-cao/page.tsx
    cai-dat/page.tsx
    tai-khoan/page.tsx
    tinh-nang/page.tsx
src/components/           # thành phần dùng chung
src/lib/                  # tiện ích thuần, không phụ thuộc React
src/db/                   # DB (chỉ server)
```

## Server và Client

- Mặc định là Server Component. Thêm `'use client'` chỉ khi cần state, sự kiện, hoặc API trình duyệt.
- Không import `src/db/client.ts` trong Client Component.
- Truyền dữ liệu từ server xuống client qua props, đã được tuần tự hoá.

## Server Actions

- Đặt trong `actions.ts` với `'use server'` ở đầu file, hoặc trong hàm có `'use server'`.
- Mọi action kiểm tra quyền và validate input. Đừng tin dữ liệu từ client.
- Sau khi ghi, gọi `revalidatePath` cho màn bị ảnh hưởng.

## Bộ lọc và phân trang trên URL

- Trạng thái lọc và trang nằm trong `searchParams`, để tải lại và chia sẻ link vẫn đúng.
- Server Component đọc `searchParams` và truy vấn DB.

## Tài liệu liên quan

- `CLAUDE.md` mục 2.
- `docs/ERROR-LOG.md` E-014 (khác biệt phiên bản).
