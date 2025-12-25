/**
 * RAG Integration for Smart Recommendations
 *
 * Uses the advanced RAG system to provide personalized problem recommendations
 * based on user's weak areas, failed problems, and roadmap goals.
 */

import { advancedRetrieve } from '../rag/retrieval/advanced-retrieval';
import { adminDb } from '../firebase-admin';
import { getScenarioById, scenarios } from '../scenarios';
import type { DSAPattern } from '../types/dsa-patterns';
import type { Difficulty } from './sm2-algorithm';
import { getWeakPatterns, getUserMasteryStats } from './mastery-calculator';
import { getAllUserProblems, type ProblemMastery } from './scheduler';

export type RecommendationType =
  | 'review'
  | 'practice_weakness'
  | 'similar_to_failed'
  | 'company_relevant'
  | 'next_in_roadmap'
  | 'strengthen_pattern';

export interface SmartRecommendation {
  type: RecommendationType;
  scenario_id: string;
  title: string;
  pattern: DSAPattern;
  difficulty: Difficulty;
  reason: string;
  priority: number; // 0-100, higher = more important
  estimated_minutes: number;
  companies?: string[];
}

interface RecentlyFailedProblem {
  problem_id: string;
  title: string;
  pattern: DSAPattern;
  score: number;
}

/**
 * Get recently failed problems (score < 60 in last 7 days)
 */
async function getRecentlyFailedProblems(
  userId: string,
  limit: number = 5
): Promise<RecentlyFailedProblem[]> {
  const problems = await getAllUserProblems(userId);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const failed = problems
    .filter((p) => {
      const reviewedAt = new Date(p.last_reviewed_at);
      return reviewedAt >= sevenDaysAgo && p.last_score < 60;
    })
    .sort((a, b) => a.last_score - b.last_score) // Worst first
    .slice(0, limit)
    .map((p) => ({
      problem_id: p.problem_id,
      title: p.title,
      pattern: p.pattern,
      score: p.last_score,
    }));

  return failed;
}

/**
 * Get user's active roadmap target company
 */
async function getActiveRoadmap(
  userId: string
): Promise<{ targetCompany?: string; targetRole?: string } | null> {
  try {
    const roadmapRef = adminDb.collection('user_roadmaps').doc(userId);
    const doc = await roadmapRef.get();

    if (!doc.exists) return null;

    const data = doc.data();
    return {
      targetCompany: data?.target_company,
      targetRole: data?.target_role,
    };
  } catch {
    return null;
  }
}

/**
 * Find similar problems to ones the user struggled with
 */
async function getSimilarProblems(
  failedProblem: RecentlyFailedProblem,
  excludeIds: string[],
  limit: number = 3
): Promise<SmartRecommendation[]> {
  const scenario = getScenarioById(failedProblem.problem_id);

  if (!scenario) return [];

  // Use RAG to find similar problems
  const results = await advancedRetrieve({
    query: `${scenario.title} ${scenario.description}`,
    limit,
    types: ['problem'],
    patterns: [failedProblem.pattern],
    excludeIds: [failedProblem.problem_id, ...excludeIds],
    enableQueryExpansion: true,
    enableReranking: true,
  });

  return results.map((result, index) => {
    const matchedScenario = scenarios.find(
      (s) => s.id === result.id || s.title === result.metadata?.title
    );

    return {
      type: 'similar_to_failed' as RecommendationType,
      scenario_id: result.id,
      title: (result.metadata?.title as string) || result.id,
      pattern: failedProblem.pattern,
      difficulty: (result.metadata?.difficulty as Difficulty) || 'medium',
      reason: `Similar to "${failedProblem.title}" which you scored ${failedProblem.score}%`,
      priority: 80 - index * 5, // Decrease priority for each subsequent result
      estimated_minutes: matchedScenario?.estimatedTime || 20,
      companies: result.metadata?.companies as string[],
    };
  });
}

/**
 * Get company-relevant problems for user's target company
 */
async function getCompanyRelevantProblems(
  targetCompany: string,
  weakPatterns: DSAPattern[],
  excludeIds: string[],
  limit: number = 3
): Promise<SmartRecommendation[]> {
  // Find problems commonly asked at the target company
  const relevantScenarios = scenarios
    .filter((s) => {
      if (excludeIds.includes(s.id)) return false;
      if (!s.companies.includes(targetCompany as any)) return false;
      if (s.type !== 'dsa') return false;
      // Prefer problems from weak patterns
      if (weakPatterns.length > 0 && 'pattern' in s) {
        return weakPatterns.includes((s as any).pattern);
      }
      return true;
    })
    .slice(0, limit);

  return relevantScenarios.map((scenario, index) => ({
    type: 'company_relevant' as RecommendationType,
    scenario_id: scenario.id,
    title: scenario.title,
    pattern: (scenario as any).pattern || 'arrays-hashing',
    difficulty: scenario.difficulty,
    reason: `Commonly asked at ${targetCompany}${
      weakPatterns.includes((scenario as any).pattern)
        ? ' and matches your weak pattern'
        : ''
    }`,
    priority: 70 - index * 5,
    estimated_minutes: scenario.estimatedTime,
    companies: scenario.companies,
  }));
}

/**
 * Get problems to strengthen weak patterns
 */
async function getPatternStrengtheningProblems(
  weakPatterns: { pattern: DSAPattern; average_score: number }[],
  completedIds: string[],
  limit: number = 3
): Promise<SmartRecommendation[]> {
  const recommendations: SmartRecommendation[] = [];

  for (const weak of weakPatterns.slice(0, 2)) {
    // Find unseen problems for this pattern, sorted by difficulty (start easier)
    const patternProblems = scenarios
      .filter((s) => {
        if (completedIds.includes(s.id)) return false;
        if (s.type !== 'dsa') return false;
        return (s as any).pattern === weak.pattern;
      })
      .sort((a, b) => {
        const diffOrder = { easy: 0, medium: 1, hard: 2 };
        return diffOrder[a.difficulty] - diffOrder[b.difficulty];
      })
      .slice(0, 2);

    patternProblems.forEach((scenario, index) => {
      recommendations.push({
        type: 'strengthen_pattern',
        scenario_id: scenario.id,
        title: scenario.title,
        pattern: weak.pattern,
        difficulty: scenario.difficulty,
        reason: `Practice ${weak.pattern} - your average score is ${weak.average_score}%`,
        priority: 75 - index * 5,
        estimated_minutes: scenario.estimatedTime,
        companies: scenario.companies,
      });
    });
  }

  return recommendations.slice(0, limit);
}

/**
 * Get the next recommended problem in user's learning roadmap
 */
async function getNextInRoadmap(
  userId: string,
  completedIds: string[]
): Promise<SmartRecommendation | null> {
  try {
    // Check if user has an active roadmap
    const roadmapRef = adminDb.collection('user_roadmaps').doc(userId);
    const doc = await roadmapRef.get();

    if (!doc.exists) return null;

    const data = doc.data();
    const currentPhase = data?.current_phase || 0;
    const phases = data?.phases || [];

    if (phases.length <= currentPhase) return null;

    const currentPhaseData = phases[currentPhase];
    const phaseProblems = currentPhaseData?.problems || [];

    // Find first uncompleted problem in current phase
    for (const problemId of phaseProblems) {
      if (!completedIds.includes(problemId)) {
        const scenario = getScenarioById(problemId);
        if (scenario) {
          return {
            type: 'next_in_roadmap',
            scenario_id: scenario.id,
            title: scenario.title,
            pattern: (scenario as any).pattern || 'arrays-hashing',
            difficulty: scenario.difficulty,
            reason: `Next in your roadmap: ${currentPhaseData.name || 'Current Phase'}`,
            priority: 85,
            estimated_minutes: scenario.estimatedTime,
            companies: scenario.companies,
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get smart recommendations for a user
 */
export async function getSmartRecommendations(
  userId: string,
  limit: number = 5
): Promise<SmartRecommendation[]> {
  const recommendations: SmartRecommendation[] = [];

  // Get user's completed/seen problem IDs
  const problems = await getAllUserProblems(userId);
  const completedIds = problems.map((p) => p.problem_id);

  // 1. Get next problem in roadmap
  const nextRoadmap = await getNextInRoadmap(userId, completedIds);
  if (nextRoadmap) {
    recommendations.push(nextRoadmap);
  }

  // 2. Find problems similar to recently failed ones
  const failedProblems = await getRecentlyFailedProblems(userId);
  for (const failed of failedProblems.slice(0, 2)) {
    const similar = await getSimilarProblems(
      failed,
      [...completedIds, ...recommendations.map((r) => r.scenario_id)],
      2
    );
    recommendations.push(...similar);
  }

  // 3. Get weak patterns for focused practice
  const weakPatterns = await getWeakPatterns(userId, 3);
  const patternProblems = await getPatternStrengtheningProblems(
    weakPatterns.map((p) => ({
      pattern: p.pattern,
      average_score: p.average_score,
    })),
    [...completedIds, ...recommendations.map((r) => r.scenario_id)],
    3
  );
  recommendations.push(...patternProblems);

  // 4. Get company-relevant problems
  const roadmap = await getActiveRoadmap(userId);
  if (roadmap?.targetCompany) {
    const companyProblems = await getCompanyRelevantProblems(
      roadmap.targetCompany,
      weakPatterns.map((p) => p.pattern),
      [...completedIds, ...recommendations.map((r) => r.scenario_id)],
      2
    );
    recommendations.push(...companyProblems);
  }

  // Sort by priority and deduplicate
  const seen = new Set<string>();
  const unique = recommendations.filter((r) => {
    if (seen.has(r.scenario_id)) return false;
    seen.add(r.scenario_id);
    return true;
  });

  return unique
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

/**
 * Get recommendations for a specific pattern
 */
export async function getPatternRecommendations(
  userId: string,
  pattern: DSAPattern,
  limit: number = 5
): Promise<SmartRecommendation[]> {
  const problems = await getAllUserProblems(userId);
  const completedIds = problems.map((p) => p.problem_id);

  // Get problems for this pattern that user hasn't completed
  const patternScenarios = scenarios
    .filter((s) => {
      if (completedIds.includes(s.id)) return false;
      if (s.type !== 'dsa') return false;
      return (s as any).pattern === pattern;
    })
    .sort((a, b) => {
      const diffOrder = { easy: 0, medium: 1, hard: 2 };
      return diffOrder[a.difficulty] - diffOrder[b.difficulty];
    })
    .slice(0, limit);

  return patternScenarios.map((scenario, index) => ({
    type: 'practice_weakness' as RecommendationType,
    scenario_id: scenario.id,
    title: scenario.title,
    pattern,
    difficulty: scenario.difficulty,
    reason: `Practice ${pattern} pattern`,
    priority: 80 - index * 5,
    estimated_minutes: scenario.estimatedTime,
    companies: scenario.companies,
  }));
}

/**
 * Get recommendations for "what to practice next" based on comprehensive analysis
 */
export async function getNextPracticeRecommendation(
  userId: string
): Promise<SmartRecommendation | null> {
  const recommendations = await getSmartRecommendations(userId, 1);
  return recommendations[0] || null;
}
