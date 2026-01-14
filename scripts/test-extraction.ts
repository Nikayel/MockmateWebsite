/**
 * Test complexity extraction from Two Sum editorial
 */

function normalizeComplexity(str: string | undefined): string | null {
  if (!str) return null
  const cleaned = str.replace(/\$\$/g, "").replace(/\$/g, "")
  const patterns = [/O\s*\(\s*([^)]+)\s*\)/i]
  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
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

function extractComplexity(content: string) {
  const approaches: any[] = []

  // Find all approach headers
  const headers: { name: string; index: number }[] = []
  const regex = /###\s*Approach\s*\d+:?\s*([^\n]+)/gi
  let match: RegExpExecArray | null
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
    const sectionContent = content.substring(start, end)

    // Look for complexity in the section
    const complexitySection = sectionContent.match(
      /\*\*Complexity Analysis\*\*([\s\S]*?)(?=---|\*\*Algorithm\*\*|###|$)/i
    )
    const textToSearch = complexitySection?.[1] || sectionContent

    // Extract time complexity
    const timeMatch = textToSearch.match(
      /\*?\s*[Tt]ime\s*[Cc]omplexity:?\s*\*?\s*:?\s*(\$\$[^$]+\$\$)/
    )
    const spaceMatch = textToSearch.match(
      /\*?\s*[Ss]pace\s*[Cc]omplexity:?\s*\*?\s*:?\s*(\$\$[^$]+\$\$)/
    )

    approaches.push({
      name: headers[i].name,
      timeComplexity: normalizeComplexity(timeMatch?.[1]),
      spaceComplexity: normalizeComplexity(spaceMatch?.[1]),
    })
  }

  return approaches
}

async function test() {
  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query { question(titleSlug: "two-sum") { title solution { content } } }`,
    }),
  })
  const data = await response.json()
  const content = data.data?.question?.solution?.content

  console.log("Problem:", data.data?.question?.title)
  console.log("\nExtracted approaches:")
  const approaches = extractComplexity(content)
  console.log(JSON.stringify(approaches, null, 2))
}

test().catch(console.error)
