/**
 * Test Email Endpoint
 * 
 * POST /api/test-email
 * 
 * Tests Brevo email sending and creates email_notifications collection entry
 * 
 * Body: { email: string, userId?: string, name?: string }
 * 
 * This endpoint helps verify:
 * - BREVO_API_KEY is configured correctly
 * - Brevo API is accessible
 * - Email sending works
 * - email_notifications collection gets created
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { sendWelcomeEmail } from '@/lib/email'
import { verifyAdminAccess } from '@/lib/admin/middleware'

export async function POST(request: NextRequest) {
  try {
    // Verify admin access (or you can remove this if you want it open for testing)
    const authResult = await verifyAdminAccess(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    const body = await request.json()
    const { email, userId, name } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Use provided userId or generate a test one
    const testUserId = userId || `test_${Date.now()}`
    const displayName = name || 'Test User'

    console.log(`[Test Email] Testing email send to ${email}`)

    // Check if BREVO_API_KEY is configured
    const hasApiKey = !!process.env.BREVO_API_KEY
    if (!hasApiKey) {
      return NextResponse.json({
        success: false,
        error: 'BREVO_API_KEY not configured',
        diagnostics: {
          hasApiKey: false,
          apiKeyLength: 0,
        },
      }, { status: 500 })
    }

    // Test sending email
    const startTime = Date.now()
    const result = await sendWelcomeEmail(testUserId, email, displayName)
    const latency = Date.now() - startTime

    // Log to email_notifications regardless of success/failure
    // This ensures the collection gets created
    const notificationData = {
      user_id: testUserId,
      email_type: 'welcome',
      status: result.success ? 'sent' : 'failed',
      scheduled_at: new Date().toISOString(),
      sent_at: result.success ? new Date().toISOString() : undefined,
      created_at: new Date().toISOString(),
      error: result.error || undefined,
      source: 'test',
      test: true,
    }

    try {
      await adminDb.collection('email_notifications').add(notificationData)
      console.log(`[Test Email] Logged to email_notifications collection`)
    } catch (logError: any) {
      console.error(`[Test Email] Failed to log to email_notifications:`, logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Test email sent successfully! Check your inbox.' 
        : 'Failed to send test email',
      result: {
        messageId: result.messageId,
        error: result.error,
      },
      diagnostics: {
        hasApiKey: true,
        apiKeyLength: process.env.BREVO_API_KEY?.length || 0,
        latency: `${latency}ms`,
        emailSent: result.success,
        notificationLogged: true,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Test Email] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send test email',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

