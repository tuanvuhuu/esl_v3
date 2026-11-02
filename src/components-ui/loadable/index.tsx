'use client';

import React, { lazy, Suspense } from 'react';
import LoaderPage from '../loader-page';

async function minDelay<T>(promise: Promise<T>, ms: number): Promise<T> {
  const [result] = await Promise.all([
    promise,
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
  return result;
}

export const Loadable = <P extends Record<string, unknown> = Record<string, unknown>>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  fallback: React.ReactNode,
) => {
  const LazyComponent = lazy(importFunc);

  const LoadableWrapper = (props: P): React.JSX.Element => (
    <Suspense fallback={fallback}>
      <LazyComponent {...(props as React.JSX.IntrinsicAttributes & P)} />
    </Suspense>
  );
  LoadableWrapper.displayName = 'LoadableWrapper';
  return LoadableWrapper;
};

export const LazyPage = <P extends Record<string, unknown> = Record<string, unknown>>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
) => {
  const LazyComponent = lazy(() =>
    minDelay(
      importFunc().then((mod) => ({ default: mod.default })),
      250,
    ),
  );

  const LazyPageWrapper = (props: P): React.JSX.Element => (
    <Suspense fallback={<LoaderPage />}>
      <LazyComponent {...(props as React.JSX.IntrinsicAttributes & P)} />
    </Suspense>
  );
  LazyPageWrapper.displayName = 'LazyPageWrapper';
  return LazyPageWrapper;
};
