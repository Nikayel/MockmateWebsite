'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform, Variants } from 'framer-motion';

/**
 * Framer Motion Utilities for Neural Minimalism
 *
 * Provides:
 * - Animation variants
 * - Scroll-triggered animations
 * - Stagger animations
 * - Page transitions
 * - Gesture animations
 */

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: { opacity: 0, y: -20 },
};

export const slideDown: Variants = {
  initial: { opacity: 0, y: -40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: { opacity: 0, y: 20 },
};

export const slideLeft: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: { opacity: 0, x: -40 },
};

export const slideRight: Variants = {
  initial: { opacity: 0, x: -40 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: { opacity: 0, x: 40 },
};

export const scale: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: { opacity: 0, scale: 0.9 },
};

export const reveal: Variants = {
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

export const neuralPulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
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

// ============================================================================
// STAGGER CONTAINER
// ============================================================================

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  threshold?: number;
}

export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.1,
  threshold = 0.1,
}: StaggerContainerProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: threshold });

  const containerVariants: Variants = {
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.2,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="initial"
      animate={isInView ? 'animate' : 'initial'}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// PARALLAX SCROLL
// ============================================================================

interface ParallaxProps {
  children: React.ReactNode;
  className?: string;
  offset?: number;
}

export function Parallax({ children, className = '', offset = 50 }: ParallaxProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, offset]);

  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}

// ============================================================================
// MAGNETIC BUTTON
// ============================================================================

interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export function Magnetic({ children, className = '', strength = 0.3 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      setPosition({ x: x * strength, y: y * strength });
    };

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return (
    <motion.div
      ref={ref}
      className={className}
      animate={position}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 15,
        mass: 0.1,
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// PAGE TRANSITION
// ============================================================================

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// HOVER SCALE
// ============================================================================

interface HoverScaleProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
}

export function HoverScale({ children, className = '', scale = 1.05 }: HoverScaleProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      whileTap={{ scale: scale * 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// GLOW ON HOVER
// ============================================================================

interface GlowHoverProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowHover({
  children,
  className = '',
  glowColor = 'rgba(0, 217, 255, 0.4)',
}: GlowHoverProps) {
  return (
    <motion.div
      className={className}
      whileHover={{
        boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
      }}
      transition={{
        duration: 0.3,
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// FADE IN VIEW (Simple)
// ============================================================================

interface FadeInViewProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function FadeInView({ children, className = '', delay = 0 }: FadeInViewProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { motion } from 'framer-motion';
export type { Variants } from 'framer-motion';
