import type { BugFixScenario } from "../../types"

export const bugfixDeepcopyScenario: BugFixScenario = {
  id: "bugfix-deepcopy",
  title: "Account Settings Shallow Copy",
  type: "bugfix",
  difficulty: "medium",
  companies: ["Amazon", "Microsoft", "Notion"],
  description: "Fix a settings update that mutates the original account object",
  tags: ["objects", "immutability", "state", "copying", "debugging"],
  estimatedTime: 22,
  problemStatement: `An account settings service returns an updated settings object for preview before saving. Support found that simply previewing a theme change mutates the original account in memory.

**Your task:**
1. Fix the copy behavior for nested preferences
2. Keep the original account unchanged
3. Return an assertable summary proving references are not shared
4. Preserve unrelated account fields`,
  buggyCode: {
    javascript: `// account-settings.js
// BUG: Object spread only copies the top level account object.
function previewAccountSettings(account, patch) {
  const updated = { ...account };

  if (patch.theme) {
    updated.preferences.theme = patch.theme;
  }

  if (patch.pushEnabled !== undefined) {
    updated.preferences.notifications.push = patch.pushEnabled;
  }

  return {
    originalTheme: account.preferences.theme,
    updatedTheme: updated.preferences.theme,
    originalPushEnabled: account.preferences.notifications.push,
    updatedPushEnabled: updated.preferences.notifications.push,
    samePreferencesObject: account.preferences === updated.preferences,
  };
}`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "services/settings-preview.js",
        content: `class SettingsPreviewService {
  preview(summary) {
    // Preview should be read-only. Saving is a separate explicit action.
    return { safeToRender: !summary.samePreferencesObject };
  }
}`,
        description: "Preview service context for immutable settings updates",
      },
      {
        fileName: "stores/account-cache.js",
        content: `class AccountCache {
  constructor(account) {
    this.account = account;
  }
}`,
        description: "Account cache context showing why original mutation is dangerous",
      },
      {
        fileName: "tests/account-settings.test.js",
        content: `// previewAccountSettings(account, { theme: "dark", pushEnabled: false })
//   -> {
//     originalTheme: "light",
//     updatedTheme: "dark",
//     originalPushEnabled: true,
//     updatedPushEnabled: false,
//     samePreferencesObject: false
//   }`,
        description: "Regression test for nested copy isolation",
      },
    ],
  },
  expectedBehavior:
    "Previewing settings should update the returned copy without mutating nested fields on the original account.",
  expectedTouchedFiles: ["solution"],
  bugDescription:
    "The top-level spread leaves preferences and notifications shared between original and updated accounts.",
  hints: [
    "Copy each nested object that can be changed.",
    "Do not mutate account.preferences directly.",
    "The returned summary should prove the nested preferences object is not shared.",
  ],
  testCases: [
    {
      input: {
        account: {
          id: "acct-1",
          preferences: { theme: "light", notifications: { email: true, push: true } },
        },
        patch: { theme: "dark", pushEnabled: false },
      },
      expected: {
        originalTheme: "light",
        updatedTheme: "dark",
        originalPushEnabled: true,
        updatedPushEnabled: false,
        samePreferencesObject: false,
      },
      description: "Nested settings preview should not mutate the original account",
    },
  ],
}
