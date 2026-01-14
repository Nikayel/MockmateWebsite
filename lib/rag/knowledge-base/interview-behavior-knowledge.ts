/**
 * Interview Behavior Knowledge Base
 *
 * Contains best practices for technical interview communication,
 * level-appropriate expectations, and interviewer guidance.
 *
 * Sources:
 * - interviewing.io FAANG guides
 * - Tech Interview Handbook
 * - LeetCopilot Think Aloud research
 * - Industry best practices 2025
 */

import type { ExperienceLevel } from "@/lib/roadmap/role-based-config"

/**
 * Experience level type (matches roadmap config)
 */
export type InterviewLevel = ExperienceLevel // 'intern' | 'beginner' | 'intermediate' | 'advanced'

/**
 * Candidate behaviors that interviewers look for
 */
export interface CandidateBehavior {
  id: string
  name: string
  description: string
  /** How to detect this behavior in conversation (for AI validation) */
  detectionHints: string[]
  /** Why this matters */
  importance: string
  /** Score impact (0-100 contribution to communication score) */
  scoreWeight: number
  /** Which levels this applies to (empty = all levels) */
  applicableLevels: InterviewLevel[]
}

/**
 * Level-specific interview expectations
 */
export interface LevelExpectations {
  level: InterviewLevel
  displayName: string
  description: string
  /** What interviewers MUST see */
  mustHave: string[]
  /** Nice to have but not required */
  niceToHave: string[]
  /** Things NOT expected at this level */
  notExpected: string[]
  /** Appropriate follow-up questions */
  appropriateFollowUps: string[]
  /** Questions to AVOID asking */
  inappropriateFollowUps: string[]
  /** Focus areas for scoring */
  scoringFocus: {
    communication: "critical" | "important" | "moderate"
    optimization: "critical" | "important" | "moderate" | "not_required"
    codeQuality: "critical" | "important" | "moderate"
    edgeCases: "critical" | "important" | "moderate"
    systemDesign: "none" | "basic" | "moderate" | "advanced"
  }
  /** Time expectations */
  timeExpectations: {
    easyProblem: number // minutes
    mediumProblem: number
    hardProblem: number
  }
  /** Common mistakes at this level */
  commonMistakes: string[]
  /** Coaching tips for this level */
  coachingTips: string[]
}

/**
 * The 3-Phase Think Aloud Protocol
 * Based on industry best practices research
 */
export interface ThinkAloudPhase {
  phase: "setup" | "execution" | "review"
  name: string
  description: string
  expectedBehaviors: string[]
  examplePhrases: string[]
  redFlags: string[]
}

// =============================================================================
// CANDIDATE BEHAVIORS KNOWLEDGE
// =============================================================================

export const CANDIDATE_BEHAVIORS: CandidateBehavior[] = [
  {
    id: "restate-problem",
    name: "Restate the Problem",
    description:
      "Candidate confirms understanding by restating the problem in their own words before solving",
    detectionHints: [
      "So we need to...",
      "Let me make sure I understand...",
      "If I'm getting this right...",
      "To summarize...",
      "Basically we want to...",
      "The goal is to...",
    ],
    importance:
      "Shows active listening and prevents solving the wrong problem. Gives interviewer chance to correct misunderstandings early.",
    scoreWeight: 10,
    applicableLevels: [], // All levels
  },
  {
    id: "clarifying-questions",
    name: "Ask Clarifying Questions",
    description: "Candidate asks questions about constraints, edge cases, and requirements",
    detectionHints: [
      "Can the input be...?",
      "What if...?",
      "Are there any constraints on...?",
      "Should I handle...?",
      "Is it safe to assume...?",
      "What's the expected...?",
    ],
    importance:
      "Demonstrates thoroughness and attention to detail. Real problems often have ambiguous requirements.",
    scoreWeight: 15,
    applicableLevels: [], // All levels
  },
  {
    id: "explain-approach",
    name: "Explain Approach Before Coding",
    description: "Candidate describes their solution strategy before writing code",
    detectionHints: [
      "I'm thinking...",
      "My approach is...",
      "I'll use a...",
      "The idea is to...",
      "First I'll..., then...",
      "The key insight is...",
    ],
    importance:
      "CRITICAL. Interviewers need to understand your thinking. Silent coding is a major red flag.",
    scoreWeight: 25,
    applicableLevels: [], // All levels
  },
  {
    id: "discuss-tradeoffs",
    name: "Discuss Trade-offs",
    description:
      "Candidate mentions alternative approaches and explains why they chose their solution",
    detectionHints: [
      "I could also...",
      "Another approach would be...",
      "The trade-off is...",
      "This is better because...",
      "The downside is...",
      "If we needed to optimize for...",
    ],
    importance: "Shows engineering maturity. Senior engineers constantly weigh trade-offs.",
    scoreWeight: 10,
    applicableLevels: ["intermediate", "advanced"], // More important for senior
  },
  {
    id: "trace-example",
    name: "Trace Through Example",
    description:
      "Candidate walks through their solution with a concrete example before/after coding",
    detectionHints: [
      "Let me trace through...",
      "For example, if input is...",
      "Walking through this...",
      "So with [1,2,3]...",
      "In this case...",
    ],
    importance: "Proves the solution works and catches bugs early. Shows systematic thinking.",
    scoreWeight: 15,
    applicableLevels: [], // All levels
  },
  {
    id: "discuss-complexity",
    name: "Discuss Complexity",
    description: "Candidate analyzes and states the time and space complexity",
    detectionHints: [
      "Time complexity is O(...)",
      "This is O(n)...",
      "Space is O(...)",
      "Linear time...",
      "Constant space...",
      "The complexity is...",
    ],
    importance: "Expected in all technical interviews. Demonstrates CS fundamentals understanding.",
    scoreWeight: 15,
    applicableLevels: [], // All levels, but less strict for interns
  },
  {
    id: "proactive-edge-cases",
    name: "Proactively Consider Edge Cases",
    description: "Candidate mentions edge cases without being prompted",
    detectionHints: [
      "What if the input is empty?",
      "Edge case: when...",
      "I should handle...",
      "For null/empty...",
      "Special case...",
      "Boundary condition...",
    ],
    importance: "Shows attention to detail and defensive programming mindset.",
    scoreWeight: 10,
    applicableLevels: [], // All levels
  },
  {
    id: "vocalize-when-stuck",
    name: "Vocalize When Stuck",
    description: "Candidate communicates when they're unsure or stuck rather than going silent",
    detectionHints: [
      "I'm stuck on...",
      "I'm not sure about...",
      "Let me think...",
      "One moment...",
      "I'm considering...",
      "The part I'm unsure about...",
    ],
    importance: "Allows interviewer to provide hints. Silent struggles waste time and deny help.",
    scoreWeight: 10,
    applicableLevels: [], // All levels
  },
]

// =============================================================================
// LEVEL EXPECTATIONS KNOWLEDGE
// =============================================================================

export const LEVEL_EXPECTATIONS: Record<InterviewLevel, LevelExpectations> = {
  intern: {
    level: "intern",
    displayName: "Intern",
    description:
      "Entry-level internship candidate. Focus on fundamentals and communication over optimization.",
    mustHave: [
      "Clear problem-solving approach",
      "Working code that handles basic cases",
      "Communication throughout the process",
      "Ability to trace through examples",
      "Basic understanding of time complexity (O(n) vs O(n²))",
    ],
    niceToHave: [
      "Handle edge cases",
      "Discuss time complexity accurately",
      "Clean code style",
      "Quick debugging when tests fail",
    ],
    notExpected: [
      "Optimal solutions for hard problems",
      "System design knowledge",
      "Advanced data structures (tries, segment trees)",
      "Complex DP problems",
      "Production-level code patterns",
    ],
    appropriateFollowUps: [
      "What made you choose this approach?",
      "Can you trace through your solution with this example?",
      "What other approaches did you consider?",
      "How would you test this?",
      "What's the time complexity here?",
      "What happens if the input is empty?",
    ],
    inappropriateFollowUps: [
      "How would you explain this to a junior engineer?", // They ARE junior
      "How would you handle this at 10x scale?",
      "What monitoring would you add in production?",
      "How would you mentor someone through this?",
      "What's the amortized complexity?",
    ],
    scoringFocus: {
      communication: "critical",
      optimization: "not_required",
      codeQuality: "moderate",
      edgeCases: "moderate",
      systemDesign: "none",
    },
    timeExpectations: {
      easyProblem: 20,
      mediumProblem: 35,
      hardProblem: 50, // Usually not asked
    },
    commonMistakes: [
      "Jumping into code without explaining approach",
      "Not asking clarifying questions",
      "Going silent when stuck",
      "Not testing with examples",
      "Giving up instead of communicating",
    ],
    coachingTips: [
      "Focus on getting a WORKING solution first, then optimize",
      "Always explain what you're thinking, even if unsure",
      "It's OK to not know the optimal solution",
      "Ask questions when requirements are unclear",
      "Trace through your code with a simple example before running",
    ],
  },

  beginner: {
    level: "beginner",
    displayName: "New Grad / Junior",
    description:
      "Entry-level full-time candidate. Should demonstrate solid fundamentals and learning ability.",
    mustHave: [
      "Working solutions to medium problems",
      "Understanding of common patterns (two pointers, hash maps, etc.)",
      "Time complexity analysis",
      "Clear communication",
      "Edge case awareness",
    ],
    niceToHave: [
      "Optimal solutions to easy/medium problems",
      "Clean, readable code",
      "Discuss trade-offs between approaches",
      "Efficient debugging",
    ],
    notExpected: [
      "Optimal solutions to hard problems without hints",
      "Advanced system design",
      "Complex optimization techniques",
      "Esoteric algorithms",
    ],
    appropriateFollowUps: [
      "What's the time and space complexity?",
      "Can you optimize this further?",
      "What if the input was sorted?",
      "How would you handle duplicates?",
      "What's an alternative approach?",
      "What edge cases should we test?",
    ],
    inappropriateFollowUps: [
      "How would you design this system at scale?",
      "What distributed systems considerations apply?",
      "How would you lead a team implementing this?",
    ],
    scoringFocus: {
      communication: "critical",
      optimization: "important",
      codeQuality: "important",
      edgeCases: "important",
      systemDesign: "none",
    },
    timeExpectations: {
      easyProblem: 15,
      mediumProblem: 30,
      hardProblem: 45,
    },
    commonMistakes: [
      "Not discussing complexity before being asked",
      "Missing common edge cases (empty, single element)",
      "Overcomplicating solutions",
      "Not verifying solution works before declaring done",
    ],
    coachingTips: [
      "Always mention time and space complexity after solving",
      "Think about edge cases proactively",
      "If you see a brute force solution, mention it, then optimize",
      "Clean code matters - use meaningful variable names",
    ],
  },

  intermediate: {
    level: "intermediate",
    displayName: "Mid-Level",
    description: "Experienced engineer. Should demonstrate optimal solutions and system thinking.",
    mustHave: [
      "Optimal solutions to medium problems",
      "Working solutions to hard problems",
      "System design basics",
      "Code quality and testing mindset",
      "Trade-off discussions",
    ],
    niceToHave: [
      "Optimal solutions to hard problems",
      "Deep system design knowledge",
      "Scalability considerations",
      "Production-readiness awareness",
    ],
    notExpected: [
      "Distributed systems expertise",
      "ML/AI specialization",
      "Org-level architectural decisions",
    ],
    appropriateFollowUps: [
      "How would you optimize this for memory?",
      "What if we needed to handle 10x the data?",
      "How would you make this thread-safe?",
      "What's the trade-off between these approaches?",
      "How would you test this in production?",
      "What monitoring would you add?",
    ],
    inappropriateFollowUps: [
      "Can you trace through what this loop does?", // Too basic
      "What does O(n) mean?", // Should know this
    ],
    scoringFocus: {
      communication: "important",
      optimization: "critical",
      codeQuality: "critical",
      edgeCases: "critical",
      systemDesign: "basic",
    },
    timeExpectations: {
      easyProblem: 10,
      mediumProblem: 25,
      hardProblem: 40,
    },
    commonMistakes: [
      "Jumping to optimal solution without explaining thought process",
      "Not discussing trade-offs between approaches",
      "Ignoring production considerations",
      "Over-engineering simple problems",
    ],
    coachingTips: [
      "Start with brute force, then optimize - show your thinking evolution",
      "Always discuss trade-offs even when one solution is clearly better",
      "Consider scalability and production concerns",
      "Write clean, maintainable code - imagine others reading it",
    ],
  },

  advanced: {
    level: "advanced",
    displayName: "Senior / Staff",
    description:
      "Senior engineer. Should demonstrate mastery, system design expertise, and mentoring ability.",
    mustHave: [
      "Optimal solutions to hard problems",
      "System design expertise",
      "Trade-off analysis at scale",
      "Leadership and mentoring ability",
      "Production-grade thinking",
    ],
    niceToHave: [
      "Domain expertise",
      "Architectural vision",
      "Cross-team influence examples",
      "Novel optimizations",
    ],
    notExpected: [], // Seniors should handle everything
    appropriateFollowUps: [
      "How would you explain this to a junior engineer?",
      "What would change if we needed 100x scale?",
      "How would you design the end-to-end system?",
      "What monitoring and alerting would you set up?",
      "How would you lead the implementation of this?",
      "What are the failure modes and how would you handle them?",
    ],
    inappropriateFollowUps: [
      // Nothing is off-limits for seniors
    ],
    scoringFocus: {
      communication: "important",
      optimization: "critical",
      codeQuality: "critical",
      edgeCases: "critical",
      systemDesign: "advanced",
    },
    timeExpectations: {
      easyProblem: 8,
      mediumProblem: 20,
      hardProblem: 35,
    },
    commonMistakes: [
      "Not demonstrating system-level thinking",
      "Focusing only on algorithm without discussing broader context",
      "Not showing mentoring/leadership signals",
      "Over-optimizing at the expense of readability",
    ],
    coachingTips: [
      "Show how you'd make this production-ready",
      "Discuss monitoring, error handling, and failure modes",
      "Demonstrate how you'd teach this to others",
      "Think about the full system, not just the algorithm",
    ],
  },
}

// =============================================================================
// THINK ALOUD PROTOCOL
// =============================================================================

export const THINK_ALOUD_PHASES: ThinkAloudPhase[] = [
  {
    phase: "setup",
    name: "Setup Phase (Before Coding)",
    description: "Establish alignment with interviewer before writing any code",
    expectedBehaviors: [
      "Restate the problem to confirm understanding",
      "Ask clarifying questions about constraints and edge cases",
      "Propose a high-level approach",
      "Wait for interviewer approval before coding",
    ],
    examplePhrases: [
      "So we're finding the longest palindromic substring, correct?",
      "What's the expected input size?",
      "I'm thinking we could use dynamic programming here...",
      "Does that approach sound reasonable before I start coding?",
    ],
    redFlags: [
      "Immediately starts coding without any discussion",
      "Doesn't ask any clarifying questions",
      "Doesn't explain approach before coding",
    ],
  },
  {
    phase: "execution",
    name: "Execution Phase (While Coding)",
    description: "Narrate your intent while implementing the solution",
    expectedBehaviors: [
      "Explain intent, not syntax (WHY not WHAT)",
      "Pause to explain complex sections",
      "Vocalize when stuck instead of going silent",
      "Respond to interviewer questions while coding",
    ],
    examplePhrases: [
      "I'm using a hash map here for O(1) lookup time",
      "Moving the left pointer to shrink the window because we found a duplicate",
      "I'm stuck on the base case - let me think about this...",
      "This loop handles the iteration from both ends...",
    ],
    redFlags: [
      "Codes in complete silence for extended periods",
      "Only describes syntax: 'I'm creating a variable called map'",
      "Goes silent when encountering difficulty",
    ],
  },
  {
    phase: "review",
    name: "Review Phase (After Coding)",
    description: "Verify solution correctness and analyze complexity",
    expectedBehaviors: [
      "Trace through with a simple example",
      "Test edge cases verbally",
      "State time and space complexity",
      "Suggest potential improvements",
    ],
    examplePhrases: [
      "Let me trace through with input 'aba'...",
      "For the empty string case, we'd return...",
      "Time complexity is O(n²), space is O(1)",
      "If we needed better time, we could use Manacher's algorithm",
    ],
    redFlags: [
      "Declares 'done' without any verification",
      "Doesn't mention complexity",
      "Doesn't consider edge cases",
    ],
  },
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get level-appropriate expectations
 */
export function getLevelExpectations(level: InterviewLevel): LevelExpectations {
  return LEVEL_EXPECTATIONS[level]
}

/**
 * Get appropriate follow-up questions for a level
 */
export function getAppropriateFollowUps(level: InterviewLevel): string[] {
  return LEVEL_EXPECTATIONS[level].appropriateFollowUps
}

/**
 * Get questions to avoid for a level
 */
export function getInappropriateFollowUps(level: InterviewLevel): string[] {
  return LEVEL_EXPECTATIONS[level].inappropriateFollowUps
}

/**
 * Check if a follow-up question is appropriate for a level
 */
export function isFollowUpAppropriate(
  question: string,
  level: InterviewLevel
): { appropriate: boolean; reason?: string } {
  const levelExpectations = LEVEL_EXPECTATIONS[level]
  const inappropriate = levelExpectations.inappropriateFollowUps

  // Check if question matches any inappropriate patterns
  const lowerQuestion = question.toLowerCase()
  for (const badQuestion of inappropriate) {
    if (lowerQuestion.includes(badQuestion.toLowerCase().slice(0, 30))) {
      return {
        appropriate: false,
        reason: `This question may be too advanced for ${levelExpectations.displayName} level`,
      }
    }
  }

  return { appropriate: true }
}

/**
 * Get coaching tips for a level
 */
export function getCoachingTips(level: InterviewLevel): string[] {
  return LEVEL_EXPECTATIONS[level].coachingTips
}

/**
 * Get expected time for a problem at a given level
 */
export function getExpectedTime(
  level: InterviewLevel,
  difficulty: "easy" | "medium" | "hard"
): number {
  const expectations = LEVEL_EXPECTATIONS[level].timeExpectations
  return difficulty === "easy"
    ? expectations.easyProblem
    : difficulty === "medium"
      ? expectations.mediumProblem
      : expectations.hardProblem
}

/**
 * Build context string for interviewer RAG
 */
export function buildInterviewerLevelContext(level: InterviewLevel): string {
  const expectations = LEVEL_EXPECTATIONS[level]

  return `
## Candidate Level: ${expectations.displayName}

### What to Look For (Must Have)
${expectations.mustHave.map((m) => `- ${m}`).join("\n")}

### Nice to Have (Not Required)
${expectations.niceToHave.map((m) => `- ${m}`).join("\n")}

### NOT Expected at This Level
${expectations.notExpected.map((m) => `- ${m}`).join("\n")}

### Appropriate Follow-up Questions
${expectations.appropriateFollowUps.map((q) => `- "${q}"`).join("\n")}

### Questions to AVOID (Too Advanced/Inappropriate)
${expectations.inappropriateFollowUps.map((q) => `- "${q}"`).join("\n")}

### Scoring Focus
- Communication: ${expectations.scoringFocus.communication}
- Optimization: ${expectations.scoringFocus.optimization}
- Code Quality: ${expectations.scoringFocus.codeQuality}
- Edge Cases: ${expectations.scoringFocus.edgeCases}
- System Design: ${expectations.scoringFocus.systemDesign}

### Common Mistakes to Watch For
${expectations.commonMistakes.map((m) => `- ${m}`).join("\n")}
`
}

/**
 * Build context string for candidate behaviors to detect
 */
export function buildBehaviorDetectionContext(): string {
  const behaviors = CANDIDATE_BEHAVIORS.map(
    (b) => `
### ${b.name}
${b.description}
Detection hints: ${b.detectionHints.slice(0, 4).join(", ")}
Importance: ${b.importance}
`
  ).join("\n")

  return `
## Candidate Behaviors to Detect

${behaviors}
`
}
