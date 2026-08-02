"use client"

import { useCallback, useEffect, useState } from "react"
import { BookOpen } from "lucide-react"
import { AdminLayout, AdminSection, DataTable, type Column } from "@/components/admin/shared"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import type {
  ExerciseStruggle,
  ItemDifficulty,
  LessonFunnelRow,
} from "@/lib/tutorials/learn-analytics"

/**
 * The human-readable end of the Learn item-response log.
 *
 * The single view worth building first is the distractor column: every authored check
 * carries a written rationale per wrong option, so seeing WHICH wrong option a cohort
 * picks names the misconception rather than reporting that an item is "hard". That is
 * the whole reason the checks were worth authoring, and it is the readout the platform
 * could not produce at all before.
 */
type View = "checks" | "exercises" | "funnel"

const percent = (value: number | null) => (value === null ? "n/a" : `${Math.round(value * 100)}%`)

export default function LearnResearchPage() {
  const [view, setView] = useState<View>("checks")
  const [rows, setRows] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (which: View) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getCurrentUserToken()
      if (!token) throw new Error("Not signed in")
      const res = await fetch(`/api/admin/learn-research?view=${which}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = (await res.json()) as { rows: unknown[] }
      setRows(data.rows ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(view)
  }, [view, load])

  const exportCsv = async () => {
    const token = await getCurrentUserToken()
    if (!token) return
    const res = await fetch("/api/admin/learn-research?view=export&format=csv", {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "learn-item-responses.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const checkColumns: Column<ItemDifficulty>[] = [
    { key: "itemId", label: "Item" },
    { key: "lessonId", label: "Lesson" },
    { key: "learners", label: "Learners" },
    {
      key: "firstTryAccuracy",
      label: "First-try correct",
      render: (row) => percent(row.firstTryAccuracy),
    },
    {
      key: "topDistractors",
      label: "Misconception that fired",
      render: (row) =>
        row.topDistractors.length
          ? `${row.topDistractors[0].label} (${row.topDistractors[0].count})`
          : "none",
    },
  ]

  const exerciseColumns: Column<ExerciseStruggle>[] = [
    { key: "itemId", label: "Exercise" },
    { key: "learners", label: "Learners" },
    { key: "passRate", label: "Ever passed", render: (row) => percent(row.passRate) },
    {
      key: "medianAttemptsToPass",
      label: "Median attempts",
      render: (row) => row.medianAttemptsToPass ?? "n/a",
    },
    { key: "hintRate", label: "Used a hint", render: (row) => percent(row.hintRate) },
    {
      key: "topErrorKinds",
      label: "Top error",
      render: (row) =>
        row.topErrorKinds.length
          ? `${row.topErrorKinds[0].kind} (${row.topErrorKinds[0].count})`
          : "none",
    },
  ]

  const funnelColumns: Column<LessonFunnelRow>[] = [
    { key: "lessonId", label: "Lesson" },
    { key: "courseId", label: "Course" },
    { key: "started", label: "Started" },
    { key: "completed", label: "Completed" },
    {
      key: "completionRate",
      label: "Completion",
      render: (row) => percent(row.completionRate),
    },
  ]

  return (
    <AdminLayout
      title="Learn research"
      description="Item difficulty, misconceptions, and where lessons leak."
      icon={BookOpen}
      error={error}
      onRefresh={() => void load(view)}
      refreshing={loading}
      headerActions={
        <Button size="sm" variant="outline" onClick={() => void exportCsv()}>
          Export consented rows (CSV)
        </Button>
      }
    >
      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList>
          <TabsTrigger value="checks">Checks</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
          <TabsTrigger value="funnel">Lesson funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="checks">
          <AdminSection
            title="Hardest checks first"
            description="First-try accuracy, because checks are freely retryable and eventual-correct converges on 100% for everything. The last column is the wrong answer the most learners picked, which names the misconception."
          >
            <DataTable
              data={rows as ItemDifficulty[]}
              columns={checkColumns}
              keyExtractor={(row) => row.itemId}
              loading={loading}
              emptyMessage="No check responses recorded yet."
            />
          </AdminSection>
        </TabsContent>

        <TabsContent value="exercises">
          <AdminSection
            title="Where learners stall"
            description="A low pass rate paired with a high hint rate usually means the teach did not prepare the exercise."
          >
            <DataTable
              data={rows as ExerciseStruggle[]}
              columns={exerciseColumns}
              keyExtractor={(row) => row.itemId}
              loading={loading}
              emptyMessage="No exercise runs recorded yet."
            />
          </AdminSection>
        </TabsContent>

        <TabsContent value="funnel">
          <AdminSection
            title="Lesson completion"
            description="Computed from progress documents, not analytics events: progress is written server-side for every signed-in learner, so it is not filtered by an analytics cookie that defaults to off."
          >
            <DataTable
              data={rows as LessonFunnelRow[]}
              columns={funnelColumns}
              keyExtractor={(row) => row.lessonId}
              loading={loading}
              emptyMessage="No lesson progress recorded yet."
            />
          </AdminSection>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  )
}
