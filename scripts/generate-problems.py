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
        },
        {
            "id": "dsa-lru-cache",
            "title": "LRU Cache",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Design and implement a Least Recently Used (LRU) cache.",
            "tags": ["linked-list", "hash-table", "design"],
            "estimatedTime": 30,
            "problemStatement": "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the LRUCache class with get(key) and put(key, value) methods. Both operations should run in O(1) time.",
            "examples": [
                {"input": "LRUCache(2), put(1,1), put(2,2), get(1), put(3,3), get(2)", "output": "1, -1", "explanation": "Cache is full, evict key 2"},
                {"input": "get(1), put(1,1), get(1)", "output": "-1, 1"}
            ],
            "constraints": [
                "1 <= capacity <= 3000",
                "0 <= key <= 10^4",
                "0 <= value <= 10^5",
                "At most 2 * 10^5 calls will be made to get and put."
            ],
            "hints": [
                "Use HashMap + Doubly Linked List",
                "HashMap for O(1) lookup, DLL for O(1) removal",
                "Move accessed items to front, evict from back"
            ],
            "complexity": {"time": "O(1)", "space": "O(capacity)"}
        },
        {
            "id": "dsa-copy-list-random-pointer",
            "title": "Copy List with Random Pointer",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Deep copy a linked list with random pointers.",
            "tags": ["linked-list", "hash-table"],
            "estimatedTime": 25,
            "problemStatement": "A linked list of length n is given such that each node contains an additional random pointer, which could point to any node in the list, or null. Construct a deep copy of the list.",
            "examples": [
                {"input": "[[7,null],[13,0],[11,4],[10,2],[1,0]]", "output": "[[7,null],[13,0],[11,4],[10,2],[1,0]]"}
            ],
            "constraints": [
                "0 <= n <= 1000",
                "-10^4 <= Node.val <= 10^4",
                "Node.random is null or is pointing to some node in the linked list."
            ],
            "hints": [
                "Use HashMap to map old nodes to new nodes",
                "First pass: create all nodes",
                "Second pass: connect next and random pointers"
            ],
            "complexity": {"time": "O(n)", "space": "O(n)"}
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
        },
        {
            "id": "dsa-lowest-common-ancestor-binary-tree",
            "title": "Lowest Common Ancestor of Binary Tree",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Find the lowest common ancestor of two nodes in a binary tree.",
            "tags": ["tree", "dfs", "recursion"],
            "estimatedTime": 25,
            "problemStatement": "Given a binary tree, find the lowest common ancestor (LCA) of two given nodes in the tree. The LCA is defined as the lowest node that has both nodes as descendants.",
            "examples": [
                {"input": "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1", "output": "3"},
                {"input": "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4", "output": "5"}
            ],
            "constraints": [
                "The number of nodes in the tree is in the range [2, 10^5].",
                "All Node.val are unique.",
                "p != q",
                "p and q will exist in the tree."
            ],
            "hints": [
                "Use recursive DFS approach",
                "If current node is p or q, return it",
                "If both left and right subtrees return non-null, current is LCA"
            ],
            "complexity": {"time": "O(n)", "space": "O(n)"}
        },
        {
            "id": "dsa-serialize-deserialize-tree",
            "title": "Serialize and Deserialize Binary Tree",
            "difficulty": "hard",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Design an algorithm to serialize and deserialize a binary tree.",
            "tags": ["tree", "dfs", "bfs", "design"],
            "estimatedTime": 35,
            "problemStatement": "Design an algorithm to serialize and deserialize a binary tree. Serialization is converting a tree to a string. Deserialization is converting the string back to the original tree structure.",
            "examples": [
                {"input": "root = [1,2,3,null,null,4,5]", "output": "[1,2,3,null,null,4,5]"}
            ],
            "constraints": [
                "The number of nodes in the tree is in the range [0, 10^4].",
                "-1000 <= Node.val <= 1000"
            ],
            "hints": [
                "Use preorder traversal with null markers",
                "Serialize: visit node, left, right (record nulls)",
                "Deserialize: recursively build tree from serialized string"
            ],
            "complexity": {"time": "O(n)", "space": "O(n)"}
        },
        {
            "id": "dsa-binary-tree-max-path-sum",
            "title": "Binary Tree Maximum Path Sum",
            "difficulty": "hard",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Find the maximum path sum in a binary tree.",
            "tags": ["tree", "dfs", "recursion"],
            "estimatedTime": 30,
            "problemStatement": "A path in a binary tree is a sequence of nodes where each pair of adjacent nodes has an edge. A node can only appear once in the sequence. The path sum is the sum of the node values. Return the maximum path sum of any non-empty path.",
            "examples": [
                {"input": "root = [1,2,3]", "output": "6", "explanation": "Path is 2->1->3"},
                {"input": "root = [-10,9,20,null,null,15,7]", "output": "42", "explanation": "Path is 15->20->7"}
            ],
            "constraints": [
                "The number of nodes in the tree is in the range [1, 3 * 10^4].",
                "-1000 <= Node.val <= 1000"
            ],
            "hints": [
                "For each node, calculate max path through that node",
                "Max path = node.val + max(left_path, 0) + max(right_path, 0)",
                "Return max single path to parent: node.val + max(left, right, 0)"
            ],
            "complexity": {"time": "O(n)", "space": "O(n)"}
        },
        {
            "id": "dsa-kth-smallest-bst",
            "title": "Kth Smallest Element in BST",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Find the kth smallest element in a BST.",
            "tags": ["tree", "dfs", "bst"],
            "estimatedTime": 20,
            "problemStatement": "Given the root of a binary search tree and an integer k, return the kth smallest value (1-indexed) in the tree.",
            "examples": [
                {"input": "root = [3,1,4,null,2], k = 1", "output": "1"},
                {"input": "root = [5,3,6,2,4,null,null,1], k = 3", "output": "3"}
            ],
            "constraints": [
                "The number of nodes in the tree is n.",
                "1 <= k <= n <= 10^4",
                "0 <= Node.val <= 10^4"
            ],
            "hints": [
                "Inorder traversal of BST gives sorted order",
                "Return the kth element during inorder traversal",
                "Can optimize with counter variable"
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
        },
        {
            "id": "dsa-clone-graph",
            "title": "Clone Graph",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Deep clone an undirected graph.",
            "tags": ["graph", "dfs", "bfs", "hash-table"],
            "estimatedTime": 25,
            "problemStatement": "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph. Each node contains a value and a list of its neighbors.",
            "examples": [
                {"input": "adjList = [[2,4],[1,3],[2,4],[1,3]]", "output": "[[2,4],[1,3],[2,4],[1,3]]"},
                {"input": "adjList = [[]]", "output": "[[]]"}
            ],
            "constraints": [
                "The number of nodes in the graph is in the range [0, 100].",
                "1 <= Node.val <= 100",
                "Node.val is unique for each node."
            ],
            "hints": [
                "Use HashMap to track old to new node mapping",
                "Use DFS or BFS to traverse graph",
                "Create new nodes and clone neighbors recursively"
            ],
            "complexity": {"time": "O(V + E)", "space": "O(V)"}
        },
        {
            "id": "dsa-word-ladder",
            "title": "Word Ladder",
            "difficulty": "hard",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Find shortest transformation sequence from begin word to end word.",
            "tags": ["graph", "bfs", "hash-table"],
            "estimatedTime": 35,
            "problemStatement": "A transformation sequence from word beginWord to word endWord is a sequence of words where each adjacent pair differs by a single letter, and every word in the sequence is in the wordList. Return the number of words in the shortest transformation sequence, or 0 if no such sequence exists.",
            "examples": [
                {"input": "beginWord = hot, endWord = dog, wordList = [hot,dot,dog,lot,log,cog]", "output": "5", "explanation": "hot -> dot -> dog"},
                {"input": "beginWord = hit, endWord = cog, wordList = [hot,dot,dog,lot,log,cog]", "output": "0"}
            ],
            "constraints": [
                "1 <= beginWord.length <= 10",
                "endWord.length == beginWord.length",
                "1 <= wordList.length <= 5000",
                "All strings consist of lowercase English letters."
            ],
            "hints": [
                "Model as graph: words are nodes, edges connect words differing by 1 letter",
                "Use BFS for shortest path",
                "Optimize by creating pattern map (h*t -> hot, hit)"
            ],
            "complexity": {"time": "O(M^2 * N)", "space": "O(M^2 * N)"}
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
        },
        {
            "id": "dsa-unique-paths",
            "title": "Unique Paths",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Count unique paths from top-left to bottom-right in grid.",
            "tags": ["dynamic-programming", "math", "combinatorics"],
            "estimatedTime": 20,
            "problemStatement": "There is a robot on an m x n grid. The robot starts at the top-left corner and wants to reach the bottom-right corner. The robot can only move down or right. How many unique paths are there?",
            "examples": [
                {"input": "m = 3, n = 7", "output": "28"},
                {"input": "m = 3, n = 2", "output": "3"}
            ],
            "constraints": [
                "1 <= m, n <= 100"
            ],
            "hints": [
                "2D DP: dp[i][j] = paths to reach cell (i,j)",
                "dp[i][j] = dp[i-1][j] + dp[i][j-1]",
                "Can optimize space to O(n) using 1D array"
            ],
            "complexity": {"time": "O(m * n)", "space": "O(n)"}
        },
        {
            "id": "dsa-edit-distance",
            "title": "Edit Distance",
            "difficulty": "hard",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Find minimum edit distance to convert one string to another.",
            "tags": ["dynamic-programming", "string"],
            "estimatedTime": 35,
            "problemStatement": "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You can insert, delete, or replace any character.",
            "examples": [
                {"input": "word1 = horse, word2 = ros", "output": "3", "explanation": "horse -> rorse -> rose -> ros"},
                {"input": "word1 = intention, word2 = execution", "output": "5"}
            ],
            "constraints": [
                "0 <= word1.length, word2.length <= 500",
                "word1 and word2 consist of lowercase English letters."
            ],
            "hints": [
                "2D DP: dp[i][j] = min operations to convert word1[0..i] to word2[0..j]",
                "If chars match: dp[i][j] = dp[i-1][j-1]",
                "Else: min of insert, delete, replace operations"
            ],
            "complexity": {"time": "O(m * n)", "space": "O(m * n)"}
        },
        {
            "id": "dsa-word-break",
            "title": "Word Break",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Determine if string can be segmented into dictionary words.",
            "tags": ["dynamic-programming", "hash-table", "string"],
            "estimatedTime": 25,
            "problemStatement": "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.",
            "examples": [
                {"input": "s = leetcode, wordDict = [leet,code]", "output": "true", "explanation": "leetcode can be segmented as leet code"},
                {"input": "s = applepenapple, wordDict = [apple,pen]", "output": "true"},
                {"input": "s = catsandog, wordDict = [cats,dog,sand,and,cat]", "output": "false"}
            ],
            "constraints": [
                "1 <= s.length <= 300",
                "1 <= wordDict.length <= 1000",
                "All strings consist of lowercase English letters."
            ],
            "hints": [
                "1D DP: dp[i] = true if s[0..i] can be segmented",
                "For each position, check all possible words ending there",
                "Use HashSet for O(1) word lookup"
            ],
            "complexity": {"time": "O(n^2)", "space": "O(n)"}
        },
        {
            "id": "dsa-house-robber",
            "title": "House Robber",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Maximize amount robbed without robbing adjacent houses.",
            "tags": ["dynamic-programming", "array"],
            "estimatedTime": 20,
            "problemStatement": "You are a robber planning to rob houses along a street. Each house has money, but adjacent houses have security that alerts police. Return the maximum amount you can rob without alerting police.",
            "examples": [
                {"input": "nums = [1,2,3,1]", "output": "4", "explanation": "Rob house 1 and 3"},
                {"input": "nums = [2,7,9,3,1]", "output": "12", "explanation": "Rob houses 1, 3, and 5"}
            ],
            "constraints": [
                "1 <= nums.length <= 100",
                "0 <= nums[i] <= 400"
            ],
            "hints": [
                "1D DP: dp[i] = max money robbing up to house i",
                "Choice: rob current (nums[i] + dp[i-2]) or skip (dp[i-1])",
                "Can optimize space to O(1) using two variables"
            ],
            "complexity": {"time": "O(n)", "space": "O(1)"}
        }
    ],
    "heaps": [
        {
            "id": "dsa-kth-largest-element",
            "title": "Kth Largest Element in Array",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Find the kth largest element in an unsorted array.",
            "tags": ["heap", "quickselect", "sorting"],
            "estimatedTime": 20,
            "problemStatement": "Given an integer array nums and an integer k, return the kth largest element in the array. Note that it is the kth largest element in sorted order, not the kth distinct element.",
            "examples": [
                {"input": "nums = [3,2,1,5,6,4], k = 2", "output": "5"},
                {"input": "nums = [3,2,3,1,2,4,5,5,6], k = 4", "output": "4"}
            ],
            "constraints": [
                "1 <= k <= nums.length <= 10^5",
                "-10^4 <= nums[i] <= 10^4"
            ],
            "hints": [
                "Use min heap of size k",
                "Or use quickselect algorithm for O(n) average",
                "Heap approach: O(n log k), Quickselect: O(n) average"
            ],
            "complexity": {"time": "O(n log k) heap, O(n) quickselect", "space": "O(k)"}
        },
        {
            "id": "dsa-merge-k-sorted-lists",
            "title": "Merge K Sorted Lists",
            "difficulty": "hard",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Merge k sorted linked lists into one sorted list.",
            "tags": ["heap", "linked-list", "divide-and-conquer"],
            "estimatedTime": 30,
            "problemStatement": "You are given an array of k linked-lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
            "examples": [
                {"input": "lists = [[1,4,5],[1,3,4],[2,6]]", "output": "[1,1,2,3,4,4,5,6]"},
                {"input": "lists = []", "output": "[]"}
            ],
            "constraints": [
                "k == lists.length",
                "0 <= k <= 10^4",
                "0 <= lists[i].length <= 500",
                "-10^4 <= lists[i][j] <= 10^4"
            ],
            "hints": [
                "Use min heap to track smallest elements from each list",
                "Pop smallest, add to result, push next from that list",
                "Alternative: divide and conquer merge pairs"
            ],
            "complexity": {"time": "O(N log k)", "space": "O(k)"}
        },
        {
            "id": "dsa-find-median-data-stream",
            "title": "Find Median from Data Stream",
            "difficulty": "hard",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Design a data structure that supports finding median in O(1).",
            "tags": ["heap", "design", "two-heaps"],
            "estimatedTime": 35,
            "problemStatement": "Design a data structure that supports addNum(int num) and findMedian() operations. addNum adds an integer to the data structure, and findMedian returns the median of all elements.",
            "examples": [
                {"input": "addNum(1), addNum(2), findMedian(), addNum(3), findMedian()", "output": "1.5, 2.0"}
            ],
            "constraints": [
                "-10^5 <= num <= 10^5",
                "At most 5 * 10^4 calls to addNum and findMedian"
            ],
            "hints": [
                "Use two heaps: max heap for smaller half, min heap for larger half",
                "Keep heaps balanced: sizes differ by at most 1",
                "Median is top of larger heap or average of both tops"
            ],
            "complexity": {"time": "O(log n) add, O(1) find", "space": "O(n)"}
        },
        {
            "id": "dsa-top-k-frequent",
            "title": "Top K Frequent Elements",
            "difficulty": "medium",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Find k most frequent elements in array.",
            "tags": ["heap", "hash-table", "bucket-sort"],
            "estimatedTime": 25,
            "problemStatement": "Given an integer array nums and an integer k, return the k most frequent elements. The answer can be returned in any order.",
            "examples": [
                {"input": "nums = [1,1,1,2,2,3], k = 2", "output": "[1,2]"},
                {"input": "nums = [1], k = 1", "output": "[1]"}
            ],
            "constraints": [
                "1 <= nums.length <= 10^5",
                "1 <= k <= number of unique elements",
                "-10^4 <= nums[i] <= 10^4"
            ],
            "hints": [
                "Count frequencies with HashMap",
                "Use min heap of size k to track top k",
                "Or use bucket sort: O(n) time"
            ],
            "complexity": {"time": "O(n log k) heap, O(n) bucket", "space": "O(n)"}
        }
    ],
    "advanced_arrays": [
        {
            "id": "dsa-trapping-rain-water",
            "title": "Trapping Rain Water",
            "difficulty": "hard",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Calculate how much rain water can be trapped between bars.",
            "tags": ["array", "two-pointers", "stack"],
            "estimatedTime": 30,
            "problemStatement": "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
            "examples": [
                {"input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]", "output": "6"},
                {"input": "height = [4,2,0,3,2,5]", "output": "9"}
            ],
            "constraints": [
                "n == height.length",
                "1 <= n <= 2 * 10^4",
                "0 <= height[i] <= 10^5"
            ],
            "hints": [
                "Water level at position = min(max_left, max_right) - height",
                "Two pointer approach: track left_max and right_max",
                "Or use stack to track bars"
            ],
            "complexity": {"time": "O(n)", "space": "O(1)"}
        },
        {
            "id": "dsa-sliding-window-maximum",
            "title": "Sliding Window Maximum",
            "difficulty": "hard",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Find maximum in each sliding window of size k.",
            "tags": ["array", "deque", "sliding-window"],
            "estimatedTime": 30,
            "problemStatement": "Given an array nums and a sliding window of size k which moves from left to right. You can only see the k numbers in the window. Return the max value in each window.",
            "examples": [
                {"input": "nums = [1,3,-1,-3,5,3,6,7], k = 3", "output": "[3,3,5,5,6,7]"}
            ],
            "constraints": [
                "1 <= nums.length <= 10^5",
                "1 <= k <= nums.length",
                "-10^4 <= nums[i] <= 10^4"
            ],
            "hints": [
                "Use deque to maintain window in decreasing order",
                "Remove elements outside window from front",
                "Remove smaller elements from back before adding new"
            ],
            "complexity": {"time": "O(n)", "space": "O(k)"}
        },
        {
            "id": "dsa-minimum-window-substring",
            "title": "Minimum Window Substring",
            "difficulty": "hard",
            "companies": ["Amazon", "Google", "Meta", "Microsoft"],
            "description": "Find minimum window in s containing all chars from t.",
            "tags": ["string", "sliding-window", "hash-table"],
            "estimatedTime": 35,
            "problemStatement": "Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If no such substring exists, return empty string.",
            "examples": [
                {"input": "s = ADOBECODEBANC, t = ABC", "output": "BANC"},
                {"input": "s = a, t = a", "output": "a"}
            ],
            "constraints": [
                "1 <= s.length, t.length <= 10^5",
                "s and t consist of uppercase and lowercase English letters."
            ],
            "hints": [
                "Use sliding window with two pointers",
                "Expand right to include chars, contract left to minimize",
                "Use HashMap to track character frequencies"
            ],
            "complexity": {"time": "O(|s| + |t|)", "space": "O(|s| + |t|)"}
        },
        {
            "id": "dsa-first-missing-positive",
            "title": "First Missing Positive",
            "difficulty": "hard",
            "companies": ["Amazon", "Google", "Meta"],
            "description": "Find smallest missing positive integer in O(n) time and O(1) space.",
            "tags": ["array", "hash-table"],
            "estimatedTime": 30,
            "problemStatement": "Given an unsorted integer array nums, return the smallest missing positive integer. Must run in O(n) time and use O(1) auxiliary space.",
            "examples": [
                {"input": "nums = [1,2,0]", "output": "3"},
                {"input": "nums = [3,4,-1,1]", "output": "2"},
                {"input": "nums = [7,8,9,11,12]", "output": "1"}
            ],
            "constraints": [
                "1 <= nums.length <= 10^5",
                "-2^31 <= nums[i] <= 2^31 - 1"
            ],
            "hints": [
                "Use array itself as hash table",
                "Place each number n at index n-1 if possible",
                "First index i where nums[i] != i+1 is the answer"
            ],
            "complexity": {"time": "O(n)", "space": "O(1)"}
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
        "buggyCodeJs": """function binarySearch(arr, target) {
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
}""",
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
        "buggyCodeJs": """async function fetchUserData(userId) {
  const user = getUserById(userId); // Bug: missing await
  const posts = getUserPosts(userId); // Bug: missing await

  return {
    ...user,
    posts: posts
  };
}""",
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
        "buggyCodeJs": """function findNthFromEnd(head, n) {
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
}""",
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

    js_code = generate_js_starter_code(problem_type, function_name)
    py_code = f"""def {function_name}():
    # Your code here
    pass"""

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
      javascript: `{js_code}`,
      python: `{py_code}`
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
