import type { BugFixScenario } from "../types"

export const asyncClosureBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-async-await",
    title: "Fix Async/Await Promise Handling",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Meta", "Amazon"],
    description: "Fix improper async/await usage causing race conditions",
    tags: ["async", "promises", "concurrency"],
    estimatedTime: 15,
    problemStatement: `This function should fetch user data and then fetch their posts, but the posts are undefined. Fix the async issue.`,
    buggyCode: {
      javascript: `// userService.js - Main file with async/await bug
async function getUserWithPosts(userId) {
  const user = fetchUser(userId);  // BUG: Missing await
  const posts = await fetchUserPosts(user.id);
  return { user, posts };
}`,
      typescript: `// userService.ts - Main file with async/await bug
async function getUserWithPosts(userId: string) {
  const user = fetchUser(userId);  // BUG: Missing await
  const posts = await fetchUserPosts(user.id);
  return { user, posts };
}`,
      python: `# user_service.py - Main file with async/await bug
async def get_user_with_posts(user_id):
    user = fetch_user(user_id)  # BUG: Missing await
    posts = await fetch_user_posts(user['id'])
    return {"user": user, "posts": posts}`,
      java: `// UserService.java - Main file with async/await bug
import java.util.concurrent.CompletableFuture;
import java.util.Map;
import java.util.List;

public class UserService {
    public static CompletableFuture<Map<String, Object>> getUserWithPosts(String userId) {
        CompletableFuture<User> user = fetchUser(userId);  // BUG: Not waiting for completion
        CompletableFuture<List<Post>> posts = user.get().getId()  // Will throw exception
            .thenCompose(id -> fetchUserPosts(id));

        return posts.thenApply(p -> Map.of("user", user, "posts", p));
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "api/userAPI.js",
          content: `// User API functions
export async function fetchUser(userId) {
  const response = await fetch(\`https://api.example.com/users/\${userId}\`);
  if (!response.ok) {
    throw new Error(\`Failed to fetch user: \${response.statusText}\`);
  }
  return response.json();
}

export async function fetchUserPosts(userId) {
  const response = await fetch(\`https://api.example.com/users/\${userId}/posts\`);
  if (!response.ok) {
    throw new Error(\`Failed to fetch posts: \${response.statusText}\`);
  }
  return response.json();
}

export async function fetchUserComments(userId) {
  const response = await fetch(\`https://api.example.com/users/\${userId}/comments\`);
  return response.json();
}`,
          description: "API functions for fetching user data - all async",
        },
        {
          fileName: "components/UserDashboard.js",
          content: `// User Dashboard component that uses getUserWithPosts
import { getUserWithPosts } from './userService.js';

export async function renderUserDashboard(userId) {
  const container = document.getElementById('dashboard');

  try {
    container.innerHTML = '<div class="loading">Loading...</div>';

    const data = await getUserWithPosts(userId);

    // This will fail if user is a Promise object
    const userHTML = \`
      <div class="user-info">
        <h2>\${data.user.name}</h2>
        <p>\${data.user.email}</p>
      </div>
    \`;

    const postsHTML = \`
      <div class="posts">
        <h3>Posts (\${data.posts.length})</h3>
        \${data.posts.map(post => \`
          <div class="post">
            <h4>\${post.title}</h4>
            <p>\${post.body}</p>
          </div>
        \`).join('')}
      </div>
    \`;

    container.innerHTML = userHTML + postsHTML;
  } catch (error) {
    container.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
    console.error('Dashboard error:', error);
  }
}`,
          description: "Dashboard component that depends on getUserWithPosts",
        },
        {
          fileName: "tests/userService.test.js",
          content: `// Test file for userService
import { getUserWithPosts } from './userService.js';

async function testGetUserWithPosts() {
  console.log('Testing getUserWithPosts...');

  try {
    const result = await getUserWithPosts('user123');

    // Check if user is actually a user object, not a Promise
    if (result.user instanceof Promise) {
      console.error('❌ FAIL: user is a Promise, not an object!');
      console.error('   This means the fetchUser call was not awaited');
      return false;
    }

    // Check if user has expected properties
    if (!result.user.id || !result.user.name) {
      console.error('❌ FAIL: user object missing expected properties');
      return false;
    }

    // Check posts
    if (!Array.isArray(result.posts)) {
      console.error('❌ FAIL: posts is not an array');
      return false;
    }

    console.log('✅ PASS: getUserWithPosts works correctly');
    return true;
  } catch (error) {
    console.error('❌ FAIL: Error occurred:', error.message);
    return false;
  }
}

// Run test
testGetUserWithPosts();`,
          description: "Test file showing how the bug manifests",
        },
      ],
      typescript: [
        {
          fileName: "api/userAPI.ts",
          content: `// User API functions
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
}

export async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(\`https://api.example.com/users/\${userId}\`);
  if (!response.ok) {
    throw new Error(\`Failed to fetch user: \${response.statusText}\`);
  }
  return response.json();
}

export async function fetchUserPosts(userId: string): Promise<Post[]> {
  const response = await fetch(\`https://api.example.com/users/\${userId}/posts\`);
  if (!response.ok) {
    throw new Error(\`Failed to fetch posts: \${response.statusText}\`);
  }
  return response.json();
}`,
          description: "API functions with TypeScript interfaces",
        },
        {
          fileName: "components/UserDashboard.tsx",
          content: `// User Dashboard component
import { getUserWithPosts } from './userService';

interface DashboardProps {
  userId: string;
}

export async function renderUserDashboard({ userId }: DashboardProps) {
  const container = document.getElementById('dashboard');
  if (!container) return;

  try {
    container.innerHTML = '<div class="loading">Loading...</div>';

    const data = await getUserWithPosts(userId);

    // TypeScript won't catch the Promise bug at compile time
    // because user is typed as User, but at runtime it's Promise<User>
    const userHTML = \`
      <div class="user-info">
        <h2>\${data.user.name}</h2>
        <p>\${data.user.email}</p>
      </div>
    \`;

    container.innerHTML = userHTML;
  } catch (error) {
    console.error('Dashboard error:', error);
  }
}`,
          description: "TypeScript component using the buggy service",
        },
      ],
      python: [
        {
          fileName: "api/user_api.py",
          content: `# User API functions
import aiohttp
import asyncio

async def fetch_user(user_id: str) -> dict:
    """Fetch user data from API"""
    async with aiohttp.ClientSession() as session:
        async with session.get(f'https://api.example.com/users/{user_id}') as response:
            if response.status != 200:
                raise Exception(f'Failed to fetch user: {response.status}')
            return await response.json()

async def fetch_user_posts(user_id: str) -> list:
    """Fetch user's posts from API"""
    async with aiohttp.ClientSession() as session:
        async with session.get(f'https://api.example.com/users/{user_id}/posts') as response:
            if response.status != 200:
                raise Exception(f'Failed to fetch posts: {response.status}')
            return await response.json()`,
          description: "Async API functions for fetching user data",
        },
        {
          fileName: "components/user_dashboard.py",
          content: `# User Dashboard component
from user_service import get_user_with_posts

async def render_user_dashboard(user_id: str):
    """Render user dashboard with posts"""
    try:
        data = await get_user_with_posts(user_id)

        # This will fail if user is a coroutine object instead of dict
        print(f"User: {data['user']['name']}")
        print(f"Email: {data['user']['email']}")
        print(f"Posts: {len(data['posts'])}")

        for post in data['posts']:
            print(f"  - {post['title']}")

    except TypeError as e:
        print(f"TypeError: {e}")
        print("This likely means user is a coroutine, not a dict")
    except Exception as e:
        print(f"Error: {e}")`,
          description: "Dashboard that uses the buggy service",
        },
      ],
      java: [
        {
          fileName: "api/UserAPI.java",
          content: `// User API functions
package api;

import java.util.concurrent.CompletableFuture;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import com.google.gson.Gson;
import java.util.List;

public class UserAPI {
    private static final HttpClient client = HttpClient.newHttpClient();
    private static final Gson gson = new Gson();

    public static CompletableFuture<User> fetchUser(String userId) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId))
            .build();

        return client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(response -> {
                if (response.statusCode() != 200) {
                    throw new RuntimeException("Failed to fetch user: " + response.statusCode());
                }
                return gson.fromJson(response.body(), User.class);
            });
    }

    public static CompletableFuture<List<Post>> fetchUserPosts(String userId) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId + "/posts"))
            .build();

        return client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(response -> {
                if (response.statusCode() != 200) {
                    throw new RuntimeException("Failed to fetch posts: " + response.statusCode());
                }
                return gson.fromJson(response.body(), new TypeToken<List<Post>>(){}.getType());
            });
    }
}

class User {
    String id;
    String name;
    String email;
    String avatar;

    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}

class Post {
    String id;
    String userId;
    String title;
    String body;
    String createdAt;
}`,
          description: "API functions returning CompletableFuture - all async",
        },
        {
          fileName: "components/UserDashboard.java",
          content: `// User Dashboard component that uses getUserWithPosts
package components;

import api.UserAPI;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class UserDashboard {
    public static void renderUserDashboard(String userId) {
        System.out.println("Loading...");

        try {
            CompletableFuture<Map<String, Object>> dataFuture = UserService.getUserWithPosts(userId);

            dataFuture.thenAccept(data -> {
                // This will fail if user is still a CompletableFuture
                User user = (User) data.get("user");
                List<Post> posts = (List<Post>) data.get("posts");

                System.out.println("User: " + user.getName());
                System.out.println("Email: " + user.getEmail());
                System.out.println("Posts: " + posts.size());

                for (Post post : posts) {
                    System.out.println("  - " + post.title);
                }
            }).exceptionally(error -> {
                System.err.println("Dashboard error: " + error.getMessage());
                error.printStackTrace();
                return null;
            }).join();
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}`,
          description: "Dashboard component that depends on getUserWithPosts",
        },
        {
          fileName: "tests/UserServiceTest.java",
          content: `// Test file for UserService
package tests;

import java.util.concurrent.CompletableFuture;
import java.util.Map;

public class UserServiceTest {
    public static void testGetUserWithPosts() {
        System.out.println("Testing getUserWithPosts...");

        try {
            CompletableFuture<Map<String, Object>> resultFuture =
                UserService.getUserWithPosts("user123");

            Map<String, Object> result = resultFuture.join();

            // Check if user is actually a User object, not a CompletableFuture
            Object userObj = result.get("user");
            if (userObj instanceof CompletableFuture) {
                System.err.println("❌ FAIL: user is a CompletableFuture, not a User object!");
                System.err.println("   This means the fetchUser call was not properly awaited");
                return;
            }

            User user = (User) userObj;
            // Check if user has expected properties
            if (user.getId() == null || user.getName() == null) {
                System.err.println("❌ FAIL: user object missing expected properties");
                return;
            }

            // Check posts
            Object postsObj = result.get("posts");
            if (!(postsObj instanceof List)) {
                System.err.println("❌ FAIL: posts is not a List");
                return;
            }

            System.out.println("✅ PASS: getUserWithPosts works correctly");
        } catch (Exception error) {
            System.err.println("❌ FAIL: Error occurred: " + error.getMessage());
            error.printStackTrace();
        }
    }

    public static void main(String[] args) {
        testGetUserWithPosts();
    }
}`,
          description: "Test file showing how the bug manifests",
        },
      ],
    },
    expectedBehavior: "Should properly await both API calls and return complete data",
    bugDescription: "Missing await on first async call causes user to be a Promise",
    hints: [
      "Check if all async functions are being awaited",
      "Remember that async functions return Promises",
      "The user variable might not be what you expect",
    ],
    testCases: [
      {
        input: { userId: "user123" },
        expected: { user: { id: "user123", name: "John Doe" }, posts: [] },
        description: "Should return user object and posts array",
      },
    ],
  },
  {
    id: "bugfix-closure-loop",
    title: "Fix Closure in Loop Bug",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Google", "Meta"],
    description: "Fix closure bug in loop causing incorrect values",
    tags: ["closures", "scope", "loops"],
    estimatedTime: 15,
    problemStatement: `This code should create buttons that log 0, 1, 2 when clicked, but they all log 3. Fix the closure issue.`,
    buggyCode: {
      javascript: `// buttonFactory.js - Creates event handlers with closure bug
function createButtons() {
  const buttons = [];
  // BUG: Using 'var' creates function-scoped variable
  for (var i = 0; i < 3; i++) {
    buttons.push(function() {
      console.log(i);  // Captures reference to i, not value
    });
  }
  return buttons;
}`,
      typescript: `// buttonFactory.ts - Creates event handlers with closure bug
function createButtons(): Function[] {
  const buttons: Function[] = [];
  // BUG: Using 'var' creates function-scoped variable
  for (var i = 0; i < 3; i++) {
    buttons.push(function() {
      console.log(i);  // Captures reference to i, not value
    });
  }
  return buttons;
}`,
      python: `# button_factory.py - Creates event handlers with closure bug
def create_buttons():
    buttons = []
    # BUG: Lambda captures variable i by reference
    for i in range(3):
        buttons.append(lambda: print(i))
    return buttons`,
      java: `// ButtonFactory.java - Creates event handlers with closure bug
import java.util.ArrayList;
import java.util.List;

public class ButtonFactory {
    public static List<Runnable> createButtons() {
        List<Runnable> buttons = new ArrayList<>();
        // BUG: Using shared mutable container instead of effectively final variable
        int[] sharedCounter = new int[1];  // Mutable array shared by all lambdas
        for (int i = 0; i < 3; i++) {
            sharedCounter[0] = i;  // Update shared counter
            // BUG: All lambdas capture reference to same array
            buttons.add(() -> System.out.println(sharedCounter[0]));
        }
        // After loop, sharedCounter[0] is 2, so all lambdas print 2
        return buttons;
    }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "ui/ButtonManager.js",
          content: `// ButtonManager - Manages dynamic button creation
import { createButtons } from './buttonFactory.js';

export class ButtonManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.handlers = [];
  }

  renderButtons() {
    this.handlers = createButtons();

    this.container.innerHTML = '';

    this.handlers.forEach((handler, index) => {
      const button = document.createElement('button');
      button.textContent = \`Button \${index}\`;
      button.className = 'btn';
      button.addEventListener('click', handler);
      this.container.appendChild(button);
    });

    console.log('Expected: Buttons should log 0, 1, 2 when clicked');
    console.log('Actual: All buttons log 3 due to closure bug');
  }

  testHandlers() {
    console.log('Testing button handlers:');
    this.handlers.forEach((handler, index) => {
      console.log(\`Handler \${index} logs:\`);
      handler();
    });
  }
}`,
          description: "UI manager that uses createButtons function",
        },
        {
          fileName: "utils/eventHandlerFactory.js",
          content: `// Utility functions for creating event handlers
// These show the CORRECT patterns to avoid closure bugs

// Pattern 1: Using let (block scope)
export function createHandlersWithLet() {
  const handlers = [];
  for (let i = 0; i < 3; i++) {  // 'let' creates block-scoped variable
    handlers.push(function() {
      console.log(i);
    });
  }
  return handlers;
}

// Pattern 2: Using IIFE (Immediately Invoked Function Expression)
export function createHandlersWithIIFE() {
  const handlers = [];
  for (var i = 0; i < 3; i++) {
    handlers.push((function(index) {
      return function() {
        console.log(index);
      };
    })(i));
  }
  return handlers;
}

// Pattern 3: Using forEach
export function createHandlersWithForEach() {
  return [0, 1, 2].map(i => {
    return function() {
      console.log(i);
    };
  });
}

// Pattern 4: Using bind
export function createHandlersWithBind() {
  const handlers = [];
  for (var i = 0; i < 3; i++) {
    handlers.push(console.log.bind(console, i));
  }
  return handlers;
}`,
          description: "Reference implementations showing correct patterns",
        },
        {
          fileName: "tests/closureTest.js",
          content: `// Test file to demonstrate closure bug
import { createButtons } from './buttonFactory.js';
import { createHandlersWithLet } from './utils/eventHandlerFactory.js';

function testClosureBug() {
  console.log('=== Testing Closure Bug ===\\n');

  console.log('Buggy version (using var):');
  const buggyHandlers = createButtons();
  buggyHandlers.forEach((handler, index) => {
    console.log(\`  Handler \${index} logs:\`, end='');
    handler();  // All will log 3
  });

  console.log('\\nExpected behavior:');
  console.log('  Handler 0 should log: 0');
  console.log('  Handler 1 should log: 1');
  console.log('  Handler 2 should log: 2');

  console.log('\\nFixed version (using let):');
  const fixedHandlers = createHandlersWithLet();
  fixedHandlers.forEach((handler, index) => {
    console.log(\`  Handler \${index} logs:\`, end='');
    handler();  // Will correctly log 0, 1, 2
  });
}

testClosureBug();`,
          description: "Test showing the bug and expected behavior",
        },
      ],
      typescript: [
        {
          fileName: "ui/ButtonManager.ts",
          content: `// ButtonManager - Manages dynamic button creation
import { createButtons } from './buttonFactory';

type EventHandler = () => void;

export class ButtonManager {
  private container: HTMLElement | null;
  private handlers: EventHandler[] = [];

  constructor(containerId: string) {
    this.container = document.getElementById(containerId);
  }

  renderButtons(): void {
    if (!this.container) return;

    this.handlers = createButtons();
    this.container.innerHTML = '';

    this.handlers.forEach((handler, index) => {
      const button = document.createElement('button');
      button.textContent = \`Button \${index}\`;
      button.className = 'btn';
      button.addEventListener('click', handler);
      this.container!.appendChild(button);
    });
  }

  testHandlers(): void {
    console.log('Testing button handlers:');
    this.handlers.forEach((handler, index) => {
      console.log(\`Handler \${index}:\`);
      handler();
    });
  }
}`,
          description: "TypeScript button manager using the buggy factory",
        },
      ],
      python: [
        {
          fileName: "ui/button_manager.py",
          content: `# ButtonManager - Manages dynamic button creation
from button_factory import create_buttons

class ButtonManager:
    def __init__(self):
        self.handlers = []

    def create_buttons(self):
        """Create button handlers"""
        self.handlers = create_buttons()
        print('Expected: Buttons should print 0, 1, 2 when called')
        print('Actual: All buttons print 2 due to closure bug')

    def test_handlers(self):
        """Test all handlers"""
        print('Testing button handlers:')
        for index, handler in enumerate(self.handlers):
            print(f'Handler {index} prints:', end=' ')
            handler()`,
          description: "UI manager that uses create_buttons function",
        },
        {
          fileName: "utils/event_handler_factory.py",
          content: `# Utility functions showing correct patterns

# Pattern 1: Using default arguments (CORRECT)
def create_handlers_with_default():
    """Create handlers using default argument to capture value"""
    handlers = []
    for i in range(3):
        handlers.append(lambda index=i: print(index))
    return handlers

# Pattern 2: Using functools.partial (CORRECT)
from functools import partial

def create_handlers_with_partial():
    """Create handlers using partial application"""
    handlers = []
    for i in range(3):
        handlers.append(partial(print, i))
    return handlers

# Pattern 3: Using list comprehension (CORRECT)
def create_handlers_with_comprehension():
    """Create handlers using list comprehension"""
    return [lambda index=i: print(index) for i in range(3)]`,
          description: "Reference implementations showing correct patterns",
        },
        {
          fileName: "tests/closure_test.py",
          content: `# Test file to demonstrate closure bug
from button_factory import create_buttons
from utils.event_handler_factory import create_handlers_with_default

def test_closure_bug():
    print('=== Testing Closure Bug ===\\n')

    print('Buggy version (lambda capturing variable):')
    buggy_handlers = create_buttons()
    for index, handler in enumerate(buggy_handlers):
        print(f'  Handler {index} prints:', end=' ')
        handler()  # All will print 2

    print('\\nExpected behavior:')
    print('  Handler 0 should print: 0')
    print('  Handler 1 should print: 1')
    print('  Handler 2 should print: 2')

    print('\\nFixed version (using default arguments):')
    fixed_handlers = create_handlers_with_default()
    for index, handler in enumerate(fixed_handlers):
        print(f'  Handler {index} prints:', end=' ')
        handler()  # Will correctly print 0, 1, 2

if __name__ == '__main__':
    test_closure_bug()`,
          description: "Test showing the bug and expected behavior",
        },
      ],
      java: [
        {
          fileName: "ui/ButtonManager.java",
          content: `// ButtonManager - Manages dynamic button creation
package ui;

import java.util.List;

public class ButtonManager {
    private List<Runnable> handlers;

    public void createButtons() {
        this.handlers = ButtonFactory.createButtons();
        System.out.println("Expected: Buttons should print 0, 1, 2 when called");
        System.out.println("Actual: All buttons print 2 due to closure bug");
    }

    public void testHandlers() {
        System.out.println("Testing button handlers:");
        for (int index = 0; index < handlers.size(); index++) {
            System.out.print("Handler " + index + " prints: ");
            handlers.get(index).run();
        }
    }

    public List<Runnable> getHandlers() {
        return handlers;
    }
}`,
          description: "UI manager that uses createButtons function",
        },
        {
          fileName: "utils/EventHandlerFactory.java",
          content: `// Utility functions showing correct patterns
package utils;

import java.util.ArrayList;
import java.util.List;

public class EventHandlerFactory {
    // Pattern 1: Using effectively final variable (CORRECT)
    public static List<Runnable> createHandlersWithFinal() {
        List<Runnable> handlers = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            final int index = i;  // Effectively final - each iteration gets its own copy
            handlers.add(() -> System.out.println(index));
        }
        return handlers;
    }

    // Pattern 2: Using method to capture value (CORRECT)
    public static List<Runnable> createHandlersWithMethod() {
        List<Runnable> handlers = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            handlers.add(createHandler(i));
        }
        return handlers;
    }

    private static Runnable createHandler(int value) {
        return () -> System.out.println(value);
    }

    // Pattern 3: Using separate array for each lambda (CORRECT)
    public static List<Runnable> createHandlersWithSeparateArrays() {
        List<Runnable> handlers = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            int[] counter = new int[]{i};  // Each lambda gets its own array
            handlers.add(() -> System.out.println(counter[0]));
        }
        return handlers;
    }
}`,
          description: "Reference implementations showing correct patterns",
        },
        {
          fileName: "tests/ClosureTest.java",
          content: `// Test file to demonstrate closure bug
package tests;

import java.util.List;
import utils.EventHandlerFactory;

public class ClosureTest {
    public static void testClosureBug() {
        System.out.println("=== Testing Closure Bug ===\\n");

        System.out.println("Buggy version (shared mutable array):");
        List<Runnable> buggyHandlers = ButtonFactory.createButtons();
        for (int index = 0; index < buggyHandlers.size(); index++) {
            System.out.print("  Handler " + index + " prints: ");
            buggyHandlers.get(index).run();  // All will print 2
        }

        System.out.println("\\nExpected behavior:");
        System.out.println("  Handler 0 should print: 0");
        System.out.println("  Handler 1 should print: 1");
        System.out.println("  Handler 2 should print: 2");

        System.out.println("\\nFixed version (using effectively final):");
        List<Runnable> fixedHandlers = EventHandlerFactory.createHandlersWithFinal();
        for (int index = 0; index < fixedHandlers.size(); index++) {
            System.out.print("  Handler " + index + " prints: ");
            fixedHandlers.get(index).run();  // Will correctly print 0, 1, 2
        }
    }

    public static void main(String[] args) {
        testClosureBug();
    }
}`,
          description: "Test showing the bug and expected behavior",
        },
      ],
    },
    expectedBehavior: "Each button should log its correct index (0, 1, 2)",
    bugDescription: "Closure captures the variable i, not its value at each iteration",
    hints: [
      "The issue is with variable scope in the loop",
      "Consider using let instead of var in JavaScript",
      "You could also use an IIFE or pass i as a parameter",
      "In Python, use default arguments in lambda: lambda i=i: print(i)",
    ],
    testCases: [
      {
        input: { action: "Call each returned function" },
        expected: [0, 1, 2],
        description: "Should log 0, 1, 2 respectively",
      },
    ],
  },
]
