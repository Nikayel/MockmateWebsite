import type { BugFixScenario } from "../../types"

const starter = `// Calculates the final cart total.
// Applies a discount if the subtotal meets the threshold.
function calculateCartTotal(cartItems, discountThreshold, discountAmount) {
  let subtotal = 0;
  for (const item of cartItems) {
    subtotal += item.price * item.quantity;
  }

  // BUG: the threshold should be inclusive (>=)
  if (subtotal > discountThreshold) {
    return Math.max(0, subtotal - discountAmount);
  }

  return subtotal;
}

module.exports = { calculateCartTotal };
`

const reference = `// Calculates the final cart total.
// Applies a discount if the subtotal meets the threshold.
function calculateCartTotal(cartItems, discountThreshold, discountAmount) {
  let subtotal = 0;
  for (const item of cartItems) {
    subtotal += item.price * item.quantity;
  }

  if (subtotal >= discountThreshold) {
    return Math.max(0, subtotal - discountAmount);
  }

  return subtotal;
}

module.exports = { calculateCartTotal };
`

export const bugfixOnboardingScenario: BugFixScenario = {
  id: "bugfix-onboarding",
  title: "Onboarding: Cart Discount Bug",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "easy",
  companies: ["Generic"],
  description: "A quick 5-minute onboarding scenario to learn the bugfix workspace.",
  tags: ["javascript", "onboarding", "logic", "debugging", "real-codebase"],
  estimatedTime: 5,
  problemStatement: `Welcome to the CodeSparring bugfix workspace!

**Incident Report**
Customers have reported that their cart discount is not being applied when their order subtotal is *exactly* equal to the discount threshold. The business rules state that the discount should be applied when the subtotal is greater than **or equal to** the threshold.

**Your Task**
1. Read \`src/cart.js\` and identify the off-by-one logic error.
2. Check the test output in the Console panel to see the failing visible test.
3. Fix the bug and click "Run Tests" to verify.
4. Submit your fix.`,
  buggyCode: { javascript: starter },
  codebaseFiles: {
    javascript: [
      {
        fileName: "tests/cart.test.js",
        content: `// Visible test file
const assert = require("node:assert/strict");
const { calculateCartTotal } = require("../src/cart");

async function runTests(record) {
  await record("applies discount when subtotal exceeds threshold", () => {
    const items = [{ price: 50, quantity: 2 }]; // subtotal = 100
    assert.equal(calculateCartTotal(items, 80, 20), 80);
  });
  
  await record("does not apply discount when below threshold", () => {
    const items = [{ price: 50, quantity: 1 }]; // subtotal = 50
    assert.equal(calculateCartTotal(items, 80, 20), 50);
  });
  
  await record("applies discount when subtotal exactly equals threshold", () => {
    const items = [{ price: 40, quantity: 2 }]; // subtotal = 80
    assert.equal(calculateCartTotal(items, 80, 20), 60);
  });
}

module.exports = { runTests };`,
        description: "Visible tests",
      },
    ],
  },
  expectedBehavior:
    "The discount should be applied when the subtotal is >= the discount threshold.",
  bugDescription:
    "The discount condition uses > instead of >=, causing orders exactly at the threshold to miss the discount.",
  hints: [
    "Look at the condition where the discount is applied.",
    "Change the comparison operator.",
  ],
  testCases: [
    {
      input: { threshold: 80 },
      expected: 60,
      description: "Workspace tests cover the discount logic",
    },
  ],
  workspace: {
    language: "javascript",
    primaryFilePath: "src/cart.js",
    editableFilePaths: ["src/cart.js"],
    visibleTestPaths: ["tests/cart.test.js"],
    hiddenTestPaths: ["tests/cart.hidden.test.js"],
    testRunnerPath: "tests/run-workspace-tests.js",
    files: [
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content: `# Onboarding: Cart Discount
Fix the off-by-one logic error in src/cart.js to ensure the discount applies when subtotal is greater than or equal to the threshold.`,
        description: "Product and architecture notes",
      },
      {
        path: "src/cart.js",
        role: "editable",
        language: "javascript",
        content: starter,
        description: "Cart calculation logic",
      },
      {
        path: "tests/cart.test.js",
        role: "test",
        language: "javascript",
        content: `const assert = require("node:assert/strict");
const { calculateCartTotal } = require("../src/cart");

async function runTests(record) {
  await record("applies discount when subtotal exceeds threshold", () => {
    const items = [{ price: 50, quantity: 2 }]; // subtotal = 100
    assert.equal(calculateCartTotal(items, 80, 20), 80);
  });
  
  await record("does not apply discount when below threshold", () => {
    const items = [{ price: 50, quantity: 1 }]; // subtotal = 50
    assert.equal(calculateCartTotal(items, 80, 20), 50);
  });
  
  await record("applies discount when subtotal exactly equals threshold", () => {
    const items = [{ price: 40, quantity: 2 }]; // subtotal = 80
    assert.equal(calculateCartTotal(items, 80, 20), 60);
  });
}

module.exports = { runTests };`,
        description: "Visible test suite",
      },
      {
        path: "tests/cart.hidden.test.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: `const assert = require("node:assert/strict");
const { calculateCartTotal } = require("../src/cart");

async function runTests(record) {
  await record("handles empty cart correctly", () => {
    assert.equal(calculateCartTotal([], 80, 20), 0);
  });
  
  await record("discount never results in negative total", () => {
    const items = [{ price: 50, quantity: 2 }]; // subtotal = 100
    assert.equal(calculateCartTotal(items, 80, 150), 0);
  });
}

module.exports = { runTests };`,
        description: "Hidden test suite",
      },
      {
        path: "tests/run-workspace-tests.js",
        role: "test",
        language: "javascript",
        hidden: true,
        content: `const suites = [
  ["visible cart logic", require("./cart.test")],
  ["hidden edge cases", require("./cart.hidden.test")],
]

const results = []

async function record(suite, name, fn) {
  try {
    await fn()
    results.push({ suite, name, passed: true, error: null, isHidden: suite.toLowerCase().includes("hidden") })
  } catch (error) {
    results.push({ suite, name, passed: false, error: error && error.message ? error.message : String(error), isHidden: suite.toLowerCase().includes("hidden") })
  }
}

;(async () => {
  for (const [suite, mod] of suites) {
    await mod.runTests((name, fn) => record(suite, name, fn))
  }
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
})().catch((error) => {
  results.push({ suite: "runner", name: "execute workspace tests", passed: false, error: error.message, isHidden: true })
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
  process.exitCode = 1
})`,
        description: "Hidden workspace test runner",
      },
    ],
    referenceFiles: [
      {
        path: "src/cart.js",
        role: "editable",
        language: "javascript",
        content: reference,
      },
    ],
  },
}
