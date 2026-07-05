import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getSystemDesignLevelBySlug } from "@/lib/tutorials/system-design/registry"
import { LevelPathView } from "@/components/tutorials/LevelPathView"
import { toLevelListModel } from "@/lib/tutorials/level-path"

type Props = { params: Promise<{ levelSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { levelSlug } = await params
  const level = getSystemDesignLevelBySlug(levelSlug)
  if (!level) return { title: "Learn System Design — CodeSparring" }
  return { title: `${level.title} — Learn System Design`, description: level.tagline }
}

/** Screen between Path and lesson — a level's modules + lessons, as a guided path. Server Component. */
export default async function SystemDesignLevelModulesPage({ params }: Props) {
  const { levelSlug } = await params
  const level = getSystemDesignLevelBySlug(levelSlug)
  if (!level) notFound()

  // Project to the lean list model server-side so no exercise payloads / model answers ship to the client.
  return (
    <LevelPathView
      model={toLevelListModel(level)}
      basePath="/learn/system-design"
      courseLabel="Learn System Design"
    />
  )
}
