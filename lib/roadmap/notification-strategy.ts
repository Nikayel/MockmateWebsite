/**
 * Notification Strategy for Roadmap
 *
 * Defines what notifications go where:
 * - In-App Panel: Frequent, actionable items
 * - Email: Critical milestones only (expensive, don't overwhelm)
 * - Push: Time-sensitive reminders
 */

import { RoadmapHealth, InterventionType } from './edge-case-handlers';

/**
 * Notification channels
 */
export type NotificationChannel = 'in_app' | 'email' | 'push';

/**
 * Notification priority
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Notification types
 */
export type NotificationType =
  // Progress notifications
  | 'daily_reminder'
  | 'streak_milestone'
  | 'pattern_mastered'
  | 'roadmap_progress'
  | 'weekly_summary'
  // Intervention notifications
  | 'falling_behind'
  | 'struggling_detected'
  | 'inactivity_warning'
  | 're_engagement'
  // Timeline notifications
  | 'interview_countdown'
  | 'interview_tomorrow'
  | 'interview_today'
  // Achievement notifications
  | 'roadmap_completed'
  | 'milestone_reached'
  | 'difficulty_unlocked';

/**
 * Notification configuration
 */
export interface NotificationConfig {
  type: NotificationType;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  // Minimum hours between same notification type
  cooldownHours: number;
  // Can user disable this?
  userCanDisable: boolean;
  // Email subject (if email channel)
  emailSubject?: string;
}

/**
 * Notification routing configuration
 *
 * EMAIL STRATEGY:
 * - Only send emails for CRITICAL events (interview tomorrow, roadmap complete)
 * - Maximum 2-3 emails per week to avoid spam
 * - Never send daily reminders via email
 * - Always offer in-app alternative
 */
export const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationConfig> = {
  // ═══════════════════════════════════════════════════════════════════
  // DAILY OPERATIONS - IN-APP ONLY (no email spam)
  // ═══════════════════════════════════════════════════════════════════
  daily_reminder: {
    type: 'daily_reminder',
    channels: ['in_app'],  // NEVER email
    priority: 'low',
    cooldownHours: 20,
    userCanDisable: true,
  },

  roadmap_progress: {
    type: 'roadmap_progress',
    channels: ['in_app'],
    priority: 'low',
    cooldownHours: 24,
    userCanDisable: true,
  },

  // ═══════════════════════════════════════════════════════════════════
  // ACHIEVEMENTS - IN-APP + OPTIONAL PUSH
  // ═══════════════════════════════════════════════════════════════════
  streak_milestone: {
    type: 'streak_milestone',
    channels: ['in_app', 'push'],
    priority: 'medium',
    cooldownHours: 24,
    userCanDisable: true,
  },

  pattern_mastered: {
    type: 'pattern_mastered',
    channels: ['in_app'],
    priority: 'medium',
    cooldownHours: 1,
    userCanDisable: false,
  },

  milestone_reached: {
    type: 'milestone_reached',
    channels: ['in_app', 'push'],
    priority: 'medium',
    cooldownHours: 1,
    userCanDisable: false,
  },

  difficulty_unlocked: {
    type: 'difficulty_unlocked',
    channels: ['in_app'],
    priority: 'medium',
    cooldownHours: 1,
    userCanDisable: false,
  },

  // ═══════════════════════════════════════════════════════════════════
  // WEEKLY SUMMARY - EMAIL OK (once per week max)
  // ═══════════════════════════════════════════════════════════════════
  weekly_summary: {
    type: 'weekly_summary',
    channels: ['email', 'in_app'],
    priority: 'low',
    cooldownHours: 168, // 7 days
    userCanDisable: true,
    emailSubject: 'Your Weekly Interview Prep Summary',
  },

  // ═══════════════════════════════════════════════════════════════════
  // INTERVENTIONS - IN-APP + PUSH, EMAIL ONLY FOR CRITICAL
  // ═══════════════════════════════════════════════════════════════════
  falling_behind: {
    type: 'falling_behind',
    channels: ['in_app', 'push'],
    priority: 'high',
    cooldownHours: 48,
    userCanDisable: true,
  },

  struggling_detected: {
    type: 'struggling_detected',
    channels: ['in_app'],
    priority: 'medium',
    cooldownHours: 24,
    userCanDisable: false,
  },

  inactivity_warning: {
    type: 'inactivity_warning',
    channels: ['in_app', 'push'],
    priority: 'medium',
    cooldownHours: 72, // 3 days
    userCanDisable: true,
  },

  re_engagement: {
    type: 're_engagement',
    channels: ['in_app', 'email'], // Email OK for re-engagement (infrequent)
    priority: 'medium',
    cooldownHours: 168, // 7 days
    userCanDisable: true,
    emailSubject: 'We miss you! Your interview prep is waiting',
  },

  // ═══════════════════════════════════════════════════════════════════
  // INTERVIEW COUNTDOWN - CRITICAL, EMAIL FOR FINAL DAYS ONLY
  // ═══════════════════════════════════════════════════════════════════
  interview_countdown: {
    type: 'interview_countdown',
    channels: ['in_app'],
    priority: 'high',
    cooldownHours: 24,
    userCanDisable: false,
  },

  interview_tomorrow: {
    type: 'interview_tomorrow',
    channels: ['in_app', 'push', 'email'], // EMAIL OK - critical
    priority: 'critical',
    cooldownHours: 24,
    userCanDisable: false,
    emailSubject: 'Interview Tomorrow - Final Tips Inside',
  },

  interview_today: {
    type: 'interview_today',
    channels: ['in_app', 'push'],  // No email day-of (too late)
    priority: 'critical',
    cooldownHours: 24,
    userCanDisable: false,
  },

  // ═══════════════════════════════════════════════════════════════════
  // COMPLETION - EMAIL OK (celebratory, one-time)
  // ═══════════════════════════════════════════════════════════════════
  roadmap_completed: {
    type: 'roadmap_completed',
    channels: ['in_app', 'push', 'email'],
    priority: 'high',
    cooldownHours: 0, // One-time
    userCanDisable: false,
    emailSubject: 'Congratulations! You completed your interview prep',
  },
};

/**
 * Notification content
 */
export interface NotificationContent {
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, unknown>;
}

/**
 * Generate notification content based on type and context
 */
export function generateNotificationContent(
  type: NotificationType,
  context: {
    companyName?: string;
    daysRemaining?: number;
    progress?: number;
    patternName?: string;
    streakDays?: number;
    milestoneName?: string;
  }
): NotificationContent {
  switch (type) {
    case 'daily_reminder':
      return {
        title: 'Time to practice!',
        body: `Your ${context.companyName || 'interview'} prep is waiting. ${context.daysRemaining} days to go.`,
        actionUrl: '/roadmap',
        actionLabel: 'Start Today\'s Practice',
      };

    case 'streak_milestone':
      return {
        title: `${context.streakDays} Day Streak!`,
        body: 'Amazing consistency! Keep it up.',
        actionUrl: '/roadmap',
        actionLabel: 'Continue Streak',
      };

    case 'pattern_mastered':
      return {
        title: 'Pattern Mastered!',
        body: `You've mastered ${context.patternName}. Great progress!`,
        actionUrl: '/roadmap?tab=progress',
        actionLabel: 'View Progress',
      };

    case 'roadmap_progress':
      return {
        title: 'Progress Update',
        body: `You're ${context.progress}% through your roadmap. ${context.daysRemaining} days remaining.`,
        actionUrl: '/roadmap',
        actionLabel: 'View Roadmap',
      };

    case 'weekly_summary':
      return {
        title: 'Your Weekly Summary',
        body: `You're ${context.progress}% complete with ${context.daysRemaining} days until your ${context.companyName} interview.`,
        actionUrl: '/roadmap?tab=progress',
        actionLabel: 'View Full Summary',
      };

    case 'falling_behind':
      return {
        title: 'Catch-Up Mode Available',
        body: "You're a bit behind schedule. We've adjusted your plan to focus on what matters most.",
        actionUrl: '/roadmap',
        actionLabel: 'View Adjusted Plan',
      };

    case 'struggling_detected':
      return {
        title: 'Need some help?',
        body: "We noticed you're finding some problems challenging. We've added easier problems to build confidence.",
        actionUrl: '/roadmap',
        actionLabel: 'See Adjusted Plan',
      };

    case 'inactivity_warning':
      return {
        title: "Don't lose momentum!",
        body: `It's been a while since your last practice. Your ${context.companyName} interview is in ${context.daysRemaining} days.`,
        actionUrl: '/roadmap',
        actionLabel: 'Resume Practice',
      };

    case 're_engagement':
      return {
        title: 'Welcome back!',
        body: `Your ${context.companyName} interview prep is waiting. Let's pick up where you left off.`,
        actionUrl: '/roadmap',
        actionLabel: 'Continue Prep',
      };

    case 'interview_countdown':
      return {
        title: `${context.daysRemaining} Days Left`,
        body: `Your ${context.companyName} interview is approaching. Stay focused!`,
        actionUrl: '/roadmap',
        actionLabel: 'View Today\'s Plan',
      };

    case 'interview_tomorrow':
      return {
        title: 'Interview Tomorrow!',
        body: `Your ${context.companyName} interview is tomorrow. Light review today, then rest well.`,
        actionUrl: '/roadmap?tab=guide',
        actionLabel: 'Final Tips',
      };

    case 'interview_today':
      return {
        title: 'Interview Day - You Got This!',
        body: `Your ${context.companyName} interview is today. Trust your preparation. Good luck!`,
        actionUrl: '/roadmap?tab=guide',
        actionLabel: 'Last Minute Tips',
      };

    case 'roadmap_completed':
      return {
        title: 'Roadmap Completed!',
        body: `Congratulations! You've completed your ${context.companyName} interview prep. You're ready!`,
        actionUrl: '/roadmap',
        actionLabel: 'View Summary',
      };

    case 'milestone_reached':
      return {
        title: 'Milestone Reached!',
        body: `You've reached "${context.milestoneName}". Great progress!`,
        actionUrl: '/roadmap?tab=schedule',
        actionLabel: 'View Milestones',
      };

    case 'difficulty_unlocked':
      return {
        title: 'Hard Problems Unlocked!',
        body: "Your performance has unlocked hard problems. Ready for the challenge?",
        actionUrl: '/roadmap',
        actionLabel: 'Try a Challenge',
      };

    default:
      return {
        title: 'Notification',
        body: 'You have an update.',
        actionUrl: '/roadmap',
      };
  }
}

/**
 * Map health status to notification type
 */
export function getNotificationForHealth(
  health: RoadmapHealth,
  intervention: InterventionType
): NotificationType | null {
  switch (health) {
    case 'significantly_behind':
      return 'falling_behind';
    case 'struggling':
      return 'struggling_detected';
    case 'inactive':
      return intervention === 're_engagement' ? 're_engagement' : 'inactivity_warning';
    case 'completed':
      return 'roadmap_completed';
    default:
      return null;
  }
}

/**
 * Get notifications for interview countdown
 */
export function getCountdownNotification(
  daysRemaining: number
): NotificationType | null {
  if (daysRemaining === 0) return 'interview_today';
  if (daysRemaining === 1) return 'interview_tomorrow';
  if (daysRemaining <= 7 && daysRemaining > 1) return 'interview_countdown';
  return null;
}

/**
 * Email-specific content (more detailed than in-app)
 */
export function generateEmailContent(
  type: NotificationType,
  context: {
    userName?: string;
    companyName?: string;
    daysRemaining?: number;
    progress?: number;
    questionsCompleted?: number;
    totalQuestions?: number;
    patternsCovered?: number;
  }
): {
  subject: string;
  preheader: string;
  sections: Array<{ title: string; content: string }>;
  cta: { label: string; url: string };
} {
  const config = NOTIFICATION_CONFIGS[type];

  switch (type) {
    case 'interview_tomorrow':
      return {
        subject: config.emailSubject || 'Interview Tomorrow',
        preheader: `Your ${context.companyName} interview is tomorrow. Here's your final prep.`,
        sections: [
          {
            title: 'Interview Day Tips',
            content: `
• Get 7-8 hours of sleep tonight
• Prepare your setup (camera, audio, quiet space)
• Have water and snacks ready
• Review your strongest patterns for confidence
• Don't cram - trust your preparation
            `.trim(),
          },
          {
            title: 'Quick Stats',
            content: `
You've completed ${context.questionsCompleted} of ${context.totalQuestions} problems (${context.progress}%).
You've covered ${context.patternsCovered} key patterns.
            `.trim(),
          },
        ],
        cta: {
          label: 'View Final Tips',
          url: '/roadmap?tab=guide',
        },
      };

    case 'weekly_summary':
      return {
        subject: config.emailSubject || 'Weekly Summary',
        preheader: `Your ${context.companyName} prep progress this week.`,
        sections: [
          {
            title: 'This Week\'s Progress',
            content: `
You're ${context.progress}% complete with your ${context.companyName} roadmap.
${context.daysRemaining} days remaining until your interview.
            `.trim(),
          },
          {
            title: 'Keep Going!',
            content: 'Consistency is key. Even 30 minutes a day makes a difference.',
          },
        ],
        cta: {
          label: 'Continue Practice',
          url: '/roadmap',
        },
      };

    case 're_engagement':
      return {
        subject: config.emailSubject || 'We miss you!',
        preheader: `Your ${context.companyName} interview prep is waiting.`,
        sections: [
          {
            title: 'Welcome Back',
            content: `
Hi${context.userName ? ` ${context.userName}` : ''}!

We noticed you haven't practiced in a while. Your ${context.companyName} interview is in ${context.daysRemaining} days.

It's not too late! Let's adjust your plan and focus on what matters most.
            `.trim(),
          },
        ],
        cta: {
          label: 'Resume Practice',
          url: '/roadmap',
        },
      };

    case 'roadmap_completed':
      return {
        subject: config.emailSubject || 'Congratulations!',
        preheader: `You completed your ${context.companyName} interview prep!`,
        sections: [
          {
            title: 'You Did It!',
            content: `
Congratulations on completing your ${context.companyName} interview preparation!

You solved ${context.questionsCompleted} problems and mastered ${context.patternsCovered} key patterns.

You're ready for this. Trust your preparation and go ace that interview!
            `.trim(),
          },
          {
            title: 'What\'s Next?',
            content: `
• Practice a mock interview to stay sharp
• Review company-specific interview tips
• Get plenty of rest before your interview
            `.trim(),
          },
        ],
        cta: {
          label: 'Practice Mock Interview',
          url: '/interview',
        },
      };

    default:
      return {
        subject: 'Mockmate Update',
        preheader: 'You have an update from Mockmate',
        sections: [
          {
            title: 'Update',
            content: 'Check your roadmap for the latest updates.',
          },
        ],
        cta: {
          label: 'View Roadmap',
          url: '/roadmap',
        },
      };
  }
}

/**
 * Should we send this notification?
 * Checks cooldown and other conditions
 */
export function shouldSendNotification(
  type: NotificationType,
  lastSentAt: Date | null,
  userPreferences: { emailEnabled: boolean; pushEnabled: boolean }
): {
  send: boolean;
  channels: NotificationChannel[];
  reason?: string;
} {
  const config = NOTIFICATION_CONFIGS[type];

  // Check cooldown
  if (lastSentAt && config.cooldownHours > 0) {
    const hoursSinceLast =
      (Date.now() - lastSentAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast < config.cooldownHours) {
      return {
        send: false,
        channels: [],
        reason: `Cooldown: ${Math.ceil(config.cooldownHours - hoursSinceLast)} hours remaining`,
      };
    }
  }

  // Filter channels based on user preferences
  const channels = config.channels.filter((channel) => {
    if (channel === 'email' && !userPreferences.emailEnabled) return false;
    if (channel === 'push' && !userPreferences.pushEnabled) return false;
    return true;
  });

  if (channels.length === 0) {
    return {
      send: false,
      channels: [],
      reason: 'All channels disabled by user',
    };
  }

  return {
    send: true,
    channels,
  };
}

/**
 * In-app notification panel structure
 */
export interface InAppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  content: NotificationContent;
  createdAt: Date;
  readAt: Date | null;
  dismissedAt: Date | null;
}

/**
 * Get notifications to show in panel
 * Sorted by priority and recency
 */
export function sortNotificationsForPanel(
  notifications: InAppNotification[]
): InAppNotification[] {
  const priorityOrder: Record<NotificationPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...notifications]
    .filter((n) => !n.dismissedAt)
    .sort((a, b) => {
      // Unread first
      if (a.readAt && !b.readAt) return 1;
      if (!a.readAt && b.readAt) return -1;

      // Then by priority
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by recency
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}
