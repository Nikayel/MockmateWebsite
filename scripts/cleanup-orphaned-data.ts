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

/**
 * The production project. This script must never run against it.
 *
 * It reads FIREBASE_SERVICE_ACCOUNT_KEY out of `.env.local`, which holds live credentials, and then
 * deletes every document in nine collections whose owner is not the one hardcoded user above. Run
 * as it was originally written, against the current `.env.local`, it would delete every real
 * customer's sessions, quota, and payment_history. It had no dry run, no confirmation, and no
 * project check: `main()` went straight to `batch.delete`.
 */
const PRODUCTION_PROJECT_ID = 'danuxx-42bf3'

/**
 * Deleting is opt-in. Without `--apply` this reports what it would remove and changes nothing,
 * because the useful half of this tool is the count and the dangerous half is the delete.
 */
const APPLY = process.argv.includes('--apply')

/**
 * Naming the project you are about to destroy is the point. An operator who has to type
 * CLEANUP_CONFIRM_PROJECT_ID=<id> cannot delete the wrong database by having the wrong shell open.
 */
const CONFIRMED_PROJECT_ID = process.env.CLEANUP_CONFIRM_PROJECT_ID

/** Fail closed before a single document is read. */
function assertSafeTarget(targetProjectId: string): void {
  if (targetProjectId === PRODUCTION_PROJECT_ID) {
    console.error(`❌ Refusing to run against production (${PRODUCTION_PROJECT_ID}).`)
    console.error('   This script keeps exactly one hardcoded user and deletes everyone else.')
    process.exit(1)
  }

  if (!APPLY) return

  if (!CONFIRMED_PROJECT_ID) {
    console.error('❌ --apply requires CLEANUP_CONFIRM_PROJECT_ID to name the target project.')
    console.error(`   Resolved project is "${targetProjectId}". Re-run with:`)
    console.error(`   CLEANUP_CONFIRM_PROJECT_ID=${targetProjectId} npx tsx scripts/cleanup-orphaned-data.ts --apply`)
    process.exit(1)
  }

  if (CONFIRMED_PROJECT_ID !== targetProjectId) {
    console.error(`❌ CLEANUP_CONFIRM_PROJECT_ID is "${CONFIRMED_PROJECT_ID}" but the credentials resolve to "${targetProjectId}".`)
    console.error('   Refusing to act on a project you did not name.')
    process.exit(1)
  }
}

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
  const db = admin.firestore()
  const targetProjectId = (db as unknown as { projectId?: string }).projectId
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    || 'unknown'

  assertSafeTarget(targetProjectId)

  console.log('🧹 Orphaned Data Cleanup Script')
  console.log('================================')
  console.log(`Project:       ${targetProjectId}`)
  console.log(`Valid User ID: ${VALID_USER}`)
  console.log(APPLY ? 'Mode:          APPLY (documents will be deleted)' : 'Mode:          DRY RUN (pass --apply to delete)')
  console.log('')

  try {
    let totalOrphans = 0

    for (const col of collections) {
      const snap = await db.collection(col.name).get()
      const orphans = snap.docs.filter(doc => {
        const uid = col.idIsUserId ? doc.id : (col.field ? doc.data()[col.field] : undefined)
        return uid && uid !== VALID_USER
      })

      totalOrphans += orphans.length
      console.log(`${col.name}: ${orphans.length} orphans`)

      if (orphans.length > 0 && APPLY) {
        const batch = db.batch()
        orphans.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
        console.log('  Deleted!')
      }
    }

    console.log(
      APPLY
        ? `\n✅ Done. Deleted ${totalOrphans} documents.`
        : `\n✅ Dry run complete. ${totalOrphans} documents WOULD be deleted. Nothing was changed.`
    )
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
