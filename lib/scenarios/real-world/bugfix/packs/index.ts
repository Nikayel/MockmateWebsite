/**
 * Bugfix PACK registry (stdout-oracle, sealed variant).
 *
 * Packs are compiled `BugFixScenario` objects carrying a `pack` runtime marker. They
 * are DELIBERATELY kept out of `realWorldBugFixScenarios` (the locked legacy-10 bank)
 * so the registry-order test stays green and the legacy assert-based quality gate —
 * which requires a client-side reference solution — never runs over a sealed pack.
 *
 * Packs resolve by id through the async lazy loader (`lib/scenarios/index.ts`
 * `loadBugFixScenarios`), which concatenates this list after the legacy bank.
 *
 * Each entry is produced by `packToScenario(pack)`; the authoring source of truth for
 * a pack is `packs/<pack-id>/` (see `future-sprints/generate-pack.md`).
 */

import type { BugFixScenario } from "../../../types"

export const bugfixPackScenarios: BugFixScenario[] = []

export default bugfixPackScenarios
