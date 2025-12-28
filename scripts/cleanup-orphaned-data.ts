/**
 * Cleanup Orphaned Data Script
 *
 * Run this script to find and delete data from collections
 * where the parent profile no longer exists.
 *
 * Usage:
 *   npx ts-node scripts/cleanup-orphaned-data.ts [--dry-run]
 *
 * Options:
 *   --dry-run  Show what would be deleted without actually deleting
 */

import * as admin from 'firebase-admin'

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined

if (!admin.apps.length) {
  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

const db = admin.firestore()

// Collections that reference user_id or userId
const COLLECTIONS_TO_CLEAN = [
  { name: 'interview_sessions', field: 'user_id' },
  { name: 'profile_quota', field: 'user_id' },
  { name: 'payment_history', field: 'user_id' },
  { name: 'email_notifications', field: 'user_id' },
  { name: 'promo_code_usage', field: 'userId' },
  { name: 'sessions', field: 'userId' },
  { name: 'session_vectors', field: 'userId' },
  { name: 'performance_profiles', field: 'userId' },
  { name: 'analytics', field: 'userId' },
  { name: 'user_learning_state', field: null, idIsUserId: true }, // doc ID = userId
  { name: 'problem_mastery', field: 'userId' },
  { name: 'user_roadmaps', field: 'userId' },
]

interface OrphanedDoc {
  collection: string
  docId: string
  userId: string
}

async function getValidUserIds(): Promise<Set<string>> {
  console.log('📋 Fetching all valid profile IDs...')
  const profilesSnapshot = await db.collection('profiles').get()
  const validIds = new Set<string>()

  profilesSnapshot.docs.forEach(doc => {
    validIds.add(doc.id)
  })

  console.log(`   Found ${validIds.size} valid profiles`)
  return validIds
}

async function findOrphanedDocuments(
  validUserIds: Set<string>
): Promise<OrphanedDoc[]> {
  const orphaned: OrphanedDoc[] = []

  for (const col of COLLECTIONS_TO_CLEAN) {
    console.log(`\n🔍 Scanning collection: ${col.name}`)

    try {
      const snapshot = await db.collection(col.name).get()
      let orphanCount = 0

      for (const doc of snapshot.docs) {
        let userId: string | undefined

        if (col.idIsUserId) {
          // Document ID is the user ID
          userId = doc.id
        } else if (col.field) {
          // User ID is in a field
          userId = doc.data()[col.field]
        }

        if (userId && !validUserIds.has(userId)) {
          orphaned.push({
            collection: col.name,
            docId: doc.id,
            userId: userId,
          })
          orphanCount++
        }
      }

      console.log(`   Total docs: ${snapshot.size}, Orphaned: ${orphanCount}`)
    } catch (error) {
      console.log(`   ⚠️  Error scanning: ${error}`)
    }
  }

  return orphaned
}

async function deleteOrphanedDocuments(
  orphaned: OrphanedDoc[],
  dryRun: boolean
): Promise<void> {
  if (orphaned.length === 0) {
    console.log('\n✅ No orphaned documents found!')
    return
  }

  console.log(`\n🗑️  ${dryRun ? '[DRY RUN] Would delete' : 'Deleting'} ${orphaned.length} orphaned documents...`)

  // Group by collection for batch deletes
  const byCollection = new Map<string, OrphanedDoc[]>()
  for (const doc of orphaned) {
    const existing = byCollection.get(doc.collection) || []
    existing.push(doc)
    byCollection.set(doc.collection, existing)
  }

  // Print summary by collection
  console.log('\nSummary by collection:')
  for (const [collection, docs] of byCollection) {
    console.log(`   ${collection}: ${docs.length} documents`)
  }

  if (dryRun) {
    console.log('\n📝 Dry run - no documents were deleted')
    console.log('   Run without --dry-run to actually delete')
    return
  }

  // Delete in batches of 500 (Firestore limit)
  const BATCH_SIZE = 500
  let deleted = 0

  for (let i = 0; i < orphaned.length; i += BATCH_SIZE) {
    const batch = db.batch()
    const chunk = orphaned.slice(i, i + BATCH_SIZE)

    for (const doc of chunk) {
      const ref = db.collection(doc.collection).doc(doc.docId)
      batch.delete(ref)
    }

    await batch.commit()
    deleted += chunk.length
    console.log(`   Deleted ${deleted}/${orphaned.length}`)
  }

  console.log(`\n✅ Successfully deleted ${deleted} orphaned documents`)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('🧹 Orphaned Data Cleanup Script')
  console.log('================================')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : '⚠️  LIVE MODE - will delete data'}`)
  console.log('')

  try {
    // Step 1: Get valid user IDs
    const validUserIds = await getValidUserIds()

    // Step 2: Find orphaned documents
    const orphaned = await findOrphanedDocuments(validUserIds)

    // Step 3: Delete orphaned documents
    await deleteOrphanedDocuments(orphaned, dryRun)

    // Print orphaned user IDs for reference
    if (orphaned.length > 0) {
      const orphanedUserIds = new Set(orphaned.map(o => o.userId))
      console.log(`\n📋 Orphaned user IDs (${orphanedUserIds.size} unique):`)
      for (const uid of orphanedUserIds) {
        console.log(`   - ${uid}`)
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
