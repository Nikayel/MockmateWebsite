import type { BugFixScenario } from "../../types"

export const bugfixFloatingPointScenario: BugFixScenario = {
  id: "bugfix-floating-point",
  title: "Invoice Rounding Precision",
  type: "bugfix",
  difficulty: "medium",
  companies: ["Generic", "Stripe", "Square", "Shopify"],
  description: "Fix invoice totals that expose floating point precision and unrounded cents",
  tags: ["javascript", "money", "floating-point", "payments", "debugging"],
  estimatedTime: 25,
  problemStatement: `A billing worker builds invoice summaries before sending them to a payment provider. Customers are seeing totals such as 0.324 and balances with long decimal tails.

**Your task:**
1. Read the invoice and payment context
2. Fix the calculation so all money fields are rounded to cents
3. Avoid floating point tails in subtotal, tax, total, and change
4. Keep the output shape stable for the payment provider`,
  buggyCode: {
    javascript: `// invoice-summary.js
// BUG: Raw floating point math leaks unrounded money values.
function createInvoiceSummary(prices, taxRate, paymentAmount) {
  const subtotal = prices.reduce((sum, price) => sum + price, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
    paid: paymentAmount >= total,
    change: paymentAmount > total ? paymentAmount - total : 0,
  };
}`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "billing/invoice-line.js",
        content: `class InvoiceLine {
  constructor(description, amount) {
    this.description = description;
    this.amount = amount;
  }
}`,
        description: "Billing line context for invoice amounts",
      },
      {
        fileName: "payments/provider-payload.js",
        content: `class ProviderPayload {
  fromSummary(summary) {
    // Provider metadata requires display-safe decimal amounts.
    return { amount: summary.total, paid: summary.paid };
  }
}`,
        description: "Payment provider context for rounded invoice summaries",
      },
      {
        fileName: "tests/invoice-summary.test.js",
        content: `// createInvoiceSummary([0.1, 0.2], 0.08, 1)
//   -> { subtotal: 0.3, tax: 0.02, total: 0.32, paid: true, change: 0.68 }
// createInvoiceSummary([10.15, 5.99, 2.5], 0.0825, 20)
//   -> { subtotal: 18.64, tax: 1.54, total: 20.18, paid: false, change: 0 }`,
        description: "Regression tests for cent-safe invoice totals",
      },
    ],
  },
  expectedBehavior:
    "Invoice money fields should be numeric values rounded to exactly the nearest cent.",
  expectedTouchedFiles: ["solution"],
  bugDescription:
    "The invoice worker performs raw floating point arithmetic and returns unrounded values.",
  hints: [
    "Round each money boundary to cents.",
    "Integer cents are safer than comparing raw floating point totals.",
    "Change should also be rounded to cents.",
  ],
  testCases: [
    {
      input: { prices: [0.1, 0.2], taxRate: 0.08, paymentAmount: 1 },
      expected: { subtotal: 0.3, tax: 0.02, total: 0.32, paid: true, change: 0.68 },
      description: "Small decimal prices should not leak floating point tails",
    },
    {
      input: { prices: [10.15, 5.99, 2.5], taxRate: 0.0825, paymentAmount: 20 },
      expected: { subtotal: 18.64, tax: 1.54, total: 20.18, paid: false, change: 0 },
      description: "Tax should be rounded to cents before returning provider metadata",
    },
  ],
}
