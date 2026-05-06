import type { DSAScenario } from "../../types"

export const dsaEncodeDecodeStringsScenario: DSAScenario = {
  id: "dsa-encode-decode-strings",
  title: "Encode and Decode Strings",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Google", "Meta", "Amazon", "Apple"],
  description: "Design an algorithm to encode and decode a list of strings",
  tags: ["string", "design", "array"],
  estimatedTime: 25,
  problemStatement: `Design an algorithm to encode a list of strings to a single string. The encoded string is then decoded back to the original list of strings.

Implement encode and decode functions.`,
  examples: [
    {
      input: 'strs = ["lint","code","love","you"]',
      output: '["lint","code","love","you"]',
      explanation: "Encode to a single string, then decode back to original list",
    },
    { input: 'strs = ["we","say",":","yes"]', output: '["we","say",":","yes"]' },
  ],
  constraints: [
    "0 <= strs.length <= 200",
    "0 <= strs[i].length <= 200",
    "strs[i] contains any possible characters out of 256 valid ASCII characters",
  ],
  hints: [
    "Use length prefix: store length + delimiter + string",
    'Example: "4#lint5#code" encodes ["lint", "code"]',
    "The delimiter must not conflict with the length number",
  ],
  starterCode: {
    javascript: `function encode(strs) {\n  // Encode list of strings to single string\n\n}\n\nfunction decode(s) {\n  // Decode single string back to list of strings\n\n}`,
    typescript: `function encode(strs: string[]): string {\n  // Encode list of strings to single string\n\n}\n\nfunction decode(s: string): string[] {\n  // Decode single string back to list of strings\n\n}`,
    python: `def encode(strs):\n    # Encode list of strings to single string\n    pass\n\ndef decode(s):\n    # Decode single string back to list of strings\n    pass`,
  },
  optimalComplexity: { time: "O(n)", space: "O(1)" },
  testCases: [
    {
      input: { strs: ["lint", "code", "love", "you"] },
      expected: ["lint", "code", "love", "you"],
      description: "Standard case",
    },
    {
      input: { strs: ["we", "say", ":", "yes"] },
      expected: ["we", "say", ":", "yes"],
      description: "With special chars",
    },
    { input: { strs: [""] }, expected: [""], description: "Empty string in list" },
    { input: { strs: [] }, expected: [], description: "Empty list" },
  ],
}
