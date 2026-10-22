import type { LabEvent } from "@/lib/bugfix/guided-lab/assessment/schema"

export function GuidedLabEvidence({
  event,
  prefix,
  sourcePhase,
}: {
  event: LabEvent
  prefix: string
  sourcePhase?: string
}) {
  return (
    <li id={`${prefix}-${event.id}`} className="border-border space-y-1 border-l pl-3 text-xs">
      <p className="text-muted-foreground">
        {event.id} · revision {event.revision}
        {sourcePhase && ` · recorded during ${sourcePhase}`}
      </p>
      {event.kind === "message" ? (
        <>
          <p className="font-medium">
            {event.role === "candidate"
              ? "You"
              : event.role === "ai_partner"
                ? "AI partner"
                : "Interviewer"}{" "}
            · {event.lane}
          </p>
          <p className="break-words whitespace-pre-wrap">
            {event.text}
            {event.truncated && " [excerpt]"}
          </p>
        </>
      ) : event.kind === "checkpoint" ? (
        event.patches.map((patch) => (
          <div key={patch.path} className="min-w-0 space-y-1">
            <p className="font-medium break-all">
              {patch.path} · from line {patch.startLine}
              {patch.truncated && " · excerpt"}
            </p>
            <p className="text-muted-foreground">Before</p>
            <pre className="bg-muted max-h-48 overflow-auto rounded p-2">
              {patch.before || "(empty)"}
            </pre>
            <p className="text-muted-foreground">After</p>
            <pre className="bg-muted max-h-48 overflow-auto rounded p-2">
              {patch.after || "(empty)"}
            </pre>
          </div>
        ))
      ) : event.kind === "test_run" ? (
        <p>
          Workspace run {event.runId}:{" "}
          {event.results.filter((r) => r.passed && !r.harnessError).length}/
          {event.results.filter((r) => !r.harnessError).length} checks passing
          {event.stale && " · superseded code"}.
        </p>
      ) : event.kind === "hint" ? (
        <p>Hint revealed: {event.text}</p>
      ) : (
        <p>
          {event.reason === "regression"
            ? "A regression reopened"
            : event.reason === "resume"
              ? "Resumed"
              : "Continued to"}{" "}
          {event.toPhaseId}.
        </p>
      )}
    </li>
  )
}
