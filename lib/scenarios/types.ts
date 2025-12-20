/**
 * Shared types for interview scenarios
 * Separated for tree-shaking and module optimization
 */

import { DSAPattern } from '../types/dsa-patterns'

export type ScenarioType = 'dsa' | 'bugfix' | 'optimization' | 'security' | 'system-design' | 'add-functionality'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'
export type Company =
  | 'Google'
  | 'Meta'
  | 'Amazon'
  | 'Netflix'
  | 'Apple'
  | 'Microsoft'
  | 'Startup'
  | 'Generic'
  | 'Airbnb'
  | 'Shopify'
  | 'Walmart'
  | 'Stripe'
  | 'Slack'
  | 'Notion'
  | 'Figma'
  | 'Discord'

export interface BaseScenario {
  id: string
  title: string
  type: ScenarioType
  difficulty: DifficultyLevel
  companies: Company[]
  description: string
  tags: string[]
  estimatedTime: number // in minutes
}

export interface DSAScenario extends BaseScenario {
  type: 'dsa'
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
  }[]
}

export interface BugFixScenario extends BaseScenario {
  type: 'bugfix'
  problemStatement: string
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
  hints: string[]
  testCases: {
    input: any
    expected: any
    description: string
  }[]
}

export interface SystemDesignScenario extends BaseScenario {
  type: 'system-design'
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

export type Scenario = DSAScenario | BugFixScenario | SystemDesignScenario

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
