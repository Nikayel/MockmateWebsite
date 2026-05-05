import type { BugFixScenario } from "../types"

export const securityQueryBugsScenarios: BugFixScenario[] = [
  {
    id: "bugfix-sql-injection",
    title: "SQL Injection Vulnerability",
    type: "bugfix",
    difficulty: "hard",
    companies: ["Amazon", "Google", "Microsoft", "Shopify"],
    description: "Fix SQL injection vulnerabilities in database queries",
    tags: ["security", "sql", "injection", "database"],
    estimatedTime: 25,
    problemStatement: `An API endpoint for searching products has a SQL injection vulnerability. User input is directly concatenated into SQL queries, allowing attackers to execute malicious SQL commands.`,
    buggyCode: {
      javascript: `const express = require('express');
const mysql = require('mysql');
const app = express();

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'shop'
});

// BUG: SQL Injection vulnerability
app.get('/products/search', (req, res) => {
  const searchTerm = req.query.q;
  const category = req.query.category;

  // BUG: Direct string concatenation
  const query = \`SELECT * FROM products WHERE name LIKE '%\${searchTerm}%' AND category = '\${category}'\`;

  connection.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(results);
  });
});

// BUG: Another injection point
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;

  // BUG: Direct interpolation in query
  connection.query(\`SELECT * FROM users WHERE id = \${userId}\`, (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(results[0]);
  });
});`,
      typescript: `import express from 'express';
import mysql from 'mysql';

const app = express();

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'shop'
});

// BUG: SQL Injection vulnerability
app.get('/products/search', (req, res) => {
  const searchTerm = req.query.q as string;
  const category = req.query.category as string;

  // BUG: Direct string concatenation
  const query = \`SELECT * FROM products WHERE name LIKE '%\${searchTerm}%' AND category = '\${category}'\`;

  connection.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(results);
  });
});

// BUG: Another injection point
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;

  // BUG: Direct interpolation in query
  connection.query(\`SELECT * FROM users WHERE id = \${userId}\`, (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(results[0]);
  });
});`,
      python: `from flask import Flask, request, jsonify
import mysql.connector

app = Flask(__name__)

connection = mysql.connector.connect(
    host='localhost',
    user='root',
    password='password',
    database='shop'
)

# BUG: SQL Injection vulnerability
@app.route('/products/search')
def search_products():
    search_term = request.args.get('q')
    category = request.args.get('category')

    # BUG: Direct string formatting
    query = f"SELECT * FROM products WHERE name LIKE '%{search_term}%' AND category = '{category}'"

    cursor = connection.cursor()
    cursor.execute(query)  # BUG: Vulnerable query
    results = cursor.fetchall()
    return jsonify(results)

# BUG: Another injection point
@app.route('/users/<user_id>')
def get_user(user_id):
    # BUG: Direct interpolation
    query = f"SELECT * FROM users WHERE id = {user_id}"

    cursor = connection.cursor()
    cursor.execute(query)  # BUG: Vulnerable query
    result = cursor.fetchone()
    return jsonify(result)`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "malicious-requests.txt",
          content: `Example malicious requests:

1. GET /products/search?q=laptop&category=' OR '1'='1
   Result: Returns all products (bypasses category filter)

2. GET /products/search?q='; DROP TABLE products; --&category=electronics
   Result: Could delete the products table

3. GET /users/1 OR 1=1
   Result: Returns all users instead of just user 1

4. GET /users/1 UNION SELECT username, password FROM admin_users
   Result: Exposes sensitive data from other tables`,
          description: "Examples of SQL injection attacks",
        },
      ],
      typescript: [
        {
          fileName: "malicious-requests.txt",
          content: `Example malicious requests:

1. GET /products/search?q=laptop&category=' OR '1'='1
   Result: Returns all products (bypasses category filter)

2. GET /products/search?q='; DROP TABLE products; --&category=electronics
   Result: Could delete the products table

3. GET /users/1 OR 1=1
   Result: Returns all users instead of just user 1`,
          description: "Examples of SQL injection attacks",
        },
      ],
      python: [
        {
          fileName: "malicious-requests.txt",
          content: `Example malicious requests:

1. GET /products/search?q=laptop&category=' OR '1'='1
   Result: Returns all products (bypasses category filter)

2. GET /products/search?q='; DROP TABLE products; --&category=electronics
   Result: Could delete the products table`,
          description: "Examples of SQL injection attacks",
        },
      ],
    },
    expectedBehavior:
      "All database queries should use parameterized statements to prevent SQL injection attacks",
    bugDescription:
      "User input is directly concatenated into SQL queries without sanitization or parameterization, allowing SQL injection attacks",
    hints: [
      "Use parameterized queries / prepared statements",
      "Never concatenate user input directly into SQL",
      "For JavaScript: use ? placeholders and pass values as array",
      "For Python: use %s placeholders with tuple/list of values",
      "Validate and sanitize input as defense-in-depth",
    ],
    testCases: [
      {
        input: "Malicious category: ' OR '1'='1",
        expected: "Query safely escapes input, no injection occurs",
        description: "SQL injection prevention",
      },
      {
        input: "Search with special chars: O'Reilly",
        expected: "Query handles apostrophes safely",
        description: "Special character handling in queries",
      },
    ],
  },
  {
    id: "bugfix-n-plus-one-query",
    title: "N+1 Query Problem",
    type: "bugfix",
    difficulty: "medium",
    companies: ["Airbnb", "Shopify", "Amazon", "Walmart"],
    description: "Fix N+1 database query problem causing performance issues",
    tags: ["database", "performance", "orm", "optimization"],
    estimatedTime: 20,
    problemStatement: `An API endpoint that returns a list of blog posts with their authors is experiencing severe performance issues. The code makes 1 query to fetch posts, then N additional queries to fetch each post's author (N+1 query problem).`,
    buggyCode: {
      javascript: `// Using Sequelize ORM
const { Post, User } = require('./models');

// BUG: N+1 Query Problem
async function getBlogPosts(req, res) {
  // Query 1: Fetch all posts
  const posts = await Post.findAll();

  // BUG: N additional queries (one per post)
  const postsWithAuthors = await Promise.all(
    posts.map(async (post) => {
      // Query 2, 3, 4, ... N+1: Fetch author for each post
      const author = await User.findByPk(post.userId);
      return {
        id: post.id,
        title: post.title,
        content: post.content,
        author: {
          id: author.id,
          name: author.name,
          email: author.email
        }
      };
    })
  );

  res.json(postsWithAuthors);
}

// BUG: Similar issue with comments
async function getPostWithComments(req, res) {
  const post = await Post.findByPk(req.params.id);
  const comments = await Comment.findAll({ where: { postId: post.id } });

  // BUG: N+1 for comment authors
  const commentsWithAuthors = await Promise.all(
    comments.map(async (comment) => {
      const author = await User.findByPk(comment.userId);
      return { ...comment.toJSON(), author };
    })
  );

  res.json({ ...post.toJSON(), comments: commentsWithAuthors });
}`,
      typescript: `// Using Prisma ORM
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// BUG: N+1 Query Problem
async function getBlogPosts(req, res) {
  // Query 1: Fetch all posts
  const posts = await prisma.post.findMany();

  // BUG: N additional queries (one per post)
  const postsWithAuthors = await Promise.all(
    posts.map(async (post) => {
      // Query 2, 3, 4, ... N+1: Fetch author for each post
      const author = await prisma.user.findUnique({
        where: { id: post.userId }
      });
      return {
        ...post,
        author
      };
    })
  );

  res.json(postsWithAuthors);
}`,
      python: `# Using Django ORM
from django.http import JsonResponse
from .models import Post, User

# BUG: N+1 Query Problem
def get_blog_posts(request):
    # Query 1: Fetch all posts
    posts = Post.objects.all()

    # BUG: N additional queries (one per post)
    posts_with_authors = []
    for post in posts:
        # Query 2, 3, 4, ... N+1: Fetch author for each post
        author = User.objects.get(id=post.user_id)
        posts_with_authors.append({
            'id': post.id,
            'title': post.title,
            'content': post.content,
            'author': {
                'id': author.id,
                'name': author.name,
                'email': author.email
            }
        })

    return JsonResponse(posts_with_authors, safe=False)`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: "models.js",
          content: `const { Sequelize, DataTypes } = require('sequelize');

const Post = sequelize.define('Post', {
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
  userId: DataTypes.INTEGER
});

const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: DataTypes.STRING
});

const Comment = sequelize.define('Comment', {
  content: DataTypes.TEXT,
  postId: DataTypes.INTEGER,
  userId: DataTypes.INTEGER
});

// Define associations
Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });`,
          description: "Sequelize models with associations",
        },
      ],
      typescript: [
        {
          fileName: "schema.prisma",
          content: `model Post {
  id      Int    @id @default(autoincrement())
  title   String
  content String
  userId  Int
  author  User   @relation(fields: [userId], references: [id])
}

model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String
  posts Post[]
}`,
          description: "Prisma schema with relations",
        },
      ],
      python: [
        {
          fileName: "models.py",
          content: `from django.db import models

class User(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField()

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')`,
          description: "Django models with foreign keys",
        },
      ],
    },
    expectedBehavior:
      "Should fetch all posts with their authors in a single query (or minimal queries) using eager loading/joins",
    bugDescription:
      "Makes 1 + N database queries: 1 for posts, then 1 for each post's author. With 100 posts, this means 101 queries instead of 1-2 queries.",
    hints: [
      "Use eager loading / include / joins to fetch related data",
      "Sequelize: use include option in findAll",
      "Prisma: use include in findMany",
      "Django: use select_related or prefetch_related",
      "Consider using DataLoader for GraphQL",
    ],
    testCases: [
      {
        input: "100 blog posts",
        expected: "2-3 queries total instead of 101 queries",
        description: "N+1 query optimization",
      },
      {
        input: "Posts with comments and authors",
        expected: "Use nested eager loading to minimize queries",
        description: "Nested eager loading for complex relations",
      },
    ],
  },
  // AI/ML Debugging Scenarios
]
