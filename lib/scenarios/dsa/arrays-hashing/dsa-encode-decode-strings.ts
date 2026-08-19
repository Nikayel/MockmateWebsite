import type { DSAScenario } from "../../types"

export const dsaEncodeDecodeStringsScenario: DSAScenario = {
  id: "dsa-encode-decode-strings",
  title: "Encode and Decode Strings",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "medium",
  companies: ["Google", "Meta", "Amazon", "Apple"],
  description: "Pack a list of strings into one string and losslessly unpack it back",
  tags: ["string", "design", "array"],
  estimatedTime: 25,
  problemStatement: `You're working with a list of strings strs. Produce a single string that captures the whole list, and be able to rebuild the exact original list from that single string alone.

Write two functions: encode, which packs strs into one string, and decode, which takes the encoded string s and recovers the original list. Individual strings can contain any character at all, so the round trip has to survive whatever they hold.`,
  examples: [
    {
      input: 'strs = ["spar","ring","code","gym"]',
      output: '["spar","ring","code","gym"]',
      explanation: "encode folds the list into one string, and decode restores the identical list",
    },
    { input: 'strs = ["par",";","6;7","ok"]', output: '["par",";","6;7","ok"]' },
  ],
  constraints: [
    "strs contains between 0 and 200 strings.",
    "Each individual string has a length from 0 up to 200.",
    "Any of the 256 valid ASCII characters can appear inside a string.",
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
    // No string above contains a separator character, so joining on "#" (or "," or any
    // single delimiter) and splitting it back passed. The whole point of the problem is
    // that the payload may contain whatever character the encoding uses.
    {
      input: { strs: ["a#b", "c,d", "3#x"] },
      expected: ["a#b", "c,d", "3#x"],
      description: "Payload contains the delimiter characters an encoding might use",
    },
  ],
}
