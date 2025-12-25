/**
 * Diagnostic Quiz for Cold Start Problem
 *
 * Solves the "cold start" problem by assessing user ability
 * before generating a personalized roadmap.
 *
 * Uses Item Response Theory (IRT) for rapid ability estimation
 * from a small number of adaptive questions.
 */

import { DSAPattern } from '@/lib/types/dsa-patterns';

/**
 * Difficulty parameters for IRT
 * Based on 3-parameter logistic model
 */
export interface ProblemIRTParams {
  scenarioId: string;
  title: string;
  pattern: DSAPattern;
  difficulty: 'easy' | 'medium' | 'hard';

  // IRT parameters
  a: number;  // Discrimination (how well it separates abilities)
  b: number;  // Difficulty (ability level at 50% success)
  c: number;  // Guessing (lower asymptote)
}

/**
 * User's estimated ability
 */
export interface AbilityEstimate {
  theta: number;              // Overall ability (-3 to 3 scale)
  standardError: number;      // Confidence interval
  patternAbilities: Map<DSAPattern, number>;  // Per-pattern estimates
}

/**
 * Quiz response
 */
export interface QuizResponse {
  scenarioId: string;
  pattern: DSAPattern;
  correct: boolean;          // Solved successfully
  partialScore: number;      // 0-100
  timeSeconds: number;       // Time taken
  hintsUsed: number;
}

/**
 * Diagnostic quiz configuration
 */
export interface DiagnosticQuizConfig {
  minQuestions: number;      // Minimum questions before stopping
  maxQuestions: number;      // Maximum questions
  targetSE: number;          // Target standard error for stopping
  timeLimit: number;         // Total time limit in minutes
  perQuestionLimit: number;  // Per-question limit in minutes
}

export const DEFAULT_QUIZ_CONFIG: DiagnosticQuizConfig = {
  minQuestions: 5,
  maxQuestions: 10,
  targetSE: 0.4,           // Stop when SE < 0.4
  timeLimit: 30,
  perQuestionLimit: 5,
};

/**
 * Core patterns to assess (covers major interview topics)
 */
export const DIAGNOSTIC_PATTERNS: DSAPattern[] = [
  'arrays-hashing',     // Foundation
  'two-pointers',       // Foundation
  'trees',              // Core data structure
  'graphs',             // Intermediate
  'dp-1d',              // Advanced
];

/**
 * Difficulty to IRT b-parameter mapping
 */
const DIFFICULTY_B: Record<'easy' | 'medium' | 'hard', number> = {
  easy: -1.0,
  medium: 0.0,
  hard: 1.5,
};

/**
 * Calculate probability of correct response using 3PL IRT model
 */
export function calculateProbability(
  theta: number,
  params: ProblemIRTParams
): number {
  const { a, b, c } = params;
  const exponent = -a * (theta - b);
  return c + (1 - c) / (1 + Math.exp(exponent));
}

/**
 * Calculate information provided by a question at ability level theta
 */
export function calculateInformation(
  theta: number,
  params: ProblemIRTParams
): number {
  const { a, b, c } = params;
  const p = calculateProbability(theta, params);
  const q = 1 - p;

  // Fisher information for 3PL model
  const numerator = Math.pow(a, 2) * q * Math.pow(p - c, 2);
  const denominator = p * Math.pow(1 - c, 2);

  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Update ability estimate using Maximum Likelihood Estimation
 */
export function updateAbilityEstimate(
  currentTheta: number,
  responses: QuizResponse[],
  problems: Map<string, ProblemIRTParams>
): AbilityEstimate {
  // Newton-Raphson iteration for MLE
  let theta = currentTheta;
  const maxIterations = 20;
  const tolerance = 0.001;

  for (let iter = 0; iter < maxIterations; iter++) {
    let numerator = 0;
    let denominator = 0;

    for (const response of responses) {
      const params = problems.get(response.scenarioId);
      if (!params) continue;

      const p = calculateProbability(theta, params);
      const q = 1 - p;
      const { a, c } = params;

      // Use partial score as weighted response
      const u = response.partialScore / 100;

      const pStar = (p - c) / (1 - c);
      const weight = a * pStar * q;

      numerator += weight * (u - p) / p;
      denominator += a * a * pStar * pStar * q / p;
    }

    if (Math.abs(denominator) < 0.0001) break;

    const delta = numerator / denominator;
    theta += delta;

    // Bound theta
    theta = Math.max(-4, Math.min(4, theta));

    if (Math.abs(delta) < tolerance) break;
  }

  // Calculate standard error
  let totalInfo = 0;
  for (const response of responses) {
    const params = problems.get(response.scenarioId);
    if (params) {
      totalInfo += calculateInformation(theta, params);
    }
  }
  const standardError = totalInfo > 0 ? 1 / Math.sqrt(totalInfo) : 2.0;

  // Calculate per-pattern abilities
  const patternAbilities = new Map<DSAPattern, number>();
  const patternResponses = new Map<DSAPattern, QuizResponse[]>();

  for (const response of responses) {
    const existing = patternResponses.get(response.pattern) || [];
    existing.push(response);
    patternResponses.set(response.pattern, existing);
  }

  for (const [pattern, resps] of patternResponses) {
    // Simple average-based adjustment from overall theta
    const avgScore = resps.reduce((s, r) => s + r.partialScore, 0) / resps.length;
    const adjustment = (avgScore - 50) / 100; // -0.5 to 0.5
    patternAbilities.set(pattern, theta + adjustment);
  }

  return {
    theta,
    standardError,
    patternAbilities,
  };
}

/**
 * Select next question adaptively
 */
export function selectNextQuestion(
  currentTheta: number,
  availableProblems: ProblemIRTParams[],
  usedIds: Set<string>,
  responses: QuizResponse[]
): ProblemIRTParams | null {
  // Filter out used problems
  const unused = availableProblems.filter(p => !usedIds.has(p.scenarioId));
  if (unused.length === 0) return null;

  // Calculate information for each problem
  const withInfo = unused.map(p => ({
    problem: p,
    information: calculateInformation(currentTheta, p),
  }));

  // Balance between maximum information and pattern coverage
  const usedPatterns = new Set(responses.map(r => r.pattern));
  const uncoveredPatterns = DIAGNOSTIC_PATTERNS.filter(p => !usedPatterns.has(p));

  // If we haven't covered all patterns, prioritize uncovered
  if (uncoveredPatterns.length > 0 && responses.length < 5) {
    const uncoveredProblems = withInfo.filter(
      x => uncoveredPatterns.includes(x.problem.pattern)
    );
    if (uncoveredProblems.length > 0) {
      // Pick highest information from uncovered patterns
      uncoveredProblems.sort((a, b) => b.information - a.information);
      return uncoveredProblems[0].problem;
    }
  }

  // Otherwise, pick maximum information
  withInfo.sort((a, b) => b.information - a.information);
  return withInfo[0]?.problem || null;
}

/**
 * Check if quiz should stop
 */
export function shouldStopQuiz(
  responses: QuizResponse[],
  ability: AbilityEstimate,
  config: DiagnosticQuizConfig = DEFAULT_QUIZ_CONFIG
): { stop: boolean; reason: string } {
  // Not enough questions
  if (responses.length < config.minQuestions) {
    return { stop: false, reason: 'Need more responses' };
  }

  // Too many questions
  if (responses.length >= config.maxQuestions) {
    return { stop: true, reason: 'Maximum questions reached' };
  }

  // Standard error low enough
  if (ability.standardError < config.targetSE) {
    return { stop: true, reason: 'Sufficient precision achieved' };
  }

  return { stop: false, reason: 'Continue for better precision' };
}

/**
 * Convert ability estimate to experience level
 */
export function abilityToExperienceLevel(
  theta: number
): 'intern' | 'beginner' | 'intermediate' | 'advanced' {
  if (theta < -1.0) return 'intern';
  if (theta < 0.0) return 'beginner';
  if (theta < 1.0) return 'intermediate';
  return 'advanced';
}

/**
 * Convert ability estimate to pattern familiarity
 */
export function abilityToFamiliarity(
  theta: number
): 'unknown' | 'seen' | 'practiced' | 'confident' {
  if (theta < -1.5) return 'unknown';
  if (theta < -0.5) return 'seen';
  if (theta < 0.5) return 'practiced';
  return 'confident';
}

/**
 * Generate initial assessment from quiz results
 */
export function generateAssessmentFromQuiz(
  responses: QuizResponse[],
  ability: AbilityEstimate
): {
  experienceLevel: 'intern' | 'beginner' | 'intermediate' | 'advanced';
  patternFamiliarity: Array<{ pattern: DSAPattern; level: 'unknown' | 'seen' | 'practiced' | 'confident' }>;
  problemsSolvedEstimate: number;
  confidence: number;
} {
  const experienceLevel = abilityToExperienceLevel(ability.theta);

  // Generate familiarity for all patterns
  const patternFamiliarity: Array<{ pattern: DSAPattern; level: 'unknown' | 'seen' | 'practiced' | 'confident' }> = [];

  for (const pattern of DIAGNOSTIC_PATTERNS) {
    const patternTheta = ability.patternAbilities.get(pattern) ?? ability.theta;
    patternFamiliarity.push({
      pattern,
      level: abilityToFamiliarity(patternTheta),
    });
  }

  // Estimate problems solved based on ability
  const problemsSolvedEstimate = Math.round(
    Math.max(0, (ability.theta + 2) * 50) // -2 -> 0, 0 -> 100, 2 -> 200
  );

  // Confidence based on standard error
  const confidence = Math.round(
    Math.max(0, Math.min(100, 100 - ability.standardError * 50))
  );

  return {
    experienceLevel,
    patternFamiliarity,
    problemsSolvedEstimate,
    confidence,
  };
}

/**
 * Create IRT parameters for a problem
 */
export function createProblemParams(
  scenarioId: string,
  title: string,
  pattern: DSAPattern,
  difficulty: 'easy' | 'medium' | 'hard'
): ProblemIRTParams {
  return {
    scenarioId,
    title,
    pattern,
    difficulty,
    a: difficulty === 'medium' ? 1.2 : (difficulty === 'easy' ? 0.8 : 1.5),
    b: DIFFICULTY_B[difficulty],
    c: 0.15, // 15% guess rate
  };
}

/**
 * Quiz state for managing the diagnostic process
 */
export interface QuizState {
  status: 'not_started' | 'in_progress' | 'completed';
  currentQuestion: ProblemIRTParams | null;
  responses: QuizResponse[];
  usedIds: Set<string>;
  ability: AbilityEstimate;
  startTime: Date | null;
  config: DiagnosticQuizConfig;
}

/**
 * Create initial quiz state
 */
export function createQuizState(
  config: DiagnosticQuizConfig = DEFAULT_QUIZ_CONFIG
): QuizState {
  return {
    status: 'not_started',
    currentQuestion: null,
    responses: [],
    usedIds: new Set(),
    ability: {
      theta: 0, // Start at average
      standardError: 2.0,
      patternAbilities: new Map(),
    },
    startTime: null,
    config,
  };
}

/**
 * Start the quiz
 */
export function startQuiz(
  state: QuizState,
  availableProblems: ProblemIRTParams[]
): QuizState {
  const nextQuestion = selectNextQuestion(
    state.ability.theta,
    availableProblems,
    state.usedIds,
    state.responses
  );

  return {
    ...state,
    status: 'in_progress',
    currentQuestion: nextQuestion,
    startTime: new Date(),
  };
}

/**
 * Submit a response and get next question
 */
export function submitResponse(
  state: QuizState,
  response: QuizResponse,
  availableProblems: ProblemIRTParams[],
  problemParams: Map<string, ProblemIRTParams>
): QuizState {
  // Add response
  const responses = [...state.responses, response];
  const usedIds = new Set(state.usedIds);
  usedIds.add(response.scenarioId);

  // Update ability estimate
  const ability = updateAbilityEstimate(
    state.ability.theta,
    responses,
    problemParams
  );

  // Check if should stop
  const { stop } = shouldStopQuiz(responses, ability, state.config);

  if (stop) {
    return {
      ...state,
      responses,
      usedIds,
      ability,
      status: 'completed',
      currentQuestion: null,
    };
  }

  // Select next question
  const nextQuestion = selectNextQuestion(
    ability.theta,
    availableProblems,
    usedIds,
    responses
  );

  if (!nextQuestion) {
    return {
      ...state,
      responses,
      usedIds,
      ability,
      status: 'completed',
      currentQuestion: null,
    };
  }

  return {
    ...state,
    responses,
    usedIds,
    ability,
    currentQuestion: nextQuestion,
  };
}

/**
 * Get quiz progress
 */
export function getQuizProgress(state: QuizState): {
  questionsAnswered: number;
  maxQuestions: number;
  currentAbility: number;
  confidence: number;
  estimatedLevel: string;
} {
  return {
    questionsAnswered: state.responses.length,
    maxQuestions: state.config.maxQuestions,
    currentAbility: Math.round((state.ability.theta + 2) * 25), // Scale to 0-100
    confidence: Math.round((1 - state.ability.standardError / 2) * 100),
    estimatedLevel: abilityToExperienceLevel(state.ability.theta),
  };
}
