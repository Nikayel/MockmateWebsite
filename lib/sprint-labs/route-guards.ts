/**
 * Shared route-layer guards for the Sprint Labs API surfaces
 * (`app/api/sprint-labs/runs/route.ts`, `app/api/sprint-labs/runs/files/
 * route.ts`, `app/api/sprint-labs/attempts` and its `complete`/`review` siblings).
 *
 * Kept out of `lib/sprint-labs/runs.ts` on purpose: house style keeps auth/
 * entitlement checks (`verifyAuth`, `requireTierForUser`) at the route layer,
 * not inside a service module (see `runs.ts`'s own doc comments on
 * `advanceSprintLabRun`/`moveSprintLabTicket`). This is the one place the
 * logic lives, imported by every route that needs it, rather than
 * copy-pasted per file.
 */

import { NextResponse } from "next/server"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { getFlagAsync } from "@/lib/feature-flags"
import type { StoredSprintLabRun } from "@/lib/sprint-labs/runs"

/**
 * Not-yet-launched surface: a disabled flag reads as "this route doesn't
 * exist" (404) rather than "you're not allowed" (403) — the whole point of
 * a kill-switch flag is that its off state looks identical to the route
 * never having shipped. Fix round 1, M9: deduped here from three separate
 * per-route copies under `app/api/sprint-labs/attempts` and its `complete`/`review` siblings.
 */
export async function requireSprintLabsEnabled(userId: string): Promise<NextResponse | null> {
  if (await getFlagAsync("SPRINT_LABS_ENABLED", userId)) return null
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

/**
 * Every surface that exposes or mutates a run at `currentSprint >= 2`
 * requires Pro: reading/resuming one (GET, POST's create-or-resume — fix
 * round 2026-08-26, I2) AND continuing to work it (PATCH move-ticket, PUT
 * workspace files — fix round 2, controller addition 3). A downgraded user
 * must not be able to keep moving tickets or saving files on a run that has
 * already progressed past sprint 1 just because a raw board/board-adjacent
 * mutation route doesn't itself re-check the tier. `null` (no run resolved,
 * or nothing to gate) and `currentSprint < 2` both pass through — this never
 * blocks sprint 1, which is free on every workbook.
 */
export async function requireTierForSprint(
  userId: string,
  run: StoredSprintLabRun | null
): Promise<NextResponse | null> {
  if (!run || run.currentSprint < 2) return null
  const tierCheck = await requireTierForUser(userId, "pro")
  return tierCheck.response ?? null
}
