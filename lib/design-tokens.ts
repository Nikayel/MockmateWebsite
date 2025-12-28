/**
 * Neural Minimalism Design System
 * Systemized design tokens for CodeSparring
 *
 * This file contains all design constants used throughout the application.
 * Ensures consistency and makes design updates easier to manage.
 */

// ============================================================================
// COLOR SYSTEM - Neural Minimalism Palette
// ============================================================================

export const colors = {
  // Base Colors
  black: '#000000',
  white: '#ffffff',

  // Primary Accent - Electric Cyan (AI/Tech association)
  accent: {
    DEFAULT: '#00d9ff',
    light: '#33e3ff',
    dark: '#00a6cc',
    glow: 'rgba(0, 217, 255, 0.5)',
  },

  // Neural Connection - Success Green
  neural: {
    DEFAULT: '#00ff88',
    light: '#33ffaa',
    dark: '#00cc6b',
    glow: 'rgba(0, 255, 136, 0.5)',
  },

  // Gray Scale - Depth without noise
  gray: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#0a0a0a',
  },

  // Dark Theme Backgrounds
  bg: {
    primary: '#000000',
    secondary: '#0a0a0a',
    tertiary: '#1a1a1a',
    hover: '#2a2a2a',
  },

  // Status Colors
  status: {
    success: '#00ff88',
    warning: '#ffbf00',
    error: '#ff3366',
    info: '#00d9ff',
  },
} as const;

// ============================================================================
// SPACING SYSTEM - 8px Base Grid
// ============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM - Perfect Fourth Scale (1.333 ratio)
// ============================================================================

export const typography = {
  // Font Families
  fontFamily: {
    heading: 'var(--font-heading)',  // Work Sans
    body: 'var(--font-sans)',         // Open Sans
    mono: 'var(--font-mono)',         // Monaco
  },

  // Font Sizes - Perfect Fourth Scale
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],       // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],      // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px
    '5xl': ['3rem', { lineHeight: '1' }],          // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],       // 60px
    '7xl': ['4.5rem', { lineHeight: '1' }],        // 72px
    '8xl': ['6rem', { lineHeight: '1' }],          // 96px
    '9xl': ['8rem', { lineHeight: '1' }],          // 128px
  },

  // Font Weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================================
// ANIMATION SYSTEM
// ============================================================================

export const animation = {
  // Duration
  duration: {
    instant: '100ms',
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
    slowest: '1000ms',
  },

  // Easing Functions
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Custom Easings
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },

  // Spring Physics (for Framer Motion)
  spring: {
    gentle: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
    bouncy: {
      type: 'spring',
      stiffness: 300,
      damping: 10,
    },
    snappy: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
    slow: {
      type: 'spring',
      stiffness: 50,
      damping: 20,
    },
  },
} as const;

// ============================================================================
// BORDER RADIUS SYSTEM
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.375rem',   // 6px
  DEFAULT: '0.5rem', // 8px
  md: '0.625rem',    // 10px
  lg: '0.75rem',     // 12px
  xl: '1rem',        // 16px
  '2xl': '1.5rem',   // 24px
  '3xl': '2rem',     // 32px
  full: '9999px',
} as const;

// ============================================================================
// SHADOWS - Subtle depth
// ============================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none',

  // Glow Effects
  glow: {
    accent: `0 0 20px ${colors.accent.glow}`,
    accentLg: `0 0 40px ${colors.accent.glow}`,
    neural: `0 0 20px ${colors.neural.glow}`,
    neuralLg: `0 0 40px ${colors.neural.glow}`,
  },
} as const;

// ============================================================================
// Z-INDEX SYSTEM - Layering
// ============================================================================

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

// ============================================================================
// BREAKPOINTS - Responsive Design
// ============================================================================

export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// LAYOUT CONSTRAINTS
// ============================================================================

export const layout = {
  maxWidth: {
    xs: '20rem',    // 320px
    sm: '24rem',    // 384px
    md: '28rem',    // 448px
    lg: '32rem',    // 512px
    xl: '36rem',    // 576px
    '2xl': '42rem', // 672px
    '3xl': '48rem', // 768px
    '4xl': '56rem', // 896px
    '5xl': '64rem', // 1024px
    '6xl': '72rem', // 1152px
    '7xl': '80rem', // 1280px
    full: '100%',
  },

  containerPadding: {
    mobile: spacing[4],    // 16px
    tablet: spacing[6],    // 24px
    desktop: spacing[8],   // 32px
  },
} as const;

// ============================================================================
// ANIMATION VARIANTS - Framer Motion Presets
// ============================================================================

export const variants = {
  // Fade In
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // Slide Up
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  // Slide Down
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  // Scale
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },

  // Stagger Container
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },

  // Stagger Item
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  },
} as const;

// ============================================================================
// NEURAL NETWORK THEME - 3D Visual Settings
// ============================================================================

export const neuralTheme = {
  // Node Settings
  node: {
    size: {
      min: 0.05,
      max: 0.15,
    },
    color: colors.accent.DEFAULT,
    glowColor: colors.accent.glow,
    pulseSpeed: 2, // seconds
  },

  // Connection Settings
  connection: {
    color: colors.neural.DEFAULT,
    opacity: {
      min: 0.2,
      max: 0.6,
    },
    width: 0.01,
    animationSpeed: 3, // seconds
  },

  // Particle Settings
  particle: {
    count: 100,
    size: 0.02,
    speed: 0.5,
    color: colors.accent.light,
  },
} as const;

// ============================================================================
// EXPORT ALL
// ============================================================================

export const designTokens = {
  colors,
  spacing,
  typography,
  animation,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  layout,
  variants,
  neuralTheme,
} as const;

export default designTokens;
