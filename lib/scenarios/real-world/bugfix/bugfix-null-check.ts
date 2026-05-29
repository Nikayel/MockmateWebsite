import type { BugFixScenario } from "../../types"

export const bugfixNullCheckScenario: BugFixScenario = {
  id: "bugfix-null-check",
  title: "Notification Recipient Null Safety",
  type: "bugfix",
  difficulty: "easy",
  companies: ["Generic", "Startup", "Amazon"],
  description: "Fix null reference crashes in a notification recipient formatter",
  tags: ["null-safety", "api", "notifications", "defensive-programming"],
  estimatedTime: 18,
  problemStatement: `A notification service formats user records before sending onboarding emails. Some records come from partial CRM imports, and the worker crashes when user, email, or name fields are missing.

**Your task:**
1. Fix the formatter without changing its public function name
2. Return null for missing email or display name fields
3. Trim and normalize valid email addresses
4. Handle partial names gracefully`,
  buggyCode: {
    javascript: `// recipient-formatter.js
// BUG: The formatter assumes every CRM user has every field.
function formatNotificationRecipient(user) {
  const email = user.email.toLowerCase().trim();
  const name = user.firstName + " " + user.lastName;

  return { email, name };
}`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "integrations/crm-user.js",
        content: `class CrmUser {
  constructor(data) {
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
  }
}`,
        description: "CRM import context where fields can be partial",
      },
      {
        fileName: "workers/welcome-email-job.js",
        content: `class WelcomeEmailJob {
  enqueue(recipient) {
    // Missing recipient fields should skip or defer, not crash the batch worker.
    return recipient.email ? "queued" : "skipped";
  }
}`,
        description: "Batch worker context for recipient formatting",
      },
      {
        fileName: "tests/recipient-formatter.test.js",
        content: `// formatNotificationRecipient({ email: " USER@EXAMPLE.COM ", firstName: "Ada", lastName: "Lovelace" })
//   -> { email: "user@example.com", name: "Ada Lovelace" }
// formatNotificationRecipient(null)
//   -> { email: null, name: null }
// formatNotificationRecipient({ firstName: "Jane" })
//   -> { email: null, name: "Jane" }`,
        description: "Regression tests for partial CRM users",
      },
    ],
  },
  expectedBehavior: "The formatter should handle null users and missing fields without throwing.",
  bugDescription:
    "The code dereferences user.email, user.firstName, and user.lastName without checking whether they exist.",
  hints: [
    "Check the user object before reading properties.",
    "Only call string methods when a value is a string.",
    "Build the display name from the name parts that actually exist.",
  ],
  testCases: [
    {
      input: { user: { email: " USER@EXAMPLE.COM ", firstName: "Ada", lastName: "Lovelace" } },
      expected: { email: "user@example.com", name: "Ada Lovelace" },
      description: "Complete CRM user should be normalized",
    },
    {
      input: { user: null },
      expected: { email: null, name: null },
      description: "Null user should not crash the worker",
    },
    {
      input: { user: { firstName: "Jane" } },
      expected: { email: null, name: "Jane" },
      description: "Partial names should still produce a usable display name",
    },
  ],
}
