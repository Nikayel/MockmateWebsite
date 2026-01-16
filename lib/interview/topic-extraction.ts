/**
 * Topic Extraction Utilities
 *
 * Pure functions for extracting interview topics from messages.
 * Used to track what the AI has asked about and what the user has answered
 * to prevent repetitive questions.
 */

/**
 * Extract topics from AI interviewer messages to track what has been asked.
 * Prevents the interviewer from repeatedly asking about the same topics.
 */
export function extractTopicsFromMessage(message: string): string[] {
  const topics: string[] = []
  const lowerMsg = message.toLowerCase()

  // Common interview question patterns
  if (lowerMsg.includes("time complexity") || lowerMsg.includes("time and space")) {
    topics.push("time complexity")
  }
  if (lowerMsg.includes("space complexity")) {
    topics.push("space complexity")
  }
  if (lowerMsg.includes("edge case") || lowerMsg.includes("edge-case")) {
    topics.push("edge cases")
  }
  if (lowerMsg.includes("walk me through") || lowerMsg.includes("explain your")) {
    topics.push("approach explanation")
  }
  if (lowerMsg.includes("optimize") || lowerMsg.includes("more efficient")) {
    topics.push("optimization")
  }
  if (lowerMsg.includes("test") && (lowerMsg.includes("how would") || lowerMsg.includes("what"))) {
    topics.push("testing")
  }
  if (lowerMsg.includes("alternative") || lowerMsg.includes("other approach")) {
    topics.push("alternative approaches")
  }

  return topics
}

/**
 * Extract topics the USER has answered from their messages.
 * This prevents the interviewer from re-asking about things the user already explained.
 */
export function extractUserAnsweredTopics(message: string): string[] {
  const topics: string[] = []
  const lowerMsg = message.toLowerCase()

  // Complexity answers - user stating time/space complexity
  if (
    lowerMsg.match(/o\s*\(\s*[n\d\s\^logn*]+\s*\)/i) || // O(n), O(n^2), O(log n), O(n log n)
    lowerMsg.includes("linear time") ||
    lowerMsg.includes("constant time") ||
    lowerMsg.includes("quadratic") ||
    lowerMsg.includes("logarithmic")
  ) {
    if (lowerMsg.includes("time") || lowerMsg.includes("runtime") || !lowerMsg.includes("space")) {
      topics.push("time complexity: user stated it")
    }
    if (lowerMsg.includes("space") || lowerMsg.includes("memory")) {
      topics.push("space complexity: user stated it")
    }
    // If they just say O(n) without specifying, assume they answered complexity
    if (!lowerMsg.includes("time") && !lowerMsg.includes("space")) {
      topics.push("complexity: user stated it")
    }
  }

  // Edge case mentions
  if (
    lowerMsg.includes("empty array") ||
    lowerMsg.includes("empty input") ||
    lowerMsg.includes("null") ||
    lowerMsg.includes("edge case") ||
    lowerMsg.includes("single element") ||
    lowerMsg.includes("negative") ||
    lowerMsg.includes("zero")
  ) {
    topics.push("edge cases: user mentioned")
  }

  // Approach explanation
  if (
    lowerMsg.includes("my approach") ||
    lowerMsg.includes("i'm thinking") ||
    lowerMsg.includes("i'll use") ||
    lowerMsg.includes("the idea is") ||
    lowerMsg.includes("basically") ||
    lowerMsg.includes("so what i'm doing")
  ) {
    topics.push("approach: user explained")
  }

  // Trade-off discussion
  if (
    lowerMsg.includes("trade-off") ||
    lowerMsg.includes("tradeoff") ||
    lowerMsg.includes("trade off") ||
    (lowerMsg.includes("space") && lowerMsg.includes("time"))
  ) {
    topics.push("trade-offs: user discussed")
  }

  return topics
}
