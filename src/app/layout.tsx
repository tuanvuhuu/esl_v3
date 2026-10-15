import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';

// Font chính: thiết kế riêng cho tiếng Việt, chữ đậm và rõ hơn ở cỡ nhỏ (đã chọn ngày 2026-10-14).
const beVietnam = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ESL Center',
  description: 'Quản lý trung tâm tiếng Anh',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

// Đặt giao diện sáng hoặc tối trước khi trang vẽ, để không bị nháy.
// Nếu người dùng chọn "Theo hệ thống" thì không đặt data-theme, CSS tự theo hệ điều hành.
const themeScript = `(function(){try{var r=document.documentElement;var p=localStorage.getItem('esl-theme');if(p==='light'||p==='dark'){r.setAttribute('data-theme',p);}var a=localStorage.getItem('esl-accent');if(a&&a!=='honey'){r.setAttribute('data-accent',a);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
