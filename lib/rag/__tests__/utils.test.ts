/**
 * Tests for RAG utility functions
 */

import {
  cosineSimilarity,
  withTimeout,
  TimeoutError,
  validateRAGQuery,
  validateProblemText,
  validateUserCode,
  sanitizeRAGOutput,
  getCircuitBreakerState,
  recordFailure,
  recordSuccess,
  isCircuitOpen,
} from "../utils"

describe("cosineSimilarity", () => {
  it("should return 1 for identical vectors", () => {
    const vec = [1, 2, 3, 4, 5]
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5)
  })

  it("should return 0 for orthogonal vectors", () => {
    const vec1 = [1, 0, 0]
    const vec2 = [0, 1, 0]
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5)
  })

  it("should return -1 for opposite vectors", () => {
    const vec1 = [1, 2, 3]
    const vec2 = [-1, -2, -3]
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 5)
  })

  it("should handle zero vectors", () => {
    const vec1 = [0, 0, 0]
    const vec2 = [1, 2, 3]
    expect(cosineSimilarity(vec1, vec2)).toBe(0)
  })

  it("should throw for vectors of different lengths", () => {
    const vec1 = [1, 2, 3]
    const vec2 = [1, 2]
    expect(() => cosineSimilarity(vec1, vec2)).toThrow("Vectors must have same length")
  })

  it("should calculate correct similarity for normalized vectors", () => {
    const vec1 = [0.6, 0.8, 0]
    const vec2 = [0.8, 0.6, 0]
    // dot product = 0.48 + 0.48 = 0.96
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.96, 2)
  })
})

describe("withTimeout", () => {
  it("should resolve if promise completes before timeout", async () => {
    const result = await withTimeout(Promise.resolve("success"), 1000, "test operation")
    expect(result).toBe("success")
  })

  it("should reject with TimeoutError if promise exceeds timeout", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 200))

    await expect(withTimeout(slowPromise, 50, "slow operation")).rejects.toThrow(TimeoutError)
  })

  it("should include operation name in timeout error", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 200))

    try {
      await withTimeout(slowPromise, 50, "my-operation")
      fail("Should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(TimeoutError)
      expect((error as TimeoutError).message).toContain("my-operation")
      expect((error as TimeoutError).timeoutMs).toBe(50)
    }
  })

  it("should propagate original error if promise rejects", async () => {
    const failingPromise = Promise.reject(new Error("original error"))

    await expect(withTimeout(failingPromise, 1000, "test")).rejects.toThrow("original error")
  })
})

describe("validateRAGQuery", () => {
  it("should accept valid queries", () => {
    const result = validateRAGQuery("What is a binary tree?")
    expect(result.valid).toBe(true)
    expect(result.sanitized).toBe("What is a binary tree?")
  })

  it("should reject empty queries", () => {
    expect(validateRAGQuery("").valid).toBe(false)
    expect(validateRAGQuery("   ").valid).toBe(false)
  })

  it("should reject null/undefined queries", () => {
    expect(validateRAGQuery(null as any).valid).toBe(false)
    expect(validateRAGQuery(undefined as any).valid).toBe(false)
  })

  it("should trim whitespace", () => {
    const result = validateRAGQuery("  hello world  ")
    expect(result.sanitized).toBe("hello world")
  })

  it("should remove control characters", () => {
    const result = validateRAGQuery("hello\x00\x01world")
    expect(result.sanitized).toBe("helloworld")
  })

  it("should reject queries exceeding max length", () => {
    const longQuery = "a".repeat(6000)
    const result = validateRAGQuery(longQuery)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("maximum length")
  })
})

describe("validateProblemText", () => {
  it("should accept valid problem text", () => {
    const result = validateProblemText(
      "Given an array of integers, find the two numbers that add up to target."
    )
    expect(result.valid).toBe(true)
  })

  it("should reject empty text", () => {
    expect(validateProblemText("").valid).toBe(false)
    expect(validateProblemText("   ").valid).toBe(false)
  })

  it("should reject text exceeding max length", () => {
    const longText = "a".repeat(11000)
    const result = validateProblemText(longText)
    expect(result.valid).toBe(false)
  })
})

describe("validateUserCode", () => {
  it("should accept valid code", () => {
    const code = `function twoSum(nums, target) {
      const map = new Map();
      for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
          return [map.get(complement), i];
        }
        map.set(nums[i], i);
      }
      return [];
    }`
    const result = validateUserCode(code)
    expect(result.valid).toBe(true)
  })

  it("should accept empty code (optional field)", () => {
    expect(validateUserCode("").valid).toBe(true)
    expect(validateUserCode("").sanitized).toBe("")
  })

  it("should reject code exceeding max length", () => {
    const longCode = "x".repeat(51000)
    const result = validateUserCode(longCode)
    expect(result.valid).toBe(false)
  })
})

describe("sanitizeRAGOutput", () => {
  it("should escape HTML tags", () => {
    const result = sanitizeRAGOutput('<script>alert("xss")</script>')
    expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;')
  })

  it("should truncate long output", () => {
    const longText = "a".repeat(15000)
    const result = sanitizeRAGOutput(longText, 10000)
    expect(result.length).toBe(10000)
  })

  it("should handle empty input", () => {
    expect(sanitizeRAGOutput("")).toBe("")
    expect(sanitizeRAGOutput(null as any)).toBe("")
  })
})

describe("Circuit Breaker", () => {
  const serviceName = "test-service"

  beforeEach(() => {
    // Reset state by recording success
    for (let i = 0; i < 10; i++) {
      recordSuccess(serviceName)
    }
  })

  it("should start with circuit closed", () => {
    expect(isCircuitOpen(serviceName)).toBe(false)
    const state = getCircuitBreakerState(serviceName)
    expect(state.isOpen).toBe(false)
    expect(state.failures).toBe(0)
  })

  it("should open circuit after threshold failures", () => {
    for (let i = 0; i < 5; i++) {
      recordFailure(serviceName)
    }

    expect(isCircuitOpen(serviceName)).toBe(true)
    const state = getCircuitBreakerState(serviceName)
    expect(state.isOpen).toBe(true)
    expect(state.failures).toBe(5)
  })

  it("should close circuit on success", () => {
    for (let i = 0; i < 5; i++) {
      recordFailure(serviceName)
    }
    expect(isCircuitOpen(serviceName)).toBe(true)

    recordSuccess(serviceName)
    expect(isCircuitOpen(serviceName)).toBe(false)

    const state = getCircuitBreakerState(serviceName)
    expect(state.failures).toBe(0)
  })

  it("should track multiple services independently", () => {
    const service1 = "service-1-" + Date.now()
    const service2 = "service-2-" + Date.now()

    for (let i = 0; i < 5; i++) {
      recordFailure(service1)
    }

    expect(isCircuitOpen(service1)).toBe(true)
    expect(isCircuitOpen(service2)).toBe(false)
  })
})
