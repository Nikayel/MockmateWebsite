#!/usr/bin/env npx ts-node
/**
 * Pinecone Setup Script
 *
 * Run this script once to create the Pinecone index:
 *   npx ts-node scripts/setup-pinecone.ts
 *
 * Or with environment variables:
 *   PINECONE_API_KEY=your_key npx ts-node scripts/setup-pinecone.ts
 *
 * Prerequisites:
 *   - PINECONE_API_KEY in .env.local or environment
 */

// Load environment variables from .env.local if dotenv is available
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv')
    const { resolve } = require('path')
    dotenv.config({ path: resolve(process.cwd(), '.env.local') })
} catch {
    // dotenv not installed, use existing env vars
    console.log('Note: dotenv not found, using existing environment variables')
}

import { Pinecone } from '@pinecone-database/pinecone'

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'mockmate-rag'
const DIMENSION = 256 // Matches TF-IDF embedding dimension

async function main() {
    console.log('🚀 Pinecone Setup Script')
    console.log('========================\n')

    // Check for API key
    const apiKey = process.env.PINECONE_API_KEY
    if (!apiKey) {
        console.error('❌ PINECONE_API_KEY not found in environment')
        console.log('\nPlease set PINECONE_API_KEY in your .env.local file:')
        console.log('  PINECONE_API_KEY=your_api_key_here')
        process.exit(1)
    }

    console.log('✅ API key found')

    // Initialize Pinecone client
    const pinecone = new Pinecone({ apiKey })

    // List existing indexes
    console.log('\n📋 Checking existing indexes...')
    const indexList = await pinecone.listIndexes()
    console.log('   Existing indexes:', indexList.indexes?.map(i => i.name).join(', ') || 'none')

    // Check if our index exists
    const existingIndex = indexList.indexes?.find(idx => idx.name === INDEX_NAME)

    if (existingIndex) {
        console.log(`\n✅ Index '${INDEX_NAME}' already exists`)
        console.log('   Dimension:', existingIndex.dimension)
        console.log('   Metric:', existingIndex.metric)
        console.log('   Host:', existingIndex.host)

        // Get stats
        const index = pinecone.index(INDEX_NAME)
        const stats = await index.describeIndexStats()
        console.log('\n📊 Index Statistics:')
        console.log('   Total vectors:', stats.totalRecordCount || 0)
        if (stats.namespaces) {
            console.log('   Namespaces:')
            for (const [ns, data] of Object.entries(stats.namespaces)) {
                console.log(`     - ${ns}: ${data.recordCount} vectors`)
            }
        }
    } else {
        console.log(`\n📝 Creating index '${INDEX_NAME}'...`)

        await pinecone.createIndex({
            name: INDEX_NAME,
            dimension: DIMENSION,
            metric: 'cosine',
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1', // Free tier is limited to us-east-1
                },
            },
        })

        console.log('   ⏳ Waiting for index to be ready...')

        // Wait for index to be ready
        let ready = false
        let attempts = 0
        while (!ready && attempts < 60) {
            const description = await pinecone.describeIndex(INDEX_NAME)
            ready = description.status?.ready || false
            if (!ready) {
                process.stdout.write('.')
                await new Promise(resolve => setTimeout(resolve, 2000))
                attempts++
            }
        }
        console.log('')

        if (ready) {
            console.log(`\n✅ Index '${INDEX_NAME}' created successfully!`)
        } else {
            console.log(`\n⚠️ Index creation timeout - check Pinecone dashboard`)
        }
    }

    // Provide next steps
    console.log('\n📋 Next Steps:')
    console.log('   1. Add to your .env.local:')
    console.log(`      PINECONE_API_KEY=${apiKey.substring(0, 8)}...`)
    console.log(`      PINECONE_INDEX_NAME=${INDEX_NAME}`)
    console.log('   2. Restart your dev server')
    console.log('   3. New embeddings will automatically use Pinecone')
    console.log('')
}

main().catch(error => {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
})
