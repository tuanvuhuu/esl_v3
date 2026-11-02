import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { PrimerProvider } from '@/components/primer/PrimerProvider';
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
  themeColor: '#f6f8fa',
};

// Đặt giao diện sáng hoặc tối (kèm data-color-mode cho Primer) trước khi trang vẽ, để không bị nháy.
// Mặc định màu chủ đề là Xanh Primer ('blue' — không đặt data-accent).
const themeScript = `(function(){try{var r=document.documentElement;var p=localStorage.getItem('esl-theme');r.setAttribute('data-light-theme','light');r.setAttribute('data-dark-theme','dark');if(p==='light'||p==='dark'){r.setAttribute('data-theme',p);r.setAttribute('data-color-mode',p);}else{r.setAttribute('data-color-mode','auto');}var a=localStorage.getItem('esl-primer-accent');if(a&&a!=='blue'){r.setAttribute('data-accent',a);}else{r.removeAttribute('data-accent');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-color-mode="auto" data-light-theme="light" data-dark-theme="dark" className={`${beVietnam.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg font-sans text-ink">
        <PrimerProvider>{children}</PrimerProvider>
      </body>
    </html>
  );
}
