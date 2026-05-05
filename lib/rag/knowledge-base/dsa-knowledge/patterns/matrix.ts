import type { DSAPatternKnowledge } from "../../types"

export const matrixKnowledge: DSAPatternKnowledge = {
  pattern: "matrix",
  displayName: "Matrix / 2D Grid",
  description:
    "Operations on 2D arrays. Common patterns include traversal, rotation, and BFS/DFS on grids.",
  whenToUse: [
    "Grid traversal and search",
    "Image processing",
    "Game board problems",
    "Path finding in 2D",
    "Matrix rotation/transformation",
  ],
  keyInsights: [
    "Use direction arrays for cleaner code: [(0,1), (1,0), (0,-1), (-1,0)]",
    "Row = y, Column = x (be consistent)",
    "In-place operations often possible with clever indexing",
    "Spiral traversal: layer by layer",
  ],
  commonMistakes: [
    "Row/column confusion",
    "Out of bounds access",
    "Modifying matrix while iterating",
    "Wrong dimensions for transposed matrix",
  ],
  timeComplexity: {
    typical: "O(m × n)",
    best: "O(1) for element access",
    worst: "O(m × n) for full traversal",
  },
  spaceComplexity: {
    typical: "O(1) to O(m × n)",
    notes: "Depends on whether in-place modification allowed",
  },
  relatedPatterns: ["graphs", "dp-2d", "bfs"],
  prerequisites: ["arrays-hashing"],
  codeTemplate: `def traverse_matrix(matrix):
  if not matrix:
      return

  rows, cols = len(matrix), len(matrix[0])
  directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]

  for r in range(rows):
      for c in range(cols):
          for dr, dc in directions:
              nr, nc = r + dr, c + dc
              if 0 <= nr < rows and 0 <= nc < cols:
                  # Process neighbor
                  pass`,
  examples: ["Rotate Image", "Spiral Matrix", "Set Matrix Zeroes", "Number of Islands (grid DFS)"],
  interviewTips: [
    "Draw the matrix and trace through",
    "Use consistent row/col naming",
    "Consider space optimization (in-place)",
  ],
}
