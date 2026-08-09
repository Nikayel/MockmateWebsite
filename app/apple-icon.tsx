import { ImageResponse } from "next/og"
import { sparraMarkDataUri } from "@/lib/brand/sparra-mark"

export const runtime = "edge"

export const size = {
  width: 180,
  height: 180,
}
export const contentType = "image/png"

// Sparra mark rendered as the PNG apple-touch-icon (iOS ignores SVG icons).
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      {}
      <img src={sparraMarkDataUri(180)} width={180} height={180} alt="" />
    </div>,
    {
      ...size,
    }
  )
}
