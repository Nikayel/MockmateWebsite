import { useState } from "react"
import { SkillAssessment, type AssessmentResult } from "@/components/roadmap/SkillAssessment"
import { scenarios } from "@/lib/scenarios"
import { resolveCategoryMix } from "@/lib/roadmap/category-weights"
import { generatePersonalizedRoadmap } from "@/lib/roadmap/prioritization-algorithm"
import type { PersonalizedRoadmap } from "@/lib/data/company-questions/types"
import { QuestionCard } from "@/components/roadmap/FocusQuestionCard"

/** Real assessment and scheduler; no authentication, persistence, or paid AI calls. */
export function RoadmapAssessmentFixture() {
  const [roadmap, setRoadmap] = useState<PersonalizedRoadmap | null>(null)
  const complete = (result: AssessmentResult) => {
    const categoryMix = resolveCategoryMix({ ...result, companyId: "google" })
    setRoadmap(
      generatePersonalizedRoadmap(
        scenarios,
        {
          targetCompany: "google",
          interviewDate: new Date("2027-01-01"),
          daysRemaining: 30,
          experienceLevel: result.experienceLevel,
          targetTrack: result.targetTrack,
          problemsSolvedEstimate: result.problemsSolved,
          patternFamiliarity: result.patternFamiliarity,
          hoursPerDay: result.hoursPerDay,
          preferredDifficulty: "mixed",
          targetScore: 80,
          categoryMix,
        },
        "fixture-owner"
      )
    )
  }
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl">Create your roadmap</h1>
      {roadmap ? (
        <section aria-label="Generated roadmap">
          <h2>Google · 30-day plan</h2>
          <p>Mix: {roadmap.categoryMix?.mode}</p>
          <dl>
            <dt>Debugging questions</dt>
            <dd data-testid="debugging-count">
              {roadmap.categoryCoverage?.find((c) => c.category === "bugfix")?.total ?? 0}
            </dd>
            <dt>Algorithms questions</dt>
            <dd data-testid="algorithms-count">
              {roadmap.categoryCoverage?.find((c) => c.category === "dsa")?.total ?? 0}
            </dd>
          </dl>
          <QuestionCard
            question={roadmap.dailyPlans.flatMap((p) => p.questions)[0]}
            index={0}
            isFirst
            canDefer={false}
            onStart={() => {}}
            onSkip={() => {}}
            onDefer={() => {}}
          />
        </section>
      ) : (
        <SkillAssessment onComplete={complete} />
      )}
    </div>
  )
}
