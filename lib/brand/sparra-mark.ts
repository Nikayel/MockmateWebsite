/**
 * The Sparra mark as a raw SVG string, for satori/ImageResponse surfaces
 * (OG images, apple-touch-icon, /api/logo.png). Satori can't consume React
 * SVG components, but renders a data-URI <img> faithfully.
 *
 * Keep geometry in sync with design/brand/icon/sparra-icon.svg.
 */
export function sparraMarkSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb347"/><stop offset=".55" stop-color="#ff8a3d"/><stop offset="1" stop-color="#e0552a"/></linearGradient></defs><rect width="64" height="64" rx="17" fill="url(#sg)"/><g transform="translate(10.88 10.88) scale(0.66)" stroke="#2a1206" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M20 24 14 32 20 40" stroke-width="6"/><path d="M44 24 50 32 44 40" stroke-width="6"/><path d="M27 44Q32 49 37 44" stroke-width="5"/></g></svg>`
}

export function sparraMarkDataUri(size: number): string {
  return `data:image/svg+xml,${encodeURIComponent(sparraMarkSvg(size))}`
}

/** Brand surface colors for OG art, from design/brand/README.md. */
export const SPARRA_OG_COLORS = {
  /** Void — dark canvas behind the mark. */
  background: "#0e0d0c",
  /** Ink — light text on the void. */
  ink: "#f2efe8",
  /** Muted supporting text. */
  muted: "#b3afa4",
  /** Ember mid-stop, for subtle glows. */
  ember: "#ff8a3d",
} as const
