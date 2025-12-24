/**
 * Company Interview Knowledge Base
 *
 * Detailed interview information for each company
 */

import type { CompanyId } from '@/lib/data/company-questions/types'
import type { DSAPattern } from '@/lib/types/dsa-patterns'
import type { CompanyInterviewKnowledge } from './types'

/**
 * Comprehensive company interview knowledge
 */
export const COMPANY_INTERVIEW_KNOWLEDGE: CompanyInterviewKnowledge[] = [
  {
    companyId: 'google',
    companyName: 'Google',
    interviewStyle: {
      description: 'Google interviews focus heavily on algorithmic problem-solving and system design. Expect challenging problems that test your ability to think through edge cases and optimize solutions.',
      pace: 'Moderate pace with emphasis on communication',
      expectations: [
        'Optimal or near-optimal solutions expected',
        'Strong emphasis on code quality and cleanliness',
        'Must explain thought process clearly',
        'Handle follow-up questions and optimizations',
        'Demonstrate knowledge of time/space trade-offs',
      ],
    },
    topPatterns: [
      { pattern: 'graphs', frequency: 85, tips: ['Know BFS/DFS inside out', 'Practice cycle detection', 'Topological sort is common'] },
      { pattern: 'dp-2d', frequency: 80, tips: ['Start with recursion, then memoize', 'Explain state transitions clearly', 'Consider space optimization'] },
      { pattern: 'trees', frequency: 75, tips: ['Binary tree traversals are fundamental', 'Know how to serialize/deserialize', 'LCA problems are common'] },
      { pattern: 'arrays-hashing', frequency: 70, tips: ['Foundation for many problems', 'Always consider hash map approach', 'Know when to use set vs map'] },
      { pattern: 'sliding-window', frequency: 65, tips: ['Practice variable-size windows', 'Common in string problems', 'Know when to expand vs shrink'] },
    ],
    interviewProcess: [
      'Initial recruiter call (30 min)',
      'Phone screen with coding (45-60 min)',
      'On-site: 4-5 rounds of technical interviews',
      'Mix of coding, system design (for senior), and behavioral',
      'Team matching process after passing',
    ],
    cultureTips: [
      'Googleyness: collaborative, humble, adaptable',
      'Data-driven decision making is valued',
      'Show intellectual curiosity',
      'Demonstrate ability to work with ambiguity',
    ],
    commonQuestionTypes: [
      'Graph traversal and shortest paths',
      'Dynamic programming optimization',
      'Tree manipulation and traversal',
      'String processing with constraints',
      'System design for Google-scale products',
    ],
    dosDonts: {
      dos: [
        'Think out loud and explain your approach',
        'Ask clarifying questions before coding',
        'Consider and mention edge cases',
        'Discuss multiple approaches before implementing',
        'Test your code with examples',
      ],
      donts: [
        'Jump into coding without a plan',
        'Give up when stuck - ask for hints',
        'Ignore the interviewer\'s hints',
        'Write messy or unclear code',
        'Forget to analyze time/space complexity',
      ],
    },
  },
  {
    companyId: 'meta',
    companyName: 'Meta (Facebook)',
    interviewStyle: {
      description: 'Meta interviews are fast-paced and practical. They want to see you solve problems efficiently and write production-quality code quickly.',
      pace: 'Fast-paced, typically 2 problems in 45 minutes',
      expectations: [
        'Speed and efficiency are crucial',
        'Working code is the priority',
        'Expect 2 medium problems or 1 hard',
        'Clean, bug-free code expected',
        'Strong problem-solving intuition needed',
      ],
    },
    topPatterns: [
      { pattern: 'arrays-hashing', frequency: 90, tips: ['Must be very fast at these', 'Know all common patterns cold', 'Two Sum variations are everywhere'] },
      { pattern: 'graphs', frequency: 80, tips: ['Clone graph, number of islands', 'BFS for shortest path', 'Union-Find for connectivity'] },
      { pattern: 'trees', frequency: 75, tips: ['Binary tree problems common', 'Know iterative traversals', 'Serialization problems'] },
      { pattern: 'string', frequency: 70, tips: ['Substring and parsing problems', 'Know sliding window well', 'Character frequency counting'] },
      { pattern: 'binary-search', frequency: 65, tips: ['Search in rotated array', 'Finding boundaries', 'Search on answer space'] },
    ],
    interviewProcess: [
      'Initial recruiter call',
      'Phone screen: 45 min, 1-2 coding problems',
      'On-site: 3-4 rounds (coding, system design for E5+)',
      'Behavioral interview included',
      'Fast turnaround on decisions',
    ],
    cultureTips: [
      'Move fast and break things mentality',
      'Impact-driven culture',
      'Show you can handle ambiguity',
      'Collaboration is highly valued',
    ],
    commonQuestionTypes: [
      'Array manipulation and optimization',
      'Graph problems (especially social network related)',
      'Binary tree operations',
      'String processing',
      'System design for social features',
    ],
    dosDonts: {
      dos: [
        'Practice under time pressure',
        'Have a systematic approach to problems',
        'Write clean code quickly',
        'Handle edge cases efficiently',
        'Communicate your thought process',
      ],
      donts: [
        'Spend too long on one problem',
        'Sacrifice code quality for speed',
        'Get stuck without asking questions',
        'Forget to verify your solution',
        'Overcomplicate simple problems',
      ],
    },
  },
  {
    companyId: 'amazon',
    companyName: 'Amazon',
    interviewStyle: {
      description: 'Amazon combines technical and behavioral questions heavily. Leadership Principles are as important as coding skills. Expect STAR format behavioral questions.',
      pace: 'Moderate pace with significant behavioral component',
      expectations: [
        'Strong coding fundamentals',
        'Leadership Principles in every answer',
        'Customer obsession in system design',
        'Practical, working solutions',
        'Clear communication and ownership',
      ],
    },
    topPatterns: [
      { pattern: 'arrays-hashing', frequency: 85, tips: ['Foundation for most problems', 'Know when to use which data structure', 'Practice in-place operations'] },
      { pattern: 'trees', frequency: 80, tips: ['Binary tree and BST operations', 'Know recursive and iterative approaches', 'LCA is very common'] },
      { pattern: 'graphs', frequency: 75, tips: ['BFS/DFS mastery required', 'Think about e-commerce applications', 'Know topological sort'] },
      { pattern: 'dp-1d', frequency: 70, tips: ['Focus on understanding, not memorization', 'Always explain state clearly', 'Consider optimization'] },
      { pattern: 'greedy', frequency: 65, tips: ['Scheduling problems common', 'Interval problems', 'Know when greedy works'] },
    ],
    interviewProcess: [
      'Online assessment (OA) with 2-3 problems',
      'Phone screen with technical + behavioral',
      'On-site loop: 4-5 interviews',
      'Each round includes Leadership Principle questions',
      'Bar raiser interview included',
    ],
    cultureTips: [
      'Memorize the 16 Leadership Principles',
      'Have STAR stories for each principle',
      'Show customer obsession',
      'Demonstrate ownership and bias for action',
      'Be data-driven in your answers',
    ],
    commonQuestionTypes: [
      'Array and string manipulation',
      'Tree problems (especially BST)',
      'Graph traversal',
      'Dynamic programming',
      'System design for e-commerce',
    ],
    dosDonts: {
      dos: [
        'Connect everything to Leadership Principles',
        'Use STAR format for behavioral',
        'Show customer focus in design',
        'Demonstrate ownership',
        'Be concrete with examples',
      ],
      donts: [
        'Ignore the behavioral component',
        'Give vague or hypothetical answers',
        'Blame others in stories',
        'Forget to mention metrics/impact',
        'Rush through behavioral questions',
      ],
    },
  },
  {
    companyId: 'microsoft',
    companyName: 'Microsoft',
    interviewStyle: {
      description: 'Microsoft interviews are conversational and focus on practical problem-solving. Emphasis on understanding, not just solution.',
      pace: 'Relaxed pace with deep discussion',
      expectations: [
        'Clear problem understanding',
        'Good communication skills',
        'Thoughtful approach to solutions',
        'Consider real-world applications',
        'Show growth mindset',
      ],
    },
    topPatterns: [
      { pattern: 'arrays-hashing', frequency: 85, tips: ['Foundation problems', 'Know multiple approaches', 'Consider edge cases'] },
      { pattern: 'trees', frequency: 80, tips: ['Binary tree traversals', 'BST operations', 'Serialization'] },
      { pattern: 'graphs', frequency: 70, tips: ['BFS/DFS applications', 'Connected components', 'Path finding'] },
      { pattern: 'dp-1d', frequency: 65, tips: ['Focus on understanding', 'Explain recurrence clearly', 'Consider optimization'] },
      { pattern: 'linked-list', frequency: 60, tips: ['Reversal techniques', 'Cycle detection', 'Merge operations'] },
    ],
    interviewProcess: [
      'Phone screen (1 hour)',
      'On-site: 4-5 interviews',
      'Mix of coding and design',
      'As Appropriate (AA) interview with hiring manager',
      'Collaborative culture emphasized',
    ],
    cultureTips: [
      'Growth mindset is core value',
      'Show collaboration skills',
      'Be open to learning',
      'Demonstrate empathy',
    ],
    commonQuestionTypes: [
      'Tree and graph problems',
      'Array manipulation',
      'String processing',
      'Linked list operations',
      'System design for Microsoft products',
    ],
    dosDonts: {
      dos: [
        'Ask thoughtful questions',
        'Discuss trade-offs openly',
        'Show willingness to learn',
        'Be collaborative',
        'Consider user experience',
      ],
      donts: [
        'Be arrogant about knowledge',
        'Refuse to accept feedback',
        'Ignore interviewer suggestions',
        'Rush to solution without discussion',
        'Forget to test your code',
      ],
    },
  },
  {
    companyId: 'apple',
    companyName: 'Apple',
    interviewStyle: {
      description: 'Apple interviews focus on excellence and attention to detail. Expect deep technical questions and emphasis on quality.',
      pace: 'Thorough and detail-oriented',
      expectations: [
        'High-quality, polished solutions',
        'Attention to detail',
        'Deep technical knowledge',
        'Consider user experience',
        'Excellence in everything',
      ],
    },
    topPatterns: [
      { pattern: 'arrays-hashing', frequency: 80, tips: ['Clean, efficient solutions', 'Handle edge cases', 'Consider memory'] },
      { pattern: 'trees', frequency: 75, tips: ['Binary tree mastery', 'Know all traversals', 'Space optimization'] },
      { pattern: 'graphs', frequency: 70, tips: ['Standard traversals', 'Know common algorithms', 'Consider efficiency'] },
      { pattern: 'dp-1d', frequency: 65, tips: ['Clear state definition', 'Explain transitions', 'Optimize space'] },
      { pattern: 'string', frequency: 60, tips: ['Parsing and validation', 'Unicode awareness', 'Edge cases'] },
    ],
    interviewProcess: [
      'Phone screen with recruiter',
      'Technical phone screen',
      'On-site: 5-6 interviews',
      'Heavy emphasis on team fit',
      'May include design review',
    ],
    cultureTips: [
      'Quality over quantity',
      'Attention to detail matters',
      'User experience focus',
      'Secrecy is valued',
    ],
    commonQuestionTypes: [
      'Array and string problems',
      'Tree manipulation',
      'Graph algorithms',
      'System design for Apple products',
      'Low-level systems knowledge',
    ],
    dosDonts: {
      dos: [
        'Show attention to detail',
        'Consider edge cases thoroughly',
        'Write clean, readable code',
        'Think about user experience',
        'Demonstrate passion',
      ],
      donts: [
        'Submit incomplete solutions',
        'Ignore code quality',
        'Be sloppy with details',
        'Forget about edge cases',
        'Show low standards',
      ],
    },
  },
  {
    companyId: 'stripe',
    companyName: 'Stripe',
    interviewStyle: {
      description: 'Stripe interviews are practical and focus on real-world engineering. Expect debugging, code review, and practical system design.',
      pace: 'Moderate with practical focus',
      expectations: [
        'Practical engineering skills',
        'Code review and debugging ability',
        'System design for payments',
        'API design knowledge',
        'Attention to edge cases',
      ],
    },
    topPatterns: [
      { pattern: 'arrays-hashing', frequency: 85, tips: ['Practical applications', 'Data processing', 'Edge case handling'] },
      { pattern: 'string', frequency: 80, tips: ['Parsing and validation', 'Format conversion', 'API response handling'] },
      { pattern: 'graphs', frequency: 65, tips: ['Dependency resolution', 'Transaction graphs', 'Cycle detection'] },
      { pattern: 'dp-1d', frequency: 60, tips: ['Optimization problems', 'Resource allocation', 'Practical applications'] },
      { pattern: 'interval', frequency: 55, tips: ['Time-based problems', 'Scheduling', 'Rate limiting'] },
    ],
    interviewProcess: [
      'Recruiter call',
      'Phone screen with practical coding',
      'On-site: 4-5 rounds',
      'Includes debugging/code review',
      'API design interview',
    ],
    cultureTips: [
      'Rigor and reliability valued',
      'User-focused engineering',
      'Move fast with quality',
      'Transparency and openness',
    ],
    commonQuestionTypes: [
      'Practical coding problems',
      'Bug finding and debugging',
      'API design',
      'System design for payments',
      'Data structure choice',
    ],
    dosDonts: {
      dos: [
        'Think about edge cases',
        'Consider failure modes',
        'Design for reliability',
        'Write maintainable code',
        'Think about API consumers',
      ],
      donts: [
        'Ignore error handling',
        'Forget about edge cases',
        'Design without considering scale',
        'Skip input validation',
        'Ignore security concerns',
      ],
    },
  },
]

/**
 * Get interview knowledge for a specific company
 */
export function getCompanyInterviewKnowledge(companyId: CompanyId): CompanyInterviewKnowledge | undefined {
  return COMPANY_INTERVIEW_KNOWLEDGE.find(c => c.companyId === companyId)
}

/**
 * Get all company interview knowledge
 */
export function getAllCompanyKnowledge(): CompanyInterviewKnowledge[] {
  return COMPANY_INTERVIEW_KNOWLEDGE
}

/**
 * Get top patterns across all companies
 */
export function getMostCommonPatterns(): { pattern: DSAPattern; averageFrequency: number; companies: CompanyId[] }[] {
  const patternStats = new Map<DSAPattern, { totalFrequency: number; companies: CompanyId[] }>()

  for (const company of COMPANY_INTERVIEW_KNOWLEDGE) {
    for (const pattern of company.topPatterns) {
      const existing = patternStats.get(pattern.pattern) || { totalFrequency: 0, companies: [] }
      existing.totalFrequency += pattern.frequency
      existing.companies.push(company.companyId)
      patternStats.set(pattern.pattern, existing)
    }
  }

  return Array.from(patternStats.entries())
    .map(([pattern, stats]) => ({
      pattern,
      averageFrequency: stats.totalFrequency / stats.companies.length,
      companies: stats.companies,
    }))
    .sort((a, b) => b.averageFrequency - a.averageFrequency)
}

/**
 * Convert company knowledge to RAG document format
 */
export function companyKnowledgeToDocument(knowledge: CompanyInterviewKnowledge): string {
  return `
# ${knowledge.companyName} Interview Guide

## Interview Style
${knowledge.interviewStyle.description}

**Pace:** ${knowledge.interviewStyle.pace}

**Expectations:**
${knowledge.interviewStyle.expectations.map(e => `- ${e}`).join('\n')}

## Top Patterns
${knowledge.topPatterns.map(p => `
### ${p.pattern} (${p.frequency}% frequency)
${p.tips.map(t => `- ${t}`).join('\n')}
`).join('\n')}

## Interview Process
${knowledge.interviewProcess.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Culture Tips
${knowledge.cultureTips.map(t => `- ${t}`).join('\n')}

## Common Question Types
${knowledge.commonQuestionTypes.map(t => `- ${t}`).join('\n')}

## Do's
${knowledge.dosDonts.dos.map(d => `- ${d}`).join('\n')}

## Don'ts
${knowledge.dosDonts.donts.map(d => `- ${d}`).join('\n')}
`.trim()
}
