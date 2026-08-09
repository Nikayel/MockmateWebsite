'use client';

import React, { useRef } from 'react';
import { motion, useInView, Variants } from 'framer-motion';

/**
 * Framer Motion Utilities for Neural Minimalism
 *
 * Provides the scroll-triggered reveal used by the marketing sections and the
 * stagger variants used by the hero, login, careers, and why-codesparring pages.
 */

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

// Default variant for ScrollReveal.
const reveal: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(10px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    filter: 'blur(10px)',
  },
};

// Stagger container
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

// Stagger item
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: { opacity: 0, y: -10 },
};

// ============================================================================
// SCROLL-TRIGGERED ANIMATION COMPONENT
// ============================================================================

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: Variants;
  delay?: number;
  threshold?: number;
}

export function ScrollReveal({
  children,
  className = '',
  variant = reveal,
  delay = 0,
  threshold = 0.1,
}: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: threshold });

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variant}
      initial="initial"
      animate={isInView ? 'animate' : 'initial'}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
