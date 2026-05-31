export function formatConversationForExtraction(
  recentMessages: Array<{ role: string; content: string }>
): string {
  return recentMessages
    .slice(-15)
    .map((message) => {
      const role =
        message.role === "user" || message.role === "candidate" ? "CANDIDATE" : "INTERVIEWER"
      return `${role}: ${message.content}`
    })
    .join("\n\n")
}
