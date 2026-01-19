/**
 * Shared Evaluation Rubrics
 *
 * Single source of truth for all evaluation criteria.
 * Used by:
 * - generate-feedback/route.ts (system instructions)
 * - constitutional-ai.ts (critique prompts)
 * - context-builder.ts (RAG context)
 *
 * DRY: Change criteria here, affects all feedback generation.
 */

// =============================================================================
// SCORE DIMENSIONS
// =============================================================================

export interface ScoreDimension {
  name: string
  weight: number
  description: string
  criteria: string[]
}

export const SCORE_DIMENSIONS: Record<string, ScoreDimension> = {
  problemSolving: {
    name: "Problem Solving",
    weight: 0.35,
    description: "Ability to break down problems and design solutions",
    criteria: [
      "Understood the problem correctly",
      "Identified constraints and requirements",
      "Chose appropriate algorithm/approach",
      "Handled edge cases",
      "Optimized when possible",
    ],
  },
  codeQuality: {
    name: "Code Quality",
    weight: 0.25,
    description: "Code correctness, readability, and best practices",
    criteria: [
      "Code runs without errors",
      "Passes test cases",
      "Readable variable/function names",
      "Appropriate code structure",
      "No obvious bugs or inefficiencies",
    ],
  },
  communication: {
    name: "Communication",
    weight: 0.25,
    description: "Explaining thought process and reasoning",
    criteria: [
      "Explained approach before coding",
      "Discussed complexity (time/space)",
      "Answered interviewer questions clearly",
      "Thought out loud while problem solving",
      "Asked clarifying questions when needed",
    ],
  },
  debugging: {
    name: "Debugging",
    weight: 0.15,
    description: "Testing and fixing code",
    criteria: [
      "Tested with example inputs",
      "Identified edge cases",
      "Fixed bugs systematically",
      "Traced through code logically",
    ],
  },
}

// =============================================================================
// DSA EVALUATION RUBRIC
// =============================================================================

export const DSA_RUBRIC = {
  name: "Data Structures & Algorithms",

  // What we evaluate
  evaluationAreas: [
    "Approach explanation before coding",
    "Time and space complexity analysis",
    "Edge case handling",
    "Code correctness (test pass rate)",
    "Communication throughout interview",
  ],

  // Score interpretation
  scoreInterpretation: {
    excellent: { range: [85, 100], description: "Interview-ready performance" },
    good: { range: [70, 84], description: "Solid fundamentals, minor gaps" },
    developing: { range: [50, 69], description: "Shows understanding, needs practice" },
    needsWork: { range: [0, 49], description: "Significant gaps to address" },
  },

  // Critical signals to detect
  criticalSignals: {
    positive: [
      "Explained approach before coding",
      "Discussed complexity correctly",
      "Handled edge cases",
      "Asked clarifying questions",
      "Tested their solution",
    ],
    negative: [
      "Started coding without explaining",
      "Couldn't analyze complexity",
      "Missed obvious edge cases",
      "Didn't ask any questions",
      "Skipped testing",
    ],
  },

  // Common feedback areas
  feedbackAreas: {
    approach: "How they broke down the problem",
    complexity: "Time/space analysis accuracy",
    edgeCases: "Handling of edge cases",
    codeQuality: "Correctness and style",
    communication: "Explaining thought process",
  },
}

// =============================================================================
// SYSTEM DESIGN RUBRIC
// =============================================================================

export const SYSTEM_DESIGN_RUBRIC = {
  name: "System Design",

  evaluationAreas: [
    "Requirements clarification",
    "High-level architecture",
    "Component selection and justification",
    "Scalability considerations",
    "Trade-off analysis",
    "Back-of-envelope calculations",
  ],

  scoreInterpretation: {
    excellent: { range: [85, 100], description: "Senior-level design thinking" },
    good: { range: [70, 84], description: "Solid design, room for depth" },
    developing: { range: [50, 69], description: "Basic understanding, needs structure" },
    needsWork: { range: [0, 49], description: "Missing core design principles" },
  },

  criticalSignals: {
    positive: [
      "Asked about scale and requirements",
      "Drew clear system diagram",
      "Discussed trade-offs",
      "Considered failure modes",
      "Provided reasonable estimates",
    ],
    negative: [
      "Jumped to solution without requirements",
      "No scalability discussion",
      "Ignored data model",
      "Missed critical components",
      "No back-of-envelope math",
    ],
  },

  feedbackAreas: {
    requirements: "Clarifying questions and constraints",
    architecture: "High-level system structure",
    components: "Database, cache, queue choices",
    scalability: "Horizontal scaling, sharding, replication",
    tradeoffs: "Pros/cons analysis of decisions",
  },
}

// =============================================================================
// BUG FIX RUBRIC
// =============================================================================

export const BUG_FIX_RUBRIC = {
  name: "Bug Fix / Debugging",

  evaluationAreas: [
    "Bug identification accuracy",
    "Debugging methodology",
    "Root cause analysis",
    "Fix quality and correctness",
    "Regression prevention",
  ],

  scoreInterpretation: {
    excellent: { range: [85, 100], description: "Efficient debugger, finds root cause" },
    good: { range: [70, 84], description: "Finds bugs, may miss root cause" },
    developing: { range: [50, 69], description: "Can fix obvious bugs" },
    needsWork: { range: [0, 49], description: "Struggles to isolate issues" },
  },

  criticalSignals: {
    positive: [
      "Reproduced the bug first",
      "Used systematic debugging approach",
      "Identified root cause, not just symptoms",
      "Fix is minimal and targeted",
      "Added tests to prevent regression",
    ],
    negative: [
      "Random code changes without understanding",
      "Fixed symptom but not root cause",
      "Introduced new bugs",
      "Didn't verify fix works",
      "Couldn't explain why bug occurred",
    ],
  },

  feedbackAreas: {
    identification: "How quickly they found the bug",
    methodology: "Debugging approach used",
    rootCause: "Understanding of why bug occurred",
    fixQuality: "Correctness and minimal impact",
    prevention: "Tests or guards added",
  },
}

// =============================================================================
// COMMUNICATION RUBRIC (shared across all types)
// =============================================================================

export const COMMUNICATION_RUBRIC = {
  name: "Communication",

  // What counts as good communication
  positiveSignals: [
    "Explained approach before implementation",
    "Discussed time/space complexity with reasoning",
    "Asked clarifying questions about the problem",
    "Thought out loud while problem solving",
    "Responded clearly to interviewer questions",
    "Walked through test cases verbally",
  ],

  // What counts as poor communication
  negativeSignals: [
    "Started coding without explaining approach",
    "Stated complexity without explanation (e.g., 'O(n²)' with no 'because...')",
    "Ignored or gave vague answers to questions",
    "Long silences without thinking out loud",
    "Didn't ask any questions about the problem",
    "Couldn't explain their code when asked",
  ],

  // Score thresholds
  thresholds: {
    high: { score: 80, requires: ["approach explained", "complexity discussed", "answered questions"] },
    medium: { score: 60, requires: ["approach explained OR complexity discussed"] },
    low: { score: 40, requires: ["minimal engagement"] },
  },
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get rubric by scenario type
 */
export function getRubricForScenario(scenarioType: "dsa" | "system-design" | "bugfix") {
  switch (scenarioType) {
    case "system-design":
      return SYSTEM_DESIGN_RUBRIC
    case "bugfix":
      return BUG_FIX_RUBRIC
    default:
      return DSA_RUBRIC
  }
}

/**
 * Format rubric for prompt injection
 */
export function formatRubricForPrompt(
  rubric: typeof DSA_RUBRIC | typeof SYSTEM_DESIGN_RUBRIC | typeof BUG_FIX_RUBRIC
): string {
  return `
## Evaluation Criteria: ${rubric.name}

### Areas to Evaluate
${rubric.evaluationAreas.map((a) => `- ${a}`).join("\n")}

### Positive Signals
${rubric.criticalSignals.positive.map((s) => `✓ ${s}`).join("\n")}

### Red Flags
${rubric.criticalSignals.negative.map((s) => `✗ ${s}`).join("\n")}

### Score Interpretation
${Object.entries(rubric.scoreInterpretation)
  .map(([level, { range, description }]) => `- ${range[0]}-${range[1]}: ${description}`)
  .join("\n")}
`
}

/**
 * Format communication rubric for prompt injection
 */
export function formatCommunicationRubricForPrompt(): string {
  return `
## Communication Evaluation

### Positive Signals (boost score)
${COMMUNICATION_RUBRIC.positiveSignals.map((s) => `✓ ${s}`).join("\n")}

### Negative Signals (reduce score)
${COMMUNICATION_RUBRIC.negativeSignals.map((s) => `✗ ${s}`).join("\n")}
`
}
