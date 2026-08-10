import type { DSAScenario } from "../../types"

export const dsaOnlineStockSpanScenario: DSAScenario = {
  id: "dsa-online-stock-span",
  title: "Online Stock Span",
  type: "dsa",
  pattern: "stack",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Bloomberg", "Goldman Sachs"],
  description: "Calculate stock price span using monotonic stack",
  tags: ["stack", "design", "monotonic-stack", "data-stream"],
  estimatedTime: 25,
  problemStatement: `Design an algorithm that collects daily price quotes for some stock and returns the span of that stock's price for the current day.

The span of the stock's price in one day is the maximum number of consecutive days (starting from that day and going backward) for which the stock price was less than or equal to the price of that day.

For example, if the prices of the stock in the last four days is [7,2,1,2] and the price of the stock today is 2, then the span of today is 4 because starting from today, the price of the stock was less than or equal 2 for 4 consecutive days.

Implement the StockSpanner class:
- StockSpanner() Initializes the object.
- int next(int price) Returns the span of the stock's price given that today's price is price.`,
  examples: [
    {
      input:
        '["StockSpanner", "next", "next", "next", "next", "next", "next", "next"]\n[[], [100], [80], [60], [70], [60], [75], [85]]',
      output: "[null, 1, 1, 1, 2, 1, 4, 6]",
    },
  ],
  constraints: ["1 <= price <= 10^5", "At most 10^4 calls will be made to next."],
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
