'use client';

import type { HTMLMotionProps, Target, Transition } from 'framer-motion';
import { motion } from 'framer-motion';

const MotionBox = motion.div;

type Preset = {
  initial: Target;
  animate: Target;
  exit: Target;
  transition?: Transition;
};

export const VARIANTS: Record<string, Preset> = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  pop: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  blur: {
    initial: { opacity: 0, filter: 'blur(8px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, filter: 'blur(8px)' },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

type VariantKey = 'fadeIn' | 'slideDown' | 'slideUp' | 'slideRight' | 'scaleIn' | 'pop' | 'blur' | 'slideLeft';

export type MotionBoxProps = HTMLMotionProps<'div'> & {
  variant?: VariantKey;
  duration?: number;
  delay?: number;
};

export function AnimatedBox({
  variant = 'scaleIn',
  duration = 0.3,
  transition,
  delay = 0,
  ...props
}: MotionBoxProps) {
  const preset = VARIANTS[variant];

  return (
    <MotionBox
      initial={preset.initial}
      animate={preset.animate}
      exit={preset.exit}
      transition={{ duration, delay: delay / 1000, ...preset.transition, ...transition }}
      {...props}
      style={{ willChange: 'transform, opacity', ...props.style }}
    />
  );
}
