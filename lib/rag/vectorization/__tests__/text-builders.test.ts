import { describe, expect, it } from "vitest"
import type {
  AddFunctionalityScenario,
  BugFixScenario,
  DSAScenario,
  SystemDesignScenario,
} from "@/lib/scenarios/types"
import { addFunctionalityToEmbeddingText } from "../text-builders/add-functionality-text"
import { bugFixToEmbeddingText } from "../text-builders/bugfix-text"
import {
  companyToEmbeddingText,
  mustKnowQuestionToEmbeddingText,
} from "../text-builders/company-text"
import { scenarioToEmbeddingText } from "../text-builders/dsa-text"
import { systemDesignToEmbeddingText } from "../text-builders/system-design-text"
import type { CompanyQuestionData } from "@/lib/data/company-questions"

describe("vectorization text builders", () => {
  it("builds rich DSA text with metadata, examples, hints, and edge cases", () => {
    const scenario = {
      id: "dsa-two-sum",
      title: "Two Sum",
      type: "dsa",
      pattern: "arrays-hashing",
      difficulty: "easy",
      companies: ["Google"],
      tags: ["array", "hash-map"],
      problemStatement: "Find two numbers that add up to target.",
      constraints: ["2 <= nums.length <= 10^4"],
      examples: [{ input: "nums=[2,7], target=9", output: "[0,1]", explanation: "2 + 7 = 9" }],
      testCases: [
        { input: [[2, 7], 9], expected: [0, 1], description: "basic pair" },
        { input: [[3, 3], 6], expected: [0, 1], description: "edge duplicate values" },
      ],
      hints: ["Use a hash map."],
      optimalComplexity: { time: "O(n)", space: "O(n)" },
      estimatedTime: 15,
    } as unknown as DSAScenario

    const text = scenarioToEmbeddingText(scenario)

    expect(text).toContain("# Two Sum")
    expect(text).toContain("Pattern: arrays-hashing")
    expect(text).toContain("Companies: Google")
    expect(text).toContain("## Test Cases (2 total)")
    expect(text).toContain("[EDGE CASE]")
    expect(text).toContain("Time: O(n)")
  })

  it("builds system design text with requirements, architecture, and trade-offs", () => {
    const scenario = {
      id: "system-design-url-shortener",
      title: "Design a URL Shortener",
      difficulty: "medium",
      companies: ["Meta"],
      estimatedTime: 45,
      tags: ["system-design"],
      problemStatement: "Design a URL shortener.",
      functionalRequirements: ["Create short links"],
      nonFunctionalRequirements: ["Low latency"],
      constraints: ["100M URLs"],
      keyComponents: ["API", "Database"],
      hints: ["Discuss ID generation"],
      evaluationCriteria: [{ category: "Scalability", weight: 40, description: "Handles load" }],
      exampleSolution: {
        overview: "Use an API and durable storage.",
        architecture: ["Load balancer", "App servers"],
        dataModel: ["short_code -> long_url"],
        apiDesign: ["POST /links"],
        scalability: ["Cache popular redirects"],
        tradeoffs: ["Random IDs vs sequential IDs"],
      },
      discussionPoints: ["Collision handling"],
    } as unknown as SystemDesignScenario

    const text = systemDesignToEmbeddingText(scenario)

    expect(text).toContain("# Design a URL Shortener")
    expect(text).toContain("## Functional Requirements")
    expect(text).toContain("- API")
    expect(text).toContain("POST /links")
    expect(text).toContain("Collision handling")
  })

  it("builds bugfix text with representative code and test cases", () => {
    const scenario = {
      id: "bugfix-race-condition",
      title: "Fix Search Race Condition",
      difficulty: "medium",
      companies: ["Airbnb"],
      estimatedTime: 25,
      tags: ["async"],
      problemStatement: "Fix stale search results.",
      bugDescription: "Older requests can overwrite newer results.",
      expectedBehavior: "Only latest response updates state.",
      buggyCode: { javascript: "async function search(q) { return fetch(q) }" },
      codebaseFiles: {
        javascript: [
          {
            fileName: "search.test.js",
            description: "Regression tests for rapid typing search behavior",
            content: "expect(latestQuery).toBe('ab')",
          },
        ],
      },
      hints: ["Track request identity."],
      testCases: [{ input: ["a", "ab"], expected: "ab", description: "edge rapid typing" }],
    } as unknown as BugFixScenario

    const text = bugFixToEmbeddingText(scenario)

    expect(text).toContain("# Fix Search Race Condition")
    expect(text).toContain("## Buggy Code (javascript)")
    expect(text).toContain("## Codebase Files")
    expect(text).toContain("search.test.js")
    expect(text).toContain("Regression tests for rapid typing search behavior")
    expect(text).toContain("Older requests can overwrite newer results.")
    expect(text).toContain("[EDGE CASE]")
  })

  it("builds add-functionality text with requirements and workspace files", () => {
    const scenario = {
      id: "add-feature-search",
      title: "Add Search",
      difficulty: "medium",
      companies: ["Slack"],
      estimatedTime: 45,
      tags: ["search"],
      problemStatement: "Add search to support tickets.",
      featureRequirements: ["Filter by query"],
      acceptanceCriteria: ["Returns ranked matches"],
      existingCode: { python: "def search(): pass" },
      hints: ["Keep ranking deterministic."],
      workspace: {
        language: "python",
        primaryFilePath: "src/search.py",
        editableFilePaths: ["src/search.py"],
        visibleTestPaths: ["tests/test_search.py"],
        hiddenTestPaths: ["tests/test_search_hidden.py"],
        testRunnerPath: "tests/run.py",
        files: [
          {
            path: "src/search.py",
            role: "editable",
            language: "python",
            content: "def search(): pass",
            description: "Search service",
          },
        ],
      },
    } as unknown as AddFunctionalityScenario

    const text = addFunctionalityToEmbeddingText(scenario)

    expect(text).toContain("# Add Search")
    expect(text).toContain("## Feature Requirements")
    expect(text).toContain("Role: editable")
    expect(text).toContain("tests/test_search.py")
    expect(text).toContain("tests/test_search_hidden.py")
  })

  it("builds company and must-know question text", () => {
    const company = {
      id: "google",
      name: "Google",
      difficultyDistribution: { easy: 20, medium: 60, hard: 20 },
      topPatterns: [
        {
          pattern: "graphs",
          frequency: 80,
          priority: 9,
          typicalDifficulty: "medium",
        },
      ],
      mustKnowQuestions: [
        {
          scenarioId: "dsa-word-ladder",
          title: "Word Ladder",
          frequency: "High",
          variants: ["Bidirectional BFS"],
        },
      ],
      interviewProcess: {
        totalRounds: 5,
        timeline: "2-4 weeks",
        rounds: [
          {
            type: "coding",
            duration: 45,
            description: "DSA screen",
            focusAreas: ["graphs"],
          },
        ],
        tips: ["Explain trade-offs"],
      },
      interviewStyle: {
        pace: "moderate",
        communicationEmphasis: 8,
        codeQualityEmphasis: 8,
        optimalSolutionRequired: true,
        allowsPseudocode: false,
        providesHints: true,
        uniqueTraits: ["Follow-up heavy"],
      },
    } as unknown as CompanyQuestionData

    const companyText = companyToEmbeddingText(company)
    const questionText = mustKnowQuestionToEmbeddingText(company.mustKnowQuestions[0], company)

    expect(companyText).toContain("# Google Interview Preparation")
    expect(companyText).toContain("- graphs: 80% frequency")
    expect(companyText).toContain("Round 1: coding")
    expect(questionText).toContain("# Word Ladder")
    expect(questionText).toContain("Company: Google")
    expect(questionText).toContain("Bidirectional BFS")
  })
})
