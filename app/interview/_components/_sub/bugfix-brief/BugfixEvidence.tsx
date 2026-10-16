import { BRIEF_LABEL } from "./content"

export function BugfixEvidence({
  reproductionSteps,
  visibleLogs,
}: {
  reproductionSteps: string[]
  visibleLogs: string[]
}) {
  if (!reproductionSteps.length && !visibleLogs.length) return null

  return (
    <div className="space-y-4">
      {reproductionSteps.length > 0 && (
        <div className="space-y-2">
          <h3 className={BRIEF_LABEL}>Reproduce</h3>
          <ol className="text-foreground list-decimal space-y-2 pl-4 text-sm leading-relaxed">
            {reproductionSteps.map((step, index) => (
              <li key={`${index}-${step}`}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {visibleLogs.length > 0 && (
        <div className="space-y-2">
          <h3 className={BRIEF_LABEL}>Visible logs</h3>
          <pre className="border-border bg-muted text-foreground overflow-x-auto rounded border p-3 font-mono text-xs leading-relaxed whitespace-pre">
            {visibleLogs.join("\n")}
          </pre>
        </div>
      )}
    </div>
  )
}
