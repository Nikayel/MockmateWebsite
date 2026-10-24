import { bugfixBookclubReadingStreakWorkspaceScenario } from "@/lib/scenarios/real-world/bugfix/bugfix-bookclub-reading-streak-workspace"
import type { BugFixScenario } from "@/lib/scenarios/types"

// Keep this lookup scoped: Edge feedback needs guided labs, not the entire problem bank.
const guidedLabScenarios: readonly BugFixScenario[] = [bugfixBookclubReadingStreakWorkspaceScenario]

export function getGuidedLabScenario(id: string): BugFixScenario | undefined {
  return guidedLabScenarios.find((scenario) => scenario.id === id)
}
