#!/usr/bin/env npx ts-node
/**
 * Vectorize Problems Script
 *
 * Run this script to vectorize all DSA problems, company questions, and pattern knowledge:
 *   npx ts-node scripts/vectorize-problems.ts
 *
 * Prerequisites:
 *   - PINECONE_API_KEY in .env.local or environment (if using Pinecone)
 *   - Firebase Admin credentials configured
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

// Check required environment variables
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error('❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID is required')
    console.error('   Please set it in your .env.local file')
    process.exit(1)
}

// Initialize Firebase Admin first (this must happen before any imports that use it)
// Import with side effects to trigger initialization
import '../lib/firebase-admin'
import admin from '../lib/firebase-admin'

import { vectorizeAllProblems, getVectorizationStatus } from '../lib/rag/problem-vectorization'
import { isPineconeEnabled, getVectorDBProvider } from '../lib/rag/vectordb'

async function main() {
    // Wait a moment for Firebase to initialize, then verify
    await new Promise(resolve => setTimeout(resolve, 100))
    if (!admin.apps.length) {
        console.error('❌ Firebase Admin failed to initialize')
        console.error('   Please check your FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS')
        process.exit(1)
    }
    console.log('🚀 Vectorize Problems Script')
    console.log('============================\n')

    // Check vector DB provider
    const provider = getVectorDBProvider()
    const usingPinecone = isPineconeEnabled()
    
    console.log(`📦 Vector DB: ${provider.toUpperCase()}`)
    if (usingPinecone) {
        console.log('   ✅ Using Pinecone for vector storage')
    } else {
        console.log('   ℹ️  Using Firestore for vector storage')
    }

    // Check current status
    console.log('\n📊 Checking current vectorization status...')
    try {
        const status = await getVectorizationStatus()
        console.log(`   Problems: ${status.problemCount}`)
        console.log(`   Companies: ${status.companyCount}`)
        console.log(`   Pattern Knowledge: ${status.patternCount}`)
        
        if (status.hasProblems && status.hasCompanies && status.hasPatternKnowledge) {
            console.log('\n⚠️  Vectors already exist. This will update/overwrite existing vectors.')
        }
    } catch (error) {
        console.log('   ⚠️  Could not check status:', error instanceof Error ? error.message : 'Unknown error')
    }

    // Confirm before proceeding
    console.log('\n⏳ Starting vectorization...')
    console.log('   This may take several minutes depending on the number of problems.\n')

    const startTime = Date.now()

    // Run vectorization with progress callback
    const result = await vectorizeAllProblems((stage, current, total, item) => {
        const percentage = Math.round((current / total) * 100)
        const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5))
        process.stdout.write(`\r   [${bar}] ${percentage}% - ${stage}: ${current}/${total} ${item ? `(${item})` : ''}`)
    })

    console.log('\n') // New line after progress

    const durationSeconds = Math.round(result.durationMs / 1000)
    const durationMinutes = Math.floor(durationSeconds / 60)
    const remainingSeconds = durationSeconds % 60

    // Display results
    console.log('\n✅ Vectorization Complete!')
    console.log('==========================\n')
    console.log('📊 Results:')
    console.log(`   Problems: ${result.vectorizedProblems}/${result.totalProblems}`)
    console.log(`   Companies: ${result.vectorizedCompanies}/${result.totalCompanies}`)
    console.log(`   Pattern Knowledge: ${result.vectorizedPatternKnowledge}/${result.totalPatternKnowledge}`)
    console.log(`   Duration: ${durationMinutes}m ${remainingSeconds}s`)
    
    if (result.errors.length > 0) {
        console.log(`\n⚠️  Errors: ${result.errors.length}`)
        console.log('   First 5 errors:')
        result.errors.slice(0, 5).forEach((error, i) => {
            console.log(`   ${i + 1}. ${error}`)
        })
        if (result.errors.length > 5) {
            console.log(`   ... and ${result.errors.length - 5} more errors`)
        }
    } else {
        console.log('\n✅ No errors!')
    }

    // Final status check
    console.log('\n📊 Final Status:')
    try {
        const finalStatus = await getVectorizationStatus()
        console.log(`   Problems: ${finalStatus.problemCount}`)
        console.log(`   Companies: ${finalStatus.companyCount}`)
        console.log(`   Pattern Knowledge: ${finalStatus.patternCount}`)
    } catch (error) {
        console.log('   ⚠️  Could not verify final status')
    }

    console.log('\n🎉 Done! Your vectors are ready for RAG retrieval.\n')
}

main().catch(error => {
    console.error('\n❌ Vectorization failed:', error.message)
    if (error.stack) {
        console.error('\nStack trace:')
        console.error(error.stack)
    }
    process.exit(1)
})

