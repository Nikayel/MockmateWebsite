/**
 * The one-time "first run boots the Python runtime" note shown beside the Run button while Pyodide
 * cold-starts. Shared by both exercise runners so the copy stays identical. Renders nothing once warm.
 */
export function ColdStartNote({ warming }: { warming: boolean }) {
  if (!warming) return null
  return (
    <span className="text-muted-foreground text-xs">
      First run downloads the Python runtime — this only happens once.
    </span>
  )
}
