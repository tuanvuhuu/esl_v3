'use client';

import { BaseStyles } from '@primer/react';
import { ThemeProvider } from '@primer/react/next';
import { useEffect, type ReactNode } from 'react';
import { useLocalStorage } from '@/lib/use-local-storage';

export function PrimerProvider({ children }: { children: ReactNode }) {
  const [storedTheme] = useLocalStorage('esl-theme', 'system');
  const colorMode = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'auto';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-color-mode', colorMode);
    root.setAttribute('data-light-theme', 'light');
    root.setAttribute('data-dark-theme', 'dark');
  }, [colorMode]);

  return (
    <ThemeProvider colorMode={colorMode} dayScheme="light" nightScheme="dark" preventSSRMismatch>
      <BaseStyles className="min-h-full bg-bg font-sans text-ink">{children}</BaseStyles>
    </ThemeProvider>
  );
}

