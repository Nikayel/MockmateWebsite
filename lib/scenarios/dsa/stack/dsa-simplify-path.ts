import type { DSAScenario } from "../../types"

export const dsaSimplifyPathScenario: DSAScenario = {
  id: "dsa-simplify-path",
  title: "Simplify Path",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Meta", "Amazon", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "swe", "fdse"],
  description: "Simplify Unix-style file path using a stack",
  tags: ["stack", "string"],
  estimatedTime: 20,
  problemStatement: `Given a string path, which is an absolute path (starting with a slash '/') to a file or directory in a Unix-style file system, convert it to the simplified canonical path.

In a Unix-style file system, a period '.' refers to the current directory, a double period '..' refers to the directory up a level, and any multiple consecutive slashes are treated as a single slash '/'. The canonical path should:
- Start with a single slash '/'
- Not end with a trailing '/'
- Only contain the directories on the path from the root directory to the target file or directory`,
  examples: [
    {
      input: 'path = "/home/"',
      output: '"/home"',
      explanation: "Remove trailing slash.",
    },
    {
      input: 'path = "/../"',
      output: '"/"',
      explanation: "Going up from root stays at root.",
    },
    {
      input: 'path = "/home//foo/"',
      output: '"/home/foo"',
      explanation: "Multiple slashes are replaced by single slash.",
    },
  ],
  constraints: [
    "1 <= path.length <= 3000",
    "path consists of English letters, digits, period, slash, or underscore",
    "path is a valid absolute Unix path",
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
  ],
}
