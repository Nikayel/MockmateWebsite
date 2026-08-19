import type { DSAScenario } from "../../types"

export const dsaSimplifyPathScenario: DSAScenario = {
  id: "dsa-simplify-path",
  title: "Simplify Path",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Meta", "Amazon", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "swe", "fdse"],
  description: "Canonicalize an absolute Unix-style file path",
  tags: ["stack", "string"],
  estimatedTime: 20,
  problemStatement: `You're given a string path, an absolute path in a Unix-style file system; it always starts at the root with a '/'. Boil it down to the equivalent canonical path.

Interpret the pieces the Unix way: a single period '.' stands for the current directory and simply drops out, a double period '..' backs up one directory level, and any run of consecutive slashes collapses into a single '/'. The canonical answer must begin with exactly one '/', must not carry a trailing '/', and must contain nothing but the directories actually on the route from the root down to the target file or directory.`,
  examples: [
    {
      input: 'path = "/var/"',
      output: '"/var"',
      explanation: "The slash at the end gets dropped.",
    },
    {
      input: 'path = "/../../"',
      output: '"/"',
      explanation: "There is nowhere above the root to climb to, so the path stays at '/'.",
    },
    {
      input: 'path = "/usr//local/"',
      output: '"/usr/local"',
      explanation: "The doubled slash collapses to a single separator.",
    },
  ],
  constraints: [
    "path measures between 1 and 3000 characters",
    "letters, digits, periods, slashes, and underscores are the only characters in path",
    "path is always a legitimate absolute Unix-style path",
  ],
  hints: [
    'Split by "/" and use a stack for directories',
    'Skip empty strings and "."',
    'Pop from stack for ".." if not empty',
  ],
  starterCode: {
    javascript: `function simplifyPath(path) {
  // Write your solution here

}`,
    typescript: `function simplifyPath(path: string): string {
  // Write your solution here

}`,
    python: `def simplify_path(path):
    # Write your solution here
    pass`,
    java: `class Solution {
    public String simplifyPath(String path) {
        // Write your solution here
        return "";
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(n)",
  },
  testCases: [
    { input: { path: "/home/" }, expected: "/home", description: "Remove trailing slash" },
    { input: { path: "/../" }, expected: "/", description: "Stay at root" },
    { input: { path: "/home//foo/" }, expected: "/home/foo", description: "Multiple slashes" },
    // No path contained a single dot, so a solution that dropped empty segments and handled
    // ".." but never skipped "." passed. A current-directory segment must vanish too.
    { input: { path: "/a/./b" }, expected: "/a/b", description: "Current-directory segment" },
  ],
}
