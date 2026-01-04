/**
 * User Learning State Management
 *
 * Handles tracking user progress for spaced repetition:
 * - Updates learning state after session completion
 * - Calculates next review dates using SM-2 algorithm
 * - Tracks streak days
 * - Integrates with problem-level mastery tracking
 */

import { adminDb, FieldValue } from "./firebase-admin";
import type { UserLearningState, TopicLearningState } from "./types";
import type { DSAPattern } from "./types/dsa-patterns";
import type { Difficulty } from "./spaced-repetition/sm2-algorithm";

/**
 * Calculate next review date using SM-2 spaced repetition algorithm
 */
function calculateNextReview(
  previousInterval: number,
  easeFactor: number,
  qualityScore: number // 0-100 scale
): { nextIntervalDays: number; newEaseFactor: number } {
  // Convert 0-100 score to 0-5 quality for SM-2
  const quality = Math.round((qualityScore / 100) * 5);

  let nextInterval: number;
  let newEaseFactor = easeFactor;

  if (quality < 3) {
    // Failed review - reset to beginning
    nextInterval = 1;
  } else {
    // Successful review - increase interval
    if (previousInterval === 0) {
      nextInterval = 1;
    } else if (previousInterval === 1) {
      nextInterval = 3;
    } else {
      nextInterval = Math.round(previousInterval * easeFactor);
    }

    // Adjust ease factor based on performance
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor);
  }

  // Cap at 180 days max interval
  nextInterval = Math.min(nextInterval, 180);

  return {
    nextIntervalDays: nextInterval,
    newEaseFactor: newEaseFactor,
  };
}

/**
 * Update user's learning state after completing a session
 */
export async function updateLearningStateAfterSession(
  userId: string,
  sessionData: {
    topic: string;
    scenarioId?: string;
    pattern?: string;
    performanceScore: number;
    completedAt: string;
  }
): Promise<void> {
  const learningStateRef = adminDb.collection("user_learning_state").doc(userId);

  const now = new Date();
  const topicId = sessionData.scenarioId || sessionData.topic.toLowerCase().replace(/\s+/g, "-");

  await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(learningStateRef);

    let learningState: UserLearningState;
    let existingTopic: TopicLearningState | undefined;

    if (doc.exists) {
      learningState = doc.data() as UserLearningState;
      existingTopic = learningState.topics?.[topicId];
    } else {
      // Create new learning state
      learningState = {
        user_id: userId,
        topics: {},
        streak_days: 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
    }

    // Calculate streak
    const lastSessionAt = learningState.last_session_at
      ? new Date(learningState.last_session_at)
      : null;

    let newStreakDays = learningState.streak_days || 0;

    if (lastSessionAt) {
      const daysSinceLastSession = Math.floor(
        (now.getTime() - lastSessionAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastSession === 0) {
        // Same day, no change
      } else if (daysSinceLastSession === 1) {
        // Consecutive day, increment streak
        newStreakDays++;
      } else {
        // Streak broken, reset to 1
        newStreakDays = 1;
      }
    } else {
      // First session ever
      newStreakDays = 1;
    }

    // Calculate next review using SM-2
    const previousInterval = existingTopic?.interval_days || 0;
    const previousEaseFactor = existingTopic?.ease_factor || 2.5;
    const reviewCount = (existingTopic?.review_count || 0) + 1;

    const { nextIntervalDays, newEaseFactor } = calculateNextReview(
      previousInterval,
      previousEaseFactor,
      sessionData.performanceScore
    );

    const nextReviewAt = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);

    // Update topic state
    const updatedTopic: TopicLearningState = {
      topic_name: sessionData.topic,
      pattern: sessionData.pattern,
      scenario_id: sessionData.scenarioId,
      last_practiced_at: sessionData.completedAt,
      performance_score: sessionData.performanceScore,
      review_count: reviewCount,
      next_review_at: nextReviewAt.toISOString(),
      interval_days: nextIntervalDays,
      ease_factor: newEaseFactor,
    };

    // Prepare update
    const updateData: Partial<UserLearningState> = {
      [`topics.${topicId}`]: updatedTopic,
      last_session_at: sessionData.completedAt,
      streak_days: newStreakDays,
      updated_at: now.toISOString(),
    } as any;

    if (doc.exists) {
      transaction.update(learningStateRef, updateData);
    } else {
      learningState.topics[topicId] = updatedTopic;
      learningState.last_session_at = sessionData.completedAt;
      learningState.streak_days = newStreakDays;
      transaction.set(learningStateRef, learningState);
    }
  });
}

/**
 * Get user's learning state
 */
export async function getUserLearningState(
  userId: string
): Promise<UserLearningState | null> {
  const doc = await adminDb.collection("user_learning_state").doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as UserLearningState;
}

/**
 * Get topics that are due for review
 */
export async function getTopicsDueForReview(
  userId: string
): Promise<TopicLearningState[]> {
  const learningState = await getUserLearningState(userId);

  if (!learningState) {
    return [];
  }

  const now = new Date();
  const dueTopics: TopicLearningState[] = [];

  for (const topicId in learningState.topics) {
    const topic = learningState.topics[topicId];
    const nextReviewAt = new Date(topic.next_review_at);

    if (nextReviewAt <= now) {
      dueTopics.push(topic);
    }
  }

  // Sort by most overdue first
  return dueTopics.sort((a, b) => {
    return new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime();
  });
}

/**
 * Get user's current streak
 */
export async function getUserStreak(userId: string): Promise<number> {
  const learningState = await getUserLearningState(userId);
  return learningState?.streak_days || 0;
}

/**
 * Reset daily email counter (call at midnight)
 */
export async function resetDailyEmailCounters(): Promise<void> {
  // Get all profiles with emails sent today > 0
  const profilesSnap = await adminDb
    .collection("profiles")
    .where("emails_sent_today", ">", 0)
    .get();

  const batch = adminDb.batch();

  profilesSnap.docs.forEach((doc) => {
    batch.update(doc.ref, { emails_sent_today: 0 });
  });

  await batch.commit();
}

/**
 * Update user's longest streak if current streak exceeds it
 */
export async function updateLongestStreak(userId: string): Promise<void> {
  const learningState = await getUserLearningState(userId);

  if (!learningState) return;

  const currentStreak = learningState.streak_days || 0;
  const longestStreak = (learningState as any).longest_streak_days || 0;

  if (currentStreak > longestStreak) {
    await adminDb.collection("user_learning_state").doc(userId).update({
      longest_streak_days: currentStreak,
      updated_at: new Date().toISOString(),
    });
  }
}

/**
 * Complete session and update both topic-level and problem-level mastery
 * This is the main entry point for recording completed practice sessions
 *
 * IMPORTANT: This also records research events for A/B testing analytics
 */
export async function completeSessionWithMastery(
  userId: string,
  sessionData: {
    scenarioId: string;
    title: string;
    pattern: DSAPattern;
    difficulty: Difficulty;
    performanceScore: number;
    timeSpentMinutes?: number;
    hintsUsed?: number;
    completedAt?: string;
  }
): Promise<{
  nextReviewAt: string;
  intervalDays: number;
  masteryLevel: string;
  streakDays: number;
}> {
  const completedAt = sessionData.completedAt || new Date().toISOString();

  // Update topic-level learning state (legacy)
  await updateLearningStateAfterSession(userId, {
    topic: sessionData.title,
    scenarioId: sessionData.scenarioId,
    pattern: sessionData.pattern,
    performanceScore: sessionData.performanceScore,
    completedAt,
  });

  // Update problem-level mastery
  const { initializeProblemMasteryFromSession, updateProblemMastery, getAllUserProblems } =
    await import("./spaced-repetition/scheduler");
  const { calculateNextInterval, mapScoreToQuality } = await import("./spaced-repetition/sm2-algorithm");
  const { recordReviewEvent, getUserAlgorithm, estimateRetention } =
    await import("./spaced-repetition");

  // Check if problem mastery exists
  const problems = await getAllUserProblems(userId);
  const existingMastery = problems.find((p) => p.problem_id === sessionData.scenarioId);

  let masteryResult;
  const now = new Date();

  if (existingMastery) {
    // Calculate new interval using enhanced SM-2
    const learningState = await getUserLearningState(userId);
    const streakDays = learningState?.streak_days || 0;

    const lastReviewAt = new Date(existingMastery.last_reviewed_at);
    const nextReviewAt = new Date(existingMastery.next_review_at);
    const daysSinceLastReview = Math.floor(
      (now.getTime() - lastReviewAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysOverdue = nextReviewAt < now
      ? Math.floor((now.getTime() - nextReviewAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const isEarlyReview = nextReviewAt > now;

    const sm2Result = calculateNextInterval({
      previousInterval: existingMastery.interval_days,
      previousEaseFactor: existingMastery.ease_factor,
      performanceScore: sessionData.performanceScore,
      reviewCount: existingMastery.review_count,
      lastReviewDate: lastReviewAt,
      problemDifficulty: sessionData.difficulty,
      streakDays,
      scoresHistory: existingMastery.scores_history,
      isEarlyReview,
      daysOverdue,
    });

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + sm2Result.nextInterval);

    masteryResult = await updateProblemMastery(userId, sessionData.scenarioId, {
      performance_score: sessionData.performanceScore,
      time_spent_minutes: sessionData.timeSpentMinutes,
      hints_used: sessionData.hintsUsed,
      ease_factor: sm2Result.newEaseFactor,
      interval_days: sm2Result.nextInterval,
      review_count: existingMastery.review_count + 1,
      next_review_at: nextReview.toISOString(),
      mastery_level: sm2Result.masteryLevel,
      confidence: sm2Result.confidence,
    });

    // Record research event for A/B testing analytics
    // This populates the research dashboard with real user data
    try {
      const predictedRetention = estimateRetention(
        existingMastery.interval_days,
        existingMastery.ease_factor,
        daysSinceLastReview
      );

      await recordReviewEvent({
        userId,
        problemId: sessionData.scenarioId,
        scenarioId: sessionData.scenarioId,
        pattern: sessionData.pattern,
        difficulty: sessionData.difficulty,
        score: sessionData.performanceScore,
        masteryScore: sessionData.performanceScore, // Fallback: use performance score when detailed metrics unavailable
        qualityRating: mapScoreToQuality(sessionData.performanceScore),
        timeSpentMinutes: sessionData.timeSpentMinutes || 0,
        hintsUsed: sessionData.hintsUsed || 0,
        preReviewState: {
          intervalDays: existingMastery.interval_days,
          daysSinceLastReview,
          daysOverdue,
          easeFactor: existingMastery.ease_factor,
          predictedRetention,
          masteryLevel: existingMastery.mastery_level as any,
        },
        postReviewState: {
          newIntervalDays: sm2Result.nextInterval,
          newEaseFactor: sm2Result.newEaseFactor,
          masteryLevel: sm2Result.masteryLevel,
        },
        isEarlyReview,
        isFirstReview: false,
        sessionNumber: existingMastery.review_count + 1,
      });
    } catch (error) {
      // Don't fail session completion if research tracking fails
      console.error("[Learning State] Failed to record research event:", error);
    }
  } else {
    // Initialize new problem mastery
    masteryResult = await initializeProblemMasteryFromSession(userId, {
      scenario_id: sessionData.scenarioId,
      title: sessionData.title,
      pattern: sessionData.pattern,
      difficulty: sessionData.difficulty,
      performance_score: sessionData.performanceScore,
      time_spent_minutes: sessionData.timeSpentMinutes,
      hints_used: sessionData.hintsUsed,
    });

    // Record research event for first review
    try {
      const qualityRating = mapScoreToQuality(sessionData.performanceScore);

      await recordReviewEvent({
        userId,
        problemId: sessionData.scenarioId,
        scenarioId: sessionData.scenarioId,
        pattern: sessionData.pattern,
        difficulty: sessionData.difficulty,
        score: sessionData.performanceScore,
        masteryScore: sessionData.performanceScore, // Fallback: use performance score when detailed metrics unavailable
        qualityRating,
        timeSpentMinutes: sessionData.timeSpentMinutes || 0,
        hintsUsed: sessionData.hintsUsed || 0,
        preReviewState: {
          intervalDays: 0,
          daysSinceLastReview: 0,
          daysOverdue: 0,
          predictedRetention: 0,
          masteryLevel: "new",
        },
        postReviewState: {
          newIntervalDays: masteryResult.interval_days,
          newEaseFactor: masteryResult.ease_factor,
          masteryLevel: masteryResult.mastery_level as any,
        },
        isEarlyReview: false,
        isFirstReview: true,
        sessionNumber: 1,
      });
    } catch (error) {
      console.error("[Learning State] Failed to record first review research event:", error);
    }
  }

  // Update longest streak
  await updateLongestStreak(userId);

  // Get updated streak
  const updatedLearningState = await getUserLearningState(userId);

  return {
    nextReviewAt: masteryResult.next_review_at,
    intervalDays: masteryResult.interval_days,
    masteryLevel: masteryResult.mastery_level,
    streakDays: updatedLearningState?.streak_days || 1,
  };
}
