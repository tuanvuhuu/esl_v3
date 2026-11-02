'use client';

import React, { useEffect, useState } from 'react';
import { useCommonContext } from './commonContext';

export interface IWindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): IWindowSize {
  const [size, setSize] = useState<IWindowSize>(() => {
    if (typeof window === 'undefined') {
      return { width: 1280, height: 800 };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

export interface IElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useElementPosition(
  ref?: React.RefObject<HTMLElement | null>,
): IElementPosition {
  const [position, setPosition] = useState<IElementPosition>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setPosition((prev) => {
        if (
          prev.x === rect.left &&
          prev.y === rect.top &&
          prev.width === rect.width &&
          prev.height === rect.height
        ) {
          return prev;
        }
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        };
      });
    };

    update();
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    resizeObserver?.observe(el);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [ref]);

  return position;
}

export interface ILazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
}

export function useLazyLoad(
  ref: React.RefObject<Element | null>,
  options?: ILazyLoadOptions,
): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(
    () => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined',
  );
  const rootMargin = options?.rootMargin ?? '100px';
  const threshold = options?.threshold ?? 0;

  useEffect(() => {
    if (isVisible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold, isVisible]);

  return isVisible;
}

export function useLazyLoadAndAlwaysWatch(
  ref: React.RefObject<Element | null>,
  options?: ILazyLoadOptions,
): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(
    () => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined',
  );
  const rootMargin = options?.rootMargin ?? '0px';
  const threshold = options?.threshold ?? 0;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  return isVisible;
}

export function useAutosizeTextArea(
  textAreaRef: React.RefObject<HTMLTextAreaElement | null> | HTMLTextAreaElement | null,
  value: string,
): void {
  useEffect(() => {
    const el =
      textAreaRef && 'current' in textAreaRef ? textAreaRef.current : textAreaRef;
    if (!el) return;
    el.style.setProperty('height', '0px');
    const scrollHeight = el.scrollHeight;
    el.style.setProperty('height', `${scrollHeight}px`);
  }, [textAreaRef, value]);
}

export default useAutosizeTextArea;

export function useCommonSelectedHook() {
  const { dm_dvcs_id, mainColor } = useCommonContext();
  return {
    dm_dvcs_id: dm_dvcs_id ?? '',
    mainColor: mainColor ?? '',
  };
}

export function useLayoutState() {
  const {
    dm_dvcs_id,
    mainColor,
    backgroundImUrl,
    setDmDvcsId,
    setMainColor,
    setBackgroundImUrl,
  } = useCommonContext();
  return {
    dm_dvcs_id: dm_dvcs_id ?? '',
    mainColor: mainColor ?? '',
    backgroundImUrl: backgroundImUrl ?? '',
    setDmDvcsId,
    setMainColor,
    setBackgroundImUrl,
  };
}
