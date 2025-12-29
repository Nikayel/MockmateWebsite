#!/usr/bin/env tsx
/**
 * Test script to verify cron endpoints are working
 * Usage: tsx scripts/test-cron.ts [endpoint]
 * 
 * Endpoints:
 * - subscription-expiry: /api/cron/subscription-expiry
 * - email-notifications: /api/cron/email-notifications
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'https://codesparring.com';

const endpoint = process.argv[2] || 'subscription-expiry';
const endpointMap: Record<string, string> = {
  'subscription-expiry': '/api/cron/subscription-expiry',
  'email-notifications': '/api/cron/email-notifications',
  'expiry': '/api/cron/subscription-expiry',
  'email': '/api/cron/email-notifications',
};

const path = endpointMap[endpoint] || `/api/cron/${endpoint}`;
const url = `${BASE_URL}${path}`;

console.log('🔍 Testing Cron Endpoint');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`URL: ${url}`);
console.log(`CRON_SECRET: ${CRON_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!CRON_SECRET) {
  console.error('❌ ERROR: CRON_SECRET is not set in environment variables');
  console.error('   Please set CRON_SECRET in .env.local');
  process.exit(1);
}

async function testCron() {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Cron endpoint is working!');
      if (data.results) {
        console.log('\nResults Summary:');
        console.log(JSON.stringify(data.results, null, 2));
      }
    } else {
      console.log('\n❌ Cron endpoint returned an error');
    }
  } catch (error: any) {
    console.error('\n❌ Error testing cron endpoint:');
    console.error(error.message);
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Make sure your server is running or use your production URL');
      console.error('   Set NEXT_PUBLIC_APP_URL or VERCEL_URL in .env.local');
    }
    process.exit(1);
  }
}

testCron();

