import type { DSAScenario } from "../../types"

export const dsaOnlineStockSpanScenario: DSAScenario = {
  id: "dsa-online-stock-span",
  title: "Online Stock Span",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Bloomberg", "Goldman Sachs"],
  description: "Report each day's stock price span as quotes arrive",
  tags: ["stack", "design", "monotonic-stack", "data-stream"],
  estimatedTime: 25,
  problemStatement: `You're building a tool that ingests one price quote per day for a stock and answers, each day, with that day's span.

The span for today counts today itself plus the unbroken run of immediately preceding days whose prices sat at or below today's. To illustrate: if the four earlier quotes were [9,3,1,3] and today's price lands at 3, the span is 4, because 3, 1, 3, and today's 3 all qualify before the 9 snaps the run.

Implement the StockSpanner class:
- StockSpanner() constructs the tracker before any quote has arrived.
- int next(int price) takes today's price as price and returns today's span.`,
  examples: [
    {
      input:
        '["StockSpanner", "next", "next", "next", "next", "next", "next", "next"]\n[[], [90], [70], [50], [65], [55], [80], [95]]',
      output: "[null, 1, 1, 1, 2, 1, 5, 7]",
    },
  ],
  constraints: ["every price falls between 1 and 10^5", "next will be invoked at most 10^4 times"],
  hints: [
    "Use monotonic decreasing stack of (price, span) pairs",
    "When new price >= stack top, pop and accumulate spans",
    "Push (price, accumulated_span) onto stack",
  ],
  starterCode: {
    javascript: `class StockSpanner {\n  constructor() {\n    // Initialize stack\n  }\n\n  next(price) {\n    // Calculate span using monotonic stack\n  }\n}`,
    typescript: `class StockSpanner {\n  constructor() {\n    // Initialize stack\n  }\n\n  next(price: number): number {\n    // Calculate span using monotonic stack\n  }\n}`,
    python: `class StockSpanner:\n    def __init__(self):\n        # Initialize stack\n        pass\n\n    def next(self, price: int) -> int:\n        # Calculate span using monotonic stack\n        pass`,
    java: `class StockSpanner {\n    public StockSpanner() {\n        // Initialize stack\n    }\n\n    public int next(int price) {\n        // Calculate span using monotonic stack\n        return 0;\n    }\n}`,
  },
  optimalComplexity: { time: "O(1) amortized per call", space: "O(n)" },
  testCases: [
    {
      input: {
        ops: ["StockSpanner", "next", "next", "next", "next"],
        args: [[], [100], [80], [60], [70]],
      },
      expected: [null, 1, 1, 1, 2],
      description: "Basic operations",
    },
    // The sequence above never needs more than one price popped at a time, and never
    // repeats a price, so a solution that collapsed only the single previous span and one
    // that compared with a strict less-than both passed. Here 75 absorbs two earlier spans
    // at once, 85 absorbs two more, and the repeated 85 must still count the day it ties.
    {
      input: {
        ops: ["StockSpanner", "next", "next", "next", "next", "next", "next", "next", "next"],
        args: [[], [100], [80], [60], [70], [60], [75], [85], [85]],
      },
      expected: [null, 1, 1, 1, 2, 1, 4, 6, 7],
      description: "Several spans collapse at once, and an equal price still counts",
    },
  ],
}
