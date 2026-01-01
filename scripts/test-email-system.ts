#!/usr/bin/env tsx
/**
 * Test Email System Script
 * 
 * Comprehensive test script to verify email system is working correctly
 * 
 * Usage: tsx scripts/test-email-system.ts [email]
 * 
 * Tests:
 * 1. Configuration check (BREVO_API_KEY, CRON_SECRET)
 * 2. Test email sending via /api/test-email
 * 3. Email diagnostics via /api/admin/email-diagnostics
 * 4. Cron job test (if CRON_SECRET is set)
 */

import * as dotenv from 'dotenv'
import * as readline from 'readline'

// Load environment variables
dotenv.config({ path: '.env.local' })

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'http://localhost:3000'

const BREVO_API_KEY = process.env.BREVO_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

function logResult(result: TestResult) {
  results.push(result)
  const icon = result.passed ? '✅' : '❌'
  console.log(`${icon} ${result.name}: ${result.message}`)
  if (result.details && !result.passed) {
    console.log(`   Details:`, JSON.stringify(result.details, null, 2))
  }
}

async function testConfiguration(): Promise<void> {
  console.log('\n📋 Testing Configuration...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Test BREVO_API_KEY
  if (BREVO_API_KEY) {
    logResult({
      name: 'BREVO_API_KEY',
      passed: true,
      message: `Configured (${BREVO_API_KEY.length} characters)`,
    })
  } else {
    logResult({
      name: 'BREVO_API_KEY',
      passed: false,
      message: 'Not configured',
      details: { error: 'BREVO_API_KEY environment variable is missing' },
    })
  }

  // Test CRON_SECRET
  if (CRON_SECRET) {
    logResult({
      name: 'CRON_SECRET',
      passed: true,
      message: `Configured (${CRON_SECRET.length} characters)`,
    })
  } else {
    logResult({
      name: 'CRON_SECRET',
      passed: false,
      message: 'Not configured (optional for testing)',
    })
  }

  // Test BASE_URL
  logResult({
    name: 'BASE_URL',
    passed: !!BASE_URL,
    message: BASE_URL || 'Not configured',
  })
}

async function testEmailSending(testEmail: string, adminToken?: string): Promise<void> {
  console.log('\n📧 Testing Email Sending...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (!testEmail) {
    logResult({
      name: 'Email Sending',
      passed: false,
      message: 'No test email provided',
      details: { error: 'Provide email as argument: tsx scripts/test-email-system.ts your@email.com' },
    })
    return
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`
    }

    const response = await fetch(`${BASE_URL}/api/test-email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: testEmail,
        name: 'Test User',
      }),
    })

    const data = await response.json()

    if (response.ok && data.success) {
      logResult({
        name: 'Email Sending',
        passed: true,
        message: `Test email sent successfully to ${testEmail}`,
        details: {
          messageId: data.result?.messageId,
          latency: data.diagnostics?.latency,
        },
      })
    } else {
      logResult({
        name: 'Email Sending',
        passed: false,
        message: data.error || 'Failed to send email',
        details: data,
      })
    }
  } catch (error: any) {
    logResult({
      name: 'Email Sending',
      passed: false,
      message: `Request failed: ${error.message}`,
      details: { error: error.message, stack: error.stack },
    })
  }
}

async function testEmailDiagnostics(adminToken?: string): Promise<void> {
  console.log('\n🔍 Testing Email Diagnostics...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const headers: Record<string, string> = {}

    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`
    } else {
      logResult({
        name: 'Email Diagnostics',
        passed: false,
        message: 'Admin token required for diagnostics',
        details: { error: 'Provide admin token to test diagnostics endpoint' },
      })
      return
    }

    const response = await fetch(`${BASE_URL}/api/admin/email-diagnostics`, {
      method: 'GET',
      headers,
    })

    const data = await response.json()

    if (response.ok) {
      logResult({
        name: 'Email Diagnostics',
        passed: true,
        message: 'Diagnostics endpoint accessible',
        details: {
          health: data.health,
          emailStats: data.statistics?.emails,
          recommendations: data.recommendations,
        },
      })

      // Print detailed stats
      if (data.statistics?.emails) {
        const stats = data.statistics.emails
        console.log(`\n   Email Statistics:`)
        console.log(`   - Total: ${stats.total}`)
        console.log(`   - Sent: ${stats.sent}`)
        console.log(`   - Failed: ${stats.failed}`)
        console.log(`   - Last 24h: ${stats.last24Hours.sent} sent, ${stats.last24Hours.failed} failed`)
      }

      if (data.recommendations && data.recommendations.length > 0) {
        console.log(`\n   Recommendations:`)
        data.recommendations.forEach((rec: string) => {
          console.log(`   - ${rec}`)
        })
      }
    } else {
      logResult({
        name: 'Email Diagnostics',
        passed: false,
        message: data.error || 'Failed to get diagnostics',
        details: data,
      })
    }
  } catch (error: any) {
    logResult({
      name: 'Email Diagnostics',
      passed: false,
      message: `Request failed: ${error.message}`,
      details: { error: error.message },
    })
  }
}

async function testCronJob(): Promise<void> {
  console.log('\n⏰ Testing Cron Job...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (!CRON_SECRET) {
    logResult({
      name: 'Cron Job',
      passed: false,
      message: 'CRON_SECRET not configured',
      details: { error: 'Cannot test cron job without CRON_SECRET' },
    })
    return
  }

  try {
    const response = await fetch(`${BASE_URL}/api/cron/email-notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    })

    const data = await response.json()

    if (response.ok) {
      logResult({
        name: 'Cron Job',
        passed: true,
        message: 'Cron endpoint accessible',
        details: {
          results: data.results,
          timestamp: data.timestamp,
        },
      })

      if (data.results) {
        console.log(`\n   Cron Results:`)
        console.log(`   - Welcome: ${data.results.welcomeEmails?.sent || 0} sent, ${data.results.welcomeEmails?.failed || 0} failed`)
        console.log(`   - Inactivity: ${data.results.inactivityEmails?.sent || 0} sent, ${data.results.inactivityEmails?.failed || 0} failed`)
        console.log(`   - Spaced Repetition: ${data.results.spacedRepetitionEmails?.sent || 0} sent, ${data.results.spacedRepetitionEmails?.failed || 0} failed`)
        console.log(`   - Roadmap: ${data.results.roadmapEmails?.sent || 0} sent, ${data.results.roadmapEmails?.failed || 0} failed`)
        
        if (data.results.errors && data.results.errors.length > 0) {
          console.log(`\n   Errors:`)
          data.results.errors.slice(0, 5).forEach((err: string) => {
            console.log(`   - ${err}`)
          })
        }
      }
    } else {
      logResult({
        name: 'Cron Job',
        passed: false,
        message: data.error || 'Cron endpoint failed',
        details: data,
      })
    }
  } catch (error: any) {
    logResult({
      name: 'Cron Job',
      passed: false,
      message: `Request failed: ${error.message}`,
      details: { error: error.message },
    })
  }
}

function printSummary(): void {
  console.log('\n📊 Test Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const passed = results.filter(r => r.passed).length
  const total = results.length
  
  console.log(`Total Tests: ${total}`)
  console.log(`Passed: ${passed} ✅`)
  console.log(`Failed: ${total - passed} ${total - passed > 0 ? '❌' : ''}`)
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Email system is configured correctly.')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.')
    console.log('\nNext Steps:')
    console.log('1. Check environment variables in Vercel dashboard')
    console.log('2. Verify BREVO_API_KEY is valid in Brevo dashboard')
    console.log('3. Check server logs for detailed error messages')
    console.log('4. Test email sending manually: POST /api/test-email')
  }
}

async function main() {
  console.log('🧪 Email System Test Suite')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`BREVO_API_KEY: ${BREVO_API_KEY ? '✅ Set' : '❌ Not set'}`)
  console.log(`CRON_SECRET: ${CRON_SECRET ? '✅ Set' : '❌ Not set'}`)

  const testEmail = process.argv[2]

  // Run tests
  await testConfiguration()
  
  if (testEmail) {
    // For test email, we need admin token - prompt user
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const question = (query: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(query, resolve)
      })
    }

    console.log('\n💡 Note: Admin token required for test-email and diagnostics endpoints')
    console.log('   You can skip by pressing Enter (tests will be marked as skipped)')
    
    const adminToken = await question('\nEnter admin token (or press Enter to skip): ')
    rl.close()

    if (adminToken) {
      await testEmailSending(testEmail, adminToken)
      await testEmailDiagnostics(adminToken)
    } else {
      logResult({
        name: 'Email Sending',
        passed: false,
        message: 'Skipped (admin token required)',
      })
      logResult({
        name: 'Email Diagnostics',
        passed: false,
        message: 'Skipped (admin token required)',
      })
    }
  } else {
    logResult({
      name: 'Email Sending',
      passed: false,
      message: 'Skipped (no email provided)',
      details: { info: 'Provide email as argument: tsx scripts/test-email-system.ts your@email.com' },
    })
  }

  await testCronJob()

  printSummary()
}

main().catch((error) => {
  console.error('❌ Test suite failed:', error)
  process.exit(1)
})

