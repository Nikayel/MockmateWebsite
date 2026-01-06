/**
 * Scoring Algorithm for AI-Assisted Technical Interviews
 *
 * ARCHITECTURE NOTE:
 * This file provides types and client-side scoring estimates.
 * The AUTHORITATIVE scoring happens server-side in /api/generate-feedback/route.ts
 * which uses AI validation + algorithmic checks for tamper-resistant scoring.
 *
 * Use this file for:
 * - InteractionMetrics type definitions
 * - Client-side score previews (before final server scoring)
 * - ScoreBreakdown type for displaying results
 *
 * Philosophy:
 * This scoring system is designed to simulate real-world AI-assisted interviews
 * (Meta, Google, etc.) where candidates are graded on:
 *
 * 1. Understanding of the code - Can you explain what you wrote?
 * 2. Debugging and problem-solving - How do you approach bugs?
 * 3. Code quality - Is your code clean, efficient, and well-structured?
 * 4. How well you explain decisions - Can you justify your choices?
 *
 * AI usage is OPTIONAL. You are NOT penalized for NOT using AI.
 * You ARE penalized for blindly copy-pasting AI suggestions without understanding.
 *
 * CRITICAL: Silent solutions (correct code without explanation) are penalized.
 * Real interviews require communication - a silent optimal solution is a C at best.
 *
 * The goal is to prepare candidates for real interviews where AI is a tool,
 * not a crutch.
 */

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface InteractionMetrics {
  // Code Understanding & Explanation (most important)
  codeExplanationQuality: number; // 0-100, how well they explain their code
  approachExplanationGiven: boolean; // Did they explain their approach?
  complexityAnalysisProvided: boolean; // Did they discuss time/space complexity?
  edgeCasesIdentified: number; // Number of edge cases they identified

  // Debugging & Problem-Solving
  debuggingAttempts: number; // How many bugs did they find and fix?
  testDrivenApproach: boolean; // Did they run tests iteratively?
  systematicDebugging: boolean; // Did they debug systematically vs. randomly?

  // Code Quality Metrics (primary scoring)
  testCasesPassed: number;
  testCasesTotal: number;
  codeEfficiencyScore: number; // 0-100
  codeQualityScore: number; // 0-100
  codeReadability: number; // 0-100

  // Problem-Solving Approach
  brokeDownProblem: boolean; // Did they break the problem into smaller parts?
  consideredAlternatives: boolean; // Did they consider multiple approaches?
  optimizationAttempted: boolean; // Did they try to optimize?

  // AI Collaboration (optional, not penalized for non-use)
  aiQuestionsAsked: number; // How many AI questions
  aiSuggestionsUnderstood: number; // Suggestions properly understood/implemented
  aiSuggestionsMisunderstood: number; // Suggestions blindly copied without understanding
  aiUsedStrategically: boolean; // Used AI for specific purposes vs. "solve this for me"

  // Communication with Interviewer
  interviewerQuestionsAnswered: number;
  clarifyingQuestionsAsked: number;
  thoughtProcessShared: number; // 0-100, how much they verbalized thinking

  // Problem Context
  problemDifficulty: 'easy' | 'medium' | 'hard';
  problemType: 'dsa' | 'bugfix' | 'system-design';
  skillsDemonstrated: string[];

  // Time & Efficiency
  timeSpent: number; // in seconds
  hintsRevealed: number;
  hintsTotal: number;

  // Workspace Context (for bugfix/system-design)
  workspaceFilesViewed: number;
  workspaceFilesTotal: number;
  workspaceContextUsed: boolean;
}

export interface ScoreBreakdown {
  // Primary scores (what really matters)
  codeQualityScore: number; // 30% - Tests, efficiency, readability
  problemSolvingScore: number; // 25% - Approach, debugging, optimization
  understandingScore: number; // 25% - Code explanation, complexity analysis
  communicationScore: number; // 20% - Sharing thought process, answering questions

  // Secondary indicators (informational, not heavily weighted)
  aiCollaborationIndicator: number; // How effectively AI was used (if at all)

  // Final score
  overallScore: number; // 0-100
}

// =============================================================================
// SCORING WEIGHTS
// =============================================================================

const WEIGHTS = {
  codeQuality: 0.30, // 30% - Your code must work and be clean
  problemSolving: 0.25, // 25% - How you approach and debug problems
  understanding: 0.25, // 25% - Can you explain what you wrote?
  communication: 0.20, // 20% - Did you share your thought process?
};

// =============================================================================
// MAIN SCORING FUNCTION
// =============================================================================

/**
 * Calculate comprehensive score based on interview performance
 *
 * Key principles:
 * - Code that works > Code that's elegant but broken
 * - Understanding your code > Having AI write it
 * - Explaining your decisions > Silent coding
 * - Strategic AI use > AI spam
 */
export function calculateUserScore(metrics: InteractionMetrics): ScoreBreakdown {
  // 1. CODE QUALITY SCORE (30%)
  // The most objective metric - does your code work?
  const testPassRate = metrics.testCasesTotal > 0
    ? (metrics.testCasesPassed / metrics.testCasesTotal) * 100
    : 0;

  // Weighted components
  const codeQualityScore = Math.min(100, Math.round(
    testPassRate * 0.50 + // 50% - Tests must pass
    (metrics.codeEfficiencyScore || 50) * 0.25 + // 25% - Efficiency matters
    (metrics.codeReadability || 50) * 0.15 + // 15% - Readable code
    (metrics.codeQualityScore || 50) * 0.10 // 10% - General quality
  ));

  // 2. PROBLEM-SOLVING SCORE (25%)
  // How do you approach the problem?
  let problemSolvingScore = 0;

  // Base: test pass rate adjusted for difficulty
  const difficultyMultiplier = {
    easy: 0.85,
    medium: 1.0,
    hard: 1.15,
  }[metrics.problemDifficulty];

  problemSolvingScore = testPassRate * 0.40 * difficultyMultiplier;

  // Bonus for structured approach
  if (metrics.brokeDownProblem) problemSolvingScore += 10;
  if (metrics.consideredAlternatives) problemSolvingScore += 10;
  if (metrics.optimizationAttempted) problemSolvingScore += 10;
  if (metrics.testDrivenApproach) problemSolvingScore += 10;
  if (metrics.systematicDebugging) problemSolvingScore += 10;

  // Debugging bonus (for bugfix scenarios)
  if (metrics.problemType === 'bugfix') {
    const debugBonus = Math.min(20, metrics.debuggingAttempts * 5);
    problemSolvingScore += debugBonus;

    // Workspace context usage is important for bugfix
    if (metrics.workspaceContextUsed && metrics.workspaceFilesTotal > 0) {
      const contextUsage = (metrics.workspaceFilesViewed / metrics.workspaceFilesTotal) * 15;
      problemSolvingScore += contextUsage;
    }
  }

  // System design: extra weight on architecture
  if (metrics.problemType === 'system-design') {
    if (metrics.workspaceContextUsed) problemSolvingScore += 20;
  }

  problemSolvingScore = Math.min(100, Math.round(problemSolvingScore));

  // 3. UNDERSTANDING SCORE (25%)
  // Can you explain what you wrote? This is what real interviewers care about.
  let understandingScore = 0;

  // Explanation quality is key
  understandingScore += (metrics.codeExplanationQuality || 0) * 0.40;

  // Did they explain their approach?
  if (metrics.approachExplanationGiven) understandingScore += 15;

  // Complexity analysis shows deep understanding
  if (metrics.complexityAnalysisProvided) understandingScore += 15;

  // Edge cases show thorough thinking - reward up to 5 edge cases
  const edgeCaseBonus = Math.min(25, metrics.edgeCasesIdentified * 5);
  understandingScore += edgeCaseBonus;

  // AI understanding penalty - if you used AI but didn't understand it
  if (metrics.aiSuggestionsMisunderstood > 0) {
    const totalAiInteractions = metrics.aiSuggestionsUnderstood + metrics.aiSuggestionsMisunderstood;
    if (totalAiInteractions > 0) {
      const misunderstandingRate = metrics.aiSuggestionsMisunderstood / totalAiInteractions;
      understandingScore -= misunderstandingRate * 20; // Up to 20 point penalty for blindly copying
    }
  }

  understandingScore = Math.min(100, Math.max(0, Math.round(understandingScore)));

  // 4. COMMUNICATION SCORE (20%)
  // Did you share your thinking? Real interviews require this.
  let communicationScore = 0;

  // Thought process sharing
  communicationScore += (metrics.thoughtProcessShared || 0) * 0.40;

  // Answering interviewer questions
  const questionsAnsweredBonus = Math.min(25, metrics.interviewerQuestionsAnswered * 5);
  communicationScore += questionsAnsweredBonus;

  // Asking clarifying questions shows engagement
  const clarifyingBonus = Math.min(20, metrics.clarifyingQuestionsAsked * 4);
  communicationScore += clarifyingBonus;

  // Strategic AI use (asking good questions) shows communication skills
  if (metrics.aiUsedStrategically) {
    communicationScore += 10;
  }

  communicationScore = Math.min(100, Math.round(communicationScore));

  // 5. AI COLLABORATION INDICATOR (informational only)
  // This is NOT heavily weighted - just an indicator of AI usage quality
  let aiCollaborationIndicator = 50; // Default neutral

  if (metrics.aiQuestionsAsked > 0) {
    const aiUnderstoodRatio = metrics.aiSuggestionsUnderstood > 0
      ? metrics.aiSuggestionsUnderstood / (metrics.aiSuggestionsUnderstood + metrics.aiSuggestionsMisunderstood)
      : 0.5;

    aiCollaborationIndicator = Math.round(
      aiUnderstoodRatio * 60 + // 60% - Did you understand the AI?
      (metrics.aiUsedStrategically ? 25 : 0) + // 25% - Was usage strategic?
      15 // Base points for even trying
    );
  }

  // Calculate final weighted score
  const overallScore = Math.round(
    codeQualityScore * WEIGHTS.codeQuality +
    problemSolvingScore * WEIGHTS.problemSolving +
    understandingScore * WEIGHTS.understanding +
    communicationScore * WEIGHTS.communication
  );

  return {
    codeQualityScore,
    problemSolvingScore,
    understandingScore,
    communicationScore,
    aiCollaborationIndicator,
    overallScore: Math.min(100, Math.max(0, overallScore)),
  };
}

// =============================================================================
// PERFORMANCE FEEDBACK
// =============================================================================

export interface PerformanceFeedback {
  level: 'excellent' | 'good' | 'average' | 'needs-improvement';
  feedback: string;
  recommendations: string[];
  strengths: string[];
}

export function getPerformanceFeedback(score: ScoreBreakdown): PerformanceFeedback {
  const { overallScore, codeQualityScore, problemSolvingScore, understandingScore, communicationScore } = score;

  let level: PerformanceFeedback['level'];
  let feedback: string;
  const recommendations: string[] = [];
  const strengths: string[] = [];

  // Determine performance level
  if (overallScore >= 85) {
    level = 'excellent';
    feedback = "Outstanding performance! You demonstrated strong problem-solving skills, clear code understanding, and excellent communication. You'd likely pass this interview at a top tech company.";
  } else if (overallScore >= 70) {
    level = 'good';
    feedback = "Good work! You showed solid technical skills and reasonable communication. A few improvements would make you a strong candidate.";
  } else if (overallScore >= 50) {
    level = 'average';
    feedback = "Decent performance with room for improvement. Focus on explaining your thought process more clearly and ensuring your code passes all test cases.";
  } else {
    level = 'needs-improvement';
    feedback = "Keep practicing! Focus on understanding the problem fully before coding, and practice explaining your approach out loud.";
  }

  // Identify strengths
  if (codeQualityScore >= 80) {
    strengths.push("Strong code quality - your solution is efficient and readable");
  }
  if (problemSolvingScore >= 80) {
    strengths.push("Excellent problem-solving approach - you broke down the problem effectively");
  }
  if (understandingScore >= 80) {
    strengths.push("Deep understanding - you clearly explained your code and reasoning");
  }
  if (communicationScore >= 80) {
    strengths.push("Great communication - you shared your thought process clearly");
  }

  // Generate recommendations based on weak areas
  if (codeQualityScore < 60) {
    recommendations.push("Focus on passing all test cases before optimizing. A working solution beats an elegant broken one.");
  }

  if (problemSolvingScore < 60) {
    recommendations.push("Practice breaking down problems into smaller steps before coding. Consider multiple approaches.");
  }

  if (understandingScore < 60) {
    recommendations.push("Practice explaining your code out loud. In real interviews, you must justify every line you write.");
    if (score.aiCollaborationIndicator > 50) {
      recommendations.push("When using AI, make sure you fully understand suggestions before implementing them.");
    }
  }

  if (communicationScore < 60) {
    recommendations.push("Share your thinking process more. Talk through your approach before and while coding.");
    recommendations.push("Ask clarifying questions - it shows you're thinking critically about the problem.");
  }

  // Add AI-specific feedback if relevant
  if (score.aiCollaborationIndicator < 40) {
    recommendations.push("If you use AI, ask specific questions rather than requesting complete solutions.");
  }

  return { level, feedback, recommendations, strengths };
}

// =============================================================================
// METRICS INITIALIZATION
// =============================================================================

/**
 * Create default metrics for a new interview session
 */
export function createDefaultMetrics(
  problemDifficulty: 'easy' | 'medium' | 'hard',
  problemType: 'dsa' | 'bugfix' | 'system-design'
): InteractionMetrics {
  return {
    // Code Understanding
    codeExplanationQuality: 0,
    approachExplanationGiven: false,
    complexityAnalysisProvided: false,
    edgeCasesIdentified: 0,

    // Debugging
    debuggingAttempts: 0,
    testDrivenApproach: false,
    systematicDebugging: false,

    // Code Quality
    testCasesPassed: 0,
    testCasesTotal: 0,
    codeEfficiencyScore: 50,
    codeQualityScore: 50,
    codeReadability: 50,

    // Problem-Solving
    brokeDownProblem: false,
    consideredAlternatives: false,
    optimizationAttempted: false,

    // AI Collaboration
    aiQuestionsAsked: 0,
    aiSuggestionsUnderstood: 0,
    aiSuggestionsMisunderstood: 0,
    aiUsedStrategically: false,

    // Communication
    interviewerQuestionsAnswered: 0,
    clarifyingQuestionsAsked: 0,
    thoughtProcessShared: 0,

    // Problem Context
    problemDifficulty,
    problemType,
    skillsDemonstrated: [],

    // Time & Hints
    timeSpent: 0,
    hintsRevealed: 0,
    hintsTotal: 0,

    // Workspace
    workspaceFilesViewed: 0,
    workspaceFilesTotal: 0,
    workspaceContextUsed: false,
  };
}

// =============================================================================
// LEGACY COMPATIBILITY (for backward compatibility with existing code)
// =============================================================================

/**
 * @deprecated Use createDefaultMetrics instead
 * This function maintains backward compatibility with the old scoring interface
 */
export function vectorizeMetrics(metrics: InteractionMetrics): number[] {
  return [
    metrics.testCasesPassed / Math.max(1, metrics.testCasesTotal),
    metrics.codeEfficiencyScore / 100,
    metrics.codeQualityScore / 100,
    metrics.codeExplanationQuality / 100,
    metrics.timeSpent / 3600,
    metrics.hintsRevealed / Math.max(1, metrics.hintsTotal),
    metrics.workspaceFilesViewed / Math.max(1, metrics.workspaceFilesTotal),
    metrics.workspaceContextUsed ? 1 : 0,
    metrics.aiQuestionsAsked,
    metrics.aiSuggestionsUnderstood / Math.max(1, metrics.aiSuggestionsUnderstood + metrics.aiSuggestionsMisunderstood),
    metrics.problemDifficulty === 'easy' ? 0 : metrics.problemDifficulty === 'medium' ? 0.5 : 1,
    metrics.problemType === 'dsa' ? 0 : metrics.problemType === 'bugfix' ? 0.5 : 1,
  ];
}

// Legacy interface for backward compatibility
export interface LegacyInteractionMetrics {
  partnerMessagesSent?: number;
  partnerMessagesReceived?: number;
  partnerHintsRequested?: number;
  partnerCodeSuggestionsAccepted?: number;
  aiCollaborationQuality?: number;
  aiQuestionsQuality?: number;
  aiSuggestionsUnderstood?: number;
  aiSuggestionsMisunderstood?: number;
  aiOverDependency?: number;
  strategicAiUsage?: number;
  interviewerQuestionsAnswered?: number;
  interviewerClarificationsRequested?: number;
  interviewerFeedbackAcknowledged?: number;
  proactiveInteractions?: number;
  testCasesPassed: number;
  testCasesTotal: number;
  codeEfficiencyScore: number;
  codeQualityScore: number;
  problemDifficulty: 'easy' | 'medium' | 'hard';
  problemType: 'dsa' | 'bugfix' | 'system-design';
  skillsDemonstrated?: string[];
  timeSpent: number;
  hintsRevealed: number;
  hintsTotal: number;
  workspaceFilesViewed?: number;
  workspaceFilesTotal?: number;
  workspaceContextUsed?: boolean;
}

/**
 * Convert legacy metrics to new format
 */
export function convertLegacyMetrics(legacy: LegacyInteractionMetrics): InteractionMetrics {
  return {
    codeExplanationQuality: legacy.aiCollaborationQuality || 50,
    approachExplanationGiven: (legacy.interviewerQuestionsAnswered || 0) > 0,
    complexityAnalysisProvided: false,
    edgeCasesIdentified: 0,

    debuggingAttempts: 0,
    testDrivenApproach: legacy.testCasesPassed > 0,
    systematicDebugging: false,

    testCasesPassed: legacy.testCasesPassed,
    testCasesTotal: legacy.testCasesTotal,
    codeEfficiencyScore: legacy.codeEfficiencyScore,
    codeQualityScore: legacy.codeQualityScore,
    codeReadability: 50,

    brokeDownProblem: false,
    consideredAlternatives: false,
    optimizationAttempted: false,

    aiQuestionsAsked: legacy.partnerMessagesSent || 0,
    aiSuggestionsUnderstood: legacy.aiSuggestionsUnderstood || 0,
    aiSuggestionsMisunderstood: legacy.aiSuggestionsMisunderstood || 0,
    aiUsedStrategically: (legacy.strategicAiUsage || 0) > 50,

    interviewerQuestionsAnswered: legacy.interviewerQuestionsAnswered || 0,
    clarifyingQuestionsAsked: legacy.interviewerClarificationsRequested || 0,
    thoughtProcessShared: (legacy.proactiveInteractions || 0) * 10,

    problemDifficulty: legacy.problemDifficulty,
    problemType: legacy.problemType,
    skillsDemonstrated: legacy.skillsDemonstrated || [],

    timeSpent: legacy.timeSpent,
    hintsRevealed: legacy.hintsRevealed,
    hintsTotal: legacy.hintsTotal,

    workspaceFilesViewed: legacy.workspaceFilesViewed || 0,
    workspaceFilesTotal: legacy.workspaceFilesTotal || 0,
    workspaceContextUsed: legacy.workspaceContextUsed || false,
  };
}
