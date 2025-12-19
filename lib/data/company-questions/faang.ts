/**
 * FAANG+ Company Interview Data
 * Based on aggregated data from LeetCode, Glassdoor, Blind, and interview reports
 */

import { CompanyQuestionData } from './types'

export const googleData: CompanyQuestionData = {
  id: 'google',
  name: 'Google',
  logo: '/company-logos/google.svg',
  careers_url: 'https://careers.google.com',

  difficultyDistribution: {
    easy: 10,
    medium: 60,
    hard: 30
  },

  topPatterns: [
    { pattern: 'arrays-hashing', frequency: 95, priority: 10, typicalDifficulty: 'medium' },
    { pattern: 'binary-search', frequency: 85, priority: 9, typicalDifficulty: 'medium' },
    { pattern: 'trees', frequency: 80, priority: 9, typicalDifficulty: 'medium' },
    { pattern: 'bfs', frequency: 75, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'dfs', frequency: 75, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'dp-1d', frequency: 70, priority: 8, typicalDifficulty: 'hard' },
    { pattern: 'sliding-window', frequency: 65, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'two-pointers', frequency: 60, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'heap', frequency: 55, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'backtracking', frequency: 50, priority: 6, typicalDifficulty: 'hard' },
  ],

  mustKnowQuestions: [
    { scenarioId: 'two-sum', title: 'Two Sum', frequency: 'very_common', lastReported: '2024 Q4' },
    { scenarioId: 'lru-cache', title: 'LRU Cache', frequency: 'very_common', lastReported: '2024 Q4' },
    { scenarioId: 'number-of-islands', title: 'Number of Islands', frequency: 'very_common' },
    { scenarioId: 'merge-intervals', title: 'Merge Intervals', frequency: 'common' },
    { scenarioId: 'word-search', title: 'Word Search', frequency: 'common' },
    { scenarioId: 'serialize-deserialize-tree', title: 'Serialize and Deserialize Binary Tree', frequency: 'common' },
    { scenarioId: 'median-data-stream', title: 'Find Median from Data Stream', frequency: 'common' },
    { scenarioId: 'word-ladder', title: 'Word Ladder', frequency: 'occasional' },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      { type: 'phone_screen', duration: 45, description: 'Technical phone screen with Googler', focusAreas: ['coding', 'problem-solving'] },
      { type: 'coding', duration: 45, description: 'Onsite coding round 1', focusAreas: ['algorithms', 'data-structures'] },
      { type: 'coding', duration: 45, description: 'Onsite coding round 2', focusAreas: ['algorithms', 'optimization'] },
      { type: 'system_design', duration: 45, description: 'System design (L4+)', focusAreas: ['scalability', 'trade-offs'] },
      { type: 'behavioral', duration: 45, description: 'Googleyness & Leadership', focusAreas: ['culture-fit', 'leadership'] },
    ],
    timeline: '4-8 weeks',
    tips: [
      'Google values clean, readable code over clever one-liners',
      'Always discuss time/space complexity before coding',
      'Think out loud - communication is heavily weighted',
      'They often ask follow-up questions to optimize your solution',
      'Practice on Google Docs - no syntax highlighting!',
    ]
  },

  interviewStyle: {
    pace: 'moderate',
    communicationEmphasis: 9,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      'Interviewers often give hints if you\'re stuck',
      'Follow-up questions to optimize are common',
      'May ask you to code in Google Docs',
      'Strong emphasis on explaining your thought process',
    ]
  },

  compensation: {
    entryLevel: '$150k - $180k TC',
    midLevel: '$200k - $350k TC',
    seniorLevel: '$350k - $500k+ TC',
  }
}

export const metaData: CompanyQuestionData = {
  id: 'meta',
  name: 'Meta',
  logo: '/company-logos/meta.svg',
  careers_url: 'https://metacareers.com',

  difficultyDistribution: {
    easy: 15,
    medium: 65,
    hard: 20
  },

  topPatterns: [
    { pattern: 'arrays-hashing', frequency: 95, priority: 10, typicalDifficulty: 'medium' },
    { pattern: 'binary-search', frequency: 80, priority: 9, typicalDifficulty: 'medium' },
    { pattern: 'trees', frequency: 85, priority: 9, typicalDifficulty: 'medium' },
    { pattern: 'bfs', frequency: 70, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'dp-1d', frequency: 65, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'two-pointers', frequency: 75, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'sliding-window', frequency: 70, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'string', frequency: 65, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'linked-list', frequency: 55, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'stack', frequency: 50, priority: 6, typicalDifficulty: 'medium' },
  ],

  mustKnowQuestions: [
    { scenarioId: 'valid-palindrome', title: 'Valid Palindrome II', frequency: 'very_common', lastReported: '2024 Q4' },
    { scenarioId: 'random-pick-index', title: 'Random Pick with Weight', frequency: 'very_common' },
    { scenarioId: 'buildings-ocean-view', title: 'Buildings With an Ocean View', frequency: 'very_common' },
    { scenarioId: 'minimum-remove-parens', title: 'Minimum Remove to Make Valid Parentheses', frequency: 'common' },
    { scenarioId: 'nested-list-weight-sum', title: 'Nested List Weight Sum', frequency: 'common' },
    { scenarioId: 'binary-tree-vertical', title: 'Binary Tree Vertical Order Traversal', frequency: 'common' },
    { scenarioId: 'k-closest-points', title: 'K Closest Points to Origin', frequency: 'common' },
    { scenarioId: 'dot-product-sparse', title: 'Dot Product of Two Sparse Vectors', frequency: 'common' },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      { type: 'phone_screen', duration: 45, description: 'Initial technical screen', focusAreas: ['coding', 'problem-solving'] },
      { type: 'coding', duration: 45, description: 'Coding round 1 (2 problems)', focusAreas: ['algorithms', 'speed'] },
      { type: 'coding', duration: 45, description: 'Coding round 2 (2 problems)', focusAreas: ['algorithms', 'optimization'] },
      { type: 'behavioral', duration: 45, description: 'Behavioral round', focusAreas: ['culture-fit', 'past-projects'] },
    ],
    timeline: '3-5 weeks',
    tips: [
      'Meta expects 2 problems per 45-min round - practice speed!',
      'They use CoderPad with syntax highlighting',
      'Focus on getting a working solution first, then optimize',
      'Be ready to trace through examples by hand',
      'They value practical problem-solving over theoretical knowledge',
    ]
  },

  interviewStyle: {
    pace: 'fast',
    communicationEmphasis: 7,
    codeQualityEmphasis: 7,
    optimalSolutionRequired: false,
    allowsPseudocode: false,
    providesHints: true,
    uniqueTraits: [
      'Expect to solve 2 problems per round',
      'Speed matters - practice timed coding',
      'They use CoderPad (real IDE)',
      'Interviewers are often friendly and give hints',
    ]
  },

  compensation: {
    entryLevel: '$140k - $170k TC',
    midLevel: '$200k - $350k TC',
    seniorLevel: '$350k - $550k+ TC',
  }
}

export const amazonData: CompanyQuestionData = {
  id: 'amazon',
  name: 'Amazon',
  logo: '/company-logos/amazon.svg',
  careers_url: 'https://amazon.jobs',

  difficultyDistribution: {
    easy: 20,
    medium: 60,
    hard: 20
  },

  topPatterns: [
    { pattern: 'arrays-hashing', frequency: 90, priority: 10, typicalDifficulty: 'medium' },
    { pattern: 'trees', frequency: 80, priority: 9, typicalDifficulty: 'medium' },
    { pattern: 'bfs', frequency: 75, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'heap', frequency: 70, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'two-pointers', frequency: 65, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'sliding-window', frequency: 60, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'dp-1d', frequency: 55, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'string', frequency: 60, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'binary-search', frequency: 55, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'stack', frequency: 50, priority: 6, typicalDifficulty: 'medium' },
  ],

  mustKnowQuestions: [
    { scenarioId: 'two-sum', title: 'Two Sum', frequency: 'very_common', lastReported: '2024 Q4' },
    { scenarioId: 'lru-cache', title: 'LRU Cache', frequency: 'very_common' },
    { scenarioId: 'number-of-islands', title: 'Number of Islands', frequency: 'very_common' },
    { scenarioId: 'merge-k-sorted-lists', title: 'Merge K Sorted Lists', frequency: 'common' },
    { scenarioId: 'top-k-frequent-words', title: 'Top K Frequent Words', frequency: 'common' },
    { scenarioId: 'reorder-data-logs', title: 'Reorder Data in Log Files', frequency: 'common' },
    { scenarioId: 'critical-connections', title: 'Critical Connections in a Network', frequency: 'occasional' },
    { scenarioId: 'word-search-ii', title: 'Word Search II', frequency: 'occasional' },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      { type: 'phone_screen', duration: 60, description: 'OA + Phone screen', focusAreas: ['coding', 'LP'] },
      { type: 'coding', duration: 60, description: 'Loop 1: Coding + LP', focusAreas: ['algorithms', 'leadership-principles'] },
      { type: 'coding', duration: 60, description: 'Loop 2: Coding + LP', focusAreas: ['algorithms', 'leadership-principles'] },
      { type: 'system_design', duration: 60, description: 'Loop 3: System Design + LP', focusAreas: ['graphs', 'leadership-principles'] },
      { type: 'behavioral', duration: 60, description: 'Bar Raiser', focusAreas: ['leadership-principles', 'culture-fit'] },
    ],
    timeline: '2-4 weeks',
    tips: [
      'MEMORIZE the 16 Leadership Principles - every round includes LP questions!',
      'Use STAR format for behavioral questions',
      'Amazon OA is common - practice on HackerRank',
      'Bar Raiser round is critical - they can veto your hire',
      'Be ready with specific examples from your experience',
    ]
  },

  interviewStyle: {
    pace: 'moderate',
    communicationEmphasis: 8,
    codeQualityEmphasis: 7,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      'Every round includes Leadership Principles questions',
      'Bar Raiser has veto power',
      'Online Assessment (OA) is usually first',
      'Strong focus on behavioral/LP stories',
    ]
  },

  compensation: {
    entryLevel: '$130k - $160k TC',
    midLevel: '$180k - $300k TC',
    seniorLevel: '$300k - $500k+ TC',
  }
}

export const appleData: CompanyQuestionData = {
  id: 'apple',
  name: 'Apple',
  logo: '/company-logos/apple.svg',
  careers_url: 'https://apple.com/careers',

  difficultyDistribution: {
    easy: 25,
    medium: 55,
    hard: 20
  },

  topPatterns: [
    { pattern: 'arrays-hashing', frequency: 85, priority: 9, typicalDifficulty: 'medium' },
    { pattern: 'trees', frequency: 75, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'linked-list', frequency: 70, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'string', frequency: 70, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'two-pointers', frequency: 65, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'binary-search', frequency: 60, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'stack', frequency: 55, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'sorting', frequency: 55, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'bfs', frequency: 50, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'dp-1d', frequency: 45, priority: 5, typicalDifficulty: 'hard' },
  ],

  mustKnowQuestions: [
    { scenarioId: 'reverse-linked-list', title: 'Reverse Linked List', frequency: 'very_common' },
    { scenarioId: 'valid-parentheses', title: 'Valid Parentheses', frequency: 'very_common' },
    { scenarioId: 'merge-sorted-array', title: 'Merge Sorted Array', frequency: 'common' },
    { scenarioId: 'lca-binary-tree', title: 'Lowest Common Ancestor', frequency: 'common' },
    { scenarioId: 'string-to-integer', title: 'String to Integer (atoi)', frequency: 'common' },
    { scenarioId: 'design-phone-directory', title: 'Design Phone Directory', frequency: 'occasional' },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      { type: 'phone_screen', duration: 45, description: 'Technical recruiter call', focusAreas: ['background', 'motivation'] },
      { type: 'phone_screen', duration: 60, description: 'Technical phone screen', focusAreas: ['coding', 'domain-knowledge'] },
      { type: 'coding', duration: 60, description: 'Onsite coding round', focusAreas: ['algorithms', 'code-quality'] },
      { type: 'system_design', duration: 60, description: 'Domain-specific design', focusAreas: ['design', 'domain-expertise'] },
      { type: 'behavioral', duration: 60, description: 'Hiring manager round', focusAreas: ['culture-fit', 'team-fit'] },
    ],
    timeline: '4-8 weeks',
    tips: [
      'Apple is very secretive - don\'t expect to know the team until late',
      'Domain expertise matters more than at other companies',
      'Code quality and attention to detail is paramount',
      'Be prepared for questions about Apple products you use',
      'Process is slower than other FAANG companies',
    ]
  },

  interviewStyle: {
    pace: 'relaxed',
    communicationEmphasis: 7,
    codeQualityEmphasis: 9,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      'Very secretive about team/project until offer',
      'Domain expertise is highly valued',
      'Code quality > speed',
      'May ask about Apple products you use',
    ]
  },

  compensation: {
    entryLevel: '$140k - $170k TC',
    midLevel: '$200k - $350k TC',
    seniorLevel: '$350k - $500k+ TC',
  }
}

export const netflixData: CompanyQuestionData = {
  id: 'netflix',
  name: 'Netflix',
  logo: '/company-logos/netflix.svg',
  careers_url: 'https://jobs.netflix.com',

  difficultyDistribution: {
    easy: 10,
    medium: 50,
    hard: 40
  },

  topPatterns: [
    { pattern: 'graphs', frequency: 90, priority: 10, typicalDifficulty: 'hard' },
    { pattern: 'arrays-hashing', frequency: 80, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'trees', frequency: 70, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'bfs', frequency: 70, priority: 7, typicalDifficulty: 'hard' },
    { pattern: 'dp-1d', frequency: 65, priority: 7, typicalDifficulty: 'hard' },
    { pattern: 'heap', frequency: 60, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'binary-search', frequency: 55, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'sliding-window', frequency: 50, priority: 5, typicalDifficulty: 'medium' },
  ],

  mustKnowQuestions: [
    { scenarioId: 'design-netflix', title: 'Design Netflix Streaming', frequency: 'very_common' },
    { scenarioId: 'rate-limiter', title: 'Rate Limiter', frequency: 'common' },
    { scenarioId: 'lru-cache', title: 'LRU Cache', frequency: 'common' },
    { scenarioId: 'topological-sort', title: 'Course Schedule', frequency: 'occasional' },
  ],

  interviewProcess: {
    totalRounds: 5,
    rounds: [
      { type: 'phone_screen', duration: 60, description: 'Hiring manager screen', focusAreas: ['experience', 'culture'] },
      { type: 'coding', duration: 60, description: 'Technical coding round', focusAreas: ['algorithms', 'code-quality'] },
      { type: 'system_design', duration: 60, description: 'System design deep-dive', focusAreas: ['architecture', 'scale'] },
      { type: 'behavioral', duration: 60, description: 'Culture fit - Netflix values', focusAreas: ['culture', 'judgment'] },
      { type: 'team_match', duration: 60, description: 'Cross-functional interview', focusAreas: ['collaboration', 'impact'] },
    ],
    timeline: '3-6 weeks',
    tips: [
      'Read and internalize the Netflix Culture Deck',
      'System design is weighted heavily - know distributed systems',
      'Netflix hires senior/experienced engineers primarily',
      'Be ready to discuss salary expectations early',
      'Demonstrate independent judgment and ownership',
    ]
  },

  interviewStyle: {
    pace: 'moderate',
    communicationEmphasis: 8,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: true,
    allowsPseudocode: false,
    providesHints: false,
    uniqueTraits: [
      'Senior-heavy hiring - fewer entry-level positions',
      'System design is critical',
      'Netflix Culture Deck is essential reading',
      'They discuss compensation early in process',
    ]
  },

  compensation: {
    entryLevel: 'Rare - primarily hires experienced',
    midLevel: '$300k - $450k TC',
    seniorLevel: '$450k - $700k+ TC',
  }
}

export const microsoftData: CompanyQuestionData = {
  id: 'microsoft',
  name: 'Microsoft',
  logo: '/company-logos/microsoft.svg',
  careers_url: 'https://careers.microsoft.com',

  difficultyDistribution: {
    easy: 25,
    medium: 55,
    hard: 20
  },

  topPatterns: [
    { pattern: 'arrays-hashing', frequency: 90, priority: 10, typicalDifficulty: 'medium' },
    { pattern: 'trees', frequency: 80, priority: 9, typicalDifficulty: 'medium' },
    { pattern: 'string', frequency: 75, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'linked-list', frequency: 70, priority: 8, typicalDifficulty: 'medium' },
    { pattern: 'bfs', frequency: 65, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'binary-search', frequency: 60, priority: 7, typicalDifficulty: 'medium' },
    { pattern: 'dp-1d', frequency: 55, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'stack', frequency: 55, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'two-pointers', frequency: 50, priority: 6, typicalDifficulty: 'medium' },
    { pattern: 'sorting', frequency: 50, priority: 5, typicalDifficulty: 'easy' },
  ],

  mustKnowQuestions: [
    { scenarioId: 'two-sum', title: 'Two Sum', frequency: 'very_common' },
    { scenarioId: 'reverse-linked-list', title: 'Reverse Linked List', frequency: 'very_common' },
    { scenarioId: 'validate-bst', title: 'Validate Binary Search Tree', frequency: 'common' },
    { scenarioId: 'serialize-deserialize-tree', title: 'Serialize and Deserialize Binary Tree', frequency: 'common' },
    { scenarioId: 'meeting-rooms-ii', title: 'Meeting Rooms II', frequency: 'common' },
    { scenarioId: 'spiral-matrix', title: 'Spiral Matrix', frequency: 'occasional' },
  ],

  interviewProcess: {
    totalRounds: 4,
    rounds: [
      { type: 'phone_screen', duration: 45, description: 'Initial technical screen', focusAreas: ['coding', 'background'] },
      { type: 'coding', duration: 45, description: 'Coding round 1', focusAreas: ['algorithms', 'problem-solving'] },
      { type: 'coding', duration: 45, description: 'Coding round 2', focusAreas: ['algorithms', 'design'] },
      { type: 'behavioral', duration: 45, description: '"As Appropriate" interview', focusAreas: ['culture-fit', 'growth-mindset'] },
    ],
    timeline: '2-4 weeks',
    tips: [
      'Microsoft values Growth Mindset - show you love learning',
      'They appreciate clean, readable code',
      'Be ready to discuss past projects in depth',
      '"As Appropriate" is the hiring manager or senior decision maker',
      'They use a variety of tools including whiteboard and IDE',
    ]
  },

  interviewStyle: {
    pace: 'moderate',
    communicationEmphasis: 7,
    codeQualityEmphasis: 8,
    optimalSolutionRequired: false,
    allowsPseudocode: true,
    providesHints: true,
    uniqueTraits: [
      'Growth Mindset is core to culture',
      'Generally friendly interview experience',
      '"As Appropriate" round is the final decision maker',
      'Work-life balance is valued',
    ]
  },

  compensation: {
    entryLevel: '$120k - $150k TC',
    midLevel: '$170k - $280k TC',
    seniorLevel: '$280k - $450k+ TC',
  }
}

export const faangCompanies: CompanyQuestionData[] = [
  googleData,
  metaData,
  amazonData,
  appleData,
  netflixData,
  microsoftData,
]
