import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getLevelBySlug } from "@/lib/tutorials/registry"
import { ModuleList } from "@/components/tutorials/ModuleList"
import type { PythonLevel } from "@/lib/tutorials/types"

type Props = { params: Promise<{ levelSlug: string }> }

/** Screen between Path and lesson — a level's modules + lessons. Server Component. */
export default async function LevelModulesPage({ params }: Props) {
  const { levelSlug } = await params
  // getLevelBySlug returns undefined for any unknown slug, so the cast is safe (→ notFound()).
  const level = getLevelBySlug(levelSlug as PythonLevel["slug"])
  if (!level) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/learn/python"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        All levels
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">{level.title}</h1>
        <p className="text-muted-foreground mt-1">{level.tagline}</p>
      </header>

      <ModuleList level={level} />
    </div>
  )
}
