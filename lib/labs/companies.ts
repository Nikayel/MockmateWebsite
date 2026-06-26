/**
 * Centralized company branding for Case Labs.
 *
 * Single source of truth for how each company is presented across the labs
 * surface (gallery rows, intro screen, the play topbar badge). Keeping the
 * label, brand color, and logo mark here means a new company is one entry, not
 * a scatter of hardcoded strings and colors. The runtime color palette lives in
 * `app/globals.css` under `.case-lab-workbook`; this file owns per-company
 * brand identity, which is intentionally outside that neutral palette.
 */

export interface CompanyBrand {
  /** Stable id — matches `CaseLab.company`. */
  id: string
  /** Display name, properly cased (the data stores lowercase ids). */
  label: string
  /** Brand background for the logo tile / badge. */
  brandColor: string
  /** Readable text/foreground on top of `brandColor`. */
  onBrandColor: string
  /** Monogram shown in the logo tile when no SVG mark is supplied. */
  monogram: string
}

const COMPANY_BRANDS: Record<string, CompanyBrand> = {
  palantir: {
    id: "palantir",
    label: "Palantir",
    brandColor: "#1A1A18",
    onBrandColor: "#FFFFFF",
    monogram: "P",
  },
  stripe: {
    id: "stripe",
    label: "Stripe",
    brandColor: "#635BFF",
    onBrandColor: "#FFFFFF",
    monogram: "S",
  },
}

/** Title-case fallback for companies without an explicit brand entry. */
function fallbackBrand(company: string): CompanyBrand {
  const label = company.charAt(0).toUpperCase() + company.slice(1)
  return {
    id: company,
    label,
    brandColor: "#7C4A2D",
    onBrandColor: "#FFFFFF",
    monogram: label.charAt(0).toUpperCase() || "?",
  }
}

/** Look up a company's brand, falling back to a neutral clay treatment. */
export function getCompanyBrand(company: string): CompanyBrand {
  return COMPANY_BRANDS[company.toLowerCase()] ?? fallbackBrand(company)
}
