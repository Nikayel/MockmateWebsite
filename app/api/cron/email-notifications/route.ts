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
  sendDailyRoadmapEmail,
  sendInterviewCountdownEmail,
  sendBehindScheduleEmail,
  canSendEmail,
  calculateRetention,
} from "@/lib/email";
import type { Profile, UserLearningState } from "@/lib/types";

const db = adminDb;

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron - ALWAYS require secret
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET) {
      console.error("[Cron Email] CRON_SECRET not configured - rejecting request");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      inactivityEmails: { sent: 0, skipped: 0, failed: 0 },
      spacedRepetitionEmails: { sent: 0, skipped: 0, failed: 0 },
      roadmapEmails: { sent: 0, skipped: 0, failed: 0 },
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

    // ============================================
    // 3. ROADMAP-BASED REMINDERS
    // ============================================
    await processRoadmapReminders(now, results);

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
  // Find users with problem mastery data (new system)
  const problemMasteryUsersSnap = await db
    .collection("problem_mastery")
    .limit(100)
    .get();

  const processedUsers = new Set<string>();

  // Process problem-level mastery (new system)
  for (const userDoc of problemMasteryUsersSnap.docs) {
    const userId = userDoc.id;
    processedUsers.add(userId);

    try {
      // Get problems due for this user
      const problemsSnap = await db
        .collection("problem_mastery")
        .doc(userId)
        .collection("problems")
        .where("next_review_at", "<=", now.toISOString())
        .limit(10)
        .get();

      if (problemsSnap.empty) continue;

      // Calculate problems due with days overdue
      const problemsDue = problemsSnap.docs.map((doc) => {
        const problem = doc.data();
        const nextReviewAt = new Date(problem.next_review_at);
        const daysOverdue = Math.floor(
          (now.getTime() - nextReviewAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...problem, daysOverdue };
      }).filter((p) => p.daysOverdue >= 1); // At least 1 day overdue

      if (problemsDue.length === 0) continue;

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

      // Send reminder for the most overdue problem
      const mostOverdue = problemsDue.sort(
        (a, b) => b.daysOverdue - a.daysOverdue
      )[0];

      const result = await sendSpacedRepetitionEmail(profile.email, {
        userName: profile.full_name || "",
        userEmail: profile.email,
        topic: mostOverdue.title,
        pattern: mostOverdue.pattern,
        daysSinceReview: mostOverdue.daysOverdue,
        lastScore: mostOverdue.last_score,
        reviewCount: mostOverdue.review_count,
        scenarioId: mostOverdue.scenario_id,
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
            topic: mostOverdue.title,
            problem_id: mostOverdue.problem_id,
            mastery_level: mostOverdue.mastery_level,
            retention_estimate: calculateRetention(
              mostOverdue.daysOverdue,
              mostOverdue.last_score
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
      results.errors.push(`Error processing problem mastery for ${userId}: ${error.message}`);
    }
  }

  // Also process legacy topic-level data for users not in new system
  const learningStatesSnap = await db
    .collection("user_learning_state")
    .limit(100)
    .get();

  for (const doc of learningStatesSnap.docs) {
    const learningState = doc.data() as UserLearningState;
    const userId = learningState.user_id;

    // Skip if already processed via problem_mastery
    if (processedUsers.has(userId)) continue;

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

async function processRoadmapReminders(
  now: Date,
  results: any
): Promise<void> {
  // Get all active roadmaps
  const roadmapsSnap = await db
    .collection("user_roadmaps")
    .where("status", "==", "active")
    .limit(100)
    .get();

  for (const doc of roadmapsSnap.docs) {
    const roadmap = doc.data();
    const userId = roadmap.userId;

    try {
      // Get user profile
      const profileSnap = await db.collection("profiles").doc(userId).get();
      if (!profileSnap.exists) continue;

      const profile = profileSnap.data() as Profile;

      // Check if user has email notifications enabled
      if (!profile.notification_preferences?.email_notifications_enabled) {
        results.roadmapEmails.skipped++;
        continue;
      }

      // Check rate limits
      const rateCheck = canSendEmail(
        profile.last_email_sent_at,
        profile.emails_sent_today
      );
      if (!rateCheck.allowed) {
        results.roadmapEmails.skipped++;
        continue;
      }

      // Calculate days until interview
      const interviewDate = roadmap.interviewDate?.toDate?.() || new Date(roadmap.interviewDate);
      const daysUntilInterview = Math.ceil(
        (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Skip if interview has passed
      if (daysUntilInterview <= 0) continue;

      // Get today's questions from dailyPlans
      const todaysQuestions: Array<{
        title: string;
        pattern: string;
        difficulty: string;
        scenarioId?: string;
      }> = [];

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      for (const plan of roadmap.dailyPlans || []) {
        const planDate = plan.date?.toDate?.() || new Date(plan.date);
        if (planDate >= todayStart && planDate <= todayEnd) {
          for (const q of plan.questions || []) {
            if (q.status !== "completed") {
              todaysQuestions.push({
                title: q.title || q.scenarioTitle || "Practice Problem",
                pattern: q.pattern || "DSA",
                difficulty: q.difficulty || "Medium",
                scenarioId: q.scenarioId,
              });
            }
          }
        }
      }

      // Calculate progress
      const questionsCompleted = roadmap.questionsCompleted || 0;
      const totalQuestions = roadmap.totalQuestions || 1;
      const isOnTrack = roadmap.isOnTrack !== false;

      // Determine which type of email to send

      // 1. Interview countdown (at 7, 3, 1 days)
      if ([7, 3, 1].includes(daysUntilInterview)) {
        // Find patterns that need focus (incomplete or low scoring)
        const patternsToFocus: string[] = [];
        for (const plan of roadmap.dailyPlans || []) {
          for (const q of plan.questions || []) {
            if (q.status !== "completed" && q.pattern && !patternsToFocus.includes(q.pattern)) {
              patternsToFocus.push(q.pattern);
              if (patternsToFocus.length >= 3) break;
            }
          }
          if (patternsToFocus.length >= 3) break;
        }

        const result = await sendInterviewCountdownEmail(profile.email, {
          userName: profile.full_name || "",
          userEmail: profile.email,
          targetCompany: roadmap.assessment?.targetCompany || roadmap.targetCompany || "your target company",
          daysUntilInterview,
          questionsCompleted,
          totalQuestions,
          patternsToFocus,
        });

        if (result.success) {
          results.roadmapEmails.sent++;
          await updateEmailTracking(userId, profile, now);
          await logEmailNotification(userId, "interview_countdown", now);
        } else {
          results.roadmapEmails.failed++;
          results.errors.push(`Countdown email failed for ${userId}: ${result.error}`);
        }
        continue;
      }

      // 2. Behind schedule alert (if significantly behind)
      if (!isOnTrack && daysUntilInterview > 3) {
        // Calculate how many questions behind
        const expectedProgress = ((roadmap.dailyPlans?.length || 1) - daysUntilInterview) / (roadmap.dailyPlans?.length || 1);
        const actualProgress = questionsCompleted / totalQuestions;
        const questionsBehind = Math.round((expectedProgress - actualProgress) * totalQuestions);

        if (questionsBehind > 2) {
          const suggestedDaily = Math.ceil((totalQuestions - questionsCompleted) / daysUntilInterview);

          const result = await sendBehindScheduleEmail(profile.email, {
            userName: profile.full_name || "",
            userEmail: profile.email,
            targetCompany: roadmap.assessment?.targetCompany || roadmap.targetCompany || "your target company",
            daysUntilInterview,
            questionsBehind,
            suggestedDailyQuestions: Math.max(1, suggestedDaily),
          });

          if (result.success) {
            results.roadmapEmails.sent++;
            await updateEmailTracking(userId, profile, now);
            await logEmailNotification(userId, "behind_schedule", now);
          } else {
            results.roadmapEmails.failed++;
            results.errors.push(`Behind schedule email failed for ${userId}: ${result.error}`);
          }
          continue;
        }
      }

      // 3. Daily roadmap reminder (if there are questions for today)
      if (todaysQuestions.length > 0) {
        const result = await sendDailyRoadmapEmail(profile.email, {
          userName: profile.full_name || "",
          userEmail: profile.email,
          targetCompany: roadmap.assessment?.targetCompany || roadmap.targetCompany || "your target company",
          daysUntilInterview,
          todaysQuestions,
          questionsCompleted,
          totalQuestions,
          isOnTrack,
        });

        if (result.success) {
          results.roadmapEmails.sent++;
          await updateEmailTracking(userId, profile, now);
          await logEmailNotification(userId, "daily_roadmap", now);
        } else {
          results.roadmapEmails.failed++;
          results.errors.push(`Daily roadmap email failed for ${userId}: ${result.error}`);
        }
      }
    } catch (error: any) {
      results.roadmapEmails.failed++;
      results.errors.push(`Error processing roadmap for ${userId}: ${error.message}`);
    }
  }
}

// Helper to update email tracking on profile
async function updateEmailTracking(userId: string, profile: Profile, now: Date): Promise<void> {
  await db.collection("profiles").doc(userId).update({
    last_email_sent_at: now.toISOString(),
    emails_sent_today: (profile.emails_sent_today || 0) + 1,
  });
}

// Helper to log email notification
async function logEmailNotification(userId: string, emailType: string, now: Date): Promise<void> {
  await db.collection("email_notifications").add({
    user_id: userId,
    email_type: emailType,
    status: "sent",
    scheduled_at: now.toISOString(),
    sent_at: now.toISOString(),
    created_at: now.toISOString(),
  });
}

// Support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
