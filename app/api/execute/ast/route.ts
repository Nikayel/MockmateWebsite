/**
 * AST-Based Code Execution API
 *
 * This endpoint uses true AST parsing to:
 * 1. Extract function signature from reference solution
 * 2. Auto-generate test inputs from type hints
 * 3. Run both reference and user code
 * 4. Compare outputs
 *
 * No hardcoded test cases needed!
 */

import { NextRequest, NextResponse } from "next/server"
import { executeRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { logger } from "@/lib/logger"
import {
  extractSignature,
  generateInputsFromSignature,
  validateWithAST,
  type FunctionSignature,
} from "@/lib/validators"

export const dynamic = "force-dynamic"

// Example reference solutions for common problems
const REFERENCE_SOLUTIONS: Record<string, { code: string; functionName: string }> = {
  "two-sum": {
    functionName: "twoSum",
    code: `
def twoSum(nums: list[int], target: int) -> list[int]:
    """Find two indices whose values sum to target."""
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []
`,
  },
  "valid-palindrome": {
    functionName: "isPalindrome",
    code: `
def isPalindrome(s: str) -> bool:
    """Check if string is a valid palindrome."""
    s = ''.join(c.lower() for c in s if c.isalnum())
    return s == s[::-1]
`,
  },
  "reverse-string": {
    functionName: "reverseString",
    code: `
def reverseString(s: list[str]) -> list[str]:
    """Reverse a list of characters in-place."""
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1
    return s
`,
  },
  "contains-duplicate": {
    functionName: "containsDuplicate",
    code: `
def containsDuplicate(nums: list[int]) -> bool:
    """Check if array contains any duplicates."""
    return len(nums) != len(set(nums))
`,
  },
  "maximum-subarray": {
    functionName: "maxSubArray",
    code: `
def maxSubArray(nums: list[int]) -> int:
    """Find the contiguous subarray with the largest sum."""
    max_sum = current_sum = nums[0]
    for n in nums[1:]:
        current_sum = max(n, current_sum + n)
        max_sum = max(max_sum, current_sum)
    return max_sum
`,
  },
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await executeRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Enforce quota — requireAuth: AST execution runs code via Piston (cost-bearing),
  // so signed-out callers are rejected with 401 "please sign in".
  const quotaResult = await enforceQuota(request, { requireAuth: true })
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  try {
    const {
      code,
      scenarioId,
      language = "python",
      // Optional: provide custom reference solution
      referenceSolution,
      functionName: customFunctionName,
      testCount = 5,
    } = await request.json()

    logger.info("AST Execute API called", { scenarioId, language })

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    // Get reference solution
    let refSolution: string
    let funcName: string

    if (referenceSolution && customFunctionName) {
      // Use provided reference
      refSolution = referenceSolution
      funcName = customFunctionName
    } else if (scenarioId && REFERENCE_SOLUTIONS[scenarioId]) {
      // Use built-in reference
      refSolution = REFERENCE_SOLUTIONS[scenarioId].code
      funcName = REFERENCE_SOLUTIONS[scenarioId].functionName
    } else {
      return NextResponse.json(
        { error: "Either scenarioId or referenceSolution+functionName required" },
        { status: 400 }
      )
    }

    // Step 1: Extract signature from reference (for debugging/info)
    const signature = await extractSignature(
      refSolution,
      language as "python" | "javascript",
      funcName
    )

    if ("error" in signature) {
      return NextResponse.json(
        { error: `Failed to parse reference solution: ${signature.error}` },
        { status: 400 }
      )
    }

    const funcSignature = Array.isArray(signature) ? signature[0] : signature

    // Step 2: Run full AST-based validation
    const validationResult = await validateWithAST(
      code,
      refSolution,
      language as "python" | "javascript" | "typescript",
      funcName,
      testCount
    )

    // Format results for frontend compatibility
    const results = validationResult.results.map((r, i) => ({
      description: `Test case ${i + 1}`,
      input: r.input,
      expected: r.expected,
      actual: r.actual,
      passed: r.passed,
      error: r.error || null,
    }))

    const passedCount = results.filter((r) => r.passed).length
    const totalCount = results.length
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

    return NextResponse.json({
      success: validationResult.passed,
      results,
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        passRate,
      },
      // AST-specific info
      ast: {
        referenceSignature: validationResult.referenceSignature,
        userSignature: validationResult.userSignature,
        signatureMatch: validationResult.signatureMatch,
        // Show what types were detected
        detectedParams: funcSignature?.params?.map((p) => ({
          name: p.name,
          type: p.type?.name || "unknown",
          kind: p.type?.kind || "unknown",
        })),
      },
      error: null,
    })
  } catch (error) {
    logger.error("AST Execute API error", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute code" },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to extract signature from code (useful for debugging)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const scenarioId = searchParams.get("scenarioId")

  if (!scenarioId || !REFERENCE_SOLUTIONS[scenarioId]) {
    return NextResponse.json({
      availableScenarios: Object.keys(REFERENCE_SOLUTIONS),
      message: "Provide ?scenarioId=two-sum to see signature",
    })
  }

  const ref = REFERENCE_SOLUTIONS[scenarioId]
  const signature = await extractSignature(ref.code, "python", ref.functionName)

  return NextResponse.json({
    scenarioId,
    functionName: ref.functionName,
    signature,
    referenceSolution: ref.code,
  })
}
