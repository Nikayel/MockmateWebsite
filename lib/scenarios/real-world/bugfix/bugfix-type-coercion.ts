import type { BugFixScenario } from "../../types"

export const bugfixTypeCoercionScenario: BugFixScenario = {
  id: "bugfix-type-coercion",
  title: "Checkout Total Type Coercion",
  type: "bugfix",
  difficulty: "easy",
  companies: ["Generic", "Shopify", "Stripe", "Amazon"],
  description: "Fix a checkout total bug caused by numeric form values arriving as strings",
  tags: ["javascript", "types", "forms", "pricing", "debugging"],
  estimatedTime: 18,
  problemStatement: `A checkout service receives cart line items from a browser form. Prices and quantities often arrive as strings, and the nightly revenue audit found totals such as "010.502.25" instead of numeric amounts.

**Your task:**
1. Read the checkout context and tests
2. Fix the total calculation so string numeric inputs are handled explicitly
3. Return numeric currency values rounded to cents
4. Preserve the existing function signature`,
  buggyCode: {
    javascript: `// checkout-total.js
// BUG: Form fields arrive as strings, so + can concatenate instead of add.
function calculateCheckoutTotal(cartItems, taxRate) {
  let subtotal = 0;

  for (const item of cartItems) {
    const quantity = item.quantity || 1;
    subtotal = subtotal + item.price * quantity;
  }

  const tax = subtotal * taxRate;
  return {
    subtotal,
    tax,
    total: subtotal + tax,
    itemCount: cartItems.length,
  };
}`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "web/checkout-form.js",
        content: `// Browser form context
// FormData returns strings for quantity, price, coupons, and tax fields.
// Example payload:
// [{ sku: "plan-pro", price: "19.99", quantity: "2" }]
// taxRate can arrive as "0.0825" from regional checkout settings.`,
        description: "Checkout form context showing why numeric fields are untrusted strings",
      },
      {
        fileName: "services/revenue-ledger.js",
        content: `class RevenueLedger {
  recordCheckout(summary) {
    // Downstream systems expect numbers, not formatted strings.
    // summary.total is used for tax reporting and Stripe metadata.
    return { amount: summary.total, source: "checkout" };
  }
}`,
        description: "Revenue ledger expects normalized numeric totals",
      },
      {
        fileName: "tests/checkout-total.test.js",
        content: `// Important cases:
// calculateCheckoutTotal([{ price: "19.99", quantity: "2" }], "0.1")
//   -> { subtotal: 39.98, tax: 4, total: 43.98, itemCount: 1 }
// calculateCheckoutTotal([{ price: 10, quantity: "3" }, { price: "2.50", quantity: 2 }], 0)
//   -> { subtotal: 35, tax: 0, total: 35, itemCount: 2 }`,
        description: "Executable behavior expected by the checkout audit tests",
      },
    ],
  },
  expectedBehavior:
    "Checkout totals should always be numbers, with subtotal, tax, and total rounded to cents.",
  expectedTouchedFiles: ["solution"],
  bugDescription:
    "The calculation trusts form values and allows JavaScript coercion to mix strings and numbers.",
  hints: [
    "Normalize untrusted numeric inputs before using arithmetic.",
    "Be careful with both item.price and item.quantity.",
    "Round currency fields at the return boundary.",
  ],
  testCases: [
    {
      input: { cartItems: [{ sku: "plan-pro", price: "19.99", quantity: "2" }], taxRate: "0.1" },
      expected: { subtotal: 39.98, tax: 4, total: 43.98, itemCount: 1 },
      description: "String price, quantity, and tax rate should produce numeric totals",
    },
    {
      input: {
        cartItems: [
          { sku: "seat", price: 10, quantity: "3" },
          { sku: "addon", price: "2.50", quantity: 2 },
        ],
        taxRate: 0,
      },
      expected: { subtotal: 35, tax: 0, total: 35, itemCount: 2 },
      description: "Mixed string and numeric line items should add normally",
    },
  ],
}
