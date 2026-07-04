import type { ReactNode } from "react"

/**
 * Two-column Apply/Practice surface: the task/description (and, for SQL, the input-table preview)
 * sits on the LEFT so the learner can read it while they work; the editor, run controls, and results
 * sit on the RIGHT. Stacks vertically below `xl` so the editor is never starved on a narrow viewport.
 * Shared by the Python and SQL single-file runners so both courses read the same way.
 */
export function ExerciseLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-6">
      <aside className="flex flex-col gap-4 xl:w-[38%] xl:max-w-md xl:shrink-0">{aside}</aside>
      <div className="flex min-w-0 flex-1 flex-col gap-4">{children}</div>
    </div>
  )
}
