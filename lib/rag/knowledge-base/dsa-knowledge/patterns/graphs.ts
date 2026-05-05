import type { DSAPatternKnowledge } from "../../types"

export const graphsKnowledge: DSAPatternKnowledge = {
  pattern: "graphs",
  displayName: "Graph Traversal",
  description:
    "DFS and BFS for graph problems. Handle cycles with visited set. Common for connectivity, shortest paths, and topological ordering.",
  whenToUse: [
    "Finding connected components",
    "Detecting cycles",
    "Shortest path (unweighted: BFS)",
    "Topological sorting",
    "Island counting problems",
  ],
  keyInsights: [
    "Always track visited nodes to handle cycles",
    "Build adjacency list for efficient traversal",
    "BFS gives shortest path in unweighted graphs",
    "DFS is often simpler for connectivity problems",
  ],
  commonMistakes: [
    "Forgetting visited set (infinite loops)",
    "Not handling disconnected components",
    "Incorrect cycle detection logic",
    "Wrong graph representation for the problem",
  ],
  timeComplexity: {
    typical: "O(V + E)",
    best: "O(1) for cached/memoized results",
    worst: "O(V + E) for full traversal",
  },
  spaceComplexity: {
    typical: "O(V)",
    notes: "For visited set and recursion stack",
  },
  relatedPatterns: ["trees", "bfs", "topological-sort"],
  prerequisites: ["trees", "stack"],
  codeTemplate: `def dfs(graph, start):
  visited = set()

  def explore(node):
      if node in visited:
          return
      visited.add(node)
      for neighbor in graph[node]:
          explore(neighbor)

  explore(start)
  return visited`,
  examples: [
    "Number of Islands",
    "Clone Graph",
    "Course Schedule (Topological Sort)",
    "Pacific Atlantic Water Flow",
  ],
  interviewTips: [
    "Ask about graph properties: directed? weighted? cycles?",
    "Clarify input format and build adjacency list",
    "Consider edge cases: empty graph, single node",
  ],
}
