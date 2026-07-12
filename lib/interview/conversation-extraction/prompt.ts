import { SPOKEN_COMPLEXITY_RULES } from "@/lib/interview/shared-patterns"

export const EXTRACTION_PROMPT = `You are analyzing a technical interview conversation to extract what the candidate has discussed.
Your job is to accurately detect signals from the conversation - be thorough but accurate.

Given the messages, extract:

1. APPROACH EXPLANATION:
   - Did the candidate explain their approach? (yes if they described what they'll do)
   - What type? (brute_force if O(n²) or nested loops, optimized if O(n) with hash/two-pointer, unclear if can't tell)
   - Quality: "none" if no explanation, "vague" if just said "I'll use X", "specific" if described how, "detailed" if walked through logic

2. TIME COMPLEXITY:
   - Did they state time complexity? (yes if they said O(n), O(n²), linear, quadratic, etc.)
   - What value did they state? (normalize to O(n) format)
   - DOMINANT complexity: If they mentioned multiple (e.g., "sort is O(n log n), then loop is O(n²)"),
     extract the OVERALL dominant complexity (O(n²) dominates O(n log n))
   - Did they explain WHY? (yes if they said "because we loop", "due to nested", etc.)

3. SPACE COMPLEXITY:
   - Did they mention space? What value?

4. EDGE CASES:
   - List any edge cases they mentioned (empty array, null, negative numbers, duplicates, etc.)

5. POSITIVE SIGNALS:
   - Did they ask clarifying questions? (indicates good interview behavior)
   - How many interviewer questions did they answer? (count responses to direct questions)

IMPORTANT RULES:
- Be LIBERAL in detection - if they said something that implies complexity, count it
${SPOKEN_COMPLEXITY_RULES}
- "two pointer" or "sort first then" = usually O(n²) or O(n log n) overall
- When multiple complexities mentioned, the DOMINANT (worst) is the overall complexity`
