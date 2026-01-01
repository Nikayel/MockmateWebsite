/**
 * Email Diagnostics Endpoint
 * 
 * GET /api/admin/email-diagnostics
 * 
 * Provides comprehensive diagnostics about email system:
 * - Configuration status (BREVO_API_KEY, CRON_SECRET)
 * - Recent email activity from email_notifications collection
 * - Email statistics (sent, failed, by type)
 * - Cron job status
 * 
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminAccess } from '@/lib/admin/middleware'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authResult = await verifyAdminAccess(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    // Check configuration
    const config = {
      BREVO_API_KEY: {
        configured: !!process.env.BREVO_API_KEY,
        length: process.env.BREVO_API_KEY?.length || 0,
        preview: process.env.BREVO_API_KEY 
          ? `${process.env.BREVO_API_KEY.substring(0, 8)}...${process.env.BREVO_API_KEY.substring(process.env.BREVO_API_KEY.length - 4)}`
          : 'Not set',
      },
      CRON_SECRET: {
        configured: !!process.env.CRON_SECRET,
        length: process.env.CRON_SECRET?.length || 0,
      },
      NEXT_PUBLIC_APP_URL: {
        configured: !!process.env.NEXT_PUBLIC_APP_URL,
        value: process.env.NEXT_PUBLIC_APP_URL || 'Not set',
      },
    }

    // Get recent email notifications (last 100)
    let recentEmails: any[] = []
    let emailStats = {
      total: 0,
      sent: 0,
      failed: 0,
      byType: {} as Record<string, { sent: number; failed: number }>,
      last24Hours: { sent: 0, failed: 0 },
      last7Days: { sent: 0, failed: 0 },
    }

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const emailsSnapshot = await adminDb
        .collection('email_notifications')
        .orderBy('created_at', 'desc')
        .limit(100)
        .get()

      emailStats.total = emailsSnapshot.size

      emailsSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        const createdAt = new Date(data.created_at)
        
        recentEmails.push({
          id: doc.id,
          ...data,
        })

        // Count by status
        if (data.status === 'sent') {
          emailStats.sent++
        } else if (data.status === 'failed') {
          emailStats.failed++
        }

        // Count by time period
        if (createdAt >= twentyFourHoursAgo) {
          if (data.status === 'sent') emailStats.last24Hours.sent++
          if (data.status === 'failed') emailStats.last24Hours.failed++
        }
        if (createdAt >= sevenDaysAgo) {
          if (data.status === 'sent') emailStats.last7Days.sent++
          if (data.status === 'failed') emailStats.last7Days.failed++
        }

        // Count by type
        const emailType = data.email_type || 'unknown'
        if (!emailStats.byType[emailType]) {
          emailStats.byType[emailType] = { sent: 0, failed: 0 }
        }
        if (data.status === 'sent') {
          emailStats.byType[emailType].sent++
        } else if (data.status === 'failed') {
          emailStats.byType[emailType].failed++
        }
      })
    } catch (error: any) {
      console.error('[Email Diagnostics] Error fetching email notifications:', error)
      // Continue even if collection doesn't exist yet
    }

    // Get user profile stats related to emails
    let profileStats = {
      total: 0,
      withEmail: 0,
      welcomeEmailSent: 0,
      emailNotificationsEnabled: 0,
    }

    try {
      const profilesSnapshot = await adminDb
        .collection('profiles')
        .limit(1000)
        .get()

      profileStats.total = profilesSnapshot.size

      profilesSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        if (data.email) profileStats.withEmail++
        if (data.welcome_email_sent) profileStats.welcomeEmailSent++
        if (data.notification_preferences?.email_notifications_enabled) {
          profileStats.emailNotificationsEnabled++
        }
      })
    } catch (error: any) {
      console.error('[Email Diagnostics] Error fetching profiles:', error)
    }

    // Determine overall health
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      issues: [] as string[],
    }

    if (!config.BREVO_API_KEY.configured) {
      health.status = 'unhealthy'
      health.issues.push('BREVO_API_KEY not configured')
    }

    if (!config.CRON_SECRET.configured) {
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded'
      health.issues.push('CRON_SECRET not configured')
    }

    if (emailStats.total === 0) {
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded'
      health.issues.push('No email notifications found - emails may not have been sent yet')
    }

    if (emailStats.failed > emailStats.sent && emailStats.total > 10) {
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded'
      health.issues.push('High failure rate detected')
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      health,
      configuration: config,
      statistics: {
        emails: emailStats,
        profiles: profileStats,
      },
      recentEmails: recentEmails.slice(0, 20), // Return last 20 for preview
      recommendations: generateRecommendations(config, emailStats, profileStats),
    })
  } catch (error: any) {
    console.error('[Email Diagnostics] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate diagnostics',
      },
      { status: 500 }
    )
  }
}

function generateRecommendations(
  config: any,
  emailStats: any,
  profileStats: any
): string[] {
  const recommendations: string[] = []

  if (!config.BREVO_API_KEY.configured) {
    recommendations.push('Set BREVO_API_KEY environment variable in Vercel')
  }

  if (!config.CRON_SECRET.configured) {
    recommendations.push('Set CRON_SECRET environment variable for cron job authentication')
  }

  if (emailStats.total === 0) {
    recommendations.push('No emails have been sent yet. Test with /api/test-email endpoint')
    recommendations.push('Check if cron job is running: /api/cron/email-notifications')
  }

  if (emailStats.failed > 0 && emailStats.failed > emailStats.sent) {
    recommendations.push('High email failure rate detected. Check Brevo dashboard for errors')
    recommendations.push('Verify BREVO_API_KEY is valid and has proper permissions')
  }

  if (profileStats.withEmail > profileStats.welcomeEmailSent) {
    const pending = profileStats.withEmail - profileStats.welcomeEmailSent
    recommendations.push(`${pending} users haven't received welcome emails yet`)
  }

  if (profileStats.emailNotificationsEnabled < profileStats.withEmail * 0.8) {
    recommendations.push('Many users have email notifications disabled. Consider re-engagement campaign')
  }

  return recommendations
}

