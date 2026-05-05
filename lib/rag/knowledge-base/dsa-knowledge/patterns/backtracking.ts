import type { DSAPatternKnowledge } from "../../types"

export const backtrackingKnowledge: DSAPatternKnowledge = {
  pattern: "backtracking",
  displayName: "Backtracking",
  description:
    "Explore all possibilities by building solutions incrementally and abandoning (backtracking) when constraints are violated.",
  whenToUse: [
    "Generating all permutations/combinations",
    "Sudoku solver",
    "N-Queens problem",
    "Word search in grid",
    'When you need to "try all possibilities"',
  ],
  keyInsights: [
    "Build solution incrementally",
    "Prune early when constraints are violated",
    "Undo choice after exploring (backtrack)",
    "Base case: valid complete solution",
  ],
  commonMistakes: [
    "Forgetting to undo choices",
    "Not pruning effectively",
    "Incorrect base case",
    "Generating duplicates",
  ],
  timeComplexity: {
    typical: "O(n!) for permutations, O(2^n) for subsets",
    best: "With good pruning, much better in practice",
    worst: "Exponential",
  },
  spaceComplexity: {
    typical: "O(n) for recursion depth",
    notes: "Plus O(k) for storing current path",
  },
  relatedPatterns: ["dp-1d", "graphs"],
  prerequisites: ["arrays-hashing", "trees"],
  codeTemplate: `def backtrack(path, choices):
  if is_solution(path):
      result.append(path[:])
      return

  for choice in choices:
      if is_valid(choice):
          path.append(choice)       # Make choice
          backtrack(path, remaining_choices)
          path.pop()                # Undo choice`,
  examples: ["Permutations", "Subsets", "N-Queens", "Word Search"],
  interviewTips: [
    "Draw the decision tree",
    "Explain pruning conditions clearly",
    "Discuss time complexity honestly",
  ],
}
