/**
 * Scoring algorithm for user performance based on interactions
 * Tracks and scores user interactions with coding partner, AI interviewer, and solution quality
 */

export interface InteractionMetrics {
  // Coding Partner (AI) Interactions
  partnerMessagesSent: number
  partnerMessagesReceived: number
  partnerHintsRequested: number
  partnerCodeSuggestionsAccepted: number
  
  // AI Collaboration Quality Metrics
  aiCollaborationQuality: number // 0-100, assessed by interviewer
  aiQuestionsQuality: number // 0-100, quality of questions asked to AI
  aiSuggestionsUnderstood: number // Count of AI suggestions properly understood/implemented
  aiSuggestionsMisunderstood: number // Count of AI suggestions misunderstood or poorly implemented
  aiOverDependency: number // 0-100, how overly dependent on AI (lower is better)
  strategicAiUsage: number // 0-100, how strategically AI is used
  
  // AI Interviewer Interactions
  interviewerQuestionsAnswered: number
  interviewerClarificationsRequested: number
  interviewerFeedbackAcknowledged: number
  proactiveInteractions: number
  
  // Code Quality Metrics
  testCasesPassed: number
  testCasesTotal: number
  codeEfficiencyScore: number
  codeQualityScore: number
  
  // Problem-Specific Metrics
  problemDifficulty: 'easy' | 'medium' | 'hard'
  problemType: 'dsa' | 'bugfix' | 'system-design'
  skillsDemonstrated: string[] // e.g., ['arrays', 'dynamic-programming', 'debugging']
  
  // Time Metrics
  timeSpent: number // in seconds
  hintsRevealed: number
  hintsTotal: number
  
  // Workspace Context Usage (for bugfix)
  workspaceFilesViewed: number
  workspaceFilesTotal: number
  workspaceContextUsed: boolean
}

export interface ScoreBreakdown {
  interactionScore: number // 0-100
  codeQualityScore: number // 0-100
  efficiencyScore: number // 0-100
  communicationScore: number // 0-100
  aiCollaborationScore: number // 0-100 - NEW: How well they collaborate with AI
  problemSolvingScore: number // 0-100
  overallScore: number // 0-100
}

/**
 * Calculate comprehensive score based on user interactions
 */
export function calculateUserScore(metrics: InteractionMetrics): ScoreBreakdown {
  // 1. Interaction Score (30% weight)
  // Measures engagement with AI partners
  const partnerEngagement = Math.min(
    100,
    (metrics.partnerMessagesSent * 5) + 
    (metrics.partnerMessagesReceived * 3) +
    (metrics.partnerHintsRequested * 2)
  )
  
  const interviewerEngagement = Math.min(
    100,
    (metrics.interviewerQuestionsAnswered * 8) +
    (metrics.interviewerClarificationsRequested * 5) +
    (metrics.proactiveInteractions * 3)
  )
  
  const interactionScore = (partnerEngagement * 0.4 + interviewerEngagement * 0.6)
  
  // 2. Code Quality Score (25% weight)
  const testPassRate = metrics.testCasesTotal > 0 
    ? (metrics.testCasesPassed / metrics.testCasesTotal) * 100 
    : 0
  
  const codeQualityScore = (testPassRate * 0.7) + (metrics.codeQualityScore * 0.3)
  
  // 3. Efficiency Score (20% weight)
  // Considers time spent, hints used, and code efficiency
  const timeEfficiency = metrics.timeSpent > 0 
    ? Math.max(0, 100 - (metrics.timeSpent / 60) * 2) // Penalize excessive time
    : 50
  
  const hintEfficiency = metrics.hintsTotal > 0
    ? (1 - (metrics.hintsRevealed / metrics.hintsTotal)) * 100 // Reward using fewer hints
    : 50
  
  const efficiencyScore = (
    (timeEfficiency * 0.3) + 
    (hintEfficiency * 0.2) + 
    (metrics.codeEfficiencyScore * 0.5)
  )
  
  // 4. Communication Score (10% weight)
  // Measures how well user communicates with interviewer
  const questionQuality = Math.min(100, metrics.interviewerClarificationsRequested * 15)
  const feedbackEngagement = Math.min(100, metrics.interviewerFeedbackAcknowledged * 20)
  
  const communicationScore = (questionQuality * 0.5) + (feedbackEngagement * 0.5)
  
  // 5. AI Collaboration Score (15% weight) - NEW
  // Measures how effectively user collaborates with AI tools (Meta pilot program style)
  const aiQuestionQuality = metrics.aiQuestionsQuality || 0
  const aiUnderstanding = metrics.aiSuggestionsUnderstood > 0
    ? Math.min(100, (metrics.aiSuggestionsUnderstood / (metrics.aiSuggestionsUnderstood + metrics.aiSuggestionsMisunderstood)) * 100)
    : 50
  const aiStrategicUsage = metrics.strategicAiUsage || 50
  const aiDependencyPenalty = Math.max(0, 100 - (metrics.aiOverDependency || 0))
  
  const aiCollaborationScore = (
    (aiQuestionQuality * 0.3) +
    (aiUnderstanding * 0.3) +
    (aiStrategicUsage * 0.25) +
    (aiDependencyPenalty * 0.15)
  )
  
  // 6. Problem Solving Score (15% weight)
  // For bugfix: workspace context usage is important
  // For DSA: algorithm correctness and optimization
  // Adjust based on problem difficulty
  let problemSolvingScore = 0
  const difficultyMultiplier = metrics.problemDifficulty === 'hard' ? 1.2 : metrics.problemDifficulty === 'medium' ? 1.0 : 0.8
  
  if (metrics.workspaceContextUsed) {
    // Bugfix scenario - reward using workspace context
    const workspaceUsage = metrics.workspaceFilesTotal > 0
      ? (metrics.workspaceFilesViewed / metrics.workspaceFilesTotal) * 100
      : 0
    problemSolvingScore = (workspaceUsage * 0.5 + (testPassRate * 0.5)) * difficultyMultiplier
  } else {
    // DSA scenario - focus on solution quality
    problemSolvingScore = testPassRate * difficultyMultiplier
  }
  
  // Ensure score doesn't exceed 100
  problemSolvingScore = Math.min(100, problemSolvingScore)
  
  // Calculate overall weighted score
  const overallScore = (
    interactionScore * 0.25 +
    codeQualityScore * 0.20 +
    efficiencyScore * 0.15 +
    communicationScore * 0.10 +
    aiCollaborationScore * 0.15 +
    problemSolvingScore * 0.15
  )
  
  return {
    interactionScore: Math.round(interactionScore),
    codeQualityScore: Math.round(codeQualityScore),
    efficiencyScore: Math.round(efficiencyScore),
    communicationScore: Math.round(communicationScore),
    aiCollaborationScore: Math.round(aiCollaborationScore),
    problemSolvingScore: Math.round(problemSolvingScore),
    overallScore: Math.round(overallScore),
  }
}

/**
 * Get performance feedback based on score
 */
export function getPerformanceFeedback(score: ScoreBreakdown): {
  level: 'excellent' | 'good' | 'average' | 'needs-improvement'
  feedback: string
  recommendations: string[]
} {
  const { overallScore, interactionScore, codeQualityScore, efficiencyScore, communicationScore } = score
  
  let level: 'excellent' | 'good' | 'average' | 'needs-improvement'
  let feedback: string
  const recommendations: string[] = []
  
  if (overallScore >= 85) {
    level = 'excellent'
    feedback = "Outstanding performance! You demonstrated strong problem-solving skills, effective communication, and high-quality code."
  } else if (overallScore >= 70) {
    level = 'good'
    feedback = "Good work! You showed solid problem-solving abilities and code quality. There's room for improvement in some areas."
  } else if (overallScore >= 50) {
    level = 'average'
    feedback = "Decent performance. Focus on improving code quality, efficiency, and communication with the interviewer."
  } else {
    level = 'needs-improvement'
    feedback = "Keep practicing! Focus on understanding the problem better, writing cleaner code, and communicating your thought process."
  }
  
  // Specific recommendations
  if (interactionScore < 60) {
    recommendations.push("Engage more with the AI interviewer and coding partner - ask questions and seek clarification")
  }
  
  if (codeQualityScore < 60) {
    recommendations.push("Focus on writing code that passes all test cases and handles edge cases")
  }
  
  if (efficiencyScore < 60) {
    recommendations.push("Work on optimizing your solution and using hints more strategically")
  }
  
  if (communicationScore < 60) {
    recommendations.push("Practice explaining your approach and asking clarifying questions during interviews")
  }
  
  if (score.aiCollaborationScore < 60) {
    recommendations.push("Improve your AI collaboration skills: ask more specific questions, understand suggestions before implementing, use AI strategically rather than dependently")
  }
  
  return { level, feedback, recommendations }
}

/**
 * Vectorize metrics for ML/AI analysis (optional future enhancement)
 */
export function vectorizeMetrics(metrics: InteractionMetrics): number[] {
  return [
    metrics.partnerMessagesSent,
    metrics.partnerMessagesReceived,
    metrics.partnerHintsRequested,
    metrics.interviewerQuestionsAnswered,
    metrics.interviewerClarificationsRequested,
    metrics.testCasesPassed / Math.max(1, metrics.testCasesTotal),
    metrics.codeEfficiencyScore / 100,
    metrics.codeQualityScore / 100,
    metrics.timeSpent / 3600, // Normalize to hours
    metrics.hintsRevealed / Math.max(1, metrics.hintsTotal),
    metrics.workspaceFilesViewed / Math.max(1, metrics.workspaceFilesTotal),
    metrics.workspaceContextUsed ? 1 : 0,
    // AI Collaboration metrics
    metrics.aiCollaborationQuality / 100,
    metrics.aiQuestionsQuality / 100,
    metrics.aiSuggestionsUnderstood / Math.max(1, metrics.aiSuggestionsUnderstood + metrics.aiSuggestionsMisunderstood),
    metrics.aiOverDependency / 100,
    metrics.strategicAiUsage / 100,
    // Problem context
    metrics.problemDifficulty === 'easy' ? 0 : metrics.problemDifficulty === 'medium' ? 0.5 : 1,
    metrics.problemType === 'dsa' ? 0 : metrics.problemType === 'bugfix' ? 0.5 : 1,
  ]
}

