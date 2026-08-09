import { ImageResponse } from "next/og"
import { sparraMarkDataUri } from "@/lib/brand/sparra-mark"

export const runtime = "edge"

// Serve a large PNG icon for SEO/structured data at /api/logo.png.
// JSON-LD (components/seo/JsonLd.tsx) points Google at this URL — keep it working.
export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sparraMarkDataUri(512)} width={512} height={512} alt="" />
    </div>,
    {
      width: 512,
      height: 512,
    }
  )
}
