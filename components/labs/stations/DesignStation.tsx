"use client"

/**
 * DesignStation (§7.3) — commit to a contract and defend tradeoffs.
 *
 * Three progressive-disclosure panels (P2):
 *  1. API contract — a named endpoint with concrete input/output fields.
 *  2. Tradeoff table — Decision / Option A / Option B / Choice / Why.
 *  3. Fallback — the ranking/fallback decision when the primary path fails.
 * Soft completion: API + at least one justified tradeoff recommended, never
 * required. Answers persist to the active run via the store.
 */

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import type { ApiField, DesignAnswer, DesignTradeoff } from "@/lib/labs/types"
import { CollapsiblePanel, RemoveRowButton } from "./station-kit"

type PanelId = "api" | "tradeoffs" | "fallback"

interface DesignForm {
  apiName: string
  inputs: ApiField[]
  outputs: ApiField[]
  tradeoffs: DesignTradeoff[]
  fallback: string
}

const emptyTradeoff = (): DesignTradeoff => ({
  decision: "",
  optionA: "",
  optionB: "",
  choice: "",
  why: "",
})

function buildInitialForm(answer: DesignAnswer | undefined): DesignForm {
  return {
    apiName: answer?.api.name ?? "",
    inputs: answer?.api.inputs.length ? answer.api.inputs : [{ name: "", type: "" }],
    outputs: answer?.api.outputs.length ? answer.api.outputs : [{ name: "", type: "" }],
    tradeoffs: answer?.tradeoffs.length ? answer.tradeoffs : [emptyTradeoff()],
    fallback: answer?.fallback ?? "",
  }
}

const trimFields = (fields: ApiField[]): ApiField[] =>
  fields.map((f) => ({ name: f.name.trim(), type: f.type.trim() })).filter((f) => f.name || f.type)

function deriveAnswer(form: DesignForm): DesignAnswer {
  return {
    api: {
      name: form.apiName.trim(),
      inputs: trimFields(form.inputs),
      outputs: trimFields(form.outputs),
    },
    tradeoffs: form.tradeoffs
      .map((t) => ({
        decision: t.decision.trim(),
        optionA: t.optionA.trim(),
        optionB: t.optionB.trim(),
        choice: t.choice.trim(),
        why: t.why.trim(),
      }))
      .filter((t) => t.decision || t.optionA || t.optionB || t.choice || t.why),
    fallback: form.fallback.trim(),
  }
}

/** Editor for a labelled list of {name, type} API fields. */
function ApiFieldList({
  label,
  fields,
  onChange,
}: {
  label: string
  fields: ApiField[]
  onChange: (fields: ApiField[]) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-foreground text-xs font-medium">{label}</span>
      {fields.map((field, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={field.name}
            onChange={(e) => {
              const next = [...fields]
              next[i] = { ...next[i], name: e.target.value }
              onChange(next)
            }}
            placeholder="field"
            className="max-w-[45%]"
          />
          <Input
            value={field.type}
            onChange={(e) => {
              const next = [...fields]
              next[i] = { ...next[i], type: e.target.value }
              onChange(next)
            }}
            placeholder="type"
          />
          {fields.length > 1 && (
            <RemoveRowButton
              label={`Remove ${label} field ${i + 1}`}
              onClick={() => onChange(fields.filter((_, idx) => idx !== i))}
            />
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...fields, { name: "", type: "" }])}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add {label.toLowerCase()}
      </Button>
    </div>
  )
}

export function DesignStation() {
  const run = useCaseLabStore((s) => s.activeRun)
  const setDesign = useCaseLabStore((s) => s.setDesign)

  const [form, setForm] = useState<DesignForm>(() => buildInitialForm(run?.answers.design))
  const [openPanel, setOpenPanel] = useState<PanelId | "">("api")

  const apply = (next: DesignForm) => {
    setForm(next)
    setDesign(deriveAnswer(next))
  }

  const togglePanel = (id: PanelId) => (open: boolean) => setOpenPanel(open ? id : "")

  const updateTradeoff = (i: number, field: keyof DesignTradeoff, value: string) => {
    const tradeoffs = [...form.tradeoffs]
    tradeoffs[i] = { ...tradeoffs[i], [field]: value }
    apply({ ...form, tradeoffs })
  }

  return (
    <section aria-labelledby="design-title" className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 id="design-title" className="text-foreground text-lg font-semibold">
          Design
        </h2>
        <p className="text-muted-foreground text-sm">
          Commit to a contract, then defend the calls you made along the way.
        </p>
      </header>

      {/* 1. API contract */}
      <CollapsiblePanel
        title="API contract"
        hint="Name the endpoint and pin its inputs and outputs to concrete types."
        open={openPanel === "api"}
        onToggle={togglePanel("api")}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="design-api-name" className="text-xs">
            Endpoint / function
          </Label>
          <Input
            id="design-api-name"
            value={form.apiName}
            onChange={(e) => apply({ ...form, apiName: e.target.value })}
            placeholder="e.g. POST /dispatch"
          />
        </div>
        <ApiFieldList
          label="Inputs"
          fields={form.inputs}
          onChange={(inputs) => apply({ ...form, inputs })}
        />
        <ApiFieldList
          label="Outputs"
          fields={form.outputs}
          onChange={(outputs) => apply({ ...form, outputs })}
        />
      </CollapsiblePanel>

      {/* 2. Tradeoff table */}
      <CollapsiblePanel
        title="Tradeoffs"
        hint="For each decision, lay out the options, your choice, and why."
        open={openPanel === "tradeoffs"}
        onToggle={togglePanel("tradeoffs")}
      >
        <ul className="flex flex-col gap-3">
          {form.tradeoffs.map((t, i) => (
            <li key={i} className="border-border flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-foreground text-xs font-medium">Decision {i + 1}</span>
                {form.tradeoffs.length > 1 && (
                  <RemoveRowButton
                    label={`Remove decision ${i + 1}`}
                    onClick={() =>
                      apply({
                        ...form,
                        tradeoffs: form.tradeoffs.filter((_, idx) => idx !== i),
                      })
                    }
                  />
                )}
              </div>
              <Input
                value={t.decision}
                onChange={(e) => updateTradeoff(i, "decision", e.target.value)}
                placeholder="Decision (e.g. how to rank responders)"
              />
              <div className="flex items-center gap-2">
                <Input
                  value={t.optionA}
                  onChange={(e) => updateTradeoff(i, "optionA", e.target.value)}
                  placeholder="Option A"
                />
                <Input
                  value={t.optionB}
                  onChange={(e) => updateTradeoff(i, "optionB", e.target.value)}
                  placeholder="Option B"
                />
              </div>
              <Input
                value={t.choice}
                onChange={(e) => updateTradeoff(i, "choice", e.target.value)}
                placeholder="Choice"
              />
              <Textarea
                value={t.why}
                onChange={(e) => updateTradeoff(i, "why", e.target.value)}
                placeholder="Why — what breaks with the other option?"
                rows={2}
              />
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => apply({ ...form, tradeoffs: [...form.tradeoffs, emptyTradeoff()] })}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add decision
        </Button>
      </CollapsiblePanel>

      {/* 3. Fallback */}
      <CollapsiblePanel
        title="Ranking / fallback"
        hint="What happens when the primary path can't be satisfied?"
        open={openPanel === "fallback"}
        onToggle={togglePanel("fallback")}
      >
        <Textarea
          value={form.fallback}
          onChange={(e) => apply({ ...form, fallback: e.target.value })}
          placeholder="e.g. If no unit is within range, escalate to the regional pool and notify dispatch."
          rows={3}
        />
      </CollapsiblePanel>
    </section>
  )
}
