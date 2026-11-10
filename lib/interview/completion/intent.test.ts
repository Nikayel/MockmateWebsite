import { describe, expect, it } from "vitest"
import { requestsInterviewCompletion } from "./intent"

describe("explicit interview completion requests", () => {
  it.each([
    "End the interview",
    "Please close this interview.",
    "Could you please finish my session for me?",
    "Can you help me close the interview?",
    "I’d like to end the interview now",
    "Let's wrap up the debrief",
    "How do I close this interview?",
    "How can I end the session?",
    "How to close the interview?",
    "where can I fin the full interview score ?",
    "Where is my interview score?",
    "Can I see my results?",
    "Show my score",
    "Please show me the full interview score",
    "Open my feedback please",
    "I can't find my interview score",
    "I don't know how to open the scoring screen",
    "  How   do I close this interview ?  ",
  ])("recognizes a current request: %j", (message) => {
    expect(requestsInterviewCompletion(message)).toBe(true)
  })

  it.each([
    "",
    "two events same user 1801 seconds apart -> count 2",
    "No nothing to add",
    "No more questions",
    "All good",
    "Done",
    "I'm done with the code",
    "I don't understand the question",
    "Do not end the interview",
    "Don't show my score yet",
    "How do I close the file?",
    "The end of the session needs another test",
    'The button says "End the interview"',
    '"End the interview"',
    "Where is my score? I have another question first.",
    "Please end the interview after I finish checking this test",
    "I can't find the bug",
    "How is my score calculated?",
  ])("leaves ambiguous or unrelated messages open: %j", (message) => {
    expect(requestsInterviewCompletion(message)).toBe(false)
  })
})
