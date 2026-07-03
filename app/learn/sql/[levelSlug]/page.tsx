import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { getSqlLevelBySlug } from "@/lib/tutorials/sql/registry"

type Props = { params: Promise<{ levelSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { levelSlug } = await params
  const level = getSqlLevelBySlug(levelSlug)
  if (!level) return { title: "Learn SQL — CodeSparring" }
  return { title: `${level.title} — Learn SQL`, description: level.tagline }
}

/** Screen between Path and lesson — a level's modules + lessons. Server Component. */
export default async function SqlLevelModulesPage({ params }: Props) {
  const { levelSlug } = await params
  const level = getSqlLevelBySlug(levelSlug)
  if (!level) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/learn/sql"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        All levels
      </Link>

      <header className="mt-4 mb-8">
        <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase">
          Level {level.id}
        </p>
        <h1 className="text-foreground mt-1.5 text-2xl font-semibold tracking-tight">
          {level.title}
        </h1>
        <p className="text-muted-foreground mt-1">{level.tagline}</p>
      </header>

      {level.modules.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          Lessons for this level are coming soon.
        </p>
      ) : (
        <div className="space-y-8">
          {level.modules.map((mod) => (
            <section key={mod.id}>
              <h2 className="text-foreground text-lg font-semibold">{mod.title}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{mod.description}</p>
              <ul className="mt-3 space-y-2">
                {mod.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/learn/sql/${level.slug}/${lesson.id}`}
                      className="group border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground font-medium">{lesson.title}</p>
                        <p className="text-muted-foreground truncate text-sm">{lesson.summary}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          <span className="capitalize">{lesson.difficulty}</span>
                          {" · "}
                          {lesson.estimatedMinutes} min
                          {lesson.skills.length > 0 && ` · ${lesson.skills.join(", ")}`}
                        </p>
                      </div>
                      <ChevronRight className="text-muted-foreground group-hover:text-foreground h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
