import { realWorldBugFixScenarios } from "."
import { bugfixPackScenarios } from "./packs"
import type { BugFixScenario } from "../../types"

/**
 * The complete public bugfix bank: the locked legacy realworld bank followed by the
 * stdout-oracle packs. One composition point so the eager registry (lib/scenarios.ts) and the
 * lazy loader (lib/scenarios/index.ts loadBugFixScenarios) can never drift on what the bugfix
 * bank contains. This is the exact two-registry seam behind the packs-unreachable incident.
 */
export const bugfixScenarios: BugFixScenario[] = [...realWorldBugFixScenarios, ...bugfixPackScenarios]
