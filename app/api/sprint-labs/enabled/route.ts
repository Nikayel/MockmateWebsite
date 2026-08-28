/**
 * Public flag probe — `GET /api/sprint-labs/enabled`.
 *
 * The Sprint row in the header's Labs picker is rendered client-side, but
 * `SPRINT_LABS_ENABLED` resolves server-side only (Firestore -> env -> static
 * default; see `lib/feature-flags.ts`, whose Firestore layer pulls in
 * firebase-admin). This is the one thin bridge that lets the client nav learn
 * the flag WITHOUT a build-time `NEXT_PUBLIC_` copy, which would freeze the
 * value at deploy time and defeat the ~30s admin toggle the flag exists for.
 *
 * No auth, by design. The nav that calls this renders for signed-in users
 * only, and the single boolean it returns — "does this catalog exist" — is
 * already revealed server-side to everyone by the `/labs` page. Resolution is
 * global (no `userId`): the nav shows one row for the whole product, and
 * `SPRINT_LABS_ENABLED` carries no per-user targeting today. A partially
 * rolled-out flag therefore reads as on here (see `resolveFlag`), which is the
 * correct nav behaviour — the surface exists, and the per-user routes still
 * gate each request.
 *
 * `force-dynamic` keeps Next from caching this past the flag's own 30s cache,
 * so a flip reaches the nav within `FLAG_CACHE_TTL_MS`, not a CDN TTL.
 */

import { NextResponse } from "next/server"

import { getFlagAsync } from "@/lib/feature-flags"

export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const enabled = await getFlagAsync("SPRINT_LABS_ENABLED")
  return NextResponse.json({ enabled })
}
