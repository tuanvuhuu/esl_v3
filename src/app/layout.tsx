import type { Metadata, Viewport } from 'next';
import { PrimerProvider } from '@/components/primer/PrimerProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ESL Center',
  description: 'Quản lý trung tâm tiếng Anh',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

// Mặc định luôn dùng giao diện Sáng (Light Mode) sắc nét chuẩn Primer & 01. TSUKUBA.
// Chỉ sang tối khi người dùng chủ động chọn 'dark' (hoặc chọn 'system' trên máy đang bật Dark Mode).
const themeScript = `(function(){try{var r=document.documentElement;var p=localStorage.getItem('esl-theme');r.setAttribute('data-light-theme','light');r.setAttribute('data-dark-theme','dark');if(p==='dark'){r.setAttribute('data-theme','dark');r.setAttribute('data-color-mode','dark');}else if(p==='system'){r.setAttribute('data-theme','system');r.setAttribute('data-color-mode','auto');}else{r.setAttribute('data-theme','light');r.setAttribute('data-color-mode','light');}var a=localStorage.getItem('esl-accent-v2');if(a&&a!=='tsukuba'){r.setAttribute('data-accent',a);}else{r.removeAttribute('data-accent');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      data-theme="light"
      data-color-mode="light"
      data-light-theme="light"
      data-dark-theme="dark"
      className="h-full"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg font-sans font-normal text-ink antialiased">
        <PrimerProvider>{children}</PrimerProvider>
      </body>
    </html>
  );
}
