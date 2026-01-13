/**
 * Admin Dashboard Design System
 *
 * Centralized design tokens for consistent UI across all admin pages.
 * Based on 2025 dashboard best practices: clear hierarchy, consistent spacing,
 * calm colors, and excellent readability.
 */

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Page titles - largest, boldest text
  pageTitle: "text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight",

  // Page subtitle - descriptive text under titles
  pageSubtitle: "text-sm text-gray-400 mt-1",

  // Section headers - for grouping related content
  sectionTitle: "text-lg font-semibold text-white flex items-center gap-2",

  // Card titles - inside cards
  cardTitle: "text-base font-semibold text-white flex items-center gap-2",
  cardDescription: "text-sm text-gray-400",

  // Metric values - big numbers that draw attention
  metricValue: "text-3xl font-bold tabular-nums tracking-tight",
  metricLabel: "text-sm font-medium text-gray-400",
  metricSubtext: "text-xs text-gray-500",

  // Table text
  tableHeader: "text-xs font-medium text-gray-400 uppercase tracking-wider",
  tableCell: "text-sm text-gray-300",
  tableCellMuted: "text-sm text-gray-500",

  // Small/helper text
  caption: "text-xs text-gray-500",
  badge: "text-xs font-medium",
} as const

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  // Page layout
  pageGap: "space-y-8",
  sectionGap: "space-y-6",

  // Card internal spacing
  cardPadding: "p-6",
  cardPaddingCompact: "p-4",

  // Grid gaps
  gridGap: "gap-6",
  gridGapCompact: "gap-4",

  // Table spacing
  tableCellPadding: "py-3 px-4",
  tableHeaderPadding: "py-3 px-4",
} as const

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Primary accent - cyan
  accent: {
    text: "text-[#00d9ff]",
    bg: "bg-[#00d9ff]",
    bgMuted: "bg-[#00d9ff]/10",
    border: "border-[#00d9ff]/30",
  },

  // Success - green
  success: {
    text: "text-green-400",
    bg: "bg-green-500",
    bgMuted: "bg-green-500/10",
    border: "border-green-500/30",
  },

  // Warning - yellow/amber
  warning: {
    text: "text-yellow-400",
    bg: "bg-yellow-500",
    bgMuted: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },

  // Error/Danger - red
  error: {
    text: "text-red-400",
    bg: "bg-red-500",
    bgMuted: "bg-red-500/10",
    border: "border-red-500/30",
  },

  // Info - blue
  info: {
    text: "text-blue-400",
    bg: "bg-blue-500",
    bgMuted: "bg-blue-500/10",
    border: "border-blue-500/30",
  },

  // Special - purple (for premium/referrals)
  purple: {
    text: "text-purple-400",
    bg: "bg-purple-500",
    bgMuted: "bg-purple-500/10",
    border: "border-purple-500/30",
  },

  // Orange (for warnings/clawbacks)
  orange: {
    text: "text-orange-400",
    bg: "bg-orange-500",
    bgMuted: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
} as const

// =============================================================================
// CARD STYLES
// =============================================================================

export const cardStyles = {
  // Default card
  default: "bg-gray-900/50 border-gray-800",

  // Interactive card (hover effect)
  interactive: "bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors",

  // Highlighted cards (with accent border)
  accent: "bg-[#00d9ff]/5 border-[#00d9ff]/20",
  success: "bg-green-500/5 border-green-500/20",
  warning: "bg-yellow-500/5 border-yellow-500/20",
  error: "bg-red-500/5 border-red-500/20",
  info: "bg-blue-500/5 border-blue-500/20",
  purple: "bg-purple-500/5 border-purple-500/20",
} as const

// =============================================================================
// TABLE STYLES
// =============================================================================

export const tableStyles = {
  container: "overflow-x-auto",
  table: "w-full text-sm",
  headerRow: "border-b border-gray-800",
  row: "border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors",
  emptyState: "text-center text-gray-500 py-12",
} as const

// =============================================================================
// BADGE VARIANTS
// =============================================================================

export const badgeVariants = {
  // Status badges
  success: "bg-green-500/20 text-green-400 border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",

  // Neutral
  muted: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  default: "bg-gray-800 text-gray-300 border-gray-700",
} as const

// =============================================================================
// BUTTON VARIANTS FOR ADMIN
// =============================================================================

export const buttonVariants = {
  // Primary action
  primary: "bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80",

  // Secondary/outline
  secondary: "border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800",

  // Danger action
  danger: "border-red-600 text-red-400 hover:bg-red-600/20",

  // Success action
  success: "border-green-600 text-green-400 hover:bg-green-600/20",

  // Purple action (for referral/premium features)
  purple: "border-purple-600 text-purple-400 hover:bg-purple-600/20",
} as const

// =============================================================================
// TIME RANGE SELECTOR STYLES
// =============================================================================

export const timeRangeStyles = {
  container: "flex gap-1 bg-gray-900 rounded-lg p-1",
  button: {
    active: "bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80",
    inactive: "text-gray-400 hover:text-white hover:bg-gray-800",
  },
} as const

// =============================================================================
// ICON SIZES
// =============================================================================

export const iconSizes = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
} as const
