"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { LayoutGrid, List, Target } from "lucide-react"
import { useShallow } from "zustand/react/shallow"

import { useScenarioFilters } from "@/lib/hooks/useScenarioFilters"
import { scenarios, type Scenario } from "@/lib/scenarios"
import { useInterviewStore, type UsageLimit } from "@/lib/stores"

import { DSARoadmap } from "./DSARoadmap"
import { InterviewTrackHeader } from "./InterviewTrackHeader"
import { InterviewResumeNotice, InterviewTrackLanding } from "./InterviewTrackLanding"
import { PatternBrowser } from "./PatternBrowser"
import { ScenarioFilters } from "./ScenarioFilters"
import { ScenarioList } from "./ScenarioList"
import { TrackViewTabs, type TrackViewTab } from "./TrackViewTabs"
import {
  scenariosInTrack,
  trackProgress,
  willResumeExistingSession,
} from "./interview-track-browsing"
import { INTERVIEW_TRACK_PARAM, findInterviewTrack } from "./interview-tracks"

interface ScenarioBrowserProps {
  onStartInterview: (scenario: Scenario) => void
  // True while a start is in flight; keeps the selected scenario's Start button in a
  // loading/disabled state so a double-click cannot kick off a second session.
  isStarting?: boolean
  usageLimit: UsageLimit | null
  completedProblems: string[]
  hasGuestBanner?: boolean
}

/** DSA's own ways of looking at its problem set. Owned by the DSA track, not by the browser. */
type DsaView = "roadmap" | "patterns" | "all"
const DSA_VIEWS: readonly TrackViewTab<DsaView>[] = [
  { id: "roadmap", label: "Roadmap", Icon: Target },
  { id: "patterns", label: "Patterns", Icon: LayoutGrid },
  { id: "all", label: "All problems", Icon: List },
]

/**
 * `/interview`: one track, addressed by `?track=`.
 *
 * This used to be a two-tab browser whose tab lived in component state, defaulting to Debugging.
 * That made the choice unlinkable, reset it on every reload, and opened the smaller track in front
 * of everyone who came for the far larger one. The track is a URL now, this component reads it,
 * and it renders exactly one track or the choice between them. There is no default and no blend.
 */
export const ScenarioBrowser = memo(function ScenarioBrowser({
  onStartInterview,
  isStarting = false,
  usageLimit,
  completedProblems,
  hasGuestBanner = false,
}: ScenarioBrowserProps) {
  // Safe without a Suspense boundary of its own: page.tsx already wraps this whole tree in one.
  const searchParams = useSearchParams()
  const track = findInterviewTrack(searchParams?.get(INTERVIEW_TRACK_PARAM))
  const trackId = track?.id ?? null

  const [dsaView, setDsaView] = useState<DsaView>("roadmap")

  const { selectedScenario, setSelectedScenario } = useInterviewStore(
    useShallow((state) => ({
      selectedScenario: state.selectedScenario,
      setSelectedScenario: state.setSelectedScenario,
    }))
  )

  const {
    filterType,
    filterDifficulty,
    filterCompanies,
    searchQuery,
    filteredScenarios,
    hasActiveFilters,
    setSearchQuery,
    clearAllFilters,
    toggleTypeFilter,
    toggleDifficultyFilter,
    toggleCompanyFilter,
    removeTypeFilter,
    removeDifficultyFilter,
    removeCompanyFilter,
    clearCompanyFilters,
  } = useScenarioFilters()

  // Switching track clears filters, the way the old tab switch did, so a difficulty or company
  // narrowed for debugging does not silently follow the user into DSA. Switching is a navigation
  // now, so the trigger is the track id changing. `clearAllFilters` is a fresh closure on every
  // render, so it is reached through a ref: depending on it directly would clear the filters the
  // user just set, on the render that set them.
  const clearAllFiltersRef = useRef(clearAllFilters)
  useEffect(() => {
    clearAllFiltersRef.current = clearAllFilters
  })
  useEffect(() => {
    clearAllFiltersRef.current()
  }, [trackId])

  // Narrowed to the track before anything renders it, so a track can never show another track's
  // problems whatever the shared filter store holds. Memoized because ScenarioList resets its
  // progressive reveal whenever this array's identity changes.
  const trackScenarios = useMemo(
    () => (track ? scenariosInTrack(track, filteredScenarios) : []),
    [track, filteredScenarios]
  )

  // Counted off the full registry rather than the filtered view: the header states how big the
  // track is, which is not a fact about the current search.
  const progress = useMemo(
    () => (track ? trackProgress(track, scenarios, completedProblems) : null),
    [track, completedProblems]
  )

  // Dynamic padding: clear the floating navbar (64px) plus comfortable breathing room below it;
  // extra when the guest banner (~40px) is also shown.
  const topPadding = hasGuestBanner ? "pt-40" : "pt-32"

  const renderProblemList = () => (
    <>
      <ScenarioFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        resultsCount={trackScenarios.length}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
        // Derived from the track, never hand-listed. The old constant advertised Optimization and
        // Security chips against zero scenarios, so clicking one could only empty the list. A
        // single-type track shows no row at all, because a chip that can only reselect everything
        // already on screen is the same kind of dead control.
        availableTypes={track && track.types.length > 1 ? track.types : []}
        filterType={filterType}
        onToggleType={toggleTypeFilter}
        onRemoveType={removeTypeFilter}
        filterDifficulty={filterDifficulty}
        onToggleDifficulty={toggleDifficultyFilter}
        onRemoveDifficulty={removeDifficultyFilter}
        filterCompanies={filterCompanies}
        onToggleCompany={toggleCompanyFilter}
        onRemoveCompany={removeCompanyFilter}
        onClearCompanies={clearCompanyFilters}
      />
      <ScenarioList
        scenarios={trackScenarios}
        selectedScenarioId={selectedScenario?.id ?? null}
        completedProblems={completedProblems}
        usageLimit={usageLimit}
        isStarting={isStarting}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
        onSelect={setSelectedScenario}
        onStart={onStartInterview}
      />
    </>
  )

  const renderTrack = () => {
    if (!track || !progress) return null
    return (
      <>
        <InterviewTrackHeader track={track} total={progress.total} completed={progress.completed} />
        {track.id === "dsa" ? (
          <>
            <TrackViewTabs
              label="DSA practice view"
              tabs={DSA_VIEWS}
              value={dsaView}
              onChange={setDsaView}
              className="mb-6"
            />
            {dsaView === "roadmap" && (
              <DSARoadmap
                onStartInterview={onStartInterview}
                completedProblems={completedProblems}
              />
            )}
            {dsaView === "patterns" && (
              <PatternBrowser
                onStartInterview={onStartInterview}
                completedProblems={completedProblems}
              />
            )}
            {dsaView === "all" && renderProblemList()}
          </>
        ) : (
          renderProblemList()
        )}
      </>
    )
  }

  // No track chosen. A deep link that is still resolving gets the holding state instead of the
  // picker, because page.tsx keeps this component mounted while `useSessionReopen` works and a
  // picker flashing in front of someone who already clicked their session is worse than nothing.
  const renderUntracked = () =>
    willResumeExistingSession(searchParams) ? <InterviewResumeNotice /> : <InterviewTrackLanding />

  return (
    <section className={`${topPadding} bg-background relative overflow-hidden pb-12`}>
      {/* One subtle page-level accent, deliberately. No per-section rainbow glows. */}
      <div className="from-accent/5 pointer-events-none absolute top-0 left-1/2 z-0 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-gradient-to-b to-transparent opacity-40 blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="mx-auto max-w-7xl">{track ? renderTrack() : renderUntracked()}</div>
      </div>
    </section>
  )
})
