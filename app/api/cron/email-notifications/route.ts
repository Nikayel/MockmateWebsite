/**
 * Email Notifications Cron Job
 *
 * Runs hourly to check for:
 * 1. Inactive users (24h+) - send inactivity reminders
 * 2. Topics due for review - send spaced repetition reminders
 *
 * Designed for Vercel Cron Jobs:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/email-notifications",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  sendInactivityEmail,
  sendSpacedRepetitionEmail,
  canSendEmail,
  calculateRetention,
} from "@/lib/email";
import type { Profile, UserLearningState } from "@/lib/types";

const db = adminDb;

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      inactivityEmails: { sent: 0, skipped: 0, failed: 0 },
      spacedRepetitionEmails: { sent: 0, skipped: 0, failed: 0 },
      errors: [] as string[],
    };

    // Get current time
    const now = new Date();
    const currentHour = now.getUTCHours();

    // Only send emails during reasonable hours (9 AM - 9 PM UTC)
    // In production, this should use user timezone
    const isReasonableHour = currentHour >= 9 && currentHour <= 21;

    if (!isReasonableHour) {
      return NextResponse.json({
        success: true,
        message: "Skipping - outside reasonable hours",
        hour: currentHour,
      });
    }

    // ============================================
    // 1. INACTIVITY REMINDERS
    // ============================================
    await processInactivityReminders(now, results);

    // ============================================
    // 2. SPACED REPETITION REMINDERS
    // ============================================
    await processSpacedRepetitionReminders(now, results);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("[Cron Email] Error:", error);
    return NextResponse.json(
      { error: error.message || "Cron job failed" },
      { status: 500 }
    );
  }
}

async function processInactivityReminders(
  now: Date,
  results: any
): Promise<void> {
  // Find users who haven't practiced in 24+ hours
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

  // Get all learning states where last_session_at is between 24h and 72h ago
  const learningStatesSnap = await db
    .collection("user_learning_state")
    .where("last_session_at", "<=", twentyFourHoursAgo.toISOString())
    .where("last_session_at", ">=", seventyTwoHoursAgo.toISOString())
    .limit(50) // Process in batches
    .get();

  for (const doc of learningStatesSnap.docs) {
    const learningState = doc.data() as UserLearningState;
    const userId = learningState.user_id;

    try {
      // Get user profile
      const profileSnap = await db.collection("profiles").doc(userId).get();
      if (!profileSnap.exists) continue;

      const profile = profileSnap.data() as Profile;

      // Check if user has email notifications enabled
      if (!profile.notification_preferences?.inactivity_reminders) {
        results.inactivityEmails.skipped++;
        continue;
      }

      if (!profile.notification_preferences?.email_notifications_enabled) {
        results.inactivityEmails.skipped++;
        continue;
      }

      // Check rate limits
      const rateCheck = canSendEmail(
        profile.last_email_sent_at,
        profile.emails_sent_today
      );
      if (!rateCheck.allowed) {
        results.inactivityEmails.skipped++;
        continue;
      }

      // Calculate hours since last session
      const lastSessionAt = new Date(learningState.last_session_at || now.toISOString());
      const hoursSinceLastSession = Math.floor(
        (now.getTime() - lastSessionAt.getTime()) / (1000 * 60 * 60)
      );

      // Get last practiced topic
      let lastTopic: string | undefined;
      let latestTopicTime = 0;
      for (const topicId in learningState.topics) {
        const topic = learningState.topics[topicId];
        const topicTime = new Date(topic.last_practiced_at).getTime();
        if (topicTime > latestTopicTime) {
          latestTopicTime = topicTime;
          lastTopic = topic.topic_name;
        }
      }

      // Send inactivity email
      const result = await sendInactivityEmail(profile.email, {
        userName: profile.full_name || "",
        userEmail: profile.email,
        hoursSinceLastSession,
        lastTopic,
        streakDays: learningState.streak_days,
      });

      if (result.success) {
        results.inactivityEmails.sent++;

        // Update profile with email tracking
        await db.collection("profiles").doc(userId).update({
          last_email_sent_at: now.toISOString(),
          emails_sent_today: (profile.emails_sent_today || 0) + 1,
        });

        // Log the notification
        await db.collection("email_notifications").add({
          user_id: userId,
          email_type: hoursSinceLastSession < 48 ? "inactivity_24h" : "inactivity_48h",
          status: "sent",
          scheduled_at: now.toISOString(),
          sent_at: now.toISOString(),
          created_at: now.toISOString(),
        });
      } else {
        results.inactivityEmails.failed++;
        results.errors.push(`Inactivity email failed for ${userId}: ${result.error}`);
      }
    } catch (error: any) {
      results.inactivityEmails.failed++;
      results.errors.push(`Error processing ${userId}: ${error.message}`);
    }
  }
}

async function processSpacedRepetitionReminders(
  now: Date,
  results: any
): Promise<void> {
  // Find topics due for review
  const learningStatesSnap = await db
    .collection("user_learning_state")
    .limit(100)
    .get();

  for (const doc of learningStatesSnap.docs) {
    const learningState = doc.data() as UserLearningState;
    const userId = learningState.user_id;

    // Find topics due for review
    const topicsDue: Array<{
      topicId: string;
      topic: any;
      daysSinceReview: number;
    }> = [];

    for (const topicId in learningState.topics) {
      const topic = learningState.topics[topicId];
      const nextReviewAt = new Date(topic.next_review_at);

      if (nextReviewAt <= now) {
        const daysSinceReview = Math.floor(
          (now.getTime() - new Date(topic.last_practiced_at).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        // Only remind for topics 3+ days old
        if (daysSinceReview >= 3) {
          topicsDue.push({ topicId, topic, daysSinceReview });
        }
      }
    }

    if (topicsDue.length === 0) continue;

    try {
      // Get user profile
      const profileSnap = await db.collection("profiles").doc(userId).get();
      if (!profileSnap.exists) continue;

      const profile = profileSnap.data() as Profile;

      // Check if user has email notifications enabled
      if (!profile.notification_preferences?.spaced_repetition_reminders) {
        results.spacedRepetitionEmails.skipped++;
        continue;
      }

      if (!profile.notification_preferences?.email_notifications_enabled) {
        results.spacedRepetitionEmails.skipped++;
        continue;
      }

      // Check rate limits
      const rateCheck = canSendEmail(
        profile.last_email_sent_at,
        profile.emails_sent_today
      );
      if (!rateCheck.allowed) {
        results.spacedRepetitionEmails.skipped++;
        continue;
      }

      // Send reminder for the most overdue topic
      const mostOverdue = topicsDue.sort(
        (a, b) => b.daysSinceReview - a.daysSinceReview
      )[0];

      const result = await sendSpacedRepetitionEmail(profile.email, {
        userName: profile.full_name || "",
        userEmail: profile.email,
        topic: mostOverdue.topic.topic_name,
        pattern: mostOverdue.topic.pattern,
        daysSinceReview: mostOverdue.daysSinceReview,
        lastScore: mostOverdue.topic.performance_score,
        reviewCount: mostOverdue.topic.review_count,
        scenarioId: mostOverdue.topic.scenario_id,
      });

      if (result.success) {
        results.spacedRepetitionEmails.sent++;

        // Update profile with email tracking
        await db.collection("profiles").doc(userId).update({
          last_email_sent_at: now.toISOString(),
          emails_sent_today: (profile.emails_sent_today || 0) + 1,
        });

        // Log the notification
        await db.collection("email_notifications").add({
          user_id: userId,
          email_type: "spaced_repetition",
          status: "sent",
          scheduled_at: now.toISOString(),
          sent_at: now.toISOString(),
          metadata: {
            topic: mostOverdue.topic.topic_name,
            retention_estimate: calculateRetention(
              mostOverdue.daysSinceReview,
              mostOverdue.topic.performance_score
            ),
          },
          created_at: now.toISOString(),
        });
      } else {
        results.spacedRepetitionEmails.failed++;
        results.errors.push(`SR email failed for ${userId}: ${result.error}`);
      }
    } catch (error: any) {
      results.spacedRepetitionEmails.failed++;
      results.errors.push(`Error processing ${userId}: ${error.message}`);
    }
  }
}

// Support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
