# Two-Phase Feedback Architecture

## Problem
The `/api/generate-feedback` endpoint times out (30s Vercel limit) because it runs 6-8 sequential AI operations at submission time.

## Solution: Pre-compute + Tiered Feedback

### Phase 1: Instant Feedback (< 3 seconds)
Return immediately on submission with **algorithmic scores only**:
- Test pass rate → Code Quality score
- Efficiency metrics → Understanding score
- Conversation signals (already tracked) → Communication score
- Phase completion → Problem-Solving score

**No AI calls. Pure math.**

### Phase 2: Rich Feedback (Background)
Generate narrative feedback asynchronously:
- Constitutional AI critique
- Evidence extraction with quotes
- Silent notes analysis
- RAG context
- Structured narrative (TL;DR, What Worked, Fix Next, Action Plan)

Notify frontend when ready via polling or update Firestore.

---

## Architecture Changes

### 1. New: Real-Time Score Accumulator (`lib/feedback/score-accumulator.ts`)

Accumulates scores incrementally during the interview:

```typescript
interface AccumulatedScores {
  // Raw signals (updated in real-time)
  testsPassRate: number;           // Updated on each test run
  efficiencyScore: number;         // Updated on code analysis
  approachExplained: boolean;      // From conversation tracker
  complexityDiscussed: boolean;    // From conversation tracker
  edgeCasesMentioned: number;      // Count from tracker
  hintsUsed: number;               // From hint reveals
  interviewerQuestionsAnswered: number;

  // Computed scores (recalculated on signal change)
  understanding: number;
  problemSolving: number;
  codeQuality: number;
  communication: number;
  overall: number;

  // Metadata
  lastUpdated: number;
  confidence: 'low' | 'medium' | 'high';  // Based on data completeness
}
```

Score formulas (deterministic, no AI):
- **Understanding** = 40% test pass + 30% efficiency + 20% approach quality + 10% complexity discussion
- **Problem-Solving** = 50% test pass + 30% efficiency + 20% (tests run before submit)
- **Code Quality** = 40% test pass + 40% efficiency + 20% (no blind AI copying)
- **Communication** = 40% approach explained + 30% complexity discussed + 20% questions answered + 10% edge cases
- **Overall** = weighted average with scenario-type adjustments

### 2. Modified: Session Metrics (`lib/session-metrics.ts`)

Add score accumulation to existing metrics tracking:

```typescript
// In SessionMetricsState, add:
accumulatedScores: AccumulatedScores;

// New event type:
case 'score_update':
  // Called after test execution, code analysis, conversation signal
  state.accumulatedScores = recalculateScores(state);
  break;
```

### 3. New: Instant Feedback Endpoint (`app/api/feedback/instant/route.ts`)

Fast endpoint (< 3s) that returns pre-computed scores:

```typescript
POST /api/feedback/instant
Body: { sessionId, userId }

Response: {
  scores: AccumulatedScores,
  flags: {
    silentSolution: boolean,
    incompleteSolution: boolean,
    aiCopyingDetected: boolean,
  },
  jobId: string,  // For polling rich feedback
}
```

### 4. Modified: Generate Feedback (`app/api/generate-feedback/route.ts`)

Convert to background job pattern:

```typescript
// Option A: Vercel Background Functions (if on Pro plan)
export const config = {
  maxDuration: 300  // 5 minutes
};

// Option B: Queue-based (works on all plans)
POST /api/generate-feedback
  → Validate request
  → Create job in Firestore: feedback_jobs/{jobId}
  → Return { jobId, status: 'processing' }
  → Trigger background processing via:
     - Vercel Cron (check pending jobs every 30s)
     - OR direct processing with response streaming
     - OR external queue (Inngest, Trigger.dev)

// Job document structure:
feedback_jobs/{jobId}: {
  sessionId, userId,
  status: 'pending' | 'processing' | 'complete' | 'failed',
  input: { code, transcript, metrics, ... },
  output?: { feedback, structuredFeedback, ... },
  createdAt, completedAt,
  error?: string
}
```

### 5. New: Feedback Status Endpoint (`app/api/feedback/status/route.ts`)

```typescript
GET /api/feedback/status?jobId=xxx

Response: {
  status: 'processing' | 'complete' | 'failed',
  progress?: number,  // 0-100
  result?: StructuredFeedback,  // Only when complete
}
```

### 6. Modified: Interview Page (`app/interview/page.tsx`)

Two-phase feedback display:

```typescript
// On submit:
1. POST /api/feedback/instant → Get scores immediately
2. Show scores in modal (instant)
3. Show "Generating detailed feedback..." spinner
4. Poll /api/feedback/status every 2s
5. When complete, update modal with rich narrative

// UI states:
- "Evaluating..." (brief, while getting instant scores)
- Scores displayed + "Loading detailed analysis..."
- Full feedback displayed
```

---

## Implementation Order

### Step 1: Score Accumulator (lib/feedback/score-accumulator.ts)
- Pure functions, no dependencies
- Unit testable
- ~150 lines

### Step 2: Integrate with Session Metrics
- Add accumulatedScores to state
- Recalculate on relevant events
- ~50 lines changes

### Step 3: Instant Feedback Endpoint
- New route, simple logic
- Returns accumulated scores + creates job
- ~100 lines

### Step 4: Background Job System
- Firestore job documents
- Processing logic (extracted from current route)
- Status endpoint
- ~200 lines

### Step 5: Frontend Integration
- Modify handleSubmit flow
- Add polling logic
- Update feedback modal
- ~100 lines changes

---

## Rollout Strategy

1. **Feature flag**: `USE_TWO_PHASE_FEEDBACK`
2. **Gradual rollout**: 10% → 50% → 100%
3. **Fallback**: If instant fails, fall back to current flow
4. **Monitoring**: Track both latencies, compare scores

---

## Benefits

1. **User sees scores in < 3 seconds** (vs 30s+ timeout)
2. **Rich feedback arrives in background** (no timeout)
3. **Better UX**: Progress indicator instead of hanging
4. **Scalable**: Can add more AI analysis without timeout pressure
5. **Resilient**: Instant scores always work, rich feedback is bonus

## Trade-offs

1. **More complex architecture** (job system, polling)
2. **Scores may differ slightly** (algorithmic vs AI-validated)
3. **Two API calls instead of one** (minimal overhead)
