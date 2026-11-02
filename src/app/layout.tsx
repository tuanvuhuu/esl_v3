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
  themeColor: '#f6f8fa',
};

// Đặt giao diện sáng hoặc tối (kèm data-color-mode cho Primer) trước khi trang vẽ, để không bị nháy.
// Mặc định màu chủ đề là Xanh Primer ('blue' — không đặt data-accent).
const themeScript = `(function(){try{var r=document.documentElement;var p=localStorage.getItem('esl-theme');r.setAttribute('data-light-theme','light');r.setAttribute('data-dark-theme','dark');if(p==='light'||p==='dark'){r.setAttribute('data-theme',p);r.setAttribute('data-color-mode',p);}else{r.setAttribute('data-color-mode','auto');}var a=localStorage.getItem('esl-primer-accent');if(a&&a!=='blue'){r.setAttribute('data-accent',a);}else{r.removeAttribute('data-accent');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-color-mode="auto" data-light-theme="light" data-dark-theme="dark" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg font-sans font-normal text-ink antialiased">
        <PrimerProvider>{children}</PrimerProvider>
      </body>
    </html>
  );
}
