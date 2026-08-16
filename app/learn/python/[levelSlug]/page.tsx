import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLevelBySlug, listLevels } from "@/lib/tutorials/registry"
import { Footer } from "@/components/footer"
import { LevelPathView } from "@/components/tutorials/LevelPathView"
import { toLevelListModel } from "@/lib/tutorials/level-path"
import { learnLevelMetadata, learnTrackMetadata } from "@/lib/seo/learn-metadata"
import { BreadcrumbJsonLd, LessonListJsonLd } from "@/components/seo/JsonLd"
import {
  LEARN_COURSE_LABEL,
  LEARN_HUB_PATH,
  levelPath,
  publicLessonPath,
  trackPath,
} from "@/lib/tutorials/lesson-routes"
import type { PythonLevel } from "@/lib/tutorials/types"

const COURSE_ID = "python" as const

type Props = { params: Promise<{ levelSlug: string }> }

/**
 * All level slugs are known at build time, so the 23 level indexes prerender as static HTML like
 * the lesson pages below them. `dynamicParams = false` makes an unknown slug a CDN 404 instead of
 * a function invocation, which is also the canonicalization guarantee: one URL per level, no
 * accidental duplicates.
 */
export const dynamicParams = false

export function generateStaticParams(): Array<{ levelSlug: string }> {
  return listLevels().map((level) => ({ levelSlug: level.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { levelSlug } = await params
  const level = getLevelBySlug(levelSlug as PythonLevel["slug"])
  // An unknown slug renders `notFound()` below, so this branch only shapes the head of the 404.
  if (!level) {
    return learnTrackMetadata({
      courseId: COURSE_ID,
      description: "Free interactive Python course that runs in your browser.",
    })
  }
  return learnLevelMetadata({
    courseId: COURSE_ID,
    levelSlug: level.slug,
    levelTitle: level.title,
    levelTagline: level.tagline,
  })
}

/**
 * Screen between Path and lesson — a level's sections + lessons, as a guided path. Server Component.
 *
 * Public: this page is a real index of the level for a visitor who has never signed in, so it must
 * not read auth or progress here. `LevelPathView` overlays completion on the client (empty when
 * signed out, since `fetchAllProgress()` returns `[]` without a token and fires no request) and
 * decides there whether a lesson card points at the public reading page or the gated workspace.
 */
export default async function LevelModulesPage({ params }: Props) {
  const { levelSlug } = await params
  // getLevelBySlug returns undefined for any unknown slug, so the cast is safe (→ notFound()).
  const level = getLevelBySlug(levelSlug as PythonLevel["slug"])
  if (!level) notFound()

  // Project to the lean list model server-side so no exercise payloads / markdown ship to the client.
  // The ItemList + breadcrumb mirror what the page visibly renders, derived from the same level.
  return (
    <>
      <LessonListJsonLd
        name={`${level.title} lessons`}
        lessons={level.modules.flatMap((mod) =>
          mod.lessons.map((lesson) => ({
            title: lesson.title,
            url: publicLessonPath(COURSE_ID, level.slug, lesson.id),
          }))
        )}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Learn", url: LEARN_HUB_PATH },
          { name: LEARN_COURSE_LABEL[COURSE_ID], url: trackPath(COURSE_ID) },
          { name: level.title, url: levelPath(COURSE_ID, level.slug) },
        ]}
      />
      <LevelPathView model={toLevelListModel(level)} courseId={COURSE_ID} />
      {/* The site footer, which `LevelPathView` deliberately does not carry: its top bar is a slim
          breadcrumb rather than the full site nav, so before this the 23 level indexes shipped just
          three site-wide links (home, the track, and the track again) around the lesson grid. The
          lesson pages below them and the `/learn` hub above them both render the footer, so these
          pages were the hole in the middle of the crawl graph as well as a dead end for a reader.
          Only the footer is added: `Header` is `fixed`, and would sit on top of the sticky bar. */}
      <Footer />
    </>
  )
}
