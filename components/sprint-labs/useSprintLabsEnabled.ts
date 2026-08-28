"use client"

import { useEffect, useState } from "react"

/**
 * Client hook: is the Sprint Labs surface live?
 *
 * The header's Labs picker renders client-side, so it cannot call `getFlag`
 * (that path is server-only). It asks `GET /api/sprint-labs/enabled` instead —
 * the one thin bridge to the server-resolved `SPRINT_LABS_ENABLED` flag.
 *
 * Returns `null` until the answer is known, then `true`/`false`. Callers treat
 * `null` and `false` identically for gating (hide the Sprint row), so the
 * surface never flashes into view before the flag is confirmed on. A failed
 * probe resolves to `false` for the same reason: a not-yet-launched catalog
 * fails closed, never open.
 *
 * The resolved value is memoised for the tab session (the nav is discovery
 * chrome, not a kill switch — the actual routes re-check the flag per request),
 * so the header and the picker share a single fetch instead of one each.
 */

type Resolved = boolean | null

let cachedValue: Resolved = null
let inflight: Promise<boolean> | null = null

async function fetchEnabled(): Promise<boolean> {
  if (cachedValue !== null) return cachedValue
  if (inflight) return inflight

  inflight = fetch("/api/sprint-labs/enabled", { headers: { accept: "application/json" } })
    .then(async (res) => {
      if (!res.ok) return false
      const data: unknown = await res.json()
      return Boolean((data as { enabled?: unknown } | null)?.enabled)
    })
    .catch(() => false)
    .then((value) => {
      cachedValue = value
      return value
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function useSprintLabsEnabled(): Resolved {
  const [enabled, setEnabled] = useState<Resolved>(cachedValue)

  useEffect(() => {
    if (cachedValue !== null) {
      setEnabled(cachedValue)
      return
    }
    let active = true
    void fetchEnabled().then((value) => {
      if (active) setEnabled(value)
    })
    return () => {
      active = false
    }
  }, [])

  return enabled
}

/** Test-only: drop the session cache so a fresh probe runs. Not used at runtime. */
export function __resetSprintLabsEnabledCache(): void {
  cachedValue = null
  inflight = null
}
