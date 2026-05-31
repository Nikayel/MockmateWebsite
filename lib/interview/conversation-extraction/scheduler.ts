export function shouldRunExtraction(
  messageCount: number,
  lastExtractionAt: number,
  currentMessage: string
): boolean {
  const messagesSinceLastExtraction = messageCount - lastExtractionAt

  if (messagesSinceLastExtraction >= 5) {
    return true
  }

  const lowerMessage = currentMessage.toLowerCase()
  const keySignals = [
    "complexity",
    "o(n)",
    "o n",
    "linear",
    "constant",
    "quadratic",
    "logarithmic",
    "approach",
    "solution",
    "edge case",
    "empty",
    "null",
    "brute force",
    "optimize",
  ]

  if (keySignals.some((signal) => lowerMessage.includes(signal))) {
    return true
  }

  return messagesSinceLastExtraction >= 3
}
