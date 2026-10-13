import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
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
  themeColor: '#FBF8F1',
};

// Đặt giao diện sáng hoặc tối trước khi trang vẽ, để không bị nháy.
// Nếu người dùng chọn "Theo hệ thống" thì không đặt data-theme, CSS tự theo hệ điều hành.
const themeScript = `(function(){try{var p=localStorage.getItem('esl-theme');if(p==='light'||p==='dark'){document.documentElement.setAttribute('data-theme',p);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
