#!/usr/bin/env npx tsx
/**
 * Cleanup Orphaned Data Script
 *
 * Run this script to find and delete data from collections
 * that don't belong to the valid user.
 *
 * Usage:
 *   npx tsx scripts/cleanup-orphaned-data.ts
 */

// Load environment variables from .env.local if dotenv is available
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv')
  const { resolve } = require('path')
  const result = dotenv.config({ path: resolve(process.cwd(), '.env.local') })
  if (result.error) {
    console.warn('Warning: Could not load .env.local:', result.error.message)
  }
} catch (error) {
  // dotenv not installed, use existing env vars
  console.log('Note: dotenv not found, using existing environment variables')
}

// Initialize Firebase Admin directly
import admin from 'firebase-admin'

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  let projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (serviceAccount) {
    try {
      const serviceAccountJson = JSON.parse(serviceAccount)
      // Extract project ID from service account if not set
      if (!projectId && serviceAccountJson.project_id) {
        projectId = serviceAccountJson.project_id
      }

      if (!projectId) {
        console.error('❌ Project ID is required. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID or include project_id in service account')
        process.exit(1)
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
        projectId: projectId,
      })
    } catch (parseError) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY')
      console.error('   Make sure it is valid JSON')
      process.exit(1)
    }
  } else {
    if (!projectId) {
      console.error('❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID is required')
      console.error('   Or set FIREBASE_SERVICE_ACCOUNT_KEY with project_id')
      process.exit(1)
    }
    // Try to use application default credentials
    admin.initializeApp({
      projectId: projectId,
    })
  }
}

// Valid user ID - only data belonging to this user will be kept
const VALID_USER = 'FTMrL1JxzzSVXk64DxnOnAdBZCi1'

// Collections that reference user_id or userId
const collections = [
  { name: 'interview_sessions', field: 'user_id' },
  { name: 'profile_quota', field: 'user_id' },
  { name: 'payment_history', field: 'user_id' },
  { name: 'session_vectors', field: 'userId' },
  { name: 'performance_profiles', field: 'userId' },
  { name: 'problem_mastery', field: 'userId' },
  { name: 'user_learning_state', idIsUserId: true },
  { name: 'user_roadmaps', field: 'userId' },
  { name: 'usage_events', field: 'userId' },
]

async function main() {
  console.log('🧹 Orphaned Data Cleanup Script')
  console.log('================================')
  console.log(`Valid User ID: ${VALID_USER}`)
  console.log('')

  const db = admin.firestore()

  try {
    for (const col of collections) {
      const snap = await db.collection(col.name).get()
      const orphans = snap.docs.filter(doc => {
        const uid = col.idIsUserId ? doc.id : (col.field ? doc.data()[col.field] : undefined)
        return uid && uid !== VALID_USER
      })

      console.log(`${col.name}: ${orphans.length} orphans`)

      if (orphans.length > 0) {
        const batch = db.batch()
        orphans.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
        console.log('  Deleted!')
      }
    }
    console.log('\n✅ Done!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
