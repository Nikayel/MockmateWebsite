import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  getSystemDesignLevelBySlug,
  listSystemDesignLevels,
} from "@/lib/tutorials/system-design/registry"
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

const COURSE_ID = "system-design" as const

type Props = { params: Promise<{ levelSlug: string }> }

/**
 * All level slugs are known at build time, so the 23 level indexes prerender as static HTML like
 * the lesson pages below them. `dynamicParams = false` makes an unknown slug a CDN 404 instead of
 * a function invocation, which is also the canonicalization guarantee: one URL per level, no
 * accidental duplicates.
 */
export const dynamicParams = false

export function generateStaticParams(): Array<{ levelSlug: string }> {
  return listSystemDesignLevels().map((level) => ({ levelSlug: level.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { levelSlug } = await params
  const level = getSystemDesignLevelBySlug(levelSlug)
  // An unknown slug renders `notFound()` below, so this branch only shapes the head of the 404.
  if (!level) {
    return learnTrackMetadata({
      courseId: COURSE_ID,
      description: "Learn system design the way real interviews test it.",
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
 * Screen between Path and lesson — a level's modules + lessons, as a guided path. Server Component.
 *
 * Public: this page is a real index of the level for a visitor who has never signed in, so it must
 * not read auth or progress here. `LevelPathView` overlays completion on the client (empty when
 * signed out) and decides there whether a lesson card points at the public reading page or the gated
 * workspace.
 */
export default async function SystemDesignLevelModulesPage({ params }: Props) {
  const { levelSlug } = await params
  const level = getSystemDesignLevelBySlug(levelSlug)
  if (!level) notFound()

  // Project to the lean list model server-side so no exercise payloads / model answers ship to the client.
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
    </>
  )
}
