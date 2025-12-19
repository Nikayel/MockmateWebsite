# RAG Implementation Plan for Skillon (MockMate)

## Table of Contents
1. [What is RAG? (Beginner's Guide)](#1-what-is-rag-beginners-guide)
2. [Current Platform Audit](#2-current-platform-audit)
3. [RAG Opportunities Identified](#3-rag-opportunities-identified)
4. [Detailed Implementation Plan](#4-detailed-implementation-plan)
5. [Architecture Design](#5-architecture-design)
6. [Priority Roadmap](#6-priority-roadmap)

---

## 1. What is RAG? (Beginner's Guide)

### The Problem with Pure Prompt Engineering

Currently, your platform uses **prompt engineering** - you craft detailed prompts and send them to AI models. The AI uses only:
- The system prompt you provide
- The conversation history
- Its pre-trained knowledge (training data cutoff)

**Limitations:**
- AI doesn't know your specific 200+ DSA problems
- AI doesn't remember user's past sessions
- AI can't learn from successful solutions by other users
- Context window is limited (can't send entire knowledge base)

### What is RAG?

**RAG = Retrieval-Augmented Generation**

```
Traditional Prompt Engineering:
┌─────────────┐     ┌─────────────┐
│   Prompt    │────▶│   AI/LLM    │────▶ Response
└─────────────┘     └─────────────┘

RAG (Retrieval-Augmented Generation):
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Query     │────▶│ Vector Database │     │   AI/LLM    │
└─────────────┘     │  (Find relevant │     │             │
                    │   documents)    │     │             │
                    └────────┬────────┘     │             │
                             │              │             │
                    ┌────────▼────────┐     │             │
                    │ Retrieved Docs  │────▶│   Enhanced  │────▶ Response
                    │ (Top K results) │     │   Prompt    │
                    └─────────────────┘     └─────────────┘
```

**How it works:**
1. **User asks a question** (or triggers an action)
2. **Retrieve relevant context** from your knowledge base using semantic search
3. **Augment the prompt** with retrieved information
4. **Generate response** using AI with the enhanced context

### Real Example for Skillon

**Without RAG (Current):**
```
User: "I'm stuck on the Two Sum problem"
AI: *Generic advice about Two Sum approach*
```

**With RAG (Enhanced):**
```
User: "I'm stuck on the Two Sum problem"

[RAG System]:
1. Search vector DB for "Two Sum" + user's code patterns
2. Retrieve: Similar problems solved, user's past attempts, common mistakes
3. Inject into prompt

AI: "I see you solved 'Three Sum' last week using a hashmap.
     Two Sum is simpler - same pattern. Looking at your code,
     you're iterating twice. Try storing seen values like you
     did in line 5 of your Three Sum solution..."
```

### Key RAG Components

| Component | Purpose | Example |
|-----------|---------|---------|
| **Embeddings** | Convert text to numbers (vectors) | "Two Sum" → [0.23, -0.45, 0.12, ...] |
| **Vector Database** | Store & search embeddings | Pinecone, Weaviate, ChromaDB |
| **Chunking** | Split large docs into pieces | Problem description → paragraphs |
| **Retrieval** | Find relevant chunks | Top 5 most similar documents |
| **Reranking** | Improve retrieval quality | Sort by relevance score |
| **Augmentation** | Add context to prompt | Inject retrieved docs |

---

## 2. Current Platform Audit

### 2.1 Current AI Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT AI USAGE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │   /api/chat │   │ /api/generate│   │    /api/rag     │  │
│  │             │   │   -feedback  │   │    (basic)      │  │
│  └──────┬──────┘   └──────┬───────┘   └────────┬────────┘  │
│         │                 │                     │           │
│         ▼                 ▼                     ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AI Provider Layer                       │   │
│  │  • Gemini 2.5 Flash (primary)                       │   │
│  │  • Deepseek (fallback)                              │   │
│  │  • Claude 3.5 Haiku (complex tasks)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Caching Layer                           │   │
│  │  • Memory cache (30min TTL)                         │   │
│  │  • Firestore cache (24hr chat, 7d feedback)         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Current AI Usage Points

| File | Purpose | RAG Opportunity? |
|------|---------|------------------|
| `/app/api/chat/route.ts` | Interview chat | ✅ HIGH - Personalize responses |
| `/app/api/generate-feedback/route.ts` | Performance scoring | ✅ HIGH - Compare with similar solutions |
| `/app/api/rag/route.ts` | Hints/recommendations | ✅ Already partial RAG - Enhance |
| `/lib/ai-providers.ts` | AI abstraction | ✅ Add vector retrieval layer |
| `/lib/scenarios.ts` | Problem database | ✅ Vectorize for semantic search |

### 2.3 Current Data Assets (Knowledge Base Candidates)

| Data Source | Location | Records | RAG Value |
|-------------|----------|---------|-----------|
| DSA Problems | `/lib/scenarios.ts` | 200+ | ⭐⭐⭐⭐⭐ |
| User Sessions | Firestore `sessions` | Per user | ⭐⭐⭐⭐⭐ |
| DSA Patterns | `/lib/types/dsa-patterns.ts` | 25+ | ⭐⭐⭐⭐ |
| User Solutions | Firestore (in sessions) | Per user | ⭐⭐⭐⭐ |
| Bug Fix Scenarios | `/lib/scenarios-realworld.ts` | 20+ | ⭐⭐⭐⭐ |
| Test Cases | In scenarios | 1000+ | ⭐⭐⭐ |
| Hints | In scenarios | 500+ | ⭐⭐⭐ |
| Common Mistakes | Not collected | N/A | ⭐⭐⭐⭐⭐ |
| LeetCode Solutions | External | 2500+ | ⭐⭐⭐⭐⭐ |

### 2.4 Current Limitations

1. **No Semantic Problem Search**
   - Users search by title only, not by concept
   - "Find problems using hashmap" doesn't work

2. **No Personalized Learning**
   - AI doesn't know user's strengths/weaknesses
   - Same hints for everyone

3. **No Solution Pattern Learning**
   - Can't show "how others solved this"
   - No code similarity detection

4. **Limited Context in Chat**
   - AI only sees current session
   - Doesn't know user's history

5. **No Adaptive Difficulty**
   - Problems suggested randomly
   - No skill-based progression

---

## 3. RAG Opportunities Identified

### 3.1 Priority Matrix

```
                    HIGH IMPACT
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │  QUICK WINS       │   STRATEGIC       │
    │  • Semantic       │   • Personalized  │
    │    Problem Search │     AI Tutor      │
    │  • Similar        │   • Adaptive      │
    │    Problem Finder │     Learning Path │
    │                   │   • Code Pattern  │
    │                   │     Recognition   │
LOW ├───────────────────┼───────────────────┤ HIGH
EFFORT                  │                   EFFORT
    │  NICE TO HAVE     │   FUTURE          │
    │  • Hint           │   • Multi-user    │
    │    Enhancement    │     Solution DB   │
    │  • FAQ/Help       │   • Real-time     │
    │    Chatbot        │     Collaboration │
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                   LOW IMPACT
```

### 3.2 RAG Use Cases (Detailed)

#### USE CASE 1: Semantic Problem Search ⭐⭐⭐⭐⭐
**Current:** Users search by title "Two Sum"
**With RAG:** Users search "find complement in array using hashmap"

```typescript
// Current approach
const results = scenarios.filter(s =>
  s.title.toLowerCase().includes(query)
);

// RAG approach
const queryEmbedding = await embed(query);
const results = await vectorDB.search({
  vector: queryEmbedding,
  topK: 10,
  filter: { difficulty: "medium" }
});
```

#### USE CASE 2: Personalized Interview Assistant ⭐⭐⭐⭐⭐
**Current:** AI gives generic interview advice
**With RAG:** AI knows user's history and tailors advice

```typescript
// Current chat prompt
const systemPrompt = `You are a tech interviewer...`;

// RAG-enhanced prompt
const userHistory = await vectorDB.search({
  vector: await embed(currentProblem),
  filter: { userId: user.id },
  topK: 5
});

const systemPrompt = `You are a tech interviewer.

USER'S LEARNING HISTORY:
- Solved: ${userHistory.solved.join(', ')}
- Struggled with: ${userHistory.struggled.join(', ')}
- Preferred patterns: ${userHistory.patterns.join(', ')}
- Common mistakes: ${userHistory.mistakes.join(', ')}

Tailor your guidance accordingly.`;
```

#### USE CASE 3: Smart Hint Generation ⭐⭐⭐⭐
**Current:** Static hints from scenario definition
**With RAG:** Dynamic hints based on user's code

```typescript
// Current hints
const hints = scenario.hints; // ["Use a hashmap", "Think about complements"]

// RAG-enhanced hints
const codeContext = await vectorDB.search({
  vector: await embed(userCode + userError),
  collection: "code_patterns",
  topK: 3
});

const dynamicHint = await generateAI({
  prompt: `User is stuck here: ${userCode}
           Error: ${userError}
           Similar solutions that worked: ${codeContext}
           Generate a personalized hint.`
});
```

#### USE CASE 4: Similar Problem Recommendations ⭐⭐⭐⭐
**Current:** Random or tag-based recommendations
**With RAG:** Semantic similarity recommendations

```typescript
// Retrieve problems similar to what user just solved
const currentEmbedding = await embed(solvedProblem.description);
const similar = await vectorDB.search({
  vector: currentEmbedding,
  filter: {
    difficulty: { $gte: user.skillLevel },
    id: { $not: solvedProblem.id }
  },
  topK: 5
});
```

#### USE CASE 5: Code Pattern Recognition ⭐⭐⭐⭐
**Current:** No code analysis
**With RAG:** Identify patterns in user's solution

```typescript
// Analyze user's code
const codeEmbedding = await embed(userCode);
const matchedPatterns = await vectorDB.search({
  vector: codeEmbedding,
  collection: "solution_patterns",
  topK: 3
});

// Feedback: "Your solution uses the 'sliding window' pattern correctly!"
```

#### USE CASE 6: Adaptive Learning Path ⭐⭐⭐⭐⭐
**Current:** Linear progression or random
**With RAG:** Personalized curriculum

```typescript
// Build learning path based on gaps
const userSkills = await analyzeUserHistory(userId);
const skillGaps = identifyGaps(userSkills);

const nextProblems = await vectorDB.search({
  vector: await embed(skillGaps.join(" ")),
  filter: {
    concepts: { $in: skillGaps },
    difficulty: userSkills.level
  },
  topK: 10
});

// Return ordered learning path
return buildCurriculum(nextProblems, userSkills);
```

#### USE CASE 7: Enhanced Feedback Generation ⭐⭐⭐⭐
**Current:** Generic feedback based on score
**With RAG:** Comparative feedback

```typescript
// Retrieve optimal solutions for comparison
const optimalSolutions = await vectorDB.search({
  vector: await embed(problemDescription),
  collection: "optimal_solutions",
  topK: 3
});

const feedback = await generateAI({
  prompt: `User's solution: ${userCode}
           Test results: ${testResults}
           Optimal approaches: ${optimalSolutions}

           Compare and provide specific improvement suggestions.`
});
```

---

## 4. Detailed Implementation Plan

### 4.1 Phase 1: Foundation (Week 1-2)

#### Task 1.1: Set Up Vector Database

**Recommended: Pinecone (Serverless)**
- Free tier: 1 index, 100K vectors
- Integrates well with Vercel
- Alternative: Weaviate Cloud, Supabase pgvector

```typescript
// /lib/vector-db.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

export const problemsIndex = pinecone.index('skillon-problems');
export const solutionsIndex = pinecone.index('skillon-solutions');
export const userHistoryIndex = pinecone.index('skillon-user-history');
```

#### Task 1.2: Create Embedding Service

```typescript
// /lib/embeddings.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// Batch processing for efficiency
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const results = await Promise.all(
    texts.map(text => model.embedContent(text))
  );
  return results.map(r => r.embedding.values);
}
```

#### Task 1.3: Vectorize Problem Database

```typescript
// /scripts/vectorize-problems.ts
import { scenarios } from '@/lib/scenarios';
import { generateEmbedding } from '@/lib/embeddings';
import { problemsIndex } from '@/lib/vector-db';

async function vectorizeProblems() {
  const vectors = [];

  for (const scenario of scenarios) {
    // Create rich text for embedding
    const text = `
      Title: ${scenario.title}
      Difficulty: ${scenario.difficulty}
      Type: ${scenario.type}
      Tags: ${scenario.tags?.join(', ')}
      Pattern: ${scenario.pattern || 'N/A'}
      Description: ${scenario.problemStatement}
      Concepts: ${extractConcepts(scenario)}
    `;

    const embedding = await generateEmbedding(text);

    vectors.push({
      id: scenario.id,
      values: embedding,
      metadata: {
        title: scenario.title,
        difficulty: scenario.difficulty,
        type: scenario.type,
        tags: scenario.tags,
        pattern: scenario.pattern,
        companies: scenario.companies
      }
    });
  }

  // Upsert in batches of 100
  await problemsIndex.upsert(vectors);
  console.log(`Vectorized ${vectors.length} problems`);
}
```

### 4.2 Phase 2: Core RAG Features (Week 3-4)

#### Task 2.1: Semantic Problem Search API

```typescript
// /app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embeddings';
import { problemsIndex } from '@/lib/vector-db';

export async function POST(req: NextRequest) {
  const { query, filters } = await req.json();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Search vector database
  const results = await problemsIndex.query({
    vector: queryEmbedding,
    topK: 20,
    includeMetadata: true,
    filter: filters // { difficulty: 'medium', type: 'dsa' }
  });

  return NextResponse.json({
    problems: results.matches.map(m => ({
      id: m.id,
      score: m.score,
      ...m.metadata
    }))
  });
}
```

#### Task 2.2: User Session Vectorization

```typescript
// /lib/user-vectors.ts
import { generateEmbedding } from '@/lib/embeddings';
import { userHistoryIndex } from '@/lib/vector-db';

export async function vectorizeSession(session: Session) {
  const sessionText = `
    Problem: ${session.scenarioTitle}
    Pattern: ${session.pattern}
    User's approach: ${extractApproach(session.code)}
    Outcome: ${session.feedback?.score >= 70 ? 'Success' : 'Struggled'}
    Mistakes: ${extractMistakes(session)}
    Duration: ${session.duration}
  `;

  const embedding = await generateEmbedding(sessionText);

  await userHistoryIndex.upsert([{
    id: `${session.userId}-${session.id}`,
    values: embedding,
    metadata: {
      userId: session.userId,
      scenarioId: session.scenarioId,
      pattern: session.pattern,
      score: session.feedback?.score,
      timestamp: session.endTime,
      concepts: extractConcepts(session)
    }
  }]);
}

// Call after session completion
// In /app/api/generate-feedback/route.ts
await vectorizeSession(completedSession);
```

#### Task 2.3: Enhanced Chat with RAG Context

```typescript
// /app/api/chat/route.ts - Modified
import { getUserContext } from '@/lib/rag-context';

export async function POST(req: NextRequest) {
  const { message, sessionId, userId } = await req.json();

  // 🆕 Retrieve relevant context
  const ragContext = await getUserContext(userId, message, sessionId);

  const systemPrompt = `You are a technical interviewer at a top tech company.

${ragContext.userProfile}

RELEVANT CONTEXT FROM USER'S HISTORY:
${ragContext.relevantHistory}

SIMILAR PROBLEMS USER HAS SOLVED:
${ragContext.similarSolved}

PATTERNS USER EXCELS AT:
${ragContext.strongPatterns}

AREAS FOR IMPROVEMENT:
${ragContext.weakAreas}

Use this context to provide personalized, encouraging guidance.
Reference their past successes when appropriate.
`;

  const response = await generateAI({
    systemPrompt,
    messages: conversation
  });

  return NextResponse.json({ response });
}
```

#### Task 2.4: RAG Context Builder

```typescript
// /lib/rag-context.ts
import { generateEmbedding } from '@/lib/embeddings';
import { userHistoryIndex, problemsIndex } from '@/lib/vector-db';

export async function getUserContext(
  userId: string,
  currentQuery: string,
  sessionId: string
) {
  const queryEmbedding = await generateEmbedding(currentQuery);

  // Get user's relevant history
  const historyResults = await userHistoryIndex.query({
    vector: queryEmbedding,
    topK: 5,
    filter: { userId },
    includeMetadata: true
  });

  // Get similar problems for reference
  const similarProblems = await problemsIndex.query({
    vector: queryEmbedding,
    topK: 3,
    includeMetadata: true
  });

  // Analyze user patterns
  const userStats = await analyzeUserPatterns(userId);

  return {
    userProfile: `
      User has completed ${userStats.totalSessions} sessions.
      Average score: ${userStats.avgScore}/100
      Skill level: ${userStats.level}
    `,
    relevantHistory: historyResults.matches
      .map(m => `- ${m.metadata.scenarioTitle}: Score ${m.metadata.score}`)
      .join('\n'),
    similarSolved: historyResults.matches
      .filter(m => m.metadata.score >= 70)
      .map(m => m.metadata.scenarioTitle)
      .join(', '),
    strongPatterns: userStats.strongPatterns.join(', '),
    weakAreas: userStats.weakAreas.join(', ')
  };
}
```

### 4.3 Phase 3: Advanced Features (Week 5-6)

#### Task 3.1: Adaptive Learning Path Generator

```typescript
// /lib/learning-path.ts
import { generateEmbedding } from '@/lib/embeddings';
import { problemsIndex, userHistoryIndex } from '@/lib/vector-db';

interface LearningPath {
  currentLevel: string;
  nextProblems: Problem[];
  skillGaps: string[];
  estimatedProgress: number;
}

export async function generateLearningPath(userId: string): Promise<LearningPath> {
  // 1. Analyze user's completed sessions
  const userHistory = await getUserCompletedSessions(userId);

  // 2. Identify mastered vs struggling patterns
  const patternAnalysis = analyzePatterns(userHistory);

  // 3. Generate embedding for skill gaps
  const gapText = `
    Need to learn: ${patternAnalysis.gaps.join(', ')}
    Struggling with: ${patternAnalysis.weakAreas.join(', ')}
    Ready for: ${patternAnalysis.nextLevel}
  `;
  const gapEmbedding = await generateEmbedding(gapText);

  // 4. Find problems that address gaps
  const recommendedProblems = await problemsIndex.query({
    vector: gapEmbedding,
    topK: 10,
    filter: {
      difficulty: { $lte: patternAnalysis.currentLevel + 1 },
      id: { $nin: userHistory.map(h => h.scenarioId) }
    },
    includeMetadata: true
  });

  // 5. Order by learning progression
  const orderedProblems = orderByProgression(
    recommendedProblems.matches,
    patternAnalysis
  );

  return {
    currentLevel: patternAnalysis.level,
    nextProblems: orderedProblems,
    skillGaps: patternAnalysis.gaps,
    estimatedProgress: calculateProgress(patternAnalysis)
  };
}
```

#### Task 3.2: Smart Hint System with RAG

```typescript
// /app/api/rag/hints/route.ts
export async function POST(req: NextRequest) {
  const { userId, sessionId, code, error, hintLevel } = await req.json();

  const session = await getSession(sessionId);

  // 1. Embed current state
  const stateText = `
    Problem: ${session.scenario.title}
    Current code: ${code}
    Error: ${error || 'No error, user requesting hint'}
    Approach: ${detectApproach(code)}
  `;
  const stateEmbedding = await generateEmbedding(stateText);

  // 2. Find similar successful attempts
  const similarSolutions = await solutionsIndex.query({
    vector: stateEmbedding,
    topK: 5,
    filter: {
      scenarioId: session.scenarioId,
      success: true
    },
    includeMetadata: true
  });

  // 3. Find user's past similar problems
  const userSimilar = await userHistoryIndex.query({
    vector: stateEmbedding,
    topK: 3,
    filter: { userId, score: { $gte: 70 } },
    includeMetadata: true
  });

  // 4. Generate personalized hint
  const hint = await generateAI({
    prompt: `Generate a level ${hintLevel} hint.

    User's current code:
    ${code}

    ${error ? `Error they're seeing: ${error}` : ''}

    Successful approaches others used:
    ${similarSolutions.matches.map(m => m.metadata.approach).join('\n')}

    User previously solved similar problem "${userSimilar.matches[0]?.metadata.title}"
    using ${userSimilar.matches[0]?.metadata.approach}.

    Hint levels:
    1 = Gentle nudge, mention the concept
    2 = Pattern hint, mention which data structure
    3 = Direct guidance, show the approach

    Personalize based on user's history.`
  });

  return NextResponse.json({ hint });
}
```

#### Task 3.3: Solution Pattern Database

```typescript
// /scripts/build-solution-patterns.ts
// Run this periodically to update solution patterns

async function buildSolutionPatterns() {
  // 1. Get all successful sessions
  const successfulSessions = await db.collection('sessions')
    .where('feedback.score', '>=', 80)
    .get();

  // 2. Extract and classify patterns
  for (const session of successfulSessions.docs) {
    const data = session.data();

    const patternText = `
      Problem: ${data.scenarioTitle}
      Pattern: ${data.pattern}
      Approach: ${classifyApproach(data.finalCode)}
      Time Complexity: ${analyzeComplexity(data.finalCode)}
      Key Techniques: ${extractTechniques(data.finalCode)}
    `;

    const embedding = await generateEmbedding(patternText);

    await solutionsIndex.upsert([{
      id: session.id,
      values: embedding,
      metadata: {
        scenarioId: data.scenarioId,
        pattern: data.pattern,
        approach: classifyApproach(data.finalCode),
        complexity: analyzeComplexity(data.finalCode),
        techniques: extractTechniques(data.finalCode),
        score: data.feedback.score,
        success: true
      }
    }]);
  }
}
```

### 4.4 Phase 4: Production & Optimization (Week 7-8)

#### Task 4.1: RAG Caching Layer

```typescript
// /lib/rag-cache.ts
import { kv } from '@vercel/kv';

interface RAGCacheConfig {
  ttl: number;      // Time to live in seconds
  maxSize: number;  // Max cache entries
}

export class RAGCache {
  constructor(private config: RAGCacheConfig) {}

  private getCacheKey(type: string, query: string, userId?: string): string {
    const hash = crypto.createHash('sha256')
      .update(`${type}:${query}:${userId || 'global'}`)
      .digest('hex')
      .slice(0, 16);
    return `rag:${type}:${hash}`;
  }

  async get<T>(type: string, query: string, userId?: string): Promise<T | null> {
    const key = this.getCacheKey(type, query, userId);
    return await kv.get(key);
  }

  async set<T>(type: string, query: string, value: T, userId?: string): Promise<void> {
    const key = this.getCacheKey(type, query, userId);
    await kv.set(key, value, { ex: this.config.ttl });
  }
}

export const ragCache = new RAGCache({
  ttl: 3600,      // 1 hour
  maxSize: 10000
});
```

#### Task 4.2: Embedding Cost Optimization

```typescript
// /lib/embeddings-optimized.ts

// Use smaller model for simple queries
const EMBEDDING_MODELS = {
  fast: 'text-embedding-3-small',   // Cheaper, faster
  quality: 'text-embedding-004'      // Better accuracy
};

export async function smartEmbed(text: string, priority: 'speed' | 'quality') {
  // Check cache first
  const cached = await embeddingCache.get(text);
  if (cached) return cached;

  const model = priority === 'speed'
    ? EMBEDDING_MODELS.fast
    : EMBEDDING_MODELS.quality;

  const embedding = await generateWithModel(text, model);

  await embeddingCache.set(text, embedding);
  return embedding;
}

// Batch similar embeddings
export async function batchEmbed(texts: string[]): Promise<Map<string, number[]>> {
  // Deduplicate
  const unique = [...new Set(texts)];

  // Check cache for all
  const cached = await Promise.all(unique.map(t => embeddingCache.get(t)));
  const uncached = unique.filter((_, i) => !cached[i]);

  // Batch embed uncached
  if (uncached.length > 0) {
    const newEmbeddings = await batchGenerateEmbeddings(uncached);
    // Cache new embeddings
    await Promise.all(uncached.map((t, i) =>
      embeddingCache.set(t, newEmbeddings[i])
    ));
  }

  // Return all
  return new Map(texts.map((t, i) => [t, cached[i] || newEmbeddings[i]]));
}
```

---

## 5. Architecture Design

### 5.1 Complete RAG Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         SKILLON RAG ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        USER INTERFACE                            │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │   │
│  │  │  Problem  │  │ Interview │  │   Chat    │  │  Feedback │    │   │
│  │  │  Browser  │  │  Editor   │  │  Panel    │  │   View    │    │   │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘    │   │
│  └────────┼──────────────┼──────────────┼──────────────┼───────────┘   │
│           │              │              │              │               │
│           ▼              ▼              ▼              ▼               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        API LAYER                                 │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │   │
│  │  │  /search   │  │   /chat    │  │   /hints   │  │ /feedback  │ │   │
│  │  │  (new!)    │  │ (enhanced) │  │ (enhanced) │  │ (enhanced) │ │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘ │   │
│  └────────┼───────────────┼───────────────┼───────────────┼────────┘   │
│           │               │               │               │            │
│           ▼               ▼               ▼               ▼            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     RAG ORCHESTRATION LAYER                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │   Query     │  │   Context   │  │      Response           │  │   │
│  │  │  Processor  │──│   Builder   │──│      Generator          │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │   │
│  └─────────┼────────────────┼─────────────────────┼────────────────┘   │
│            │                │                     │                    │
│            ▼                ▼                     ▼                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       DATA LAYER                                 │   │
│  │                                                                  │   │
│  │   ┌────────────────┐    ┌────────────────┐    ┌──────────────┐  │   │
│  │   │  EMBEDDINGS    │    │  VECTOR DB     │    │  FIRESTORE   │  │   │
│  │   │  (Gemini API)  │    │  (Pinecone)    │    │  (Firebase)  │  │   │
│  │   │                │    │                │    │              │  │   │
│  │   │ • text-embed   │    │ • problems     │    │ • sessions   │  │   │
│  │   │ • code-embed   │    │ • solutions    │    │ • profiles   │  │   │
│  │   └───────┬────────┘    │ • user-history │    │ • analytics  │  │   │
│  │           │             └───────┬────────┘    └──────┬───────┘  │   │
│  │           │                     │                    │          │   │
│  │           └──────────┬──────────┴────────────────────┘          │   │
│  │                      │                                           │   │
│  │                      ▼                                           │   │
│  │           ┌─────────────────────┐                               │   │
│  │           │     RAG CACHE       │                               │   │
│  │           │   (Vercel KV)       │                               │   │
│  │           │  • Query results    │                               │   │
│  │           │  • Embeddings       │                               │   │
│  │           │  • Context snippets │                               │   │
│  │           └─────────────────────┘                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       AI LAYER                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │  Gemini     │  │  Deepseek   │  │  Claude (fallback)      │  │   │
│  │  │  2.5 Flash  │  │  (backup)   │  │  for complex reasoning  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Flow Diagrams

#### Semantic Search Flow
```
User types "binary search in rotated array"
           │
           ▼
┌──────────────────────────┐
│ 1. Query Preprocessing   │
│    - Clean & normalize   │
│    - Extract keywords    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 2. Generate Embedding    │
│    - text-embedding-004  │
│    - 768-dim vector      │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 3. Vector Search         │
│    - Pinecone query      │
│    - topK=20, filters    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 4. Rerank & Filter       │
│    - Score threshold     │
│    - Dedup by pattern    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 5. Return Results        │
│    - Scenario metadata   │
│    - Similarity scores   │
└──────────────────────────┘
```

#### Personalized Chat Flow
```
User sends message in interview
           │
           ▼
┌──────────────────────────┐
│ 1. RAG Context Retrieval │
│    - User history search │
│    - Similar problems    │
│    - Pattern analysis    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 2. Prompt Augmentation   │
│    + User profile        │
│    + Relevant history    │
│    + Similar solved      │
│    + Weak areas          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 3. AI Generation         │
│    - Gemini 2.5 Flash    │
│    - Personalized resp.  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 4. Response Validation   │
│    - Relevance check     │
│    - Hallucination det.  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ 5. Cache & Return        │
│    - Store for future    │
│    - Return to user      │
└──────────────────────────┘
```

### 5.3 File Structure

```
/lib
├── rag/
│   ├── index.ts              # Main RAG exports
│   ├── vector-db.ts          # Pinecone client
│   ├── embeddings.ts         # Embedding generation
│   ├── chunking.ts           # Text chunking utilities
│   ├── retrieval.ts          # Search & retrieval logic
│   ├── context-builder.ts    # Prompt augmentation
│   ├── reranker.ts           # Result reranking
│   └── cache.ts              # RAG-specific caching
│
├── ml/
│   ├── pattern-detector.ts   # Code pattern detection
│   ├── skill-analyzer.ts     # User skill analysis
│   └── learning-path.ts      # Curriculum generation
│
/app/api
├── search/
│   └── route.ts              # Semantic search endpoint
├── rag/
│   ├── route.ts              # Enhanced RAG endpoint
│   ├── hints/route.ts        # Smart hints
│   ├── similar/route.ts      # Similar problems
│   └── path/route.ts         # Learning path
│
/scripts
├── vectorize-problems.ts     # One-time problem indexing
├── vectorize-solutions.ts    # Solution pattern indexing
├── update-user-vectors.ts    # Periodic user history update
└── rag-analytics.ts          # RAG performance metrics
```

---

## 6. Priority Roadmap

### Phase 1: Foundation (Weeks 1-2) ⭐ START HERE
| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| Set up Pinecone account | P0 | 1 day | Foundation |
| Create embedding service | P0 | 1 day | Foundation |
| Vectorize 200+ problems | P0 | 2 days | Foundation |
| Basic semantic search API | P0 | 2 days | User-facing |
| Update ScenarioBrowser UI | P1 | 2 days | User-facing |

**Milestone:** Users can search problems by concept, not just title.

### Phase 2: Personalization (Weeks 3-4)
| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| User session vectorization | P0 | 2 days | Foundation |
| RAG context builder | P0 | 3 days | Core feature |
| Enhanced chat prompts | P0 | 2 days | User-facing |
| Similar problem finder | P1 | 2 days | User-facing |

**Milestone:** AI knows user's history and personalizes guidance.

### Phase 3: Intelligence (Weeks 5-6)
| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| Smart hint system | P0 | 3 days | User-facing |
| Solution pattern DB | P1 | 3 days | Foundation |
| Enhanced feedback | P1 | 2 days | User-facing |
| Learning path generator | P1 | 3 days | Differentiator |

**Milestone:** AI provides intelligent, context-aware hints and paths.

### Phase 4: Optimization (Weeks 7-8)
| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| RAG caching layer | P0 | 2 days | Cost savings |
| Embedding optimization | P1 | 2 days | Cost savings |
| Analytics dashboard | P1 | 2 days | Insights |
| A/B testing framework | P2 | 3 days | Optimization |

**Milestone:** Production-ready, cost-optimized RAG system.

---

## Cost Estimation

### Vector Database (Pinecone Serverless)
| Tier | Vectors | Cost/Month |
|------|---------|------------|
| Free | 100K | $0 |
| Starter | 1M | $70 |
| Pro | 5M | $350 |

**Estimated for Skillon:** Free tier initially (200 problems + 10K user sessions)

### Embeddings (Google text-embedding-004)
| Operation | Tokens | Cost |
|-----------|--------|------|
| Problem embedding | ~500 | $0.000025 |
| Query embedding | ~50 | $0.0000025 |
| 200 problems | 100K | $0.005 |
| 1000 queries/day | 50K | $0.0025/day |

**Monthly embedding cost:** ~$5-10

### Total Additional Cost
| Component | Monthly Cost |
|-----------|--------------|
| Pinecone (free tier) | $0 |
| Embeddings | ~$10 |
| Additional AI calls | ~$20 |
| **Total** | **~$30/month** |

---

## Success Metrics

### User Experience
- **Search relevance:** 80%+ of semantic searches return relevant results
- **Hint usefulness:** 70%+ positive feedback on AI hints
- **Learning path engagement:** 50%+ of users follow suggested path

### Technical Performance
- **Retrieval latency:** < 200ms p95
- **Embedding cache hit rate:** > 70%
- **RAG context accuracy:** > 85% relevant context

### Business Impact
- **Session completion rate:** +15% improvement
- **User retention:** +20% after implementing learning paths
- **Premium conversion:** +10% from personalized experience

---

## Next Steps

1. **Today:** Create Pinecone account (free tier)
2. **This week:** Implement embedding service and vectorize problems
3. **Next week:** Build semantic search API and update UI
4. **Week 3:** Start user session vectorization

Would you like me to start implementing Phase 1?
