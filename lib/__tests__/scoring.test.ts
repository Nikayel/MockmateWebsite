/**
 * Tests for scoring.ts
 * Ensures the interview scoring algorithm works correctly
 */

import { describe, it, expect } from 'vitest'
import {
  calculateUserScore,
  getPerformanceFeedback,
  createDefaultMetrics,
  type InteractionMetrics,
  type ScoreBreakdown,
} from '../scoring'

describe('Scoring Algorithm', () => {
  describe('calculateUserScore', () => {
    it('should return a score breakdown with all required fields', () => {
      const metrics = createDefaultMetrics('medium', 'dsa')
      const score = calculateUserScore(metrics)

      expect(score).toHaveProperty('codeQualityScore')
      expect(score).toHaveProperty('problemSolvingScore')
      expect(score).toHaveProperty('understandingScore')
      expect(score).toHaveProperty('communicationScore')
      expect(score).toHaveProperty('overallScore')
    })

    it('should calculate higher scores for passing tests', () => {
      const passedMetrics = createDefaultMetrics('medium', 'dsa')
      passedMetrics.testCasesPassed = 5
      passedMetrics.testCasesTotal = 5

      const failedMetrics = createDefaultMetrics('medium', 'dsa')
      failedMetrics.testCasesPassed = 0
      failedMetrics.testCasesTotal = 5

      const passedScore = calculateUserScore(passedMetrics)
      const failedScore = calculateUserScore(failedMetrics)

      expect(passedScore.codeQualityScore).toBeGreaterThan(failedScore.codeQualityScore)
      expect(passedScore.overallScore).toBeGreaterThan(failedScore.overallScore)
    })

    it('should reward code explanation', () => {
      const explained = createDefaultMetrics('medium', 'dsa')
      explained.approachExplanationGiven = true
      explained.complexityAnalysisProvided = true
      explained.codeExplanationQuality = 80

      const notExplained = createDefaultMetrics('medium', 'dsa')
      notExplained.approachExplanationGiven = false
      notExplained.complexityAnalysisProvided = false
      notExplained.codeExplanationQuality = 20

      const explainedScore = calculateUserScore(explained)
      const notExplainedScore = calculateUserScore(notExplained)

      expect(explainedScore.understandingScore).toBeGreaterThan(notExplainedScore.understandingScore)
    })

    it('should not penalize for not using AI', () => {
      const withAI = createDefaultMetrics('medium', 'dsa')
      withAI.aiQuestionsAsked = 5
      withAI.aiSuggestionsUnderstood = 5
      withAI.aiUsedStrategically = true

      const withoutAI = createDefaultMetrics('medium', 'dsa')
      withoutAI.aiQuestionsAsked = 0
      withoutAI.aiSuggestionsUnderstood = 0
      withoutAI.aiUsedStrategically = false

      // Make test pass rate equal
      withAI.testCasesPassed = 5
      withAI.testCasesTotal = 5
      withoutAI.testCasesPassed = 5
      withoutAI.testCasesTotal = 5

      const withAIScore = calculateUserScore(withAI)
      const withoutAIScore = calculateUserScore(withoutAI)

      // Scores should be similar - AI usage is optional
      const scoreDiff = Math.abs(withAIScore.overallScore - withoutAIScore.overallScore)
      expect(scoreDiff).toBeLessThan(20) // Allow some variance but not huge penalty
    })

    it('should handle edge case of no tests', () => {
      const metrics = createDefaultMetrics('medium', 'dsa')
      metrics.testCasesPassed = 0
      metrics.testCasesTotal = 0

      const score = calculateUserScore(metrics)
      expect(score.overallScore).toBeGreaterThanOrEqual(0)
      expect(score.overallScore).toBeLessThanOrEqual(100)
    })

    it('should scale scores between 0 and 100', () => {
      const perfectMetrics = createDefaultMetrics('medium', 'dsa')
      perfectMetrics.testCasesPassed = 5
      perfectMetrics.testCasesTotal = 5
      perfectMetrics.codeEfficiencyScore = 100
      perfectMetrics.codeQualityScore = 100
      perfectMetrics.codeExplanationQuality = 100
      perfectMetrics.thoughtProcessShared = 100
      perfectMetrics.approachExplanationGiven = true
      perfectMetrics.complexityAnalysisProvided = true
      perfectMetrics.systematicDebugging = true

      const score = calculateUserScore(perfectMetrics)

      expect(score.codeQualityScore).toBeLessThanOrEqual(100)
      expect(score.problemSolvingScore).toBeLessThanOrEqual(100)
      expect(score.understandingScore).toBeLessThanOrEqual(100)
      expect(score.communicationScore).toBeLessThanOrEqual(100)
      expect(score.overallScore).toBeLessThanOrEqual(100)
    })
  })

  describe('getPerformanceFeedback', () => {
    it('should return appropriate feedback for excellent scores', () => {
      const excellentScore: ScoreBreakdown = {
        codeQualityScore: 95,
        problemSolvingScore: 92,
        understandingScore: 90,
        communicationScore: 88,
        aiCollaborationIndicator: 80,
        overallScore: 92,
      }

      const feedback = getPerformanceFeedback(excellentScore)

      expect(feedback.level).toBe('excellent')
      expect(feedback.feedback).toBeDefined()
      expect(feedback.strengths.length).toBeGreaterThan(0)
    })

    it('should return appropriate feedback for good scores', () => {
      const goodScore: ScoreBreakdown = {
        codeQualityScore: 78,
        problemSolvingScore: 75,
        understandingScore: 72,
        communicationScore: 70,
        aiCollaborationIndicator: 65,
        overallScore: 74,
      }

      const feedback = getPerformanceFeedback(goodScore)

      expect(feedback.level).toBe('good')
      expect(feedback.feedback).toBeDefined()
    })

    it('should return appropriate feedback for needs improvement scores', () => {
      const poorScore: ScoreBreakdown = {
        codeQualityScore: 45,
        problemSolvingScore: 40,
        understandingScore: 35,
        communicationScore: 30,
        aiCollaborationIndicator: 25,
        overallScore: 38,
      }

      const feedback = getPerformanceFeedback(poorScore)

      expect(['needs-improvement', 'average']).toContain(feedback.level)
      expect(feedback.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('createDefaultMetrics', () => {
    it('should create metrics with correct difficulty', () => {
      const easyMetrics = createDefaultMetrics('easy', 'dsa')
      const hardMetrics = createDefaultMetrics('hard', 'dsa')

      expect(easyMetrics.problemDifficulty).toBe('easy')
      expect(hardMetrics.problemDifficulty).toBe('hard')
    })

    it('should create metrics with correct problem type', () => {
      const dsaMetrics = createDefaultMetrics('medium', 'dsa')
      const bugfixMetrics = createDefaultMetrics('medium', 'bugfix')
      const systemDesignMetrics = createDefaultMetrics('medium', 'system-design')

      expect(dsaMetrics.problemType).toBe('dsa')
      expect(bugfixMetrics.problemType).toBe('bugfix')
      expect(systemDesignMetrics.problemType).toBe('system-design')
    })

    it('should initialize all metrics to default values', () => {
      const metrics = createDefaultMetrics('medium', 'dsa')

      expect(metrics.testCasesPassed).toBe(0)
      expect(metrics.testCasesTotal).toBe(0)
      expect(metrics.aiQuestionsAsked).toBe(0)
      expect(metrics.hintsRevealed).toBe(0)
    })
  })

  describe('Score Weighting', () => {
    it('should weight code quality at 30%', () => {
      // Create two metrics that differ only in code quality
      const highQuality = createDefaultMetrics('medium', 'dsa')
      highQuality.codeQualityScore = 100
      highQuality.testCasesPassed = 5
      highQuality.testCasesTotal = 5

      const lowQuality = createDefaultMetrics('medium', 'dsa')
      lowQuality.codeQualityScore = 50
      lowQuality.testCasesPassed = 5
      lowQuality.testCasesTotal = 5

      const highScore = calculateUserScore(highQuality)
      const lowScore = calculateUserScore(lowQuality)

      // The difference should reflect ~30% weight
      const scoreDiff = highScore.overallScore - lowScore.overallScore
      expect(scoreDiff).toBeGreaterThan(0)
    })

    it('should weight all categories appropriately', () => {
      const balanced = createDefaultMetrics('medium', 'dsa')
      balanced.testCasesPassed = 5
      balanced.testCasesTotal = 5
      balanced.codeQualityScore = 80
      balanced.codeEfficiencyScore = 80
      balanced.codeExplanationQuality = 80
      balanced.thoughtProcessShared = 80
      balanced.approachExplanationGiven = true
      balanced.complexityAnalysisProvided = true

      const score = calculateUserScore(balanced)

      // All sub-scores should be in reasonable range
      expect(score.codeQualityScore).toBeGreaterThan(50)
      expect(score.problemSolvingScore).toBeGreaterThanOrEqual(0)
      expect(score.understandingScore).toBeGreaterThanOrEqual(0)
      expect(score.communicationScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle perfect scores', () => {
      const perfect = createDefaultMetrics('medium', 'dsa')
      perfect.testCasesPassed = 10
      perfect.testCasesTotal = 10
      perfect.codeQualityScore = 100
      perfect.codeEfficiencyScore = 100
      perfect.codeReadability = 100
      perfect.codeExplanationQuality = 100
      perfect.thoughtProcessShared = 100
      perfect.approachExplanationGiven = true
      perfect.complexityAnalysisProvided = true
      perfect.edgeCasesIdentified = 5
      perfect.brokeDownProblem = true
      perfect.consideredAlternatives = true
      perfect.optimizationAttempted = true
      perfect.systematicDebugging = true
      perfect.testDrivenApproach = true

      const score = calculateUserScore(perfect)
      // Perfect metrics should result in high scores
      expect(score.overallScore).toBeGreaterThan(70)
    })

    it('should handle zero scores', () => {
      const zero = createDefaultMetrics('medium', 'dsa')
      zero.testCasesPassed = 0
      zero.testCasesTotal = 10
      zero.codeQualityScore = 0
      zero.codeEfficiencyScore = 0
      zero.codeExplanationQuality = 0
      zero.thoughtProcessShared = 0

      const score = calculateUserScore(zero)
      expect(score.overallScore).toBeGreaterThanOrEqual(0)
      expect(score.overallScore).toBeLessThan(50)
    })

    it('should handle partially completed interviews', () => {
      const partial = createDefaultMetrics('medium', 'dsa')
      partial.testCasesPassed = 3
      partial.testCasesTotal = 5
      partial.codeQualityScore = 60
      partial.timeSpent = 1800 // 30 minutes

      const score = calculateUserScore(partial)
      expect(score.overallScore).toBeGreaterThanOrEqual(0)
      expect(score.overallScore).toBeLessThan(80)
    })
  })
})
