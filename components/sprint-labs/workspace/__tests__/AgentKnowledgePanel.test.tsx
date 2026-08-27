/**
 * @vitest-environment jsdom
 *
 * AgentKnowledgePanel renders the LITERAL directive text (never a summary),
 * a per-entry mute toggle, and the fixed disclosure line, exactly as
 * AGENT-CONTEXT.md §7 specifies. Presentational/controlled: no fetching.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AgentKnowledgePanel } from "../AgentKnowledgePanel"
import type { DirectiveEntry } from "@/lib/sprint-labs/types"

afterEach(cleanup)

const DIRECTIVES: DirectiveEntry[] = [
  {
    id: "d1",
    instruction: "On changes touching tenant scoping, narrate the invariant before editing.",
    tags: ["tenant-scoping"],
    createdSprint: 3,
    expiresAfterSprint: 4,
  },
  {
    id: "d2",
    instruction: "Ask what happens on redelivery before writing the handler.",
    tags: ["idempotency"],
    createdSprint: 2,
    expiresAfterSprint: 4,
  },
]

describe("AgentKnowledgePanel", () => {
  it("renders the literal instruction text for each directive, verbatim", () => {
    render(
      <AgentKnowledgePanel
        open
        onOpenChange={vi.fn()}
        directives={DIRECTIVES}
        mutedDirectiveIds={[]}
        onToggleMute={vi.fn()}
      />
    )
    expect(
      screen.getByText("On changes touching tenant scoping, narrate the invariant before editing.")
    ).not.toBeNull()
    expect(
      screen.getByText("Ask what happens on redelivery before writing the handler.")
    ).not.toBeNull()
  })

  it("shows the title and the fixed muting-disclosure line", () => {
    render(
      <AgentKnowledgePanel
        open
        onOpenChange={vi.fn()}
        directives={DIRECTIVES}
        mutedDirectiveIds={[]}
        onToggleMute={vi.fn()}
      />
    )
    expect(screen.getByText("What the agent knows about you")).not.toBeNull()
    expect(
      screen.getByText("Muting is not recorded, not penalized, and not shown to the agent.")
    ).not.toBeNull()
  })

  it("renders a graceful empty state when there are no directives yet", () => {
    render(
      <AgentKnowledgePanel
        open
        onOpenChange={vi.fn()}
        directives={[]}
        mutedDirectiveIds={[]}
        onToggleMute={vi.fn()}
      />
    )
    expect(screen.getByText("Sable has nothing on file about you yet.")).not.toBeNull()
  })

  it("calls onToggleMute(id, true) when muting an active entry", () => {
    const onToggleMute = vi.fn()
    render(
      <AgentKnowledgePanel
        open
        onOpenChange={vi.fn()}
        directives={DIRECTIVES}
        mutedDirectiveIds={[]}
        onToggleMute={onToggleMute}
      />
    )
    fireEvent.click(screen.getAllByRole("switch", { name: "Mute this entry" })[0])
    expect(onToggleMute).toHaveBeenCalledWith("d1", true)
  })

  it("calls onToggleMute(id, false) when unmuting an already-muted entry", () => {
    const onToggleMute = vi.fn()
    render(
      <AgentKnowledgePanel
        open
        onOpenChange={vi.fn()}
        directives={DIRECTIVES}
        mutedDirectiveIds={["d1"]}
        onToggleMute={onToggleMute}
      />
    )
    fireEvent.click(screen.getByRole("switch", { name: "Unmute this entry" }))
    expect(onToggleMute).toHaveBeenCalledWith("d1", false)
  })

  it("reflects the muted state via aria-checked", () => {
    render(
      <AgentKnowledgePanel
        open
        onOpenChange={vi.fn()}
        directives={DIRECTIVES}
        mutedDirectiveIds={["d1"]}
        onToggleMute={vi.fn()}
      />
    )
    const switches = screen.getAllByRole("switch")
    expect(switches[0].getAttribute("aria-checked")).toBe("true")
    expect(switches[1].getAttribute("aria-checked")).toBe("false")
  })
})
