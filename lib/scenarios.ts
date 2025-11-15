/**
 * Interview scenarios for MockMate
 * Shared between website and extension
 */

export type ScenarioType = 'dsa' | 'bugfix' | 'optimization' | 'security' | 'system-design';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type Company = 'Google' | 'Meta' | 'Amazon' | 'Netflix' | 'Apple' | 'Microsoft' | 'Startup' | 'Generic';

export interface BaseScenario {
  id: string;
  title: string;
  type: ScenarioType;
  difficulty: DifficultyLevel;
  companies: Company[];
  description: string;
  tags: string[];
  estimatedTime: number; // in minutes
}

export interface DSAScenario extends BaseScenario {
  type: 'dsa';
  problemStatement: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  hints: string[];
  starterCode?: {
    [language: string]: string;
  };
  optimalComplexity: {
    time: string;
    space: string;
  };
}

export type Scenario = DSAScenario;

export const scenarios: Scenario[] = [
  {
    id: 'dsa-two-sum',
    title: 'Two Sum',
    type: 'dsa',
    difficulty: 'easy',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple'],
    description: 'Find two numbers in an array that add up to a target value',
    tags: ['array', 'hash-table', 'two-pointers'],
    estimatedTime: 15,
    problemStatement: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0,1]',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    hints: [
      'Try using a hash map to store values you\'ve already seen',
      'For each number, check if (target - current number) exists in your hash map',
      'The optimal solution has O(n) time complexity',
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {
  // Write your solution here
  
}`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
  // Write your solution here
  
}`,
      python: `def twoSum(nums, target):
    # Write your solution here
    pass`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)',
    },
  },
  {
    id: 'dsa-valid-parentheses',
    title: 'Valid Parentheses',
    type: 'dsa',
    difficulty: 'easy',
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    description: 'Determine if a string containing parentheses is valid',
    tags: ['stack', 'string'],
    estimatedTime: 15,
    problemStatement: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: 'true',
      },
      {
        input: 's = "()[]{}"',
        output: 'true',
      },
      {
        input: 's = "(]"',
        output: 'false',
      },
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only \'()[]{}\'.',
    ],
    hints: [
      'Use a stack to keep track of opening brackets',
      'When you see a closing bracket, check if it matches the top of the stack',
      'The string is valid if the stack is empty at the end',
    ],
    starterCode: {
      javascript: `function isValid(s) {
  // Write your solution here
  
}`,
    },
    optimalComplexity: {
      time: 'O(n)',
      space: 'O(n)',
    },
  },
];

export function filterScenarios(filters: {
  type?: ScenarioType[];
  difficulty?: DifficultyLevel[];
  companies?: Company[];
  searchQuery?: string;
}): Scenario[] {
  return scenarios.filter((scenario) => {
    if (filters.type && filters.type.length > 0 && !filters.type.includes(scenario.type)) {
      return false;
    }
    if (filters.difficulty && filters.difficulty.length > 0 && !filters.difficulty.includes(scenario.difficulty)) {
      return false;
    }
    if (filters.companies && filters.companies.length > 0) {
      const hasMatchingCompany = filters.companies.some((company) =>
        scenario.companies.includes(company)
      );
      if (!hasMatchingCompany) return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTitle = scenario.title.toLowerCase().includes(query);
      const matchesDescription = scenario.description.toLowerCase().includes(query);
      const matchesTags = scenario.tags.some((tag) => tag.toLowerCase().includes(query));
      if (!matchesTitle && !matchesDescription && !matchesTags) return false;
    }
    return true;
  });
}

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}

