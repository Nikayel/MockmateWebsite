/**
 * AI Provider Configuration Status
 *
 * Reports whether each provider's API key is present IN THIS DEPLOYMENT, so the
 * settings page can stop rendering four hardcoded green "Active" badges that
 * probed nothing. A panel that says "Active" whether or not a key exists is
 * worse than no panel: it is the screen an operator checks when a provider has
 * just started failing.
 *
 * Presence only. Key values, lengths and prefixes are never returned: an
 * account-level credential must not be reconstructable from an admin page.
 */

import { NextResponse } from "next/server"
import { withPermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"

export const dynamic = "force-dynamic"

/**
 * The variable names below are the ones the code actually reads. The settings
 * page previously documented `GOOGLE_AI_API_KEY` for Gemini, which no code path
 * has ever read, so an operator who set it would have configured nothing.
 */
const PROVIDER_ENV_VARS = [
  { id: "gemini", label: "Gemini", envVar: "GEMINI_API_KEY", role: "Primary interviewer model" },
  { id: "openai", label: "OpenAI", envVar: "OPENAI_API_KEY", role: "Embeddings and fallback" },
  { id: "deepseek", label: "Deepseek", envVar: "DEEPSEEK_API_KEY", role: "Edge fallback model" },
  { id: "anthropic", label: "Claude", envVar: "ANTHROPIC_API_KEY", role: "Optional model" },
  { id: "deepgram", label: "Deepgram", envVar: "DEEPGRAM_API_KEY", role: "Voice transcription" },
] as const

export interface ProviderStatus {
  id: string
  label: string
  envVar: string
  role: string
  configured: boolean
}

export const GET = withPermission(PERMISSIONS.MANAGE_SETTINGS, async () => {
  const providers: ProviderStatus[] = PROVIDER_ENV_VARS.map((provider) => ({
    ...provider,
    // A variable set to an empty string is not configured. Vercel will happily
    // hold one, and it fails at call time rather than at deploy time.
    configured: Boolean(process.env[provider.envVar]?.trim()),
  }))

  return NextResponse.json({
    success: true,
    providers,
    // Which deployment these answers describe. The same page served from a
    // preview and from production reports different things, and that has been
    // mistaken for a provider outage before.
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
  })
})
