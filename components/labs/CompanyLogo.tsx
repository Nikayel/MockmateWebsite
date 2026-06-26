/**
 * CompanyLogo — the brand mark for a Case Lab's company.
 *
 * A brand-colored monogram tile, optionally followed by the company wordmark.
 * Branding is read from the central registry (`lib/labs/companies.ts`) so every
 * surface (gallery, intro, topbar) renders companies identically.
 */

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
        className={cn("flex shrink-0 items-center justify-center rounded font-semibold", s.tile)}
        style={{ backgroundColor: brand.brandColor, color: brand.onBrandColor }}
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
