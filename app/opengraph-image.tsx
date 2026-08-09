import { ImageResponse } from "next/og"
import { SparringOgCard } from "@/lib/brand/og-card"

export const runtime = "edge"

export const alt = "CodeSparring - Ace Your Tech Interview with AI Mock Practice"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(<SparringOgCard />, {
    ...size,
  })
}
