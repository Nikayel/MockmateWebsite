// Client-safe public contract. Import next-practice.server directly on the server.
export { selectNextPractice } from "./next-practice"
export { getNextPracticeFocus } from "./next-practice-focus"
export type { NextPracticeRecommendation, NextPracticeResponse } from "./next-practice-types"
