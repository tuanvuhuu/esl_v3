'use client';

import { ThemeProvider } from '@primer/react/next';
import { useEffect, type ReactNode } from 'react';
import { useLocalStorage } from '@/lib/use-local-storage';

// Dùng div[data-component="BaseStyles"][data-portal-root="true"] thay vì import <BaseStyles> của @primer/react:
// BaseStyles.module.css nạp rule không nằm trong @layer (`a { color: var(--fgColor-accent) }`), sẽ đè lên mọi
// class `text-*` trong `@layer utilities` của Tailwind CSS v4 trên toàn bộ thẻ <Link> / <a>.
export function PrimerProvider({ children }: { children: ReactNode }) {
  const [storedTheme] = useLocalStorage('esl-theme', 'light');
  const colorMode = storedTheme === 'dark' ? 'dark' : storedTheme === 'system' ? 'auto' : 'light';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-color-mode', colorMode);
    root.setAttribute('data-theme', storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'light');
    root.setAttribute('data-light-theme', 'light');
    root.setAttribute('data-dark-theme', 'dark');
  }, [colorMode, storedTheme]);

  return (
    <ThemeProvider colorMode={colorMode} dayScheme="light" nightScheme="dark" preventSSRMismatch>
      <div
        data-component="BaseStyles"
        data-portal-root="true"
        className="min-h-full font-sans text-[var(--fgColor-default)]"
      >
        {children}
      </div>
    </ThemeProvider>
  );
}
