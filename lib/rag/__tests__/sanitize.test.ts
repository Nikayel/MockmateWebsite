/**
 * Tests for text sanitization utilities
 */

import {
  sanitizeText,
  checkForIssues,
  validateForEmbedding,
  prepareTextForEmbedding,
} from "../utils/sanitize"

describe("sanitizeText", () => {
  it("should return empty string for null/undefined", () => {
    expect(sanitizeText(null as any)).toBe("")
    expect(sanitizeText(undefined as any)).toBe("")
  })

  it("should return empty string for non-string input", () => {
    expect(sanitizeText(123 as any)).toBe("")
    expect(sanitizeText({} as any)).toBe("")
  })

  it("should remove null bytes", () => {
    // Null bytes are simply removed, not replaced with spaces
    expect(sanitizeText("hello\x00world")).toBe("helloworld")
  })

  it("should remove control characters", () => {
    const input = "hello\x01\x02\x03world"
    const result = sanitizeText(input)
    expect(result).not.toContain("\x01")
    expect(result).not.toContain("\x02")
    expect(result).not.toContain("\x03")
  })

  it("should normalize whitespace", () => {
    expect(sanitizeText("hello    world")).toBe("hello world")
    expect(sanitizeText("hello\n\n\nworld")).toBe("hello world")
    expect(sanitizeText("hello\t\tworld")).toBe("hello world")
  })

  it("should trim leading and trailing whitespace", () => {
    expect(sanitizeText("  hello world  ")).toBe("hello world")
  })

  it("should truncate text exceeding max length", () => {
    const longText = "a".repeat(15000)
    const result = sanitizeText(longText)
    expect(result.length).toBe(10000)
  })

  it("should preserve normal text", () => {
    const normalText =
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
    expect(sanitizeText(normalText)).toBe(normalText)
  })

  it("should preserve code-like content", () => {
    const code = "function twoSum(nums, target) { return [0, 1]; }"
    expect(sanitizeText(code)).toBe(code)
  })
})

describe("checkForIssues", () => {
  it("should return empty array for normal text", () => {
    const warnings = checkForIssues("This is a normal problem statement.")
    expect(warnings).toEqual([])
  })

  it("should return empty array for empty input", () => {
    expect(checkForIssues("")).toEqual([])
    expect(checkForIssues(null as any)).toEqual([])
  })

  it("should warn about very long input", () => {
    const longText = "a".repeat(60000)
    const warnings = checkForIssues(longText)
    expect(warnings.some((w) => w.includes("Very long input"))).toBe(true)
  })

  it("should detect email addresses", () => {
    const textWithEmail = "Contact me at test@example.com for help"
    const warnings = checkForIssues(textWithEmail)
    expect(warnings.some((w) => w.includes("Possible emails"))).toBe(true)
  })

  it("should detect multiple email addresses", () => {
    const textWithEmails = "Email: user1@test.com or user2@test.com"
    const warnings = checkForIssues(textWithEmails)
    expect(warnings.some((w) => w.includes("2"))).toBe(true)
  })

  it("should detect OpenAI API keys", () => {
    const textWithKey = "My key is sk-1234567890abcdefghijklmnopqrstuvwxyz"
    const warnings = checkForIssues(textWithKey)
    expect(warnings.some((w) => w.includes("API key"))).toBe(true)
  })

  it("should detect Google API keys", () => {
    const textWithKey = "API: AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ12345678"
    const warnings = checkForIssues(textWithKey)
    expect(warnings.some((w) => w.includes("API key"))).toBe(true)
  })

  it("should detect GitHub tokens", () => {
    const textWithToken = "Token: ghp_1234567890ABCDEFGHIJKLMNOPQRSTUVWXyz"
    const warnings = checkForIssues(textWithToken)
    expect(warnings.some((w) => w.includes("API key"))).toBe(true)
  })
})

describe("validateForEmbedding", () => {
  it("should validate normal text", () => {
    const result = validateForEmbedding("This is valid text for embedding.")
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it("should reject null/undefined", () => {
    expect(validateForEmbedding(null as any).valid).toBe(false)
    expect(validateForEmbedding(undefined as any).valid).toBe(false)
  })

  it("should reject empty string", () => {
    const result = validateForEmbedding("")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("non-empty")
  })

  it("should reject text that is too short after sanitization", () => {
    const result = validateForEmbedding("ab")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("too short")
  })

  it("should reject whitespace-only text", () => {
    const result = validateForEmbedding("   \n\t   ")
    expect(result.valid).toBe(false)
  })

  it("should accept minimum length text", () => {
    const result = validateForEmbedding("abc")
    expect(result.valid).toBe(true)
  })
})

describe("prepareTextForEmbedding", () => {
  it("should sanitize and validate text", () => {
    const result = prepareTextForEmbedding("  Hello World  ")
    expect(result.valid).toBe(true)
    expect(result.text).toBe("Hello World")
    expect(result.warnings).toEqual([])
  })

  it("should return warnings for problematic text when logging enabled", () => {
    const longText = "a".repeat(60000)
    // When logWarnings is true (default), warnings are returned
    const result = prepareTextForEmbedding(longText)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it("should skip warnings when logWarnings is false", () => {
    const longText = "a".repeat(60000)
    const result = prepareTextForEmbedding(longText, { logWarnings: false })
    expect(result.warnings.length).toBe(0)
  })

  it("should include context in warnings", () => {
    // This test checks the function accepts context parameter
    const result = prepareTextForEmbedding("valid text", { context: "test-context" })
    expect(result.valid).toBe(true)
  })

  it("should return error for invalid text", () => {
    const result = prepareTextForEmbedding("")
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it("should handle text with mixed issues", () => {
    const text = "   \x00Hello\x01World\x02   "
    const result = prepareTextForEmbedding(text)
    expect(result.valid).toBe(true)
    expect(result.text).toBe("HelloWorld")
  })
})
