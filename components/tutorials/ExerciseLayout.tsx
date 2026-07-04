import type { ReactNode } from "react"

/**
 * Two-column Apply/Practice workspace. A container-query grid: the LEFT column is the brief (task,
 * data, goal) and stays sticky so it's visible while the RIGHT column — the editor, run controls,
 * and results — scrolls. The editor is the widest surface (`minmax(0,1.5fr)` vs the brief's
 * `minmax(240px,0.72fr)`). Below ~640px of *stage* width the columns stack in reading order
 * (brief → data → editor → results) so the editor is never starved. It queries the stage width via
 * `@container`, not the viewport, so the split is correct regardless of the tutor panel's state.
 * Shared by the Python and SQL runners so both courses read the same way.
 */
export function ExerciseLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 items-start gap-6 @min-[640px]:[grid-template-columns:minmax(240px,0.72fr)_minmax(0,1.5fr)] @min-[640px]:gap-8">
        <aside className="flex flex-col gap-4 @min-[640px]:sticky @min-[640px]:top-0">
          {aside}
        </aside>
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </div>
    </div>
  )
}
