"use client"

import { LessonOutline, type UpNextLesson } from "./LessonOutline"
import { LessonRailStrip } from "./LessonRailStrip"
import type { CourseId, LessonSection, SectionStatus } from "@/lib/tutorials/types"

/**
 * The lesson workspace's left column, in one of two widths. Collapsed (default) it's a slim strip of
 * phase dots (`LessonRailStrip`); expanded it's the full Read → Apply → Practice stepper plus "Up
 * next" (`LessonOutline`). Progressive disclosure: a three-step tracker earns its 248px on demand,
 * not permanently, and the reclaimed space goes to the editor. The caller owns the width (the grid's
 * `--railw`) and persists the choice; this component owns only which inner block is shown.
 */
export function LessonRail({
  collapsed,
  onToggle,
  sections,
  active,
  onSelect,
  upNext,
  courseId,
  sectionOrder,
  sectionLabels,
}: {
  collapsed: boolean
  /** Toggles between the slim strip and the full outline; the caller persists + drives `--railw`. */
  onToggle: () => void
  sections: Record<LessonSection, SectionStatus>
  active: LessonSection
  onSelect: (section: LessonSection) => void
  upNext: UpNextLesson[]
  /** Which course the "Up next" lessons belong to; passed through to build workspace links. */
  courseId: CourseId
  /** Phases to show, in order. Omit for the code-course Read → Apply → Practice loop; System Design
   * passes just Read → Design (it has no standalone Practice phase). */
  sectionOrder?: LessonSection[]
  /** Per-phase label overrides, e.g. `{ apply: "Design" }`, merged over the shared defaults. */
  sectionLabels?: Partial<Record<LessonSection, string>>
}) {
  return (
    <div className="border-border overflow-y-auto border-r">
      {collapsed ? (
        <LessonRailStrip
          sections={sections}
          active={active}
          onSelect={onSelect}
          onExpand={onToggle}
          sectionOrder={sectionOrder}
          sectionLabels={sectionLabels}
        />
      ) : (
        <div className="px-4 py-6">
          <LessonOutline
            sections={sections}
            active={active}
            onSelect={onSelect}
            upNext={upNext}
            courseId={courseId}
            onCollapse={onToggle}
            sectionOrder={sectionOrder}
            sectionLabels={sectionLabels}
          />
        </div>
      )}
    </div>
  )
}
