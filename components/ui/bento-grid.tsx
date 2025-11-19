'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Bento Grid Component
 *
 * A modern, asymmetric grid layout inspired by Japanese bento boxes.
 * Provides visual hierarchy and unique layouts that stand out from
 * traditional 3-column grids.
 *
 * Features:
 * - Responsive asymmetric layouts
 * - Hover effects with glow
 * - Stagger animations
 * - Flexible sizing
 */

export interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid auto-rows-[minmax(300px,auto)] gap-4',
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  span?: 'default' | 'wide' | 'tall' | 'large';
  gradient?: boolean;
  glow?: boolean;
  index?: number;
}

export function BentoCard({
  children,
  className,
  title,
  description,
  icon,
  span = 'default',
  gradient = false,
  glow = true,
  index = 0,
}: BentoCardProps) {
  const spanStyles = {
    default: '',
    wide: 'md:col-span-2',
    tall: 'md:row-span-2',
    large: 'md:col-span-2 md:row-span-2',
  };

  return (
    <motion.div
      className={cn(
        'group relative overflow-hidden',
        'rounded-2xl border border-white/[0.08]',
        'bg-card p-6 md:p-8',
        'transition-all duration-500',
        'hover:border-accent/30',
        glow && 'hover:shadow-[0_0_30px_rgba(0,217,255,0.1)]',
        spanStyles[span],
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {/* Gradient overlay (optional) */}
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Icon */}
        {icon && (
          <motion.div
            className="mb-4 text-accent"
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {icon}
          </motion.div>
        )}

        {/* Title */}
        {title && (
          <h3 className="text-xl md:text-2xl font-heading font-bold mb-3 text-foreground">
            {title}
          </h3>
        )}

        {/* Description */}
        {description && (
          <p className="text-muted-foreground mb-4 leading-relaxed">{description}</p>
        )}

        {/* Custom content */}
        <div className="flex-1">{children}</div>
      </div>

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
    </motion.div>
  );
}

export interface BentoFeatureProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  span?: 'default' | 'wide' | 'tall' | 'large';
  metric?: {
    value: string;
    label: string;
  };
  features?: string[];
  index?: number;
}

export function BentoFeature({
  title,
  description,
  icon,
  span = 'default',
  metric,
  features,
  index = 0,
}: BentoFeatureProps) {
  return (
    <BentoCard title={title} description={description} icon={icon} span={span} index={index}>
      {/* Metric display */}
      {metric && (
        <div className="mt-auto">
          <div className="text-4xl md:text-5xl font-bold text-accent mb-1">{metric.value}</div>
          <div className="text-sm text-muted-foreground">{metric.label}</div>
        </div>
      )}

      {/* Feature list */}
      {features && (
        <ul className="mt-auto space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <svg
                className="w-5 h-5 text-neural flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      )}
    </BentoCard>
  );
}

export interface BentoStatProps {
  value: string;
  label: string;
  icon: React.ReactNode;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  index?: number;
}

export function BentoStat({ value, label, icon, change, index = 0 }: BentoStatProps) {
  const trendColors = {
    up: 'text-neural',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <BentoCard className="bg-gradient-to-br from-card to-card/50" index={index}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-accent">{icon}</div>
        {change && (
          <div className={cn('text-sm font-medium', trendColors[change.trend])}>
            {change.value}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </BentoCard>
  );
}

export default BentoGrid;
