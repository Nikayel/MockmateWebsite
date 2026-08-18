/**
 * CompanyLogo — the brand mark for a Case Lab's company.
 *
 * A brand-colored monogram tile, optionally followed by the company wordmark.
 * Branding is read from the central registry (`lib/labs/companies.ts`) so every
 * surface (gallery, intro, topbar) renders companies identically.
 *
 * ## Why the colours are custom properties rather than a `style` value picked in JS
 *
 * This renders inside Server Components, which cannot know the active theme, and a brand mark that
 * reads on cream can be invisible on charcoal: Palantir's #1A1A18 measured 1.10:1 on the dark card
 * and vanished. Both pairs are emitted as `--logo-bg` / `--logo-fg`, and a `.dark` rule in
 * `globals.css` swaps in the dark pair. No client component, no flash, no theme prop threaded
 * through three surfaces. A company without a dark pair simply keeps its one colour in both.
 */

import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"
import { getCompanyBrand } from "@/lib/labs/companies"

const SIZES = {
  sm: { tile: "h-5 w-5 text-[10px]", text: "text-[12px]" },
  md: { tile: "h-7 w-7 text-[13px]", text: "text-[14px]" },
} as const

export function CompanyLogo({
  company,
  size = "sm",
  showLabel = false,
  className,
}: {
  company: string
  size?: keyof typeof SIZES
  showLabel?: boolean
  className?: string
}) {
  const brand = getCompanyBrand(company)
  const s = SIZES[size]

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "company-logo-tile flex shrink-0 items-center justify-center rounded font-semibold",
          s.tile
        )}
        style={
          {
            "--logo-bg": brand.brandColor,
            "--logo-fg": brand.onBrandColor,
            "--logo-bg-dark": brand.brandColorDark ?? brand.brandColor,
            "--logo-fg-dark": brand.onBrandColorDark ?? brand.onBrandColor,
          } as CSSProperties
        }
      >
        {brand.monogram}
      </span>
      {showLabel && (
        <span className={cn("font-medium text-[var(--wb-text)]", s.text)}>{brand.label}</span>
      )}
      {!showLabel && <span className="sr-only">{brand.label}</span>}
    </span>
  )
}
