import { NextRequest, NextResponse } from 'next/server'
import {
  generateHints,
  getNextHint,
  type HintGenerationRequest,
  type StruggleMetrics,
} from '@/lib/agents/hint-agent'
import type { DSAPattern } from '@/lib/types/dsa-patterns'

/**
 * Hint Agent API
 *
 * Endpoints for AI-powered hint generation:
 * - POST: Generate personalized hints based on current state
 *
 * Actions:
 * - generate: Generate all hints for current problem state
 * - get-next: Get the next unrevealed hint
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'generate':
        return handleGenerateHints(params)
      case 'get-next':
        return handleGetNextHint(params)
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Hint Agent API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Hint generation failed' },
      { status: 500 }
    )
  }
}

/**
 * Generate personalized hints
 */
async function handleGenerateHints(params: {
  userId: string
  problemId: string
  problemTitle: string
  problemText: string
  problemPattern?: string
  difficulty?: string
  userCode?: string
  language?: string
  struggleMetrics?: Partial<StruggleMetrics>
  testResults?: {
    passed: number
    total: number
    failingTests?: string[]
  }
  existingHints?: string[]
}) {
  const {
    userId,
    problemId,
    problemTitle,
    problemText,
    problemPattern,
    difficulty = 'medium',
    userCode = '',
    language = 'javascript',
    struggleMetrics = {},
    testResults,
    existingHints,
  } = params

  // Validate required fields
  if (!userId || !problemId || !problemText) {
    return NextResponse.json(
      { error: 'userId, problemId, and problemText are required' },
      { status: 400 }
    )
  }

  // Build full struggle metrics with defaults
  const fullMetrics: StruggleMetrics = {
    timeSpentMinutes: struggleMetrics.timeSpentMinutes ?? 0,
    codeChanges: struggleMetrics.codeChanges ?? 0,
    testsRun: struggleMetrics.testsRun ?? 0,
    testsFailed: struggleMetrics.testsFailed ?? 0,
    hintsRevealed: struggleMetrics.hintsRevealed ?? 0,
    lastCodeChangeMinutesAgo: struggleMetrics.lastCodeChangeMinutesAgo ?? 0,
    errorCount: struggleMetrics.errorCount ?? 0,
  }

  // Build request
  const request: HintGenerationRequest = {
    userId,
    problemId,
    problemTitle,
    problemText,
    problemPattern: problemPattern as DSAPattern | undefined,
    difficulty: difficulty as 'easy' | 'medium' | 'hard',
    userCode,
    language,
    struggleMetrics: fullMetrics,
    existingHints,
    testResults,
  }

  // Generate hints
  const response = await generateHints(request)

  return NextResponse.json({
    hints: response.hints,
    struggleLevel: response.struggleLevel,
    recommendedRevealLevel: response.recommendedRevealLevel,
    personalizationApplied: response.personalizationApplied,
    metadata: response.metadata,
  })
}

/**
 * Get the next unrevealed hint
 */
async function handleGetNextHint(params: {
  userId: string
  problemId: string
  problemTitle: string
  problemText: string
  problemPattern?: string
  difficulty?: string
  userCode?: string
  language?: string
  struggleMetrics?: Partial<StruggleMetrics>
  testResults?: {
    passed: number
    total: number
    failingTests?: string[]
  }
  previousHintIds: string[]
}) {
  const {
    userId,
    problemId,
    problemTitle,
    problemText,
    problemPattern,
    difficulty = 'medium',
    userCode = '',
    language = 'javascript',
    struggleMetrics = {},
    testResults,
    previousHintIds = [],
  } = params

  // Validate required fields
  if (!userId || !problemId || !problemText) {
    return NextResponse.json(
      { error: 'userId, problemId, and problemText are required' },
      { status: 400 }
    )
  }

  // Build full struggle metrics
  const fullMetrics: StruggleMetrics = {
    timeSpentMinutes: struggleMetrics.timeSpentMinutes ?? 0,
    codeChanges: struggleMetrics.codeChanges ?? 0,
    testsRun: struggleMetrics.testsRun ?? 0,
    testsFailed: struggleMetrics.testsFailed ?? 0,
    hintsRevealed: struggleMetrics.hintsRevealed ?? previousHintIds.length,
    lastCodeChangeMinutesAgo: struggleMetrics.lastCodeChangeMinutesAgo ?? 0,
    errorCount: struggleMetrics.errorCount ?? 0,
  }

  const request: HintGenerationRequest = {
    userId,
    problemId,
    problemTitle,
    problemText,
    problemPattern: problemPattern as DSAPattern | undefined,
    difficulty: difficulty as 'easy' | 'medium' | 'hard',
    userCode,
    language,
    struggleMetrics: fullMetrics,
    testResults,
  }

  const hint = await getNextHint(request, previousHintIds)

  if (!hint) {
    return NextResponse.json({
      hint: null,
      message: 'No more hints available',
    })
  }

  return NextResponse.json({
    hint,
    message: 'Hint generated successfully',
  })
}
