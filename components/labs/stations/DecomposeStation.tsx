"use client"

/**
 * DecomposeStation (§7.2) — map the system into parts.
 *
 * Three progressive-disclosure panels (P2: one open at a time):
 *  1. Legacy workflow — ordered steps.
 *  2. Core entities — name + one-line role.
 *  3. State transitions — states + transitions for one key entity.
 * Soft completion: entities + at least one state machine recommended, never
 * required. Answers persist to the active run via the store.
 */

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import type { DecomposeAnswer, DecomposeEntity, StateTransition } from "@/lib/labs/types"
import { CollapsiblePanel, RemoveRowButton, StationHeader } from "./station-kit"

type PanelId = "workflow" | "entities" | "state"

interface DecomposeForm {
  workflow: string[]
  entities: DecomposeEntity[]
  smEntity: string
  smStates: string[]
  smTransitions: StateTransition[]
}

function buildInitialForm(answer: DecomposeAnswer | undefined): DecomposeForm {
  return {
    workflow: answer?.workflow.length ? answer.workflow : [""],
    entities: answer?.entities.length ? answer.entities : [{ name: "", role: "" }],
    smEntity: answer?.stateMachine?.entity ?? "",
    smStates: answer?.stateMachine?.states.length ? answer.stateMachine.states : [""],
    smTransitions: answer?.stateMachine?.transitions ?? [],
  }
}

function deriveAnswer(form: DecomposeForm): DecomposeAnswer {
  const states = form.smStates.map((s) => s.trim()).filter(Boolean)
  const transitions = form.smTransitions.filter((t) => t.from.trim() || t.to.trim() || t.on.trim())
  const entity = form.smEntity.trim()
  const hasStateMachine = Boolean(entity || states.length || transitions.length)
  return {
    workflow: form.workflow.map((s) => s.trim()).filter(Boolean),
    entities: form.entities
      .map((e) => ({ name: e.name.trim(), role: e.role.trim() }))
      .filter((e) => e.name || e.role),
    stateMachine: hasStateMachine ? { entity, states, transitions } : undefined,
  }
}

export function DecomposeStation() {
  const run = useCaseLabStore((s) => s.activeRun)
  const setDecompose = useCaseLabStore((s) => s.setDecompose)

  const [form, setForm] = useState<DecomposeForm>(() => buildInitialForm(run?.answers.decompose))
  const [openPanel, setOpenPanel] = useState<PanelId | "">("workflow")

  const apply = (next: DecomposeForm) => {
    setForm(next)
    setDecompose(deriveAnswer(next))
  }

  const togglePanel = (id: PanelId) => (open: boolean) => setOpenPanel(open ? id : "")

  return (
    <section aria-labelledby="decompose-title" className="flex flex-col gap-3">
      <StationHeader
        tag="Decompose"
        title="Decompose"
        titleId="decompose-title"
        description="Break the system into its moving parts before you design the contract."
      />

      {/* 1. Legacy workflow */}
      <CollapsiblePanel
        title="Legacy workflow"
        hint="The ordered steps the system goes through today."
        open={openPanel === "workflow"}
        onToggle={togglePanel("workflow")}
      >
        <ol className="flex flex-col gap-2">
          {form.workflow.map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-muted-foreground w-5 shrink-0 text-right text-xs">
                {i + 1}.
              </span>
              <Input
                value={step}
                onChange={(e) => {
                  const workflow = [...form.workflow]
                  workflow[i] = e.target.value
                  apply({ ...form, workflow })
                }}
                placeholder="e.g. Call received and triaged"
              />
              {form.workflow.length > 1 && (
                <RemoveRowButton
                  label={`Remove step ${i + 1}`}
                  onClick={() =>
                    apply({
                      ...form,
                      workflow: form.workflow.filter((_, idx) => idx !== i),
                    })
                  }
                />
              )}
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => apply({ ...form, workflow: [...form.workflow, ""] })}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add step
        </Button>
      </CollapsiblePanel>

      {/* 2. Core entities */}
      <CollapsiblePanel
        title="Core entities"
        hint="The nouns in the system — each with a one-line role."
        open={openPanel === "entities"}
        onToggle={togglePanel("entities")}
      >
        <ul className="flex flex-col gap-2">
          {form.entities.map((entity, i) => (
            <li key={i} className="flex items-center gap-2">
              <Input
                value={entity.name}
                onChange={(e) => {
                  const entities = [...form.entities]
                  entities[i] = { ...entities[i], name: e.target.value }
                  apply({ ...form, entities })
                }}
                placeholder="Name (e.g. Responder)"
                className="max-w-[40%]"
              />
              <Input
                value={entity.role}
                onChange={(e) => {
                  const entities = [...form.entities]
                  entities[i] = { ...entities[i], role: e.target.value }
                  apply({ ...form, entities })
                }}
                placeholder="Role (e.g. a unit that can be dispatched)"
              />
              {form.entities.length > 1 && (
                <RemoveRowButton
                  label={`Remove entity ${i + 1}`}
                  onClick={() =>
                    apply({
                      ...form,
                      entities: form.entities.filter((_, idx) => idx !== i),
                    })
                  }
                />
              )}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => apply({ ...form, entities: [...form.entities, { name: "", role: "" }] })}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add entity
        </Button>
      </CollapsiblePanel>

      {/* 3. State transitions */}
      <CollapsiblePanel
        title="State transitions"
        hint="Pick one key entity and map how it moves between states."
        open={openPanel === "state"}
        onToggle={togglePanel("state")}
      >
        <div className="flex flex-col gap-1.5">
          <Input
            value={form.smEntity}
            onChange={(e) => apply({ ...form, smEntity: e.target.value })}
            placeholder="Entity (e.g. Dispatch)"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-xs font-medium">States</span>
          {form.smStates.map((state, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={state}
                onChange={(e) => {
                  const smStates = [...form.smStates]
                  smStates[i] = e.target.value
                  apply({ ...form, smStates })
                }}
                placeholder="e.g. pending"
              />
              {form.smStates.length > 1 && (
                <RemoveRowButton
                  label={`Remove state ${i + 1}`}
                  onClick={() =>
                    apply({
                      ...form,
                      smStates: form.smStates.filter((_, idx) => idx !== i),
                    })
                  }
                />
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => apply({ ...form, smStates: [...form.smStates, ""] })}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add state
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-xs font-medium">Transitions</span>
          {form.smTransitions.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={t.from}
                onChange={(e) => {
                  const smTransitions = [...form.smTransitions]
                  smTransitions[i] = { ...smTransitions[i], from: e.target.value }
                  apply({ ...form, smTransitions })
                }}
                placeholder="from"
              />
              <Input
                value={t.on}
                onChange={(e) => {
                  const smTransitions = [...form.smTransitions]
                  smTransitions[i] = { ...smTransitions[i], on: e.target.value }
                  apply({ ...form, smTransitions })
                }}
                placeholder="on event"
              />
              <Input
                value={t.to}
                onChange={(e) => {
                  const smTransitions = [...form.smTransitions]
                  smTransitions[i] = { ...smTransitions[i], to: e.target.value }
                  apply({ ...form, smTransitions })
                }}
                placeholder="to"
              />
              <RemoveRowButton
                label={`Remove transition ${i + 1}`}
                onClick={() =>
                  apply({
                    ...form,
                    smTransitions: form.smTransitions.filter((_, idx) => idx !== i),
                  })
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              apply({
                ...form,
                smTransitions: [...form.smTransitions, { from: "", to: "", on: "" }],
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add transition
          </Button>
        </div>
      </CollapsiblePanel>
    </section>
  )
}
