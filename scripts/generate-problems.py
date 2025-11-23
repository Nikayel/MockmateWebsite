#!/usr/bin/env python3
"""
Problem Generator Script for MockMate
Generates high-quality DSA and Bugfix scenarios based on templates
"""

import json
import re

# Problem templates for rapid generation
PROBLEM_TEMPLATES = {
    "linked_list": [
        {
            "id": "dsa-reverse-linked-list",
            "title": "Reverse Linked List",
            "difficulty": "easy",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Reverse a singly linked list.",
            "tags": ["linked-list", "recursion", "iteration"],
            "estimatedTime": 15,
            "problemStatement": "Given the head of a singly linked list, reverse the list, and return the reversed list.",
            "examples": [
                {"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]"},
                {"input": "head = [1,2]", "output": "[2,1]"},
                {"input": "head = []", "output": "[]"}
            ],
            "constraints": [
                "The number of nodes in the list is the range [0, 5000].",
                "-5000 <= Node.val <= 5000"
            ],
            "hints": [
                "Think about iterative approach with three pointers",
                "Consider recursive solution as well",
                "Handle edge cases: empty list, single node"
            ],
            "complexity": {"time": "O(n)", "space": "O(1) iterative, O(n) recursive"}
        },
        {
            "id": "dsa-merge-two-sorted-lists",
            "title": "Merge Two Sorted Lists",
            "difficulty": "easy",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Merge two sorted linked lists into one sorted list.",
            "tags": ["linked-list", "recursion", "two-pointers"],
            "estimatedTime": 20,
            "problemStatement": "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.",
            "examples": [
                {"input": "list1 = [1,2,4], list2 = [1,3,4]", "output": "[1,1,2,3,4,4]"},
                {"input": "list1 = [], list2 = []", "output": "[]"},
                {"input": "list1 = [], list2 = [0]", "output": "[0]"}
            ],
            "constraints": [
                "The number of nodes in both lists is in the range [0, 50].",
                "-100 <= Node.val <= 100",
                "Both list1 and list2 are sorted in non-decreasing order."
            ],
            "hints": [
                "Use a dummy node to simplify edge cases",
                "Compare values and link smaller node",
                "Don't forget to link remaining nodes"
            ],
            "complexity": {"time": "O(n + m)", "space": "O(1)"}
        },
        {
            "id": "dsa-linked-list-cycle",
            "title": "Linked List Cycle",
            "difficulty": "easy",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Detect if a linked list has a cycle.",
            "tags": ["linked-list", "two-pointers", "hash-table"],
            "estimatedTime": 15,
            "problemStatement": "Given head, the head of a linked list, determine if the linked list has a cycle in it. There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer.",
            "examples": [
                {"input": "head = [3,2,0,-4], pos = 1", "output": "true", "explanation": "There is a cycle where tail connects to the 1st node (0-indexed)"},
                {"input": "head = [1,2], pos = 0", "output": "true"},
                {"input": "head = [1], pos = -1", "output": "false"}
            ],
            "constraints": [
                "The number of nodes in the list is in the range [0, 10^4].",
                "-10^5 <= Node.val <= 10^5",
                "pos is -1 or a valid index in the linked-list."
            ],
            "hints": [
                "Use Floyd's cycle detection (tortoise and hare)",
                "Use two pointers: slow (1 step) and fast (2 steps)",
                "If they meet, there's a cycle"
            ],
            "complexity": {"time": "O(n)", "space": "O(1)"}
        }
    ],
    "trees": [
        {
            "id": "dsa-binary-tree-inorder",
            "title": "Binary Tree Inorder Traversal",
            "difficulty": "easy",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Return the inorder traversal of a binary tree's nodes' values.",
            "tags": ["tree", "dfs", "stack", "recursion"],
            "estimatedTime": 15,
            "problemStatement": "Given the root of a binary tree, return the inorder traversal of its nodes' values.",
            "examples": [
                {"input": "root = [1,null,2,3]", "output": "[1,3,2]"},
                {"input": "root = []", "output": "[]"},
                {"input": "root = [1]", "output": "[1]"}
            ],
            "constraints": [
                "The number of nodes in the tree is in the range [0, 100].",
                "-100 <= Node.val <= 100"
            ],
            "hints": [
                "Inorder: left -> root -> right",
                "Can solve recursively or iteratively with stack",
                "Morris traversal for O(1) space"
            ],
            "complexity": {"time": "O(n)", "space": "O(n) recursive, O(1) Morris"}
        },
        {
            "id": "dsa-validate-bst",
            "title": "Validate Binary Search Tree",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Determine if a binary tree is a valid binary search tree.",
            "tags": ["tree", "dfs", "bst"],
            "estimatedTime": 20,
            "problemStatement": "Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST is defined as follows: The left subtree of a node contains only nodes with keys less than the node's key. The right subtree of a node contains only nodes with keys greater than the node's key. Both the left and right subtrees must also be binary search trees.",
            "examples": [
                {"input": "root = [2,1,3]", "output": "true"},
                {"input": "root = [5,1,4,null,null,3,6]", "output": "false", "explanation": "The root node's value is 5 but its right child's value is 4."}
            ],
            "constraints": [
                "The number of nodes in the tree is in the range [1, 10^4].",
                "-2^31 <= Node.val <= 2^31 - 1"
            ],
            "hints": [
                "Keep track of valid range for each node",
                "Use inorder traversal - should be strictly increasing",
                "Pass min and max values down the tree"
            ],
            "complexity": {"time": "O(n)", "space": "O(n)"}
        }
    ],
    "graphs": [
        {
            "id": "dsa-number-of-islands",
            "title": "Number of Islands",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Count the number of islands in a 2D grid.",
            "tags": ["graph", "dfs", "bfs", "union-find"],
            "estimatedTime": 25,
            "problemStatement": "Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
            "examples": [
                {
                    "input": 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
                    "output": "1"
                },
                {
                    "input": 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
                    "output": "3"
                }
            ],
            "constraints": [
                "m == grid.length",
                "n == grid[i].length",
                "1 <= m, n <= 300",
                "grid[i][j] is '0' or '1'."
            ],
            "hints": [
                "Use DFS or BFS to explore each island",
                "Mark visited cells to avoid counting twice",
                "Increment counter for each new island found"
            ],
            "complexity": {"time": "O(m * n)", "space": "O(m * n)"}
        },
        {
            "id": "dsa-course-schedule",
            "title": "Course Schedule",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Determine if you can finish all courses given prerequisites.",
            "tags": ["graph", "dfs", "bfs", "topological-sort"],
            "estimatedTime": 25,
            "problemStatement": "There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return true if you can finish all courses. Otherwise, return false.",
            "examples": [
                {"input": "numCourses = 2, prerequisites = [[1,0]]", "output": "true", "explanation": "Take course 0, then course 1"},
                {"input": "numCourses = 2, prerequisites = [[1,0],[0,1]]", "output": "false", "explanation": "Circular dependency"}
            ],
            "constraints": [
                "1 <= numCourses <= 2000",
                "0 <= prerequisites.length <= 5000",
                "prerequisites[i].length == 2",
                "0 <= ai, bi < numCourses"
            ],
            "hints": [
                "This is cycle detection in a directed graph",
                "Use topological sort or DFS with visited states",
                "If there's a cycle, return false"
            ],
            "complexity": {"time": "O(V + E)", "space": "O(V + E)"}
        }
    ],
    "dynamic_programming": [
        {
            "id": "dsa-climbing-stairs",
            "title": "Climbing Stairs",
            "difficulty": "easy",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Count ways to climb n stairs taking 1 or 2 steps at a time.",
            "tags": ["dynamic-programming", "math", "memoization"],
            "estimatedTime": 15,
            "problemStatement": "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
            "examples": [
                {"input": "n = 2", "output": "2", "explanation": "1 step + 1 step or 2 steps"},
                {"input": "n = 3", "output": "3", "explanation": "1+1+1, 1+2, or 2+1"}
            ],
            "constraints": ["1 <= n <= 45"],
            "hints": [
                "This is Fibonacci sequence",
                "ways(n) = ways(n-1) + ways(n-2)",
                "Can optimize space to O(1)"
            ],
            "complexity": {"time": "O(n)", "space": "O(1)"}
        },
        {
            "id": "dsa-coin-change",
            "title": "Coin Change",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Find fewest coins needed to make amount.",
            "tags": ["dynamic-programming", "array"],
            "estimatedTime": 25,
            "problemStatement": "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.",
            "examples": [
                {"input": "coins = [1,2,5], amount = 11", "output": "3", "explanation": "11 = 5 + 5 + 1"},
                {"input": "coins = [2], amount = 3", "output": "-1"},
                {"input": "coins = [1], amount = 0", "output": "0"}
            ],
            "constraints": [
                "1 <= coins.length <= 12",
                "1 <= coins[i] <= 2^31 - 1",
                "0 <= amount <= 10^4"
            ],
            "hints": [
                "Use bottom-up DP",
                "dp[i] = min coins needed for amount i",
                "dp[i] = min(dp[i - coin] + 1) for all coins"
            ],
            "complexity": {"time": "O(amount * coins)", "space": "O(amount)"}
        },
        {
            "id": "dsa-longest-increasing-subsequence",
            "title": "Longest Increasing Subsequence",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Find length of longest strictly increasing subsequence.",
            "tags": ["dynamic-programming", "binary-search", "array"],
            "estimatedTime": 30,
            "problemStatement": "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
            "examples": [
                {"input": "nums = [10,9,2,5,3,7,101,18]", "output": "4", "explanation": "[2,3,7,101]"},
                {"input": "nums = [0,1,0,3,2,3]", "output": "4"},
                {"input": "nums = [7,7,7,7,7,7,7]", "output": "1"}
            ],
            "constraints": [
                "1 <= nums.length <= 2500",
                "-10^4 <= nums[i] <= 10^4"
            ],
            "hints": [
                "DP approach: dp[i] = longest LIS ending at i",
                "For each element, check all previous elements",
                "Can optimize with binary search to O(n log n)"
            ],
            "complexity": {"time": "O(n²) DP, O(n log n) binary search", "space": "O(n)"}
        }
    ]
}

# Bugfix templates
BUGFIX_TEMPLATES = [
    {
        "id": "bugfix-binary-search-off-by-one",
        "title": "Binary Search Off-by-One Error",
        "difficulty": "easy",
        "companies": ["Amazon", "Google"],
        "description": "Fix off-by-one error in binary search implementation",
        "tags": ["binary-search", "array", "debugging"],
        "estimatedTime": 15,
        "bugDescription": "The binary search function has an off-by-one error that causes it to miss the target in certain cases or go into infinite loop.",
        "buggyCodeJs": `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length; // Bug: should be arr.length - 1

  while (left <= right) {
    let mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid; // Bug: should be mid + 1
    } else {
      right = mid; // Bug: should be mid - 1
    }
  }

  return -1;
}`,
        "hints": [
            "Check the initial value of 'right'",
            "Look at how 'left' and 'right' are updated",
            "Make sure the search space is shrinking each iteration"
        ]
    },
    {
        "id": "bugfix-async-await-missing",
        "title": "Missing Await in Async Function",
        "difficulty": "easy",
        "companies": ["Meta", "Amazon"],
        "description": "Fix missing await causing race condition",
        "tags": ["async", "promises", "debugging"],
        "estimatedTime": 15,
        "bugDescription": "The function doesn't wait for async operations to complete, causing race conditions and incorrect results.",
        "buggyCodeJs": `async function fetchUserData(userId) {
  const user = getUserById(userId); // Bug: missing await
  const posts = getUserPosts(userId); // Bug: missing await

  return {
    ...user,
    posts: posts
  };
}`,
        "hints": [
            "Check which functions return promises",
            "Make sure to await async operations",
            "Consider using Promise.all for parallel fetches"
        ]
    },
    {
        "id": "bugfix-null-pointer-linkedlist",
        "title": "Null Pointer in Linked List Traversal",
        "difficulty": "easy",
        "companies": ["Amazon", "Microsoft"],
        "description": "Fix null pointer exception in linked list code",
        "tags": ["linked-list", "null-safety", "debugging"],
        "estimatedTime": 15,
        "bugDescription": "The function crashes with null pointer exception when traversing certain linked lists.",
        "buggyCodeJs": `function findNthFromEnd(head, n) {
  let fast = head;
  let slow = head;

  // Move fast n steps ahead
  for (let i = 0; i < n; i++) {
    fast = fast.next; // Bug: no null check
  }

  // Move both until fast reaches end
  while (fast.next !== null) { // Bug: should check fast !== null
    fast = fast.next;
    slow = slow.next;
  }

  return slow.val;
}`,
        "hints": [
            "Check for null before accessing .next",
            "What if n is larger than list length?",
            "What if head is null?"
        ]
    }
]

def generate_js_starter_code(problem_type, function_name):
    """Generate JavaScript starter code based on problem type"""
    if problem_type == "linked-list":
        return f"""function {function_name}(head) {{
  // Your code here
}}"""
    elif problem_type == "tree":
        return f"""function {function_name}(root) {{
  // Your code here
}}"""
    elif problem_type == "array":
        return f"""function {function_name}(nums) {{
  // Your code here
}}"""
    else:
        return f"""function {function_name}() {{
  // Your code here
}}"""

def generate_problem_from_template(template, problem_type):
    """Convert template to full TypeScript scenario format"""
    function_name = template["id"].replace("dsa-", "").replace("-", "_")

    # Build examples string
    examples_str = "[\n    " + ",\n    ".join([
        f'{{\n      input: \'{ex["input"]}\',\n      output: \'{ex["output"]}\'' +
        (f',\n      explanation: \'{ex.get("explanation", "")}\'' if "explanation" in ex else "") +
        '\n    }'
        for ex in template["examples"]
    ]) + "\n  ]"

    # Build constraints string
    constraints_str = "[\n    '" + "',\n    '".join(template["constraints"]) + "'\n  ]"

    # Build hints string
    hints_str = "[\n    '" + "',\n    '".join(template["hints"]) + "'\n  ]"

    return f'''  {{
    id: '{template["id"]}',
    title: '{template["title"]}',
    type: 'dsa',
    difficulty: '{template["difficulty"]}',
    companies: {json.dumps(template["companies"])},
    description: '{template["description"]}',
    tags: {json.dumps(template["tags"])},
    estimatedTime: {template["estimatedTime"]},
    problemStatement: `{template["problemStatement"]}`,
    examples: {examples_str},
    constraints: {constraints_str},
    hints: {hints_str},
    starterCode: {{
      javascript: `{generate_js_starter_code(problem_type, function_name)}`,
      python: `def {function_name}():
    # Your code here
    pass`
    }},
    optimalComplexity: {{
      time: '{template["complexity"]["time"]}',
      space: '{template["complexity"]["space"]}'
    }},
    testCases: []
  }}'''

# Generate all problems
print("Generating DSA problems...")
all_problems = []

for problem_type, templates in PROBLEM_TEMPLATES.items():
    for template in templates:
        problem_code = generate_problem_from_template(template, problem_type)
        all_problems.append(problem_code)

print(f"Generated {len(all_problems)} DSA problems")
print("\n" + "="*80)
print("GENERATED PROBLEMS (copy and paste into scenarios.ts before closing bracket):")
print("="*80 + "\n")

for problem in all_problems:
    print(problem + ",\n")
