# RAG Feature Examples - Real-World User Experience

This document shows what users will experience with the 3 new RAG features.

---

## 1. Misconception RAG - Smarter Error Debugging

### Before (Regex-only)
When user's code fails, they see generic suggestions:

```
❌ Your tests failed

Detected Issue: Off-by-one error
Suggestion: Check your loop conditions: use < for 0-indexed, verify slice boundaries
```

### After (With RAG)
Now users get context-aware debugging hints:

```
❌ Your tests failed (3/5 passed)

🔍 Detected Issue: Off-by-one error in loop bounds

📚 RAG-Enhanced Debugging Hints:
┌─────────────────────────────────────────────────────────────┐
│ 1. "In two-pointer problems, use < instead of <= when      │
│    comparing indices to avoid accessing out-of-bounds"     │
│    (Relevance: 87%)                                        │
│                                                            │
│ 2. "For arrays-hashing, remember that arr.length gives     │
│    the count, but indices go from 0 to length-1"           │
│    (Relevance: 82%)                                        │
└─────────────────────────────────────────────────────────────┘

💡 Community Insights:
• "80% of off-by-one errors occur at array boundaries - always test with length 0, 1, and 2"
• "Pro tip: Draw array indices on paper before coding loops"

🔧 Suggested Fix:
Change: for (let i = 0; i <= arr.length; i++)
To:     for (let i = 0; i < arr.length; i++)
```

### How It Works

```typescript
// In your hint system or feedback API:
import { analyzeAndTrackMisconceptionsWithRAG } from '@/lib/rag/misconception-detection'

const result = await analyzeAndTrackMisconceptionsWithRAG(
  userId,
  userCode,
  'two-pointers', // pattern
  { passed: 3, total: 5, failingTests: ['Test case 3: expected [1,2] got [1,2,3]'] }
)

// Result includes:
// - misconceptions: [{type: 'off-by-one', description: '...'}]
// - ragHints: [{hint: '...', relevance: 0.87, source: 'knowledge-base'}]
// - communityInsights: ['Pro tip: ...']
```

---

## 2. Dynamic Chat RAG - Context-Aware Conversations

### Before (Static Context)
The AI partner always gets the same context regardless of what the user asks:

```
User: "Why isn't my binary search working?"

AI: "Here's information about binary search patterns..."
(Generic response, not tailored to debugging)
```

### After (With Dynamic Context)
The system detects user intent and retrieves relevant context:

```
User: "Why isn't my binary search working?"

[System detects: intent='debugging', confidence=0.95]
[System retrieves: debugging hints for binary-search pattern]

AI: "I see you're having trouble with your binary search. Based on common issues:

🔍 Most likely causes:
• Boundary update issue: Are you using left = mid + 1 and right = mid - 1?
• Integer overflow: Use mid = left + (right - left) / 2 instead of (left + right) / 2
• Termination condition: Check if you need < or <= based on your update logic

Looking at your code, I notice you have `right = mid` without the -1.
This can cause an infinite loop when left equals right.

Try changing line 8 to: right = mid - 1"
```

### Intent Detection Examples

| User Message | Detected Intent | Dynamic Context Retrieved |
|--------------|-----------------|--------------------------|
| "How should I approach this?" | `asking-approach` | Pattern-specific approach strategies |
| "What's the time complexity?" | `asking-complexity` | Complexity analysis for current pattern |
| "What edge cases should I handle?" | `asking-edge-cases` | Common edge cases for the pattern |
| "Why isn't this working?" | `debugging` | Debugging hints + common mistakes |
| "How can I make this faster?" | `optimization` | Optimization strategies |
| "Should I use a hashmap or set?" | `data-structure` | Data structure comparison |
| "I'm stuck" | `stuck` | Progressive hints |

### How It Works

```typescript
// In chat route - happens automatically now!
// The buildRAGContext function now analyzes user messages:

const ragContext = await buildRAGContext({
  scenarioTitle,
  scenarioPattern,
  userCode: currentCode,
  userMessage: message,        // NEW: Passed for dynamic context
  testResults,                 // NEW: Passed for debugging context
})

// Internally, this calls:
import { getDynamicChatContext, shouldRetrieveDynamicContext } from '@/lib/rag/dynamic-chat-context'

if (shouldRetrieveDynamicContext(userMessage)) {
  const dynamicContext = await getDynamicChatContext({
    userMessage,
    currentCode,
    pattern: 'binary-search',
    testResults: { passed: 2, total: 5 }
  })

  // dynamicContext includes:
  // - intent: 'debugging'
  // - confidence: 0.95
  // - retrievedContext: "Binary search debugging tips..."
  // - debuggingHints: ['Check boundary updates', 'Verify termination condition']
}
```

---

## 3. Question Frequency RAG - Company-Specific Roadmaps

### Before (Generic Prioritization)
Roadmaps prioritized by difficulty and pattern coverage:

```
Day 1:
• Two Sum (Easy, Arrays)
• Valid Anagram (Easy, Arrays)
• Contains Duplicate (Easy, Arrays)

Day 2:
• Binary Search (Easy, Binary Search)
• Search Insert Position (Easy, Binary Search)
```

### After (Company-Specific Prioritization)
Roadmaps now highlight must-know questions for your target company:

```
📋 Your Google Interview Roadmap

Day 1:
┌─────────────────────────────────────────────────────────────┐
│ ⭐ Must-Know: Two Sum, LRU Cache                            │
│ 💡 Tip for Two Sum: HashMap for O(n), Handle duplicates     │
│                                                             │
│ • Two Sum (Easy) - 95% frequency at Google                  │
│ • Valid Anagram (Easy) - Practice problem                   │
│ • LRU Cache (Medium) - 90% frequency at Google              │
│                                                             │
│ Tips: Use HashMap for O(1) lookups                          │
└─────────────────────────────────────────────────────────────┘

Day 2:
┌─────────────────────────────────────────────────────────────┐
│ ⭐ Must-Know: Word Break                                    │
│ 💡 Tip for Word Break: DP with word set lookup              │
│                                                             │
│ • Word Break (Medium) - 85% frequency at Google             │
│ • Binary Search (Easy) - Foundation problem                 │
│ • Merge Intervals (Medium) - 80% frequency at Google        │
│                                                             │
│ Tips: Focus on DP patterns - Google loves these!            │
└─────────────────────────────────────────────────────────────┘

📊 Company Question Profile: Google
├── Must-Know Questions (6):
│   • Two Sum (arrays-hashing, easy)
│   • LRU Cache (linked-list, medium)
│   • Word Break (dp-1d, medium)
│   • Merge Intervals (intervals, medium)
│   • Number of Islands (graphs, medium)
│   • Serialize/Deserialize Binary Tree (trees, hard)
│
├── Top Patterns:
│   • Dynamic Programming: 9/10 frequency
│   • Trees: 8/10 frequency
│   • Arrays & Hashing: 8/10 frequency
│
└── Interview Insights:
    • "Google emphasizes problem-solving approach over memorization"
    • "Expect follow-up questions on optimization and edge cases"
```

### Company-Specific Must-Know Questions

| Company | Must-Know Questions | Focus Areas |
|---------|---------------------|-------------|
| **Google** | Two Sum, LRU Cache, Word Break, Merge Intervals | DP, Trees, System Design |
| **Meta** | Two Sum, Valid Palindrome, Clone Graph, Binary Tree Views | Trees, BFS/DFS, Graphs |
| **Amazon** | Two Sum, Meeting Rooms II, K Closest Points, Word Search | Heaps, Graphs, Backtracking |
| **Microsoft** | Two Sum, Add Two Numbers, Spiral Matrix, Word Ladder | Arrays, Linked Lists, BFS |
| **Apple** | Two Sum, Reverse Linked List, 3Sum, Valid Sudoku | Two Pointers, Arrays |

### How It Works

```typescript
// When generating a roadmap:
import { getCompanyFrequentQuestions, getPrioritizedQuestionsForCompany } from '@/lib/rag/question-frequency-rag'

// Get company question profile
const profile = await getCompanyFrequentQuestions({
  companyId: 'google',
  experienceLevel: 'intermediate',
  limit: 15
})

// profile includes:
// - topQuestions: [{title: 'Two Sum', frequencyScore: 95, isMustkKnow: true, ...}]
// - topPatterns: [{pattern: 'dp-1d', frequency: 9, recentTrend: 'stable'}]
// - interviewInsights: ['Google emphasizes...']

// Prioritize questions for roadmap
const prioritized = await getPrioritizedQuestionsForCompany(
  'google',
  ['dsa-two-sum', 'dsa-lru-cache', 'dsa-binary-search', ...],
  { experienceLevel: 'intermediate' }
)

// prioritized includes:
// - [{scenarioId: 'dsa-two-sum', priorityBoost: 1.25, reason: 'Must-know for Google'}]
```

---

## Summary: What Users See

### 1. When Their Code Fails
```
Before: "Off-by-one error. Check loop bounds."
After:  "Off-by-one error. Based on 500+ similar errors, users fixed this by...
         Pro tip: Draw array indices on paper first."
```

### 2. When They Ask Questions in Chat
```
Before: Same generic pattern info regardless of question
After:  Intent-aware responses:
        - "How to approach?" → Strategy hints
        - "Why not working?" → Debugging hints
        - "Too slow?" → Optimization tips
```

### 3. When They Generate a Study Roadmap
```
Before: Problems sorted by difficulty
After:  Must-know questions highlighted with company-specific tips:
        "⭐ LRU Cache is asked in 90% of Google interviews.
         Tip: Use HashMap + Doubly Linked List for O(1) operations"
```

---

## Cost Impact

| Feature | Extra RAG Calls | Cost per Use | Trigger Frequency |
|---------|-----------------|--------------|-------------------|
| Misconception RAG | 1-2 embeddings | ~$0.00005 | On test failure only |
| Dynamic Chat RAG | 1 embedding | ~$0.000025 | Per meaningful message |
| Question Frequency | 1 embedding | ~$0.000025 | Per roadmap (cached 24h) |

**Monthly estimate (1,000 active users):** ~$2-3 extra

All features use:
- 30-second caching for misconceptions
- 1-minute caching for dynamic chat
- 24-hour caching for company profiles
