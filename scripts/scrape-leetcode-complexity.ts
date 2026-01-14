#!/usr/bin/env npx ts-node

/**
 * LeetCode Complexity Data Scraper
 *
 * Fetches problem data including editorial/solution complexity from LeetCode.
 * Outputs raw data for manual verification before use.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/scrape-leetcode-complexity.ts
 *
 * Output:
 *   data/raw-complexity-data.json
 *
 * IMPORTANT: This script fetches data from LeetCode's public API.
 * All extracted data must be manually verified before use.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs")
const path = require("path")

// Import mappings - use require for compatibility
const { LEETCODE_MAPPINGS } = require("../lib/rag/knowledge-base/leetcode-mapping")

// Re-define type locally since we can't import it
interface LeetCodeMapping {
  scenarioId: string
  leetcodeNumber: number
  slug: string
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  hasEditorial: boolean
}

// ============================================
// Types
// ============================================

interface ApproachData {
  name: string
  timeComplexity: string | null
  spaceComplexity: string | null
  explanation: string | null
  source: "leetcode-editorial" | "leetcode-solution" | "manual"
}

interface ScrapedProblem {
  scenarioId: string
  leetcodeNumber: number
  slug: string
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  url: string
  editorialUrl: string

  // Scraped data
  hasEditorial: boolean
  approaches: ApproachData[]

  // Metadata
  tags: string[]
  scrapedAt: string
  status: "success" | "partial" | "failed"
  error?: string
}

interface ScrapeResult {
  scrapedAt: string
  totalProblems: number
  successCount: number
  partialCount: number
  failedCount: number
  problems: ScrapedProblem[]
}

// ============================================
// LeetCode GraphQL API
// ============================================

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql"

async function fetchLeetCodeProblem(slug: string): Promise<any> {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        titleSlug
        difficulty
        topicTags {
          name
          slug
        }
        hints
        solution {
          id
          canSeeDetail
          paidOnly
          content
        }
        content
      }
    }
  `

  try {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; complexity-scraper/1.0)",
      },
      body: JSON.stringify({
        query,
        variables: { titleSlug: slug },
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data?.question
  } catch (error) {
    console.error(`Failed to fetch ${slug}:`, error)
    return null
  }
}

// ============================================
// Complexity Extraction
// ============================================

/**
 * Clean and normalize complexity notation from LeetCode content
 * Handles various formats: $$O(n)$$, O(n), \mathcal{O}(n), etc.
 */
function normalizeComplexity(str: string | undefined): string | null {
  if (!str) return null

  // Remove LaTeX delimiters
  const cleaned = str.replace(/\$\$/g, "").replace(/\$/g, "")

  // Extract O(...) notation - handle various formats
  // Matches: O(n), O(n^2), O(n log n), O(n \cdot m), O(1), O(n*m), etc.
  const patterns = [
    /O\s*\(\s*([^)]+)\s*\)/i, // Standard O(...)
    /\\mathcal\{O\}\s*\(\s*([^)]+)\s*\)/i, // LaTeX \mathcal{O}(...)
    /\\text\{O\}\s*\(\s*([^)]+)\s*\)/i, // LaTeX \text{O}(...)
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
      // Clean up the inner expression
      const inner = match[1]
        .replace(/\\cdot/g, "*")
        .replace(/\\log/g, "log")
        .replace(/\\times/g, "*")
        .replace(/\s+/g, " ")
        .trim()

      return `O(${inner})`
    }
  }

  return null
}

/**
 * Extract complexity information from solution/editorial content
 * LeetCode uses markdown with LaTeX math notation ($$...$$)
 */
function extractComplexityFromContent(content: string): ApproachData[] {
  const approaches: ApproachData[] = []

  if (!content) return approaches

  // LeetCode editorials use "### Approach X: Name" format
  // Split content by approach sections
  const approachRegex = /###\s*Approach\s*(\d+):?\s*([^\n]+)/gi
  const sections: { name: string; content: string; index: number }[] = []

  const lastIndex = 0
  let match: RegExpExecArray | null

  // Find all approach headers
  const headers: { name: string; index: number }[] = []
  const regex = /###\s*Approach\s*\d+:?\s*([^\n]+)/gi
  while ((match = regex.exec(content)) !== null) {
    headers.push({
      name: match[1].replace(/\*\*/g, "").trim(),
      index: match.index,
    })
  }

  // Extract content between approaches
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index
    const end = i + 1 < headers.length ? headers[i + 1].index : content.length
    sections.push({
      name: headers[i].name,
      content: content.substring(start, end),
      index: i + 1,
    })
  }

  // Extract complexity from each section
  for (const section of sections) {
    const sectionContent = section.content

    // Look for "Complexity Analysis" subsection
    // Then find "Time complexity:" and "Space complexity:" lines
    const complexitySection = sectionContent.match(
      /\*\*Complexity Analysis\*\*([\s\S]*?)(?=---|\*\*Algorithm\*\*|###|$)/i
    )
    const textToSearch = complexitySection?.[1] || sectionContent

    // Extract time complexity - look for "Time complexity: $$O(...)$$" pattern
    const timeMatch = textToSearch.match(
      /\*?\s*[Tt]ime\s*[Cc]omplexity:?\s*\*?\s*:?\s*(\$\$[^$]+\$\$)/
    )
    // Also try without LaTeX
    const timeMatchAlt = textToSearch.match(
      /\*?\s*[Tt]ime\s*[Cc]omplexity:?\s*\*?\s*:?\s*(O\s*\([^)]+\))/i
    )

    // Extract space complexity
    const spaceMatch = textToSearch.match(
      /\*?\s*[Ss]pace\s*[Cc]omplexity:?\s*\*?\s*:?\s*(\$\$[^$]+\$\$)/
    )
    const spaceMatchAlt = textToSearch.match(
      /\*?\s*[Ss]pace\s*[Cc]omplexity:?\s*\*?\s*:?\s*(O\s*\([^)]+\))/i
    )

    const timeComplexity =
      normalizeComplexity(timeMatch?.[1]) || normalizeComplexity(timeMatchAlt?.[1])
    const spaceComplexity =
      normalizeComplexity(spaceMatch?.[1]) || normalizeComplexity(spaceMatchAlt?.[1])

    if (timeComplexity || spaceComplexity) {
      approaches.push({
        name: section.name,
        timeComplexity,
        spaceComplexity,
        explanation: null,
        source: "leetcode-editorial",
      })
    }
  }

  // If no structured approaches found, try to extract any complexity mentions
  if (approaches.length === 0) {
    // Look for any O(...) in LaTeX format
    const allComplexities = content.matchAll(/\$\$\s*(O\s*\([^)]+\))\s*\$\$/gi)
    const complexityList = [...allComplexities].map((m) => normalizeComplexity(m[1]))

    // Try to pair them up (usually time then space)
    if (complexityList.length >= 2) {
      approaches.push({
        name: "Primary Solution",
        timeComplexity: complexityList[0],
        spaceComplexity: complexityList[1],
        explanation: null,
        source: "leetcode-editorial",
      })
    } else if (complexityList.length === 1) {
      approaches.push({
        name: "Primary Solution",
        timeComplexity: complexityList[0],
        spaceComplexity: null,
        explanation: null,
        source: "leetcode-editorial",
      })
    }
  }

  return approaches
}

// ============================================
// Main Scraping Logic
// ============================================

async function scrapeProblem(mapping: LeetCodeMapping): Promise<ScrapedProblem> {
  const result: ScrapedProblem = {
    scenarioId: mapping.scenarioId,
    leetcodeNumber: mapping.leetcodeNumber,
    slug: mapping.slug,
    title: mapping.title,
    difficulty: mapping.difficulty,
    url: `https://leetcode.com/problems/${mapping.slug}/`,
    editorialUrl: `https://leetcode.com/problems/${mapping.slug}/editorial/`,
    hasEditorial: false,
    approaches: [],
    tags: [],
    scrapedAt: new Date().toISOString(),
    status: "failed",
  }

  try {
    console.log(`Fetching: ${mapping.title} (${mapping.slug})...`)

    const problemData = await fetchLeetCodeProblem(mapping.slug)

    if (!problemData) {
      result.error = "Failed to fetch problem data"
      return result
    }

    // Extract tags
    result.tags = problemData.topicTags?.map((t: any) => t.name) || []

    // Check for solution/editorial
    if (problemData.solution?.content) {
      result.hasEditorial = true
      result.approaches = extractComplexityFromContent(problemData.solution.content)
    }

    // Determine status
    if (result.approaches.length > 0) {
      const hasComplexity = result.approaches.some((a) => a.timeComplexity || a.spaceComplexity)
      result.status = hasComplexity ? "success" : "partial"
    } else if (result.hasEditorial) {
      result.status = "partial"
      result.error = "Editorial found but could not extract complexity"
    } else {
      result.status = "partial"
      result.error = "No editorial available"
    }

    return result
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    return result
  }
}

async function scrapeAllProblems(): Promise<ScrapeResult> {
  const problems: ScrapedProblem[] = []

  console.log(`\n🔍 Scraping ${LEETCODE_MAPPINGS.length} LeetCode problems...\n`)

  for (let i = 0; i < LEETCODE_MAPPINGS.length; i++) {
    const mapping = LEETCODE_MAPPINGS[i]
    const problem = await scrapeProblem(mapping)
    problems.push(problem)

    // Progress indicator
    const statusIcon =
      problem.status === "success" ? "✅" : problem.status === "partial" ? "⚠️" : "❌"
    console.log(
      `  [${i + 1}/${LEETCODE_MAPPINGS.length}] ${statusIcon} ${mapping.title}: ${problem.approaches.length} approaches found`
    )

    // Rate limiting - be nice to LeetCode servers
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  const result: ScrapeResult = {
    scrapedAt: new Date().toISOString(),
    totalProblems: problems.length,
    successCount: problems.filter((p) => p.status === "success").length,
    partialCount: problems.filter((p) => p.status === "partial").length,
    failedCount: problems.filter((p) => p.status === "failed").length,
    problems,
  }

  return result
}

// ============================================
// Output
// ============================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════╗")
  console.log("║  LeetCode Complexity Data Scraper                      ║")
  console.log("║  Output will require MANUAL VERIFICATION               ║")
  console.log("╚════════════════════════════════════════════════════════╝")

  const result = await scrapeAllProblems()

  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, "..", "data")
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // Write results
  const outputPath = path.join(dataDir, "raw-complexity-data.json")
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

  // Summary
  console.log("\n" + "═".repeat(60))
  console.log("📊 SCRAPE SUMMARY")
  console.log("═".repeat(60))
  console.log(`Total Problems:  ${result.totalProblems}`)
  console.log(`✅ Success:      ${result.successCount}`)
  console.log(`⚠️  Partial:      ${result.partialCount}`)
  console.log(`❌ Failed:       ${result.failedCount}`)
  console.log("═".repeat(60))
  console.log(`\n📁 Output saved to: ${outputPath}`)
  console.log("\n⚠️  IMPORTANT: Review and verify all data before use!")
  console.log("   - Check that complexity values match LeetCode editorials")
  console.log("   - Verify approach names are accurate")
  console.log("   - Mark entries as 'verified' before importing\n")

  // List problems that need manual review
  const needsReview = result.problems.filter((p) => p.status !== "success")
  if (needsReview.length > 0) {
    console.log("📝 Problems needing manual data entry:")
    needsReview.forEach((p) => {
      console.log(`   - ${p.title}: ${p.error || "No complexity extracted"}`)
    })
  }
}

main().catch(console.error)
