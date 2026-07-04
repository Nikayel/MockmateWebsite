import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getSqlLevelBySlug } from "@/lib/tutorials/sql/registry"
import { LevelPathView } from "@/components/tutorials/LevelPathView"
import { toLevelListModel } from "@/lib/tutorials/level-path"

type Props = { params: Promise<{ levelSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { levelSlug } = await params
  const level = getSqlLevelBySlug(levelSlug)
  if (!level) return { title: "Learn SQL — CodeSparring" }
  return { title: `${level.title} — Learn SQL`, description: level.tagline }
}

/** Screen between Path and lesson — a level's sections + lessons, as a guided path. Server Component. */
export default async function SqlLevelModulesPage({ params }: Props) {
  const { levelSlug } = await params
  const level = getSqlLevelBySlug(levelSlug)
  if (!level) notFound()

  // Project to the lean list model server-side so no exercise payloads / SQL ship to the client.
  return (
    <LevelPathView model={toLevelListModel(level)} basePath="/learn/sql" courseLabel="Learn SQL" />
  )
}
