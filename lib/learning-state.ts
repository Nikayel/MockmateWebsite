/**
 * User Learning State Management
 *
 * Handles tracking user progress for spaced repetition:
 * - Updates learning state after session completion
 * - Calculates next review dates using SM-2 algorithm
 * - Tracks streak days
 */

import { adminDb, FieldValue } from "./firebase-admin";
import type { UserLearningState, TopicLearningState } from "./types";

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
