/**
 * RAG-enhanced feedback context builder
 *
 * This module builds context from RAG (Retrieval Augmented Generation) sources
 * including pattern knowledge, similar solutions, and user performance data.
 */

import { buildFeedbackContext } from '@/lib/rag/context-builder'
import { getPatternKnowledge } from '@/lib/rag/knowledge-base/dsa-knowledge'
import { getUserPerformanceProfile, getUserRecommendations } from '@/lib/rag/user-performance-rag'
import { logger } from '@/lib/logger'
import type { DSAPattern } from '@/lib/types/dsa-patterns'

/**
 * Build RAG-enhanced context for feedback generation
 * Retrieves pattern knowledge, similar solutions, and user performance insights
 */
export async function buildRAGFeedbackContext(options: {
  problemText: string
  userCode: string
  testResults: { passed: number; total: number }
  scenarioPattern?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  userId?: string
}): Promise<string> {
  const ragParts: string[] = []

  try {
    // 1. Get pattern-specific feedback criteria
    if (options.scenarioPattern) {
      const patternKnowledge = getPatternKnowledge(options.scenarioPattern as DSAPattern)
      if (patternKnowledge) {
        ragParts.push(`
## Pattern-Specific Evaluation: ${patternKnowledge.displayName}

### Expected Approach
${patternKnowledge.keyInsights.slice(0, 3).map(i => `- ${i}`).join('\n')}

### Common Mistakes to Check For
${patternKnowledge.commonMistakes.slice(0, 3).map(m => `- ${m}`).join('\n')}

### Expected Complexity
- Optimal Time: ${patternKnowledge.timeComplexity.typical}
- Optimal Space: ${patternKnowledge.spaceComplexity.typical}
- Better Than Brute Force: ${(patternKnowledge.timeComplexity as any).bruteForce || 'N/A'}
`)
      }
    }

    // 2. Build feedback context from RAG
    const feedbackContext = await buildFeedbackContext({
      problemText: options.problemText,
      userCode: options.userCode,
      testResults: options.testResults,
      pattern: options.scenarioPattern as DSAPattern,
      difficulty: options.difficulty,
    })

    if (feedbackContext.retrievedDocs.length > 0) {
      ragParts.push(`
## Reference Solutions (${feedbackContext.retrievedDocs.length} found)

${feedbackContext.retrievedDocs.slice(0, 2).map((doc, i) => `
### Reference ${i + 1} (Relevance: ${Math.round(doc.finalScore * 100)}%)
${doc.text.substring(0, 300)}${doc.text.length > 300 ? '...' : ''}
`).join('\n')}
`)
    }

    // 3. Get user performance profile for personalized feedback
    if (options.userId) {
      const userProfile = await getUserPerformanceProfile(options.userId)
      if (userProfile) {
        const patternStrength = options.scenarioPattern
          ? (userProfile.patternProficiency as any)[options.scenarioPattern as DSAPattern]
          : null

        ragParts.push(`
## User Performance Context

- Average Score: ${Math.round(userProfile.averageScore)}%
- Sessions Completed: ${userProfile.totalSessions}
- Trend: ${userProfile.recentTrend}
${patternStrength ? `- Proficiency in ${options.scenarioPattern}: ${patternStrength.level} (${patternStrength.successRate}% success rate)` : ''}

### Strengths
${userProfile.strengths.slice(0, 2).map(s => `- ${s}`).join('\n')}

### Areas for Improvement
${userProfile.weaknesses.slice(0, 2).map(w => `- ${w}`).join('\n')}
`)

        // Get personalized recommendations
        const recommendations = await getUserRecommendations(options.userId)
        if (recommendations && recommendations.length > 0) {
          ragParts.push(`
### Personalized Recommendations
${recommendations.slice(0, 2).map((rec, i) => `${i + 1}. ${rec.reason || (rec as any).scenario?.title || 'Practice similar problems'}`).join('\n')}
`)
        }
      }
    }
  } catch (error) {
    logger.error('[Feedback API] RAG context build error', { error })
    // Continue without RAG context - don't fail the feedback generation
  }

  if (ragParts.length === 0) {
    return ''
  }

  return `
=== RAG-ENHANCED FEEDBACK CONTEXT ===
${ragParts.join('\n')}
=== END RAG CONTEXT ===
`
}
