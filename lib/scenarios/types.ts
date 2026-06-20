/**
 * Shared types for interview scenarios
 * Separated for tree-shaking and module optimization
 */

import { DSAPattern } from "../types/dsa-patterns"
import type { ValidatorConfig, ReferenceSolution } from "../validators/types"

export type ScenarioType =
  | "dsa"
  | "bugfix"
  | "optimization"
  | "security"
  | "system-design"
  | "add-functionality"
export type DifficultyLevel = "easy" | "medium" | "hard"
export type Company =
  | "Google"
  | "Meta"
  | "Amazon"
  | "Netflix"
  | "Apple"
  | "Microsoft"
  | "Startup"
  | "Generic"
  | "Airbnb"
  | "Shopify"
  | "Walmart"
  | "Stripe"
  | "Slack"
  | "Notion"
  | "Figma"
  | "Discord"
  | "LinkedIn"
  | "Bloomberg"
  | "Cloudflare"
  | "Algolia"
  | "Elasticsearch"
  | "Twitter"
  | "Uber"
  | "Lyft"
  | "DoorDash"
  | "Instacart"
  | "eBay"
  | "Alibaba"
  | "Dropbox"
  | "Box"
  | "Goldman Sachs"
  | "Jane Street"
  | "Coinbase"
  | "Robinhood"
  | "Square"
  | "Databricks"
  | "Snowflake"
  | "Palantir"
  | "Veeva"
  | "Salesforce"
  // Popular tech companies for interns and new grads
  | "Roblox"
  | "TikTok"
  | "NVIDIA"
  | "Snap"
  | "Pinterest"
  | "Reddit"
  | "Atlassian"
  | "Oracle"
  | "Spotify"
  | "Twitch"
  | "ZipRecruiter"

export interface BaseScenario {
  id: string
  title: string
  type: ScenarioType
  difficulty: DifficultyLevel
  companies: Company[]
  description: string
  tags: string[]
  estimatedTime: number // in minutes
  executionMode?: "single-file" | "workspace"
  workspace?: WorkspaceScenarioConfig
}

export type WorkspaceScenarioLanguage = "javascript" | "typescript" | "python"
export type WorkspaceScenarioFileRole = "editable" | "readonly" | "test" | "docs"

export interface WorkspaceScenarioFile {
  path: string
  content: string
  role: WorkspaceScenarioFileRole
  language: WorkspaceScenarioLanguage | "markdown" | "json" | "text"
  description?: string
  hidden?: boolean
}

export interface WorkspaceScenarioConfig {
  language: WorkspaceScenarioLanguage
  primaryFilePath: string
  editableFilePaths: string[]
  visibleTestPaths: string[]
  hiddenTestPaths: string[]
  testRunnerPath: string
  files: WorkspaceScenarioFile[]
  referenceFiles?: WorkspaceScenarioFile[]
}

/**
 * Clarifying question that candidates should ask in "Real Interview Mode"
 */
export interface ClarifyingQuestion {
  /** The question topic/intent (used for semantic matching) */
  question: string
  /** Semantic topic for flexible LLM matching (e.g., "output_format", "edge_cases") */
  topic?: string
  /** The answer the interviewer would give */
  answer: string
  /** Is this critical to ask? Affects scoring */
  required: boolean
}

/**
 * Common wrong approach detection for proactive AI intervention
 */
export interface WrongApproach {
  /** Description of the suboptimal approach */
  description: string
  /** Keywords/patterns to detect in code (for hint matching, not regex) */
  codeSignals: string[]
  /** What the AI should say to nudge them */
  intervention: string
}

/**
 * Mid-coding probe for proactive AI engagement
 */
export interface MidCodingProbe {
  /** When to trigger this probe (semantic description) */
  trigger: string
  /** The question to ask */
  question: string
}

export interface DSAScenario extends BaseScenario {
  type: "dsa"
  pattern: DSAPattern
  problemStatement: string
  examples: {
    input: string
    output: string
    explanation?: string
  }[]
  constraints: string[]
  hints: string[]
  starterCode: {
    [language: string]: string
  }
  optimalComplexity: {
    time: string
    space: string
  }
  testCases: {
    input: any
    expected: any
    description: string
    compareAsSet?: boolean
    orderMatters?: boolean
    // Optional property-based validation config
    // If not provided, auto-detection kicks in based on scenario ID
    validation?: ValidatorConfig
  }[]
  // Optional reference solution for dynamic validation
  // Allows running canonical solution and comparing outputs
  referenceSolution?: ReferenceSolution

  // ==========================================
  // Real Interview Mode (Fuzzy Mode) Fields
  // ==========================================

  /** Vague problem statement for "Real Interview Mode" - requires candidate to ask clarifying Qs */
  fuzzyStatement?: string

  /** Expected clarifying questions - checked via batch LLM at phase transition */
  clarifyingQuestions?: ClarifyingQuestion[]

  // ==========================================
  // Proactive AI Interviewer Fields
  // ==========================================

  /** Common wrong approaches to detect and intervene on */
  commonWrongApproaches?: WrongApproach[]

  /** Problem-specific "what if" questions (e.g., "What if array is empty?") */
  whatIfQuestions?: string[]

  /** Context-aware probes to ask during coding */
  midCodingProbes?: MidCodingProbe[]

  /** When to push for optimization */
  optimizationPush?: {
    /** The suboptimal complexity that triggers the nudge */
    suboptimalComplexity: string
    /** The nudge message */
    nudge: string
  }

  /** Notes about correct implementation patterns - helps AI avoid incorrectly questioning correct code */
  correctPatternNotes?: string[]
}

export interface BugFixScenario extends BaseScenario {
  type: "bugfix"
  problemStatement: string
  userReport?: string
  observedSymptoms?: string[]
  reproductionSteps?: string[]
  visibleLogs?: string[]
  successCriteria?: string[]
  debuggingSkills?: string[]
  expectedTouchedFiles?: string[]
  rootCauseRubric?: string[]
  bugfixKind?: "real-codebase" | "micro-debugging"
  buggyCode: {
    [language: string]: string
  }
  codebaseFiles: {
    [language: string]: {
      fileName: string
      content: string
      description: string
    }[]
  }
  expectedBehavior: string
  bugDescription: string
  groundTruth?: string
  hints: string[]
  testCases: {
    input: any
    expected: any
    description: string
    compareAsSet?: boolean
    orderMatters?: boolean
    validation?: ValidatorConfig
  }[]
  referenceSolution?: ReferenceSolution
}

export interface SystemDesignScenario extends BaseScenario {
  type: "system-design"
  problemStatement: string
  functionalRequirements: string[]
  nonFunctionalRequirements: string[]
  constraints: string[]
  keyComponents: string[]
  hints: string[]
  evaluationCriteria: {
    category: string
    description: string
    weight: number
  }[]
  exampleSolution: {
    overview: string
    architecture: string[]
    dataModel: string[]
    apiDesign: string[]
    scalability: string[]
    tradeoffs: string[]
  }
  discussionPoints: string[]
}

export interface AddFunctionalityScenario extends BaseScenario {
  type: "add-functionality"
  problemStatement: string
  featureRequirements: string[]
  existingCode: {
    [language: string]: string
  }
  codebaseFiles: {
    [language: string]: {
      fileName: string
      content: string
      description: string
    }[]
  }
  hints: string[]
  testCases: {
    input: any
    expected: any
    description: string
    compareAsSet?: boolean
  }[]
  acceptanceCriteria: string[]
}

export type Scenario =
  | DSAScenario
  | BugFixScenario
  | SystemDesignScenario
  | AddFunctionalityScenario

// Scenario metadata for listing without loading full content
export interface ScenarioMeta {
  id: string
  title: string
  type: ScenarioType
  difficulty: DifficultyLevel
  companies: Company[]
  description: string
  tags: string[]
  estimatedTime: number
  pattern?: DSAPattern
}
