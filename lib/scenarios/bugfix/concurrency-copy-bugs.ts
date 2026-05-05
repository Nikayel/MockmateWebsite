import type { BugFixScenario } from "../types"

export const concurrencyCopyBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-race-condition",
    title: "Fix Race Condition in Async Code",
    type: "bugfix",
    difficulty: "hard",
    companies: ["Meta", "Google", "Amazon"],
    description: "Fix race condition where outdated async results overwrite newer ones",
    tags: ["async", "race-condition", "concurrency"],
    estimatedTime: 20,
    problemStatement: `This search function has a race condition where old results can overwrite newer ones if requests complete out of order. Fix it.`,
    buggyCode: {
      javascript: `async function handleSearch(query) {
  const results = await searchAPI(query);
  displayResults(results);
}
// When user types quickly, older searches can overwrite newer ones`,
      typescript: `let currentQuery = '';

async function handleSearch(query: string) {
  const results = await searchAPI(query);
  displayResults(results);
}`,
      java: `// SearchHandler.java - Search handler with race condition
import java.util.concurrent.CompletableFuture;

public class SearchHandler {
    public static void handleSearch(String query) {
        CompletableFuture<SearchResult> resultsFuture = searchAPI(query);
        // BUG: No tracking of which request is latest
        resultsFuture.thenAccept(results -> {
            displayResults(results);
        });
    }
    // When user types quickly, older searches can overwrite newer ones
}`,
    },
    expectedBehavior: "Should only display results for the most recent query",
    bugDescription: "No mechanism to ignore outdated async results",
    hints: [
      "Track the most recent query and ignore older results",
      "Use a request ID or timestamp to identify the latest request",
      "Consider using AbortController to cancel outdated requests",
    ],
    testCases: [
      {
        input: 'Quick succession: "a", "ab", "abc"',
        expected: 'Only shows results for "abc", ignores earlier results',
        description: "Race condition handling for rapid input changes",
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: "components/SearchBar.jsx",
          content: `import React, { useState } from 'react';
import { searchAPI } from '../api/searchAPI';

export function SearchBar({ onResults }) {
  const [query, setQuery] = useState('');

  async function handleSearch(query) {
    // BUG: No tracking of which request is latest
    const results = await searchAPI(query);
    onResults(results);
  }

  const handleChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    handleSearch(newQuery); // Fires on every keystroke
  };

  return (
    <input
      type="text"
      value={query}
      onChange={handleChange}
      placeholder="Search..."
    />
  );
}`,
          description: "SearchBar component that triggers searches on every keystroke",
        },
        {
          fileName: "api/searchAPI.js",
          content: `// Simulates API call with random delays
export async function searchAPI(query) {
  // Simulate network delay (100-500ms)
  const delay = Math.random() * 400 + 100;

  await new Promise(resolve => setTimeout(resolve, delay));

  // Simulate search results
  return {
    query,
    results: [
      { id: 1, title: \`Result for "\${query}" - 1\` },
      { id: 2, title: \`Result for "\${query}" - 2\` },
      { id: 3, title: \`Result for "\${query}" - 3\` },
    ],
    timestamp: Date.now()
  };
}`,
          description: "API function with simulated variable delay causing race conditions",
        },
        {
          fileName: "components/SearchResults.jsx",
          content: `import React from 'react';

export function SearchResults({ results }) {
  if (!results) {
    return <div>No results yet</div>;
  }

  return (
    <div className="search-results">
      <h3>Results for: {results.query}</h3>
      <ul>
        {results.results.map(result => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
      <small>Timestamp: {results.timestamp}</small>
    </div>
  );
}`,
          description:
            "Component that displays search results - shows wrong results when race condition occurs",
        },
        {
          fileName: "tests/searchRaceCondition.test.js",
          content: `import { render, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '../components/SearchBar';
import { SearchResults } from '../components/SearchResults';
import { searchAPI } from '../api/searchAPI';

jest.mock('../api/searchAPI');

describe('Search Race Condition Bug', () => {
  test('demonstrates race condition - older results overwrite newer', async () => {
    let onResults;
    const { getByPlaceholderText, getByText } = render(
      <div>
        <SearchBar onResults={(r) => { onResults = r; }} />
        <SearchResults results={onResults} />
      </div>
    );

    // Mock searchAPI to control timing
    searchAPI.mockImplementation((query) => {
      const delays = { 'a': 300, 'ab': 200, 'abc': 100 }; // Reverse order!
      return new Promise(resolve =>
        setTimeout(() => resolve({
          query,
          results: [{ id: 1, title: \`Result for "\${query}"\` }],
          timestamp: Date.now()
        }), delays[query])
      );
    });

    const input = getByPlaceholderText('Search...');

    // Type quickly: a, ab, abc
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });

    // Wait for all requests to complete
    await waitFor(() => {}, { timeout: 500 });

    // BUG: Shows results for "a" instead of "abc"!
    // Because "a" took longest (300ms) and completed last
    expect(getByText(/Result for "a"/)).toBeInTheDocument();
    // This assertion FAILS - we don't see "abc" results
    // expect(getByText(/Result for "abc"/)).toBeInTheDocument();
  });
});`,
          description: "Test demonstrating the race condition bug when typing quickly",
        },
      ],
      typescript: [
        {
          fileName: "components/SearchBar.tsx",
          content: `import React, { useState } from 'react';
import { searchAPI, SearchResult } from '../api/searchAPI';

interface SearchBarProps {
  onResults: (results: SearchResult) => void;
}

export function SearchBar({ onResults }: SearchBarProps) {
  const [query, setQuery] = useState('');

  async function handleSearch(query: string): Promise<void> {
    // BUG: No tracking of which request is latest
    const results = await searchAPI(query);
    onResults(results);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    handleSearch(newQuery); // Fires on every keystroke
  };

  return (
    <input
      type="text"
      value={query}
      onChange={handleChange}
      placeholder="Search..."
    />
  );
}`,
          description: "SearchBar component that triggers searches on every keystroke",
        },
        {
          fileName: "api/searchAPI.ts",
          content: `export interface SearchResult {
  query: string;
  results: Array<{ id: number; title: string }>;
  timestamp: number;
}

// Simulates API call with random delays
export async function searchAPI(query: string): Promise<SearchResult> {
  // Simulate network delay (100-500ms)
  const delay = Math.random() * 400 + 100;

  await new Promise(resolve => setTimeout(resolve, delay));

  // Simulate search results
  return {
    query,
    results: [
      { id: 1, title: \`Result for "\${query}" - 1\` },
      { id: 2, title: \`Result for "\${query}" - 2\` },
      { id: 3, title: \`Result for "\${query}" - 3\` },
    ],
    timestamp: Date.now()
  };
}`,
          description: "API function with simulated variable delay causing race conditions",
        },
        {
          fileName: "components/SearchResults.tsx",
          content: `import React from 'react';
import { SearchResult } from '../api/searchAPI';

interface SearchResultsProps {
  results: SearchResult | null;
}

export function SearchResults({ results }: SearchResultsProps) {
  if (!results) {
    return <div>No results yet</div>;
  }

  return (
    <div className="search-results">
      <h3>Results for: {results.query}</h3>
      <ul>
        {results.results.map(result => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
      <small>Timestamp: {results.timestamp}</small>
    </div>
  );
}`,
          description:
            "Component that displays search results - shows wrong results when race condition occurs",
        },
      ],
      java: [
        {
          fileName: "components/SearchBar.java",
          content: `// SearchBar component with race condition
package components;

import java.util.concurrent.CompletableFuture;
import api.SearchAPI;
import api.SearchResult;

public class SearchBar {
    private String query = "";
    private SearchResultListener listener;

    public SearchBar(SearchResultListener listener) {
        this.listener = listener;
    }

    public void handleSearch(String query) {
        // BUG: No tracking of which request is latest
        CompletableFuture<SearchResult> resultsFuture = SearchAPI.search(query);
        resultsFuture.thenAccept(results -> {
            listener.onResults(results);
        });
    }

    public void handleChange(String newQuery) {
        this.query = newQuery;
        handleSearch(newQuery); // Fires on every keystroke
    }

    public interface SearchResultListener {
        void onResults(SearchResult results);
    }
}`,
          description: "SearchBar component that triggers searches on every keystroke",
        },
        {
          fileName: "api/SearchAPI.java",
          content: `// Simulates API call with random delays
package api;

import java.util.concurrent.CompletableFuture;
import java.util.List;
import java.util.Arrays;
import java.util.Random;

public class SearchAPI {
    private static final Random random = new Random();

    public static CompletableFuture<SearchResult> search(String query) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Simulate network delay (100-500ms)
                int delay = random.nextInt(400) + 100;
                Thread.sleep(delay);

                // Simulate search results
                return new SearchResult(
                    query,
                    Arrays.asList(
                        new SearchItem(1, "Result for \\"" + query + "\\" - 1"),
                        new SearchItem(2, "Result for \\"" + query + "\\" - 2"),
                        new SearchItem(3, "Result for \\"" + query + "\\" - 3")
                    ),
                    System.currentTimeMillis()
                );
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        });
    }
}

class SearchResult {
    String query;
    List<SearchItem> results;
    long timestamp;

    SearchResult(String query, List<SearchItem> results, long timestamp) {
        this.query = query;
        this.results = results;
        this.timestamp = timestamp;
    }
}

class SearchItem {
    int id;
    String title;

    SearchItem(int id, String title) {
        this.id = id;
        this.title = title;
    }
}`,
          description: "API function with simulated variable delay causing race conditions",
        },
        {
          fileName: "tests/SearchRaceConditionTest.java",
          content: `// Test demonstrating the race condition bug
package tests;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class SearchRaceConditionTest {
    public static void testRaceCondition() throws Exception {
        System.out.println("=== Testing Search Race Condition ===\\n");

        SearchResultTracker tracker = new SearchResultTracker();

        // Mock searchAPI to control timing
        // "a" takes 300ms, "ab" takes 200ms, "abc" takes 100ms
        // So "abc" completes first, but "a" completes last and overwrites

        System.out.println("Simulating quick typing: 'a', 'ab', 'abc'");
        System.out.println("Delays: 'a'=300ms, 'ab'=200ms, 'abc'=100ms");
        System.out.println();

        // Type quickly
        CompletableFuture<SearchResult> future1 = simulateSearch("a", 300);
        CompletableFuture<SearchResult> future2 = simulateSearch("ab", 200);
        CompletableFuture<SearchResult> future3 = simulateSearch("abc", 100);

        future1.thenAccept(r -> {
            System.out.println("Response for 'a' arrived at " + r.timestamp);
            tracker.setResults(r);
        });
        future2.thenAccept(r -> {
            System.out.println("Response for 'ab' arrived at " + r.timestamp);
            tracker.setResults(r);
        });
        future3.thenAccept(r -> {
            System.out.println("Response for 'abc' arrived at " + r.timestamp);
            tracker.setResults(r);
        });

        // Wait for all to complete
        Thread.sleep(500);

        System.out.println("\\nFinal displayed results: " + tracker.getCurrentQuery());
        System.out.println("❌ BUG: Shows results for 'a' instead of 'abc'!");
        System.out.println("Because 'a' took longest and completed last\\n");
    }

    private static CompletableFuture<SearchResult> simulateSearch(String query, int delay) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(delay);
                return new SearchResult(query, null, System.currentTimeMillis());
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        });
    }

    static class SearchResultTracker {
        private SearchResult currentResults;

        void setResults(SearchResult results) {
            this.currentResults = results;
        }

        String getCurrentQuery() {
            return currentResults != null ? currentResults.query : "none";
        }
    }

    public static void main(String[] args) throws Exception {
        testRaceCondition();
    }
}`,
          description: "Test demonstrating the race condition bug when typing quickly",
        },
      ],
    },
  },
  {
    id: "bugfix-deepcopy",
    title: "Fix Shallow Copy Bug",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Amazon", "Microsoft"],
    description: "Fix bug where shallow copy causes unintended mutations",
    tags: ["objects", "copying", "mutation"],
    estimatedTime: 15,
    problemStatement: `This function should create a copy of user settings without modifying the original, but changes to the copy affect the original. Fix it.`,
    buggyCode: {
      javascript: `function updateUserSettings(user, newTheme) {
  const updatedUser = { ...user };
  updatedUser.preferences.theme = newTheme;
  return updatedUser;
}
// Original user.preferences.theme also changes!`,
      typescript: `function updateUserSettings(user: any, newTheme: string) {
  const updatedUser = { ...user };
  updatedUser.preferences.theme = newTheme;
  return updatedUser;
}`,
      python: `def updateUserSettings(user, newTheme):
    updatedUser = user.copy()
    updatedUser['preferences']['theme'] = newTheme
    return updatedUser`,
      java: `// UserSettingsManager.java - Shallow copy bug
public class UserSettingsManager {
    public static User updateUserSettings(User user, String newTheme) {
        User updatedUser = user.clone(); // BUG: shallow clone
        updatedUser.getPreferences().setTheme(newTheme);
        return updatedUser;
    }
    // Original user.preferences.theme also changes!
}`,
    },
    expectedBehavior: "Should deep copy nested objects to prevent mutations",
    bugDescription:
      "Spread operator only creates shallow copy, nested objects are still referenced",
    hints: [
      "Spread operator / .copy() only copies top-level properties",
      "Nested objects are still referenced, not copied",
      "Use deep copy techniques like structuredClone or recursive copying",
    ],
    testCases: [
      {
        input: '{name: "John", preferences: {theme: "light"}}, "dark"',
        expected: 'Original user.preferences.theme stays "light"',
        description: "Deep copy should prevent mutation of nested objects",
      },
    ],
    codebaseFiles: {
      javascript: [
        {
          fileName: "components/UserSettings.jsx",
          content: `import React, { useState } from 'react';
import { SettingsManager } from '../services/SettingsManager';

const settingsManager = new SettingsManager();

export function UserSettings() {
  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'light',
      notifications: {
        email: true,
        push: false,
        sms: true
      },
      language: 'en'
    }
  });

  const updateTheme = (newTheme) => {
    // BUG: This mutates the original user object!
    const updated = settingsManager.updateUserSettings(user, newTheme);
    setUser(updated);

    // Original user object is also modified
    console.log('Original user theme:', user.preferences.theme);
    // Expected: 'light', Actual: 'dark' (mutation bug!)
  };

  return (
    <div>
      <h2>User Settings</h2>
      <p>Name: {user.name}</p>
      <p>Current Theme: {user.preferences.theme}</p>
      <button onClick={() => updateTheme('dark')}>
        Switch to Dark Theme
      </button>
      <button onClick={() => updateTheme('light')}>
        Switch to Light Theme
      </button>
    </div>
  );
}`,
          description: "Component that updates user settings and experiences mutation bug",
        },
        {
          fileName: "services/SettingsManager.js",
          content: `export class SettingsManager {
  // BUG: Shallow copy doesn't prevent nested object mutation
  updateUserSettings(user, newTheme) {
    const updatedUser = { ...user }; // Shallow copy
    updatedUser.preferences.theme = newTheme; // Mutates original!
    return updatedUser;
  }

  // This has the same bug
  toggleNotification(user, notificationType) {
    const updatedUser = { ...user };
    updatedUser.preferences.notifications[notificationType] =
      !updatedUser.preferences.notifications[notificationType];
    return updatedUser; // Original user is also modified
  }

  // Even this seemingly safe operation has the bug
  updateLanguage(user, newLanguage) {
    const updatedUser = { ...user };
    updatedUser.preferences.language = newLanguage;
    // This works because 'preferences' is replaced, but it's inconsistent
    return updatedUser;
  }
}`,
          description: "Settings manager class with shallow copy bug affecting nested objects",
        },
        {
          fileName: "tests/settingsMutation.test.js",
          content: `import { SettingsManager } from '../services/SettingsManager';

describe('SettingsManager Mutation Bug', () => {
  const settingsManager = new SettingsManager();

  test('demonstrates shallow copy mutation bug', () => {
    const originalUser = {
      name: 'John',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: false
        }
      }
    };

    // Update theme to dark
    const updatedUser = settingsManager.updateUserSettings(originalUser, 'dark');

    // BUG: Original object is mutated!
    expect(originalUser.preferences.theme).toBe('light'); // FAILS!
    expect(originalUser.preferences.theme).toBe('dark'); // Actually true :(

    expect(updatedUser.preferences.theme).toBe('dark'); // Passes

    // They share the same preferences object
    expect(originalUser.preferences).toBe(updatedUser.preferences); // Same reference!
  });

  test('demonstrates nested mutation bug', () => {
    const originalUser = {
      name: 'Jane',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: false,
          sms: true
        }
      }
    };

    // Toggle email notifications
    const updatedUser = settingsManager.toggleNotification(originalUser, 'email');

    // BUG: Original notifications object is mutated!
    expect(originalUser.preferences.notifications.email).toBe(true); // FAILS!
    expect(originalUser.preferences.notifications.email).toBe(false); // Actual value

    // Both objects share the same notifications reference
    expect(originalUser.preferences.notifications)
      .toBe(updatedUser.preferences.notifications);
  });
});`,
          description: "Test file demonstrating the shallow copy mutation bug",
        },
        {
          fileName: "examples/deepCopyExamples.js",
          content: `// Examples showing the difference between shallow and deep copy

// Example 1: Shallow copy problem
function shallowCopyProblem() {
  const original = {
    name: 'User',
    settings: { theme: 'light' }
  };

  const copy = { ...original };
  copy.settings.theme = 'dark';

  console.log('Original theme:', original.settings.theme); // 'dark' - MUTATED!
  console.log('Copy theme:', copy.settings.theme); // 'dark'
  console.log('Same reference?', original.settings === copy.settings); // true
}

// Example 2: Solutions for deep copy

// Solution 1: structuredClone (modern browsers/Node 17+)
function deepCopyWithStructuredClone(obj) {
  return structuredClone(obj);
}

// Solution 2: JSON parse/stringify (simple but has limitations)
function deepCopyWithJSON(obj) {
  return JSON.parse(JSON.stringify(obj));
  // Limitations: loses functions, undefined, Dates become strings, etc.
}

// Solution 3: Recursive deep copy
function deepCopyRecursive(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepCopyRecursive(item));

  const copy = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepCopyRecursive(obj[key]);
    }
  }
  return copy;
}

// Solution 4: Using spread operator correctly for nested objects
function properNestedCopy(user, newTheme) {
  return {
    ...user,
    preferences: {
      ...user.preferences,
      theme: newTheme
    }
  };
}`,
          description: "Examples showing shallow vs deep copy and various solutions",
        },
      ],
      typescript: [
        {
          fileName: "components/UserSettings.tsx",
          content: `import React, { useState } from 'react';
import { SettingsManager, User } from '../services/SettingsManager';

const settingsManager = new SettingsManager();

export function UserSettings() {
  const [user, setUser] = useState<User>({
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'light',
      notifications: {
        email: true,
        push: false,
        sms: true
      },
      language: 'en'
    }
  });

  const updateTheme = (newTheme: 'light' | 'dark') => {
    // BUG: This mutates the original user object!
    const updated = settingsManager.updateUserSettings(user, newTheme);
    setUser(updated);

    // Original user object is also modified
    console.log('Original user theme:', user.preferences.theme);
    // Expected: 'light', Actual: 'dark' (mutation bug!)
  };

  return (
    <div>
      <h2>User Settings</h2>
      <p>Name: {user.name}</p>
      <p>Current Theme: {user.preferences.theme}</p>
      <button onClick={() => updateTheme('dark')}>
        Switch to Dark Theme
      </button>
      <button onClick={() => updateTheme('light')}>
        Switch to Light Theme
      </button>
    </div>
  );
}`,
          description: "Component that updates user settings and experiences mutation bug",
        },
        {
          fileName: "services/SettingsManager.ts",
          content: `export interface User {
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    language: string;
  };
}

export class SettingsManager {
  // BUG: Shallow copy doesn't prevent nested object mutation
  updateUserSettings(user: User, newTheme: 'light' | 'dark'): User {
    const updatedUser = { ...user }; // Shallow copy
    updatedUser.preferences.theme = newTheme; // Mutates original!
    return updatedUser;
  }

  toggleNotification(user: User, notificationType: keyof User['preferences']['notifications']): User {
    const updatedUser = { ...user };
    updatedUser.preferences.notifications[notificationType] =
      !updatedUser.preferences.notifications[notificationType];
    return updatedUser; // Original user is also modified
  }
}`,
          description: "Settings manager class with shallow copy bug affecting nested objects",
        },
        {
          fileName: "tests/settingsMutation.test.ts",
          content: `import { SettingsManager, User } from '../services/SettingsManager';

describe('SettingsManager Mutation Bug', () => {
  const settingsManager = new SettingsManager();

  test('demonstrates shallow copy mutation bug', () => {
    const originalUser: User = {
      name: 'John',
      email: 'john@test.com',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: false,
          sms: true
        },
        language: 'en'
      }
    };

    // Update theme to dark
    const updatedUser = settingsManager.updateUserSettings(originalUser, 'dark');

    // BUG: Original object is mutated!
    expect(originalUser.preferences.theme).toBe('light'); // FAILS!
    expect(originalUser.preferences.theme).toBe('dark'); // Actually true :(

    // They share the same preferences object
    expect(originalUser.preferences).toBe(updatedUser.preferences); // Same reference!
  });
});`,
          description: "Test file demonstrating the shallow copy mutation bug",
        },
      ],
      python: [
        {
          fileName: "services/settings_manager.py",
          content: `from copy import copy, deepcopy

class SettingsManager:
    """Manages user settings with shallow copy bug"""

    def update_user_settings(self, user, new_theme):
        """BUG: dict.copy() only creates shallow copy"""
        updated_user = user.copy()  # Shallow copy
        updated_user['preferences']['theme'] = new_theme  # Mutates original!
        return updated_user

    def toggle_notification(self, user, notification_type):
        """Same shallow copy bug"""
        updated_user = user.copy()
        updated_user['preferences']['notifications'][notification_type] = \\
            not updated_user['preferences']['notifications'][notification_type]
        return updated_user  # Original user is also modified

    def update_user_settings_fixed(self, user, new_theme):
        """Fixed version using deepcopy"""
        updated_user = deepcopy(user)
        updated_user['preferences']['theme'] = new_theme
        return updated_user`,
          description: "Python settings manager showing shallow copy bug with dict.copy()",
        },
        {
          fileName: "tests/test_settings_mutation.py",
          content: `import unittest
from services.settings_manager import SettingsManager

class TestSettingsMutation(unittest.TestCase):
    def setUp(self):
        self.manager = SettingsManager()
        self.original_user = {
            'name': 'John',
            'email': 'john@test.com',
            'preferences': {
                'theme': 'light',
                'notifications': {
                    'email': True,
                    'push': False,
                    'sms': True
                },
                'language': 'en'
            }
        }

    def test_shallow_copy_mutation_bug(self):
        """Demonstrates that dict.copy() causes mutation"""
        # Update theme to dark
        updated_user = self.manager.update_user_settings(
            self.original_user, 'dark'
        )

        # BUG: Original object is mutated!
        # This assertion FAILS
        # self.assertEqual(self.original_user['preferences']['theme'], 'light')

        # This is what actually happens
        self.assertEqual(self.original_user['preferences']['theme'], 'dark')

        # They share the same preferences dictionary
        self.assertIs(
            self.original_user['preferences'],
            updated_user['preferences']
        )

    def test_deepcopy_fix(self):
        """Shows that deepcopy prevents mutation"""
        updated_user = self.manager.update_user_settings_fixed(
            self.original_user, 'dark'
        )

        # Original is NOT mutated with deepcopy
        self.assertEqual(self.original_user['preferences']['theme'], 'light')
        self.assertEqual(updated_user['preferences']['theme'], 'dark')

        # They have different preference objects
        self.assertIsNot(
            self.original_user['preferences'],
            updated_user['preferences']
        )`,
          description: "Test demonstrating shallow vs deep copy in Python",
        },
      ],
      java: [
        {
          fileName: "models/User.java",
          content: `// User model with shallow clone implementation
package models;

public class User implements Cloneable {
    private String name;
    private String email;
    private Preferences preferences;

    public User(String name, String email, Preferences preferences) {
        this.name = name;
        this.email = email;
        this.preferences = preferences;
    }

    // BUG: Default clone() only does shallow copy
    @Override
    public User clone() {
        try {
            return (User) super.clone(); // Shallow copy!
        } catch (CloneNotSupportedException e) {
            throw new RuntimeException(e);
        }
    }

    public String getName() { return name; }
    public String getEmail() { return email; }
    public Preferences getPreferences() { return preferences; }
    public void setPreferences(Preferences preferences) { this.preferences = preferences; }
}

class Preferences {
    private String theme;
    private Notifications notifications;
    private String language;

    public Preferences(String theme, Notifications notifications, String language) {
        this.theme = theme;
        this.notifications = notifications;
        this.language = language;
    }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public Notifications getNotifications() { return notifications; }
    public String getLanguage() { return language; }
}

class Notifications {
    private boolean email;
    private boolean push;
    private boolean sms;

    public Notifications(boolean email, boolean push, boolean sms) {
        this.email = email;
        this.push = push;
        this.sms = sms;
    }

    public boolean isEmail() { return email; }
    public void setEmail(boolean email) { this.email = email; }
    public boolean isPush() { return push; }
    public boolean isSms() { return sms; }
}`,
          description: "User model with shallow clone causing mutation bugs",
        },
        {
          fileName: "services/SettingsManager.java",
          content: `// Settings manager with shallow copy bug
package services;

import models.User;

public class SettingsManager {
    // BUG: Shallow clone doesn't prevent nested object mutation
    public User updateUserSettings(User user, String newTheme) {
        User updatedUser = user.clone(); // Shallow copy
        updatedUser.getPreferences().setTheme(newTheme); // Mutates original!
        return updatedUser;
    }

    // This has the same bug
    public User toggleNotification(User user, String notificationType) {
        User updatedUser = user.clone();
        switch (notificationType) {
            case "email":
                updatedUser.getPreferences().getNotifications()
                    .setEmail(!updatedUser.getPreferences().getNotifications().isEmail());
                break;
            // ... other cases
        }
        return updatedUser; // Original user is also modified
    }
}`,
          description: "Settings manager class with shallow copy bug affecting nested objects",
        },
        {
          fileName: "tests/SettingsMutationTest.java",
          content: `// Test demonstrating shallow vs deep copy in Java
package tests;

import models.User;
import models.Preferences;
import models.Notifications;
import services.SettingsManager;

public class SettingsMutationTest {
    public static void testShallowCopyMutation() {
        System.out.println("=== Testing Shallow Copy Mutation Bug ===\\n");

        SettingsManager manager = new SettingsManager();

        // Create original user
        Notifications notifications = new Notifications(true, false, true);
        Preferences preferences = new Preferences("light", notifications, "en");
        User originalUser = new User("John", "john@test.com", preferences);

        System.out.println("Original theme: " + originalUser.getPreferences().getTheme());

        // Update theme to dark
        User updatedUser = manager.updateUserSettings(originalUser, "dark");

        System.out.println("\\nAfter update:");
        System.out.println("Original theme: " + originalUser.getPreferences().getTheme());
        System.out.println("Updated theme: " + updatedUser.getPreferences().getTheme());

        // BUG: Original object is mutated!
        if (originalUser.getPreferences().getTheme().equals("dark")) {
            System.out.println("\\n❌ BUG: Original was mutated! Expected 'light', got 'dark'");
        }

        // They share the same preferences object
        if (originalUser.getPreferences() == updatedUser.getPreferences()) {
            System.out.println("❌ Same preferences reference - shallow copy!");
        }

        System.out.println("\\nFIX: Override clone() to create deep copy of nested objects");
    }

    public static void main(String[] args) {
        testShallowCopyMutation();
    }
}`,
          description: "Test demonstrating the shallow copy mutation bug",
        },
      ],
    },
  },
]
