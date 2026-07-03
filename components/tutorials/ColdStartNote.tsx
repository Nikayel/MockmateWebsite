/**
 * The one-time "first run boots the runtime" note shown beside the Run button while the WASM engine
 * cold-starts. Shared by every exercise runner so the copy stays consistent. Renders nothing once warm.
 *
 * `engine` selects the copy: Python (Pyodide, a multi-MB download) vs SQL (sql.js, a ~1 MB
 * same-origin compile). Defaults to Python so existing call sites are unchanged.
 */
export function ColdStartNote({
  warming,
  engine = "python",
}: {
  warming: boolean
  engine?: "python" | "sql"
}) {
  if (!warming) return null
  return (
    <span className="text-muted-foreground text-xs">
      {engine === "sql"
        ? "First run starts the in-browser SQL engine — this only happens once."
        : "First run downloads the Python runtime — this only happens once."}
    </span>
  )
}
