import type { DSAPatternKnowledge } from "../../types"

export const unionFindKnowledge: DSAPatternKnowledge = {
  pattern: "union-find",
  displayName: "Union-Find (Disjoint Set)",
  description:
    "Data structure for tracking connected components and detecting cycles in graphs. Uses path compression and union by rank for near-constant time operations.",
  whenToUse: [
    "Finding connected components",
    "Detecting cycles in undirected graphs",
    "Dynamic connectivity queries",
    "Kruskal's MST algorithm",
    "Grouping/merging elements by some relation",
  ],
  keyInsights: [
    "Path compression: flatten tree during find operations",
    "Union by rank: attach smaller tree under larger tree root",
    "Both optimizations together give O(α(n)) amortized time",
    "Track component count by decrementing on successful unions",
  ],
  commonMistakes: [
    "Forgetting to implement path compression",
    "Incorrect initialization of parent array",
    "Not tracking component count when needed",
    "Using for directed graphs (doesn't work)",
  ],
  timeComplexity: {
    typical: "O(α(n)) amortized per operation",
    best: "O(1) with full path compression",
    worst: "O(log n) without optimizations",
  },
  spaceComplexity: {
    typical: "O(n)",
    notes: "Parent array and optional rank array",
  },
  relatedPatterns: ["graphs", "trees"],
  prerequisites: ["arrays-hashing", "trees"],
  codeTemplate: `class UnionFind:
  def __init__(self, n):
      self.parent = list(range(n))
      self.rank = [0] * n
      self.count = n  # Number of components

  def find(self, x):
      if self.parent[x] != x:
          self.parent[x] = self.find(self.parent[x])  # Path compression
      return self.parent[x]

  def union(self, x, y):
      px, py = self.find(x), self.find(y)
      if px == py:
          return False  # Already connected
      # Union by rank
      if self.rank[px] < self.rank[py]:
          px, py = py, px
      self.parent[py] = px
      if self.rank[px] == self.rank[py]:
          self.rank[px] += 1
      self.count -= 1
      return True`,
  examples: [
    "Number of Connected Components in Undirected Graph",
    "Redundant Connection: Find edge that creates cycle",
    "Accounts Merge: Group accounts by common emails",
    "Minimum Cost to Connect All Points (Kruskal's)",
  ],
  interviewTips: [
    "Always explain path compression and union by rank",
    "Know when Union-Find is better than DFS (dynamic queries)",
    "Track component count if the problem requires it",
    "Mention the inverse Ackermann function for complexity",
  ],
}
