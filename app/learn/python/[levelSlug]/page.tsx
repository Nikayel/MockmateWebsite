import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLevelBySlug } from "@/lib/tutorials/registry"
import { LevelPathView } from "@/components/tutorials/LevelPathView"
import { toLevelListModel } from "@/lib/tutorials/level-path"
import type { PythonLevel } from "@/lib/tutorials/types"

type Props = { params: Promise<{ levelSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { levelSlug } = await params
  const level = getLevelBySlug(levelSlug as PythonLevel["slug"])
  if (!level) return { title: "Learn Python — CodeSparring" }
  return {
    title: `${level.title} — Learn Python`,
    description: level.tagline,
  }
}

/** Screen between Path and lesson — a level's sections + lessons, as a guided path. Server Component. */
export default async function LevelModulesPage({ params }: Props) {
  const { levelSlug } = await params
  // getLevelBySlug returns undefined for any unknown slug, so the cast is safe (→ notFound()).
  const level = getLevelBySlug(levelSlug as PythonLevel["slug"])
  if (!level) notFound()

  // Project to the lean list model server-side so no exercise payloads / markdown ship to the client.
  return (
    <LevelPathView
      model={toLevelListModel(level)}
      basePath="/learn/python"
      courseLabel="Learn Python"
    />
  )
}
