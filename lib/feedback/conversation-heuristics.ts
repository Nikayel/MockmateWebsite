/**
 * Lightweight transcript heuristics used as safety nets around LLM validation.
 */

export interface ApproachHeuristicResult {
  explained: boolean
  quality: string
  complexityMentioned: boolean
  edgeCasesMentioned: boolean
}

/**
 * Detect obvious signs of approach explanation that AI might miss.
 */
export function detectApproachHeuristically(
  candidateMessages: Array<{ content: string }>
): ApproachHeuristicResult {
  const allContent = candidateMessages.map((m) => m.content.toLowerCase()).join(" ")

  const approachPatterns = [
    /\b(two pointers?|sliding window|hash ?map|hash ?set|dictionary|freq|bucket|sort|heap|stack|queue|bfs|dfs|binary search|dp|dynamic programming|recursion|memoiz)/i,
    /\b(i('ll|'m going to|want to|can|could|would) (use|try|loop|iterate|check|compare|add|remove|keep track))/i,
    /\b(approach|strategy|idea|solution|algorithm|method|way to solve)/i,
    /\b(first|then|after that|next|finally|so what i)/i,
    /\b(time complexity|space complexity|o\s*\(|o\s*of\s*n|linear|constant|quadratic|log)/i,
    /\b(brute force|optimiz|more efficient|better approach)/i,
    /\b(loop over|iterate through|traverse|walk through)/i,
    /\b(as (i|we) (loop|iterate|go|move)|while (we|i) (have|loop))/i,
  ]

  const complexityPatterns = [
    /\bo\s*\(\s*n\s*\)/i,
    /\bo\s*\(\s*1\s*\)/i,
    /\bo\s*\(\s*n\s*log\s*n\s*\)/i,
    /\bo\s*\(\s*n\s*(squared|²|\^2|square)\s*\)/i,
    /\bo\s+of?\s*n\b/i,
    /\bo\s+n\b/i,
    /\boh\s*n\b/i,
    /\bo\s+of?\s*one\b/i,
    /\bo\s+one\b/i,
    /\boh\s*one\b/i,
    /\bo\s+of?\s*1\b/i,
    /\bo\s+1\b/i,
    /\bo\s+n\s*log\s*n\b/i,
    /\bo\s+of\s*n\s*log\s*n\b/i,
    /\bo\s+n\s*(squared?|square)\b/i,
    /\btime complexity/i,
    /\bspace complexity/i,
    /\blinear( time)?/i,
    /\bconstant( space| time)?/i,
    /\bquadratic/i,
    /\blogarithmic/i,
  ]

  const edgeCasePatterns = [
    /\b(empty|null|none|zero|single|one element|edge case|boundary|special case)/i,
    /\b(what if|if it's empty|if there's nothing|if the (string|array|input) is)/i,
    /\b(negative|duplicate|unicode|lowercase|uppercase)/i,
  ]

  const approachMatches = approachPatterns.filter((p) => p.test(allContent)).length
  const complexityMatches = complexityPatterns.filter((p) => p.test(allContent)).length
  const edgeCaseMatches = edgeCasePatterns.filter((p) => p.test(allContent)).length

  const substantialExplanations = candidateMessages.filter(
    (m) =>
      m.content.length > 150 &&
      (approachPatterns.some((p) => p.test(m.content.toLowerCase())) ||
        /\b(so|because|the reason|which means|that way|this will|this would)\b/i.test(m.content))
  ).length

  const explained = approachMatches >= 2 || substantialExplanations >= 1

  let quality = "none"
  if (explained) {
    if (approachMatches >= 4 || substantialExplanations >= 2) {
      quality = "good"
    } else if (approachMatches >= 2 || substantialExplanations >= 1) {
      quality = "basic"
    }
  }

  return {
    explained,
    quality,
    complexityMentioned: complexityMatches >= 1,
    edgeCasesMentioned: edgeCaseMatches >= 1,
  }
}
