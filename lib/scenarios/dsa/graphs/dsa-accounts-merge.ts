import type { DSAScenario } from "../../types"

export const accountsMergeScenario: DSAScenario = {
  id: "dsa-accounts-merge",
  title: "Accounts Merge",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Merge accounts with common emails using Union-Find",
  tags: ["graph", "union-find", "dfs", "string"],
  estimatedTime: 30,
  problemStatement: `Given accounts where accounts[i][0] is name and rest are emails, merge accounts belonging to same person (sharing emails). Return merged accounts with sorted emails.`,
  examples: [
    {
      input:
        'accounts = [["John","a@mail.com","b@mail.com"],["John","a@mail.com","c@mail.com"],["Mary","m@mail.com"]]',
      output: '[["John","a@mail.com","b@mail.com","c@mail.com"],["Mary","m@mail.com"]]',
    },
  ],
  constraints: ["1 <= accounts.length <= 1000", "2 <= accounts[i].length <= 10"],
  hints: ["Union-Find to group emails", "Map email to index, union within accounts"],
  starterCode: {
    javascript: `function accountsMerge(accounts) {\n  // Write your solution here\n\n}`,
    typescript: `function accountsMerge(accounts: string[][]): string[][] {\n  // Write your solution here\n\n}`,
    python: `def accountsMerge(accounts):\n    # Write your solution here\n    pass`,
  },
  optimalComplexity: { time: "O(n*k*α(n*k))", space: "O(n*k)" },
  // The single original case merged two same-name accounts that also shared an email, so a
  // solution that merged BY NAME (never looking at emails) passed it, as did one that only
  // merged direct overlaps without transitive closure. Each added case kills one of those.
  testCases: [
    {
      input: {
        accounts: [
          ["John", "a@mail.com", "b@mail.com"],
          ["John", "a@mail.com", "c@mail.com"],
          ["Mary", "m@mail.com"],
        ],
      },
      expected: [
        ["John", "a@mail.com", "b@mail.com", "c@mail.com"],
        ["Mary", "m@mail.com"],
      ],
      description: "Merge Johns",
    },
    {
      input: {
        accounts: [
          ["John", "j1@mail.com"],
          ["John", "j2@mail.com"],
        ],
      },
      expected: [
        ["John", "j1@mail.com"],
        ["John", "j2@mail.com"],
      ],
      description: "Same name, no shared email: two different people stay separate",
    },
    {
      input: {
        accounts: [
          ["Alex", "a@mail.com", "b@mail.com"],
          ["Alex", "c@mail.com", "d@mail.com"],
          ["Alex", "b@mail.com", "c@mail.com"],
        ],
      },
      expected: [["Alex", "a@mail.com", "b@mail.com", "c@mail.com", "d@mail.com"]],
      description: "Transitive merge: the third account bridges the first two",
    },
    {
      input: { accounts: [["Solo", "only@mail.com"]] },
      expected: [["Solo", "only@mail.com"]],
      description: "Single account passes through",
    },
  ],
}
