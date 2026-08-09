/**
 * Interview Components Module
 *
 * Organized components for the interview page.
 * Split for maintainability and reusability.
 *
 * Deliberately does NOT re-export `interview-tracks` or `InterviewTrackPicker`.
 *
 * This barrel pulls in `ScenarioBrowser`, which imports the whole scenario registry. The picker and
 * the track registry are imported by `components/header.tsx`, which renders on every page, so
 * reaching them through here would put the entire catalog in the bundle of every route on the site.
 * Import those two from their own paths, the way the header does.
 */

// Core interview components
export { ScenarioBrowser } from "./ScenarioBrowser"
export { PatternBrowser } from "./PatternBrowser"
export { DSARoadmap } from "./DSARoadmap"

// ScenarioBrowser sub-components
export { ScenarioCard } from "./ScenarioCard"
export { ScenarioFilters } from "./ScenarioFilters"
export { ScenarioSearchBar } from "./ScenarioSearchBar"

// Utilities
export { InterviewTimer } from "./InterviewTimer"
export { TestResultsPanel } from "./TestResultsPanel"

// Voice mode toggle for live transcription
export { VoiceModeToggle } from "./VoiceModeToggle"

// Company picker for freeball sessions
export { CompanyPicker } from "./CompanyPicker"
