import type {
  FeedbackEfficiencyMetrics,
  FeedbackTestResult,
  FeedbackTranscriptMessage,
} from "./request-schema"

export function buildFeedbackTestResultsSummary(params: {
  testResults?: FeedbackTestResult[]
  testsPassed: number
  testsTotal: number
  serviceErrorCount: number
}): string {
  const { testResults, testsPassed, testsTotal, serviceErrorCount } = params

  return testResults && Array.isArray(testResults)
    ? `\n\nTEST RESULTS:\n- Total tests: ${testsTotal}\n- Passed: ${testsPassed}\n- Failed: ${testsTotal - testsPassed}${serviceErrorCount > 0 ? `\n- Note: ${serviceErrorCount} test(s) excluded due to service errors (not code issues)` : ""}\n`
    : ""
}

export function buildFeedbackTimeInfo(timeSpent?: number): string {
  return timeSpent
    ? `TIME SPENT: ${Math.floor(timeSpent / 60)} minutes ${timeSpent % 60} seconds`
    : ""
}

export function buildFeedbackEfficiencyInfo(efficiencyMetrics?: FeedbackEfficiencyMetrics): string {
  return efficiencyMetrics
    ? `
CODE EFFICIENCY ANALYSIS:
- Lines of code: ${efficiencyMetrics.linesOfCode || "N/A"}
- Code complexity level: ${efficiencyMetrics.complexity || "N/A"}
- Estimated time complexity: ${efficiencyMetrics.estimatedTimeComplexity || "N/A"}
- Optimal time complexity: ${efficiencyMetrics.optimalTimeComplexity || "N/A"}
- Estimated space complexity: ${efficiencyMetrics.estimatedSpaceComplexity || "N/A"}
- Optimal space complexity: ${efficiencyMetrics.optimalSpaceComplexity || "N/A"}
- Efficiency score: ${efficiencyMetrics.efficiencyScore || "N/A"}/100
- Time complexity match: ${efficiencyMetrics.estimatedTimeComplexity === efficiencyMetrics.optimalTimeComplexity ? "YES - Optimal" : "NO - Suboptimal"}
- Space complexity match: ${efficiencyMetrics.estimatedSpaceComplexity === efficiencyMetrics.optimalSpaceComplexity ? "YES - Optimal" : "NO - Suboptimal"}
`
    : `
CODE EFFICIENCY ANALYSIS:
- No efficiency data available
`
}

export function normalizeFeedbackTranscriptMessages(
  conversationTranscript?: FeedbackTranscriptMessage[]
): Array<{ role: "user" | "interviewer"; content: string }> {
  return Array.isArray(conversationTranscript)
    ? conversationTranscript.map((msg) => ({
        role:
          msg.type === "user" || msg.role === "user" || msg.role === "candidate"
            ? "user"
            : "interviewer",
        content: msg.message || msg.content || "",
      }))
    : []
}

export function normalizeTranscriptForCritique(
  conversationTranscript?: FeedbackTranscriptMessage[]
): Array<{ role: "candidate" | "interviewer"; content: string }> | undefined {
  return conversationTranscript?.map((msg) => ({
    role: msg.type === "user" || msg.role === "user" ? "candidate" : "interviewer",
    content: msg.message || msg.content || "",
  }))
}
