import type { ReactNode } from "react"

/**
 * Two-column Apply/Practice workspace. A container-query grid: the LEFT column is the brief (task,
 * data, goal) and stays sticky so it's visible while the RIGHT column — the editor, run controls,
 * and results — scrolls. The editor is the widest surface (`minmax(0,1.5fr)` vs the brief's
 * `minmax(240px,0.72fr)`) and holds a 320px floor so it is never starved. Below ~640px of *stage*
 * width the columns stack in reading order (brief → data → editor → results). It queries the stage
 * width via `@container`, not the viewport, so the split recomputes on its own as the side rails
 * collapse/expand — no matter the outline or tutor panel state. Shared by the Python and SQL runners
 * so both courses read the same way.
 */
export function ExerciseLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 items-start gap-6 @min-[640px]:[grid-template-columns:minmax(240px,0.72fr)_minmax(320px,1.5fr)] @min-[640px]:gap-8">
        {/* `min-w-0` is load-bearing, not tidying. A grid item defaults to `min-width: auto`, which
            means it refuses to shrink below its content, so one wide child (a markdown table in a
            supplied incident timeline, say) widens this whole column and squeezes the editor beside
            it instead of scrolling inside itself. The right column has carried `min-w-0` since it
            was written; this one did not, and nothing noticed until `supplied` artifacts started
            arriving as tables. */}
        <aside className="flex min-w-0 flex-col gap-4 @min-[640px]:sticky @min-[640px]:top-0">
          {aside}
        </aside>
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </div>
    </div>
  )
}
