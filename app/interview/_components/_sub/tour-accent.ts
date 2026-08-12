/**
 * The interview walkthrough's accent recipe, in one place.
 *
 * The tour hardcoded cyan (border-cyan-300, bg-cyan-300 buttons, a cyan glow)
 * on a platform whose accent is clay, so the very first thing a guest's or
 * new user's session showed them was another design system. Both tour files
 * consume these constants so the affordance color has a single source and the
 * next reskin is a one-file change.
 *
 * Token contract (enforced for pricing by pricing-theme-tokens.test.ts):
 * --accent is a fill/border/ring value, --accent-strong carries primary-button
 * fills with --accent-foreground ink.
 */
export const TOUR_CARD_CLASSES = "border-accent/30 shadow-2xl shadow-black/40"

export const TOUR_PRIMARY_BUTTON_CLASSES =
  "bg-accent-strong text-accent-foreground hover:bg-accent-strong/90 focus:ring-accent focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:outline-none"

export const TOUR_PROGRESS_DOT_ACTIVE = "bg-accent"

export const TOUR_FOCUS_RING = "focus:ring-accent focus:ring-2 focus:outline-none"

export const TOUR_SPOTLIGHT_CLASSES =
  "border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.55),0_0_28px_color-mix(in_srgb,var(--accent)_45%,transparent)]"
