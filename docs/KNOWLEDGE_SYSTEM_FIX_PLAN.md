# Knowledge System Fix Plan

## Problem Summary

1. **Complexity detection uses fragile regex** - misses Python, recursion, binary search
2. **Verified complexity data not used for detection** - we have per-problem approaches but don't match against them
3. **Knowledge bases exist but aren't wired into interview flow** - Debugging/System Design only used in feedback

## Architecture Fix

### Phase 1: Approach Detection (Replace Regex)

**File: `lib/interview/approach-detector.ts` (NEW)**

```typescript
import { getComplexityKnowledge, type ProblemApproach } from "@/lib/rag/knowledge-base/complexity-knowledge"

interface ApproachDetectionResult {
  detectedApproach: string | null
  confidence: "high" | "medium" | "low"
  timeComplexity: string
  spaceComplexity: string
  isOptimal: boolean
  matchedPatterns: string[]
}

/**
 * Detect which approach the user is using based on code patterns
 * Uses verified approach data from complexity-knowledge.ts
 */
export function detectApproach(
  code: string,
  problemId: string
): ApproachDetectionResult {
  const knowledge = getComplexityKnowledge(problemId)

  if (!knowledge) {
    // Fallback to pattern-based detection if no specific data
    return detectApproachByPattern(code)
  }

  // Match code against known approaches for this problem
  for (const approach of knowledge.approaches) {
    const patterns = getCodePatternsForApproach(approach)
    const matchScore = matchCodeToPatterns(code, patterns)

    if (matchScore.confidence !== "low") {
      return {
        detectedApproach: approach.name,
        confidence: matchScore.confidence,
        timeComplexity: approach.timeComplexity,
        spaceComplexity: approach.spaceComplexity,
        isOptimal: approach.isOptimalTime || false,
        matchedPatterns: matchScore.matchedPatterns,
      }
    }
  }

  // No match found
  return {
    detectedApproach: null,
    confidence: "low",
    timeComplexity: "Unknown",
    spaceComplexity: "Unknown",
    isOptimal: false,
    matchedPatterns: [],
  }
}

/**
 * Code pattern indicators for each approach type
 */
function getCodePatternsForApproach(approach: ProblemApproach): CodePatterns {
  const patterns: Record<string, CodePatterns> = {
    "Brute Force": {
      indicators: [
        /for.*for/s,                    // Nested loops (multiline)
        /while.*while/s,                // Nested while
        /for.*while|while.*for/s,       // Mixed nesting
      ],
      antiIndicators: [
        /Map|Set|dict|set\(/,           // Hash structures suggest optimization
      ],
    },
    "Two-pass Hash Table": {
      indicators: [
        /Map|dict|{}.*for.*for/s,       // Create map then iterate
        /for.*Map|for.*dict/s,          // Build map in loop
      ],
    },
    "One-pass Hash Table": {
      indicators: [
        /for[^}]*(?:Map|dict|{}).*(?:get|has|in)/s, // Check and insert in same loop
      ],
    },
    "Two Pointer": {
      indicators: [
        /left.*right|i.*j.*while/s,     // Two pointer pattern
        /sort.*while/s,                 // Sort then two pointer
      ],
    },
    "Binary Search": {
      indicators: [
        /while.*left.*right.*mid/s,     // Binary search loop
        /mid\s*=.*\/\s*2|>>\s*1/,       // Midpoint calculation
      ],
    },
    "Dynamic Programming": {
      indicators: [
        /dp\[|memo\[|cache/,            // DP array or memoization
        /def.*\(.*\).*return.*\(.*\)/s, // Recursive with same function call
      ],
    },
    "Sliding Window": {
      indicators: [
        /while.*end.*start|left.*right.*sum/s,
      ],
    },
  }

  return patterns[approach.name] || { indicators: [], antiIndicators: [] }
}
```

### Phase 2: Wire Knowledge into Agents

**Interviewer Agent Enhancement:**

```typescript
// In lib/agents/interviewer-agent.ts

// Add debugging knowledge for bugfix scenarios
if (context.scenarioType === "bugfix") {
  const debugKnowledge = getDebuggingKnowledge(/* detect bug category from code */)
  if (debugKnowledge) {
    prompt += `\n\n## Debugging Knowledge\n${formatDebuggingKnowledgeForContext(debugKnowledge)}`
  }
}

// Add system design knowledge for system-design scenarios
if (context.scenarioType === "system-design") {
  const sdKnowledge = getSystemDesignKnowledge(/* detect concepts from conversation */)
  if (sdKnowledge) {
    prompt += `\n\n## System Design Knowledge\n${formatSystemDesignForContext(sdKnowledge)}`
  }
}
```

### Phase 3: Scorer Integration

**Update Scorer Agent:**

```typescript
// In lib/agents/scorer-agent.ts

private calculateDSAScores(...) {
  // Use approach detection instead of regex
  const approachResult = detectApproach(input.code, input.scenarioId)

  // Compare detected approach to optimal
  if (approachResult.isOptimal) {
    codeQuality += 15 // Bonus for optimal solution
    adjustments.push("+15 code quality: optimal approach used")
  } else if (approachResult.detectedApproach === "Brute Force") {
    // Brute force that passes tests is still valid
    adjustments.push("Brute force approach - works but not optimal")
  }

  // Verify stated complexity matches detected
  if (aiValidation.statedComplexity === approachResult.timeComplexity) {
    adjustments.push("+5 understanding: correct complexity analysis")
    understanding += 5
  }
}
```

## Implementation Priority

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| P0 | Create approach-detector.ts | High - fixes wrong complexity | Medium |
| P0 | Integrate into scorer | High - accurate scoring | Low |
| P1 | Wire debugging knowledge into bugfix interviews | Medium | Low |
| P1 | Wire system design knowledge into SD interviews | Medium | Low |
| P2 | Add more company knowledge | Medium | High |
| P2 | Create problem-solving framework knowledge | Medium | High |

## Files to Change

1. **NEW: `lib/interview/approach-detector.ts`** - Smart approach detection
2. **MODIFY: `lib/agents/scorer-agent.ts`** - Use approach detector
3. **MODIFY: `lib/agents/interviewer-agent.ts`** - Inject scenario-specific knowledge
4. **MODIFY: `lib/interview/code-analysis.ts`** - Use approach detector instead of regex
5. **MODIFY: `lib/hooks/useTestExecution.ts`** - Use approach detector

## Success Metrics

- 3Sum correctly detected as O(n²) even with sort
- Brute force vs optimal distinguished per problem
- Debugging knowledge shown during bugfix interviews
- System design knowledge shown during SD interviews
