#!/usr/bin/env npx tsx
/**
 * Seed Knowledge Base Script
 *
 * Seeds the RAG knowledge base with company knowledge, DSA patterns, etc.
 * Uses the unified company knowledge source.
 *
 * Usage:
 *   npx tsx scripts/seed-knowledge-base.ts
 *   npx tsx scripts/seed-knowledge-base.ts --force  # Re-seed even if already seeded
 *   npx tsx scripts/seed-knowledge-base.ts --category company-knowledge  # Seed specific category
 *
 * Prerequisites:
 *   - PINECONE_API_KEY in .env.local or environment
 *   - GEMINI_API_KEY in .env.local or environment
 *   - Firebase Admin credentials configured
 */

// Load environment variables from .env.local
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require("dotenv")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { resolve } = require("path")
  const result = dotenv.config({ path: resolve(process.cwd(), ".env.local") })
  if (result.error) {
    console.warn("Warning: Could not load .env.local:", result.error.message)
  }
} catch {
  console.log("Note: dotenv not found, using existing environment variables")
}

// Initialize Firebase Admin directly (before any imports that use it)
import admin from "firebase-admin"

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  let projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (serviceAccount) {
    try {
      const serviceAccountJson = JSON.parse(serviceAccount)
      if (!projectId && serviceAccountJson.project_id) {
        projectId = serviceAccountJson.project_id
      }

      if (!projectId) {
        console.error(
          "❌ Project ID is required. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID or include project_id in service account"
        )
        process.exit(1)
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
        projectId: projectId,
      })
      console.log(`✅ Firebase Admin initialized for project: ${projectId}`)
    } catch (error) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error)
      process.exit(1)
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      projectId: projectId,
    })
    console.log("✅ Firebase Admin initialized using GOOGLE_APPLICATION_CREDENTIALS")
  } else {
    console.error(
      "❌ Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS"
    )
    process.exit(1)
  }
}

// Now import the seeder (which uses firebase-admin internally)
import {
  seedKnowledgeBase,
  getKnowledgeBaseStatus,
  type KnowledgeCategory,
} from "../lib/rag/knowledge-base/seeder"

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes("--force")

  // Parse category flag
  const categoryIndex = args.indexOf("--category")
  const categories: KnowledgeCategory[] | undefined =
    categoryIndex !== -1 && args[categoryIndex + 1]
      ? [args[categoryIndex + 1] as KnowledgeCategory]
      : undefined

  console.log("\n=== Knowledge Base Seeding Script ===\n")

  // Check current status
  console.log("Checking current knowledge base status...")
  const status = await getKnowledgeBaseStatus()

  console.log(`\nCurrent Status:`)
  console.log(`  Seeded: ${status.seeded}`)
  console.log(`  Total Documents: ${status.totalDocuments}`)
  console.log(`  Version: ${status.version}`)
  console.log(`  Needs Sync: ${status.needsSync}`)
  console.log(`  Last Seeded: ${status.lastSeededAt?.toISOString() || "Never"}`)

  console.log(`\nCategories:`)
  for (const cat of status.categories) {
    const syncStatus = cat.needsSync ? "⚠️  NEEDS SYNC" : "✅"
    console.log(
      `  ${syncStatus} ${cat.category}: ${cat.documentCount} docs (source: ${cat.sourceCount})`
    )
  }

  if (status.seeded && !force && !status.needsSync) {
    console.log("\n✅ Knowledge base is already seeded and up to date.")
    console.log("   Use --force to re-seed anyway.")
    return
  }

  console.log(`\n${force ? "Force re-seeding" : "Seeding"} knowledge base...`)
  if (categories) {
    console.log(`  Categories: ${categories.join(", ")}`)
  }

  const startTime = Date.now()
  const progress = await seedKnowledgeBase({ force, categories })
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  console.log(`\n=== Seeding Complete ===`)
  console.log(`  Status: ${progress.status}`)
  console.log(`  Total: ${progress.totalDocuments}`)
  console.log(`  Successful: ${progress.successfulDocuments}`)
  console.log(`  Failed: ${progress.failedDocuments}`)
  console.log(`  Duration: ${duration}s`)

  if (progress.errors.length > 0) {
    console.log(`\n⚠️ Errors:`)
    for (const err of progress.errors.slice(0, 10)) {
      console.log(`  - ${err.documentId}: ${err.error}`)
    }
    if (progress.errors.length > 10) {
      console.log(`  ... and ${progress.errors.length - 10} more errors`)
    }
  }

  // Show final status
  const finalStatus = await getKnowledgeBaseStatus()
  console.log(`\n=== Final Status ===`)
  console.log(`  Total Documents: ${finalStatus.totalDocuments}`)
  console.log(`  Version: ${finalStatus.version}`)
  console.log(`  Needs Sync: ${finalStatus.needsSync}`)
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
