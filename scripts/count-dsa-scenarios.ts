/**
 * Script to count all DSA scenarios and identify any issues
 */

import { scenarios } from "../lib/scenarios"

// Filter DSA scenarios
const dsaScenarios = scenarios.filter((s) => s.type === "dsa")

console.log("=== DSA Scenario Count ===")
console.log(`Total DSA scenarios: ${dsaScenarios.length}`)
console.log(`Total all scenarios: ${scenarios.length}`)

// Check for duplicate IDs
const ids = dsaScenarios.map((s) => s.id)
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
if (duplicates.length > 0) {
  console.log("\n⚠️  DUPLICATE IDs FOUND:")
  duplicates.forEach((id) => {
    const count = ids.filter((i) => i === id).length
    console.log(`  - ${id} (appears ${count} times)`)
  })
} else {
  console.log("\n✅ No duplicate IDs found")
}

// Count by pattern
const byPattern = new Map<string, number>()
dsaScenarios.forEach((s) => {
  const pattern = (s as any).pattern || "unknown"
  byPattern.set(pattern, (byPattern.get(pattern) || 0) + 1)
})

console.log("\n=== Count by Pattern ===")
Array.from(byPattern.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([pattern, count]) => {
    console.log(`  ${pattern}: ${count}`)
  })

// Count by difficulty
const byDifficulty = new Map<string, number>()
dsaScenarios.forEach((s) => {
  const diff = s.difficulty
  byDifficulty.set(diff, (byDifficulty.get(diff) || 0) + 1)
})

console.log("\n=== Count by Difficulty ===")
Array.from(byDifficulty.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([diff, count]) => {
    console.log(`  ${diff}: ${count}`)
  })

// List all pattern types
const patterns = new Set(dsaScenarios.map((s) => (s as any).pattern))
console.log("\n=== All Patterns ===")
Array.from(patterns)
  .sort()
  .forEach((p) => console.log(`  - ${p}`))
