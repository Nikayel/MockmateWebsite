/**
 * Knowledge Base Seeder
 *
 * Seeds the RAG vector database with DSA patterns, company knowledge,
 * and other reference materials for retrieval.
 */

import { getHybridProvider } from '../embeddings/hybrid-provider'
import { vectorDB } from '../vectordb'
import type { VectorDocument } from '../types'
import type { KnowledgeDocument, SeedingProgress, KnowledgeType } from './types'
import { DSA_PATTERN_KNOWLEDGE, patternKnowledgeToDocument } from './dsa-knowledge'
import { COMPANY_INTERVIEW_KNOWLEDGE, companyKnowledgeToDocument } from './company-knowledge'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * Knowledge seeder class for managing the RAG knowledge base
 */
export class KnowledgeBaseSeeder {
  private embeddingProvider = getHybridProvider()
  private progress: SeedingProgress

  constructor() {
    this.progress = this.createInitialProgress()
  }

  /**
   * Create initial seeding progress
   */
  private createInitialProgress(): SeedingProgress {
    return {
      totalDocuments: 0,
      processedDocuments: 0,
      successfulDocuments: 0,
      failedDocuments: 0,
      errors: [],
      startedAt: new Date(),
      status: 'pending',
    }
  }

  /**
   * Seed all knowledge categories
   */
  async seedAll(options: {
    force?: boolean  // Force re-seed even if already seeded
    categories?: ('dsa-patterns' | 'company-knowledge' | 'interview-tips')[]
  } = {}): Promise<SeedingProgress> {
    const categories = options.categories || ['dsa-patterns', 'company-knowledge', 'interview-tips']

    this.progress = this.createInitialProgress()
    this.progress.status = 'in_progress'

    console.log('[Seeder] Starting knowledge base seeding...')
    console.log('[Seeder] Categories:', categories.join(', '))

    try {
      // Check if already seeded (unless force is true)
      if (!options.force) {
        const alreadySeeded = await this.checkIfSeeded()
        if (alreadySeeded) {
          console.log('[Seeder] Knowledge base already seeded. Use force=true to re-seed.')
          this.progress.status = 'completed'
          return this.progress
        }
      }

      // Collect all documents to seed
      const documents: KnowledgeDocument[] = []

      if (categories.includes('dsa-patterns')) {
        documents.push(...this.createDSAPatternDocuments())
      }

      if (categories.includes('company-knowledge')) {
        documents.push(...this.createCompanyKnowledgeDocuments())
      }

      if (categories.includes('interview-tips')) {
        documents.push(...this.createInterviewTipDocuments())
      }

      this.progress.totalDocuments = documents.length
      console.log(`[Seeder] Total documents to seed: ${documents.length}`)

      // Process documents in batches
      const batchSize = 10
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize)
        await this.seedBatch(batch)

        console.log(`[Seeder] Progress: ${this.progress.processedDocuments}/${this.progress.totalDocuments}`)
      }

      // Mark seeding complete
      await this.markSeeded()

      this.progress.status = 'completed'
      this.progress.completedAt = new Date()

      console.log('[Seeder] Seeding completed successfully!')
      console.log(`[Seeder] Success: ${this.progress.successfulDocuments}, Failed: ${this.progress.failedDocuments}`)

    } catch (error) {
      console.error('[Seeder] Seeding failed:', error)
      this.progress.status = 'failed'
      this.progress.errors.push({
        documentId: 'general',
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return this.progress
  }

  /**
   * Seed a batch of documents
   */
  private async seedBatch(documents: KnowledgeDocument[]): Promise<void> {
    // Generate embeddings for all documents in batch
    const texts = documents.map(d => d.content)
    const embeddings = await this.embeddingProvider.generateEmbeddings(texts)

    // Create vector documents
    const vectorDocs: VectorDocument[] = documents.map((doc, index) => ({
      id: doc.id,
      vector: embeddings[index],
      text: doc.content,
      metadata: {
        type: 'knowledge',
        knowledgeType: doc.type,
        title: doc.title,
        ...doc.metadata,
        createdAt: doc.createdAt.toISOString(),
      },
    }))

    // Store in vector DB
    try {
      await vectorDB.upsert(vectorDocs)

      // Also store metadata in Firestore for reference
      const batch = adminDb.batch()
      for (const doc of documents) {
        const ref = adminDb.collection('knowledge_base').doc(doc.id)
        batch.set(ref, {
          id: doc.id,
          type: doc.type,
          title: doc.title,
          content: doc.content,
          metadata: doc.metadata,
          createdAt: Timestamp.fromDate(doc.createdAt),
          updatedAt: Timestamp.fromDate(doc.updatedAt),
        })
      }
      await batch.commit()

      this.progress.successfulDocuments += documents.length
      this.progress.processedDocuments += documents.length

    } catch (error) {
      console.error('[Seeder] Batch failed:', error)
      this.progress.failedDocuments += documents.length
      this.progress.processedDocuments += documents.length

      for (const doc of documents) {
        this.progress.errors.push({
          documentId: doc.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  /**
   * Create DSA pattern knowledge documents
   */
  private createDSAPatternDocuments(): KnowledgeDocument[] {
    const now = new Date()

    return DSA_PATTERN_KNOWLEDGE.map(pattern => ({
      id: `dsa-pattern-${pattern.pattern}`,
      type: 'dsa-pattern' as KnowledgeType,
      title: pattern.displayName,
      content: patternKnowledgeToDocument(pattern),
      metadata: {
        pattern: pattern.pattern,
        patterns: [pattern.pattern, ...pattern.relatedPatterns],
        tags: [
          pattern.pattern,
          pattern.timeComplexity.typical,
          ...pattern.relatedPatterns,
        ],
        category: 'dsa',
        importance: 10,
        verified: true,
      },
      createdAt: now,
      updatedAt: now,
    }))
  }

  /**
   * Create company knowledge documents
   */
  private createCompanyKnowledgeDocuments(): KnowledgeDocument[] {
    const now = new Date()
    const documents: KnowledgeDocument[] = []

    for (const company of COMPANY_INTERVIEW_KNOWLEDGE) {
      // Main company document
      documents.push({
        id: `company-${company.companyId}`,
        type: 'company-info' as KnowledgeType,
        title: `${company.companyName} Interview Guide`,
        content: companyKnowledgeToDocument(company),
        metadata: {
          companyId: company.companyId,
          companyIds: [company.companyId],
          patterns: company.topPatterns.map(p => p.pattern),
          tags: [
            company.companyId,
            company.companyName.toLowerCase(),
            'interview',
            'guide',
          ],
          category: 'company',
          importance: 10,
          verified: true,
        },
        createdAt: now,
        updatedAt: now,
      })

      // Company-specific pattern documents
      for (const pattern of company.topPatterns) {
        documents.push({
          id: `company-pattern-${company.companyId}-${pattern.pattern}`,
          type: 'company-pattern' as KnowledgeType,
          title: `${company.companyName} - ${pattern.pattern} Tips`,
          content: `
# ${pattern.pattern} at ${company.companyName}

**Frequency:** ${pattern.frequency}% of interviews

## Tips for ${company.companyName}
${pattern.tips.map(t => `- ${t}`).join('\n')}

## Pattern Overview
The ${pattern.pattern} pattern appears in ${pattern.frequency}% of ${company.companyName} interviews.
This is a ${pattern.frequency >= 80 ? 'must-know' : pattern.frequency >= 60 ? 'very common' : 'common'} pattern.
          `.trim(),
          metadata: {
            companyId: company.companyId,
            pattern: pattern.pattern,
            frequency: pattern.frequency,
            tags: [company.companyId, pattern.pattern],
            category: 'company-pattern',
            importance: Math.ceil(pattern.frequency / 10),
            verified: true,
          },
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    return documents
  }

  /**
   * Create general interview tip documents
   */
  private createInterviewTipDocuments(): KnowledgeDocument[] {
    const now = new Date()

    const tips = [
      {
        id: 'interview-tip-communication',
        title: 'Communication During Coding Interviews',
        content: `
# Effective Communication in Coding Interviews

## Why Communication Matters
- Shows your thought process
- Helps interviewer follow along
- Allows for early feedback
- Demonstrates collaboration skills

## Best Practices
1. **Think Out Loud**: Verbalize your thought process
2. **Ask Clarifying Questions**: Never assume - verify requirements
3. **Discuss Trade-offs**: Compare different approaches before coding
4. **Explain Edge Cases**: Show you consider corner cases
5. **Test Your Solution**: Walk through examples verbally

## What to Say When Stuck
- "Let me think about this for a moment"
- "I'm considering approach X because..."
- "Could you give me a hint about..."
- "Let me try a different approach"

## Common Communication Mistakes
- Coding in silence
- Not asking clarifying questions
- Ignoring interviewer hints
- Not explaining your approach
        `.trim(),
        tags: ['communication', 'soft-skills', 'general'],
      },
      {
        id: 'interview-tip-time-management',
        title: 'Time Management in Coding Interviews',
        content: `
# Time Management Strategies

## Typical Interview Timeline (45-60 min)
- **5 min**: Read problem, ask questions
- **5 min**: Discuss approach
- **25-35 min**: Code the solution
- **5-10 min**: Test and optimize
- **5 min**: Questions for interviewer

## When You're Running Out of Time
1. Communicate with interviewer about time
2. Prioritize working solution over optimal
3. Mention optimizations you would make
4. Don't sacrifice correctness for speed

## Speed Tips
- Practice common patterns until automatic
- Use templates for standard problems
- Don't over-engineer edge cases initially
- Start with brute force if needed
        `.trim(),
        tags: ['time-management', 'strategy', 'general'],
      },
      {
        id: 'interview-tip-problem-solving',
        title: 'Problem-Solving Framework',
        content: `
# Systematic Problem-Solving Framework

## The UMPIRE Method
1. **U**nderstand: Clarify the problem
2. **M**atch: Identify patterns
3. **P**lan: Design your approach
4. **I**mplement: Write the code
5. **R**eview: Test and debug
6. **E**valuate: Analyze complexity

## Pattern Recognition
- Array problems → Hash map, two pointers
- Substring/subarray → Sliding window
- Sorted array → Binary search
- Tree problems → DFS/BFS
- Optimization → DP or Greedy

## When Stuck
1. Simplify the problem
2. Try examples by hand
3. Think about brute force first
4. Look for patterns in examples
5. Consider related problems you've solved
        `.trim(),
        tags: ['problem-solving', 'framework', 'general'],
      },
      {
        id: 'interview-tip-debugging',
        title: 'Debugging During Interviews',
        content: `
# Debugging Strategies

## Common Bug Sources
- Off-by-one errors
- Null/undefined handling
- Integer overflow
- Wrong variable references
- Incorrect loop bounds

## Systematic Debugging
1. Read error message carefully
2. Add print statements strategically
3. Trace through with simple input
4. Check boundary conditions
5. Verify variable values at key points

## Prevention Strategies
- Use meaningful variable names
- Keep functions small
- Test incrementally
- Handle edge cases explicitly
- Write clean, readable code
        `.trim(),
        tags: ['debugging', 'coding', 'general'],
      },
    ]

    return tips.map(tip => ({
      id: tip.id,
      type: 'interview-tip' as KnowledgeType,
      title: tip.title,
      content: tip.content,
      metadata: {
        tags: tip.tags,
        category: 'interview-tips',
        importance: 8,
        verified: true,
      },
      createdAt: now,
      updatedAt: now,
    }))
  }

  /**
   * Check if knowledge base has already been seeded
   */
  private async checkIfSeeded(): Promise<boolean> {
    try {
      const doc = await adminDb.collection('system_config').doc('knowledge_base').get()
      return doc.exists && doc.data()?.seeded === true
    } catch {
      return false
    }
  }

  /**
   * Mark knowledge base as seeded
   */
  private async markSeeded(): Promise<void> {
    await adminDb.collection('system_config').doc('knowledge_base').set({
      seeded: true,
      lastSeededAt: Timestamp.now(),
      documentCount: this.progress.successfulDocuments,
      version: '1.0.0',
    })
  }

  /**
   * Get current seeding progress
   */
  getProgress(): SeedingProgress {
    return { ...this.progress }
  }

  /**
   * Delete all knowledge base documents (for re-seeding)
   */
  async clearKnowledgeBase(): Promise<void> {
    console.log('[Seeder] Clearing knowledge base...')

    // Delete from Firestore
    const snapshot = await adminDb.collection('knowledge_base').get()
    const batch = adminDb.batch()
    snapshot.docs.forEach(doc => batch.delete(doc.ref))
    await batch.commit()

    // Reset seeding status
    await adminDb.collection('system_config').doc('knowledge_base').delete()

    console.log('[Seeder] Knowledge base cleared')
  }
}

/**
 * Singleton seeder instance
 */
let seederInstance: KnowledgeBaseSeeder | null = null

export function getKnowledgeBaseSeeder(): KnowledgeBaseSeeder {
  if (!seederInstance) {
    seederInstance = new KnowledgeBaseSeeder()
  }
  return seederInstance
}

/**
 * Seed the knowledge base (convenience function)
 */
export async function seedKnowledgeBase(options?: {
  force?: boolean
  categories?: ('dsa-patterns' | 'company-knowledge' | 'interview-tips')[]
}): Promise<SeedingProgress> {
  return getKnowledgeBaseSeeder().seedAll(options)
}

/**
 * Check if knowledge base is seeded
 */
export async function isKnowledgeBaseSeeded(): Promise<boolean> {
  try {
    const doc = await adminDb.collection('system_config').doc('knowledge_base').get()
    return doc.exists && doc.data()?.seeded === true
  } catch {
    return false
  }
}
