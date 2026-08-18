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
  /** Brand background for the logo tile / badge, on a light surface. */
  brandColor: string
  /** Readable text/foreground on top of `brandColor`. */
  onBrandColor: string
  /**
   * The same pair for a dark surface. Optional: a mark with enough chroma reads on both, and
   * repeating it would just be a second place to update.
   *
   * Palantir needs it. Its mark is #1A1A18, which against the dark card (#232220) measures 1.10:1
   * and simply is not there: three of the four labs rendered a bare floating glyph with no tile,
   * which broke the alignment grid on every card. Inverting the mark on dark is what Palantir's own
   * brand does, so this is the correct treatment rather than a workaround.
   */
  brandColorDark?: string
  onBrandColorDark?: string
  /** Monogram shown in the logo tile when no SVG mark is supplied. */
  monogram: string
}

const COMPANY_BRANDS: Record<string, CompanyBrand> = {
  palantir: {
    id: "palantir",
    label: "Palantir",
    brandColor: "#1A1A18",
    onBrandColor: "#FFFFFF",
    // Inverted for dark: tile 13.10:1 against the card, glyph 14.37:1 against the tile.
    brandColorDark: "#ECE9E1",
    onBrandColorDark: "#1A1A18",
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
