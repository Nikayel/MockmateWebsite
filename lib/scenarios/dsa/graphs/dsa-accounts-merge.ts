import type { DSAScenario } from "../../types"

export const accountsMergeScenario: DSAScenario = {
  id: "dsa-accounts-merge",
  title: "Accounts Merge",
  type: "dsa",
  pattern: "graphs",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Meta", "Microsoft", "Palantir"],
  roles: ["new-grad", "junior", "senior", "swe", "fdse"],
  description: "Merge account rows that share an email into one entry per person",
  tags: ["graph", "union-find", "dfs", "string"],
  estimatedTime: 30,
  problemStatement: `You're given accounts, a list of rows in which each row opens with a person's name and every later entry is an email address that person has used. Whenever two rows share at least one email address, they belong to the same person, and the connection chains: a row that shares an email with a second row, which in turn shares a different email with a third, makes all three one person. A matching name proves nothing on its own, since two distinct people can carry the same name.

Collapse each person's rows into one merged account shaped as the name first, followed by every email that person owns, with duplicates removed and the emails in sorted order. Return the merged accounts in the order each person's earliest row appears in accounts.`,
  examples: [
    {
      input:
        'accounts = [["Dana","d1@mail.com","d2@mail.com"],["Dana","d2@mail.com","d3@mail.com"],["Omar","omar@mail.com"]]',
      output: '[["Dana","d1@mail.com","d2@mail.com","d3@mail.com"],["Omar","omar@mail.com"]]',
    },
  ],
  constraints: [
    "accounts holds between 1 and 1000 rows",
    "each row's length runs from 2 to 10: the name plus at least one email",
  ],
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
