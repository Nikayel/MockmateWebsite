/**
 * Quick test of LeetCode API access
 */

async function testLeetCodeAPI() {
  console.log("Testing LeetCode GraphQL API...")

  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `query { question(titleSlug: "two-sum") { title difficulty solution { content } } }`,
    }),
  })

  const data = await response.json()

  console.log("Response status:", response.status)
  console.log("Title:", data.data?.question?.title)
  console.log("Difficulty:", data.data?.question?.difficulty)
  console.log("Has solution content:", !!data.data?.question?.solution?.content)

  if (data.data?.question?.solution?.content) {
    // Check content format
    const content = data.data.question.solution.content
    console.log("\n--- Content snippet (first 2000 chars) ---")
    console.log(content.substring(0, 2000))
    console.log("\n--- Looking for complexity patterns ---")

    // Search for different patterns
    const patterns = [
      /Time complexity/gi,
      /Space complexity/gi,
      /O\([^)]+\)/gi,
      /\\text\{O\}/gi,
      /mathcal\{O\}/gi,
    ]

    for (const pattern of patterns) {
      const matches = content.match(pattern)
      console.log(`Pattern ${pattern}: ${matches?.length || 0} matches`, matches?.slice(0, 3))
    }
  }
}

testLeetCodeAPI().catch(console.error)
