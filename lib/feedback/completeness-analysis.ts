/**
 * Code completeness analysis
 *
 * This module analyzes whether submitted code is complete and functional,
 * or just stub/skeleton code without actual implementation.
 */

import type { IncompleteSolutionAnalysis } from './types'

// ============================================================================
// SOLUTION COMPLETENESS DETECTION
// ============================================================================

/**
 * Detect if a DSA solution is incomplete/stub code
 * This catches cases where user only wrote base case but no actual algorithm
 *
 * Examples of incomplete solutions:
 * - Just a null check with `pass`
 * - Only base cases, no recursive/iterative logic
 * - Contains `pass`, `...`, `TODO`, `NotImplementedError`
 * - Returns only for edge cases, no main logic
 */
export function analyzeCodeCompleteness(code: string, language: string = 'python'): IncompleteSolutionAnalysis {
  if (!code || !code.trim()) {
    return {
      isIncomplete: true,
      reason: 'Empty solution submitted',
      hasBaseCase: false,
      hasActualLogic: false,
      stubPatterns: ['empty']
    }
  }

  const trimmedCode = code.trim()
  const lines = trimmedCode.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const stubPatterns: string[] = []

  // Detect common stub/placeholder patterns
  const stubIndicators = {
    python: [
      { pattern: /^\s*pass\s*$/m, name: 'pass statement' },
      { pattern: /^\s*\.\.\.\s*$/m, name: 'ellipsis placeholder' },
      { pattern: /raise\s+NotImplementedError/i, name: 'NotImplementedError' },
      { pattern: /#\s*TODO/i, name: 'TODO comment' },
      { pattern: /#\s*FIXME/i, name: 'FIXME comment' },
      { pattern: /#\s*your\s+code\s+here/i, name: 'placeholder comment' },
      { pattern: /#\s*implement\s+here/i, name: 'implement comment' },
    ],
    javascript: [
      { pattern: /throw\s+new\s+Error\s*\(\s*['"]not\s+implemented/i, name: 'not implemented error' },
      { pattern: /\/\/\s*TODO/i, name: 'TODO comment' },
      { pattern: /\/\/\s*FIXME/i, name: 'FIXME comment' },
      { pattern: /\/\/\s*your\s+code\s+here/i, name: 'placeholder comment' },
      { pattern: /return\s*;\s*$/m, name: 'empty return' },
    ],
    typescript: [
      { pattern: /throw\s+new\s+Error\s*\(\s*['"]not\s+implemented/i, name: 'not implemented error' },
      { pattern: /\/\/\s*TODO/i, name: 'TODO comment' },
      { pattern: /\/\/\s*FIXME/i, name: 'FIXME comment' },
      { pattern: /return\s*;\s*$/m, name: 'empty return' },
    ],
    java: [
      { pattern: /throw\s+new\s+UnsupportedOperationException/i, name: 'unsupported operation' },
      { pattern: /\/\/\s*TODO/i, name: 'TODO comment' },
      { pattern: /return\s+null\s*;\s*$/m, name: 'null return only' },
    ]
  }

  const indicators = stubIndicators[language as keyof typeof stubIndicators] || stubIndicators.python
  for (const indicator of indicators) {
    if (indicator.pattern.test(trimmedCode)) {
      stubPatterns.push(indicator.name)
    }
  }

  // Detect base case patterns (null checks, empty checks)
  const baseCasePatterns = [
    /if\s+.*(?:is\s+None|==\s*None|===?\s*null|\.length\s*===?\s*0|==\s*0)\s*:/i,  // Python/JS null checks
    /if\s*\(\s*!?\w+\s*(?:===?\s*null|===?\s*undefined|\.length\s*===?\s*0)\s*\)/i, // JS null checks
    /if\s+(?:not\s+)?(?:root|head|node|arr|nums|s|str)\s*:/i,  // Common variable null checks
    /if\s+len\s*\(\s*\w+\s*\)\s*==\s*0/i,  // Python length check
    /return\s+(?:None|null|undefined|\[\]|\{\})\s*$/m,  // Early return for edge cases
  ]

  let hasBaseCase = false
  for (const pattern of baseCasePatterns) {
    if (pattern.test(trimmedCode)) {
      hasBaseCase = true
      break
    }
  }

  // Detect actual algorithm implementation patterns
  const algorithmPatterns = [
    // Recursion
    /def\s+(\w+).*:[\s\S]*\1\s*\(/,  // Python recursive call
    /function\s+(\w+)[\s\S]*\1\s*\(/,  // JS recursive call
    // Loops
    /for\s+\w+\s+in\s+/,  // Python for-in
    /for\s*\([^)]+\)/,    // JS/Java for loop
    /while\s*[\(:].*:/,   // While loops
    // Data structure operations
    /\.append\s*\(/,
    /\.push\s*\(/,
    /\.pop\s*\(/,
    /\.insert\s*\(/,
    /\[\w+\]\s*=/,        // Array/dict assignment
    // Tree/Node operations
    /\.left\s*=/,
    /\.right\s*=/,
    /\.next\s*=/,
    /\.val\s*=/,
    // Common algorithm patterns
    /left.*right|right.*left/i,  // Two pointer or tree swap
    /temp\s*=|swap/i,            // Swap operation
    /result\s*[+=]/,             // Building result
    /stack\s*[.=\[]|queue\s*[.=\[]/i,  // Stack/Queue usage
    /\bmap\s*\(|\breduce\s*\(|\bfilter\s*\(/,  // Functional patterns
    /return\s+\[.*for.*in/,      // List comprehension return
  ]

  let hasActualLogic = false
  for (const pattern of algorithmPatterns) {
    if (pattern.test(trimmedCode)) {
      hasActualLogic = true
      break
    }
  }

  // Special case: Very short code with only base case and no logic
  // e.g., "if root is None: return None\n    pass"
  const nonCommentLines = lines.filter(l => !l.startsWith('#') && !l.startsWith('//'))
  const isVeryShort = nonCommentLines.length <= 5

  // Check for "base case + pass/return" pattern (incomplete implementation)
  const baseCasePlusStub = /if\s+.*(?:None|null|0)\s*:[\s\S]{0,50}(?:return|pass)[\s\S]{0,20}(?:pass|\.\.\.|$)/i

  // Determine if solution is incomplete
  let isIncomplete = false
  let reason = ''

  if (stubPatterns.length > 0 && !hasActualLogic) {
    isIncomplete = true
    reason = `Solution contains stub patterns (${stubPatterns.join(', ')}) without actual implementation`
  } else if (hasBaseCase && !hasActualLogic && isVeryShort) {
    isIncomplete = true
    reason = 'Solution only handles base/edge cases without implementing the main algorithm'
  } else if (baseCasePlusStub.test(trimmedCode)) {
    isIncomplete = true
    reason = 'Solution has base case check but then just pass/return without actual logic'
  } else if (nonCommentLines.length <= 2 && hasBaseCase) {
    isIncomplete = true
    reason = 'Solution is too short to contain meaningful implementation'
  }

  return {
    isIncomplete,
    reason,
    hasBaseCase,
    hasActualLogic,
    stubPatterns
  }
}

// ============================================================================
// DESIGN TEMPLATE ANALYSIS
// ============================================================================

/**
 * Detect if design notes are just the blank template (not filled in)
 * This is CRITICAL for scoring - empty submissions should get low scores
 */
export function isBlankDesignTemplate(designNotes: string): boolean {
  if (!designNotes || !designNotes.trim()) {
    return true
  }

  const notes = designNotes.trim()

  // Known template placeholder patterns - these are NOT user content
  const templatePlaceholders = [
    /\/\/\s*-\s*$/m,                           // "// -" (blank bullet point)
    /\/\/\s*$/m,                               // "//" (blank comment line)
    /\/\/\s*\d+\.\s*$/m,                       // "// 1." "// 2." "// 3." (blank numbered items)
    /\/\/\s*POST\s+\/api\/\.{3}/i,             // "// POST /api/..." (template endpoint)
    /\/\/\s*GET\s+\/api\/\.{3}/i,              // "// GET /api/..." (template endpoint)
    /\/\/\s*-\s*Scale:\s*$/im,                 // "// - Scale:" (blank)
    /\/\/\s*-\s*Latency:\s*$/im,               // "// - Latency:" (blank)
    /\/\/\s*-\s*Availability:\s*$/im,          // "// - Availability:" (blank)
    /\/\/\s*Functional:\s*$/im,                // "// Functional:" (section header)
    /\/\/\s*Non-Functional:\s*$/im,            // "// Non-Functional:" (section header)
    /\/\/\s*Key Components:\s*$/im,            // "// Key Components:" (section header)
    /\/\/\s*Tables\/Collections:\s*$/im,       // "// Tables/Collections:" (section header)
    /\/\/\s*Endpoints:\s*$/im,                 // "// Endpoints:" (section header)
    /\/\/\s*DESIGN NOTES:/i,                   // "// DESIGN NOTES:" (header)
    /\/\/\s*Use this space to document/i,      // Template instruction
    /\/\*\s*=+\s*$/m,                          // "/* ===" divider start
    /\s*=+\s*\*\//m,                           // "==== */" divider end
    /^\s*\d+\.\s*(REQUIREMENTS|HIGH-LEVEL|DATA MODEL|API DESIGN|SCALING)/im, // Section titles
  ]

  // Count how many template patterns exist in the notes
  const templatePatternMatches = templatePlaceholders.filter(p => p.test(notes)).length

  // Extract lines and analyze for REAL user content
  const lines = notes.split('\n')

  let realContentLines = 0
  let totalUserAddedChars = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) continue

    // Skip divider blocks (/* === */)
    if (trimmed.startsWith('/*') || trimmed.startsWith('*/') || /^[=\s*\/]+$/.test(trimmed)) {
      continue
    }

    // Skip section headers (numbers followed by section names)
    if (/^\d+\.\s*(REQUIREMENTS|HIGH-LEVEL|DATA MODEL|API DESIGN|SCALING|ARCHITECTURE)/i.test(trimmed)) {
      continue
    }

    // For comment lines, extract actual content
    if (trimmed.startsWith('//')) {
      const content = trimmed.replace(/^\/\/\s*/, '').trim()

      // Skip if it's just a template placeholder
      if (!content || content === '-' || /^\d+\.$/.test(content)) {
        continue
      }

      // Skip known template text patterns
      const isTemplateText = [
        /^DESIGN NOTES:/i,
        /^Use this space/i,
        /^Functional:\s*$/i,
        /^Non-Functional:\s*$/i,
        /^Key Components:\s*$/i,
        /^Tables\/Collections:\s*$/i,
        /^Endpoints:\s*$/i,
        /^POST\s+\/api\/\.{3}/i,
        /^GET\s+\/api\/\.{3}/i,
        /^-\s*Scale:\s*$/i,
        /^-\s*Latency:\s*$/i,
        /^-\s*Availability:\s*$/i,
        /^-\s*$/,
      ].some(p => p.test(content))

      if (isTemplateText) continue

      // This looks like real content - count it if substantial
      if (content.length > 15) {
        realContentLines++
        totalUserAddedChars += content.length
      }
    } else {
      // Non-comment content (actual code or text)
      if (trimmed.length > 10) {
        realContentLines++
        totalUserAddedChars += trimmed.length
      }
    }
  }

  // STRICT VALIDATION:
  // Template has ~40 lines, many template patterns, and no real content
  // User who actually filled it in would have:
  // - Added content to the placeholder sections
  // - Written at least a few sentences about their design
  // - Modified the template meaningfully

  // If most of the content matches template patterns, it's blank
  if (templatePatternMatches >= 8) {
    // High template pattern count - only pass if there's substantial real content
    if (realContentLines < 5 || totalUserAddedChars < 200) {
      return true
    }
  }

  // If very little real content was added, it's essentially blank
  if (realContentLines < 3) {
    return true
  }

  // If total user-added content is minimal (less than a paragraph), it's insufficient
  if (totalUserAddedChars < 100) {
    return true
  }

  return false
}
