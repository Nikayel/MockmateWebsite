'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Magnetic Button Component
 *
 * A unique interactive button that creates a magnetic attraction effect.
 * The button warps toward the cursor when hovering, creating a compelling
 * micro-interaction that stands out.
 *
 * Features:
 * - Magnetic cursor attraction
 * - Ripple effect on click
 * - Neural glow animation
 * - Spring physics
 * - Accessibility support
 */

export interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  strength?: number; // Magnetic strength (0-1)
  glowColor?: 'accent' | 'neural' | 'none';
  ripple?: boolean;
}

export function MagneticButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  strength = 0.4,
  glowColor = 'accent',
  ripple = true,
  disabled,
  onClick,
  onDrag: _onDrag, // Destructure to exclude from motion.button spread
  onDragStart: _onDragStart,
  onDragEnd: _onDragEnd,
  onAnimationStart: _onAnimationStart, // Exclude - conflicts with framer-motion
  onAnimationEnd: _onAnimationEnd,
  onAnimationIteration: _onAnimationIteration,
  ...props
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  // Magnetic effect
  useEffect(() => {
    const button = buttonRef.current;
    if (!button || disabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const distance = Math.sqrt(x * x + y * y);
      const maxDistance = Math.max(rect.width, rect.height);

      // Apply magnetic effect based on distance
      if (distance < maxDistance) {
        const force = Math.max(0, 1 - distance / maxDistance);
        setPosition({
          x: x * strength * force,
          y: y * strength * force,
        });
      }
    };

    const handleMouseEnter = () => {
      setIsHovering(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
      setPosition({ x: 0, y: 0 });
    };

    button.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      button.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength, disabled]);

  // Ripple effect on click
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple && !disabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();

      setRipples((prev) => [...prev, { x, y, id }]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }

    onClick?.(e);
  };

  // Variant styles
  const variantStyles = {
    primary: 'bg-accent text-black hover:bg-accent/90 border-accent',
    secondary: 'bg-secondary text-foreground hover:bg-secondary/80 border-secondary',
    outline:
      'bg-transparent text-foreground border-accent/50 hover:bg-accent/10 hover:border-accent',
    ghost: 'bg-transparent text-foreground hover:bg-accent/10',
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  // Glow styles
  const glowStyles = {
    accent: 'shadow-[0_0_20px_rgba(196, 112, 63,0.3)]',
    neural: 'shadow-[0_0_20px_rgba(63, 184, 131,0.3)]',
    none: '',
  };

  return (
    <motion.button
      ref={buttonRef}
      className={cn(
        'relative overflow-hidden',
        'inline-flex items-center justify-center gap-2',
        'font-medium rounded-lg',
        'border transition-all duration-300',
        'cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        isHovering && !disabled && glowColor !== 'none' && glowStyles[glowColor],
        className
      )}
      animate={{
        x: position.x,
        y: position.y,
      }}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 15,
        mass: 0.1,
      }}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">{children}</span>

      {/* Ripple effect */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{
            width: 400,
            height: 400,
            opacity: 0,
            x: -200,
            y: -200,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* Hover gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: '-100%' }}
        animate={isHovering ? { x: '100%' } : { x: '-100%' }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />
    </motion.button>
  );
}

export default MagneticButton;
