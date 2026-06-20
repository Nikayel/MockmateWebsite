import type { BugFixScenario } from "../../types"

export const bugfixFeatureEngineeringNanScenario: BugFixScenario = {
  id: "bugfix-feature-engineering-nan",
  title: "Feature Pipeline NaN Cleanup",
  type: "bugfix",
  difficulty: "medium",
  companies: ["Amazon", "Airbnb", "Shopify", "Walmart"],
  description: "Fix and optimize a JavaScript feature pipeline that emits invalid numeric features",
  tags: ["ai", "ml", "feature-engineering", "data-processing", "debugging"],
  estimatedTime: 35,
  problemStatement: `A ranking service prepares customer features before batch scoring. Rows with zero age, zero income, or zero credit limit produce NaN and Infinity values, which then poison model inputs.

This is a two-phase debugging exercise:

**Phase 1: correctness**
1. Prevent NaN and Infinity in derived numeric features
2. Do not mutate the source rows
3. Preserve useful features for valid rows

**Phase 2: optimization**
1. Centralize safe numeric transforms instead of repeating ad hoc checks
2. Return a compact validation summary in the same pass as feature generation
3. Avoid brittle timing assumptions; prove the optimized shape through returned data`,
  buggyCode: {
    javascript: `// feature-pipeline.js
// BUG: Direct division/log transforms create NaN and Infinity for zero or missing values.
function buildCustomerFeatures(rows) {
  const features = rows.map((row) => {
    row.ageGroup = row.age < 30 ? "young" : row.age < 50 ? "middle" : "senior";
    row.incomePerAge = row.income / row.age;
    row.debtToIncome = row.debt / row.income;
    row.creditUtilization = row.debt / row.creditLimit;
    row.savingsRate = (row.income - row.expenses) / row.income;
    row.logIncome = Math.log(row.income);
    return row;
  });

  return {
    features,
    summary: {
      rowCount: features.length,
      invalidNumericCount: 0,
      sourceMutated: rows[0] && Object.prototype.hasOwnProperty.call(rows[0], "incomePerAge"),
    },
  };
}`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "ranking/customer-row.js",
        content: `class CustomerRow {
  constructor(data) {
    this.customerId = data.customerId;
    this.age = data.age;
    this.income = data.income;
    this.debt = data.debt;
    this.creditLimit = data.creditLimit;
    this.expenses = data.expenses;
  }
}`,
        description: "Customer feature row shape consumed by ranking",
      },
      {
        fileName: "ranking/model-contract.js",
        content: `class ModelContract {
  accepts(features) {
    // Model inputs must contain finite numbers for every numeric feature.
    return features.every((row) => Number.isFinite(row.incomePerAge));
  }
}`,
        description: "Model input contract requiring finite numeric features",
      },
      {
        fileName: "tests/feature-pipeline.test.js",
        content: `// buildCustomerFeatures(rows) should:
// - return cloned feature rows
// - use 0 for unsafe ratios/log transforms
// - report invalidNumericCount: 0
// - report sourceMutated: false`,
        description: "Regression tests for feature safety and source immutability",
      },
    ],
  },
  expectedBehavior:
    "Feature generation should return cloned rows with finite numeric features and a compact validation summary.",
  expectedTouchedFiles: ["solution"],
  bugDescription:
    "The pipeline mutates input rows and performs direct division/log transforms that can produce NaN or Infinity.",
  hints: [
    "Treat zero, missing, and non-finite denominators as unsafe.",
    "Clone each row before adding derived features.",
    "You can count invalid outputs while building features instead of scanning again later.",
  ],
  testCases: [
    {
      input: {
        rows: [
          {
            customerId: "c1",
            age: 25,
            income: 50000,
            debt: 5000,
            creditLimit: 10000,
            expenses: 40000,
          },
          {
            customerId: "c2",
            age: 0,
            income: 0,
            debt: 0,
            creditLimit: 0,
            expenses: 500,
          },
        ],
      },
      expected: {
        features: [
          {
            customerId: "c1",
            age: 25,
            income: 50000,
            debt: 5000,
            creditLimit: 10000,
            expenses: 40000,
            ageGroup: "young",
            incomePerAge: 2000,
            debtToIncome: 0.1,
            creditUtilization: 0.5,
            savingsRate: 0.2,
            logIncome: 10.819778284410283,
          },
          {
            customerId: "c2",
            age: 0,
            income: 0,
            debt: 0,
            creditLimit: 0,
            expenses: 500,
            ageGroup: "unknown",
            incomePerAge: 0,
            debtToIncome: 0,
            creditUtilization: 0,
            savingsRate: 0,
            logIncome: 0,
          },
        ],
        summary: { rowCount: 2, invalidNumericCount: 0, sourceMutated: false },
      },
      description: "Invalid numeric source values should not produce NaN or Infinity",
    },
  ],
}
