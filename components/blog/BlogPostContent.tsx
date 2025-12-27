"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { type BlogPost, categoryLabels, categoryColors } from "@/lib/blog"
import { Calendar, Clock, ArrowLeft, ArrowRight, User } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

// Blog post content - stored here for simplicity
// In production, you'd use MDX or a CMS
const blogContent: Record<string, React.ReactNode> = {
  "two-sum-5-solutions": <TwoSumContent />,
  "leetcode-vs-codesparring": <LeetCodeVsCodeSparringContent />,
  "15-dsa-patterns": <DSAPatternsContent />,
}

function ArticleJsonLd({ post }: { post: BlogPost }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    author: {
      "@type": "Person",
      name: post.author,
    },
    datePublished: post.date,
    publisher: {
      "@type": "Organization",
      name: "CodeSparring",
      logo: {
        "@type": "ImageObject",
        url: "https://codesparring.com/icon.svg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://codesparring.com/blog/${post.slug}`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function BlogPostContent({ post }: { post: BlogPost }) {
  const content = blogContent[post.slug]

  return (
    <main className="min-h-screen bg-background">
      <ArticleJsonLd post={post} />
      <Header />

      {/* Article Header */}
      <article className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Category badge */}
              <Badge className={`${categoryColors[post.category]} mb-4`}>
                {categoryLabels[post.category]}
              </Badge>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight">
                {post.title}
              </h1>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-8 pb-8 border-b border-gray-800">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {post.author}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {post.readTime}
                </span>
              </div>

              {/* Content */}
              <div className="prose prose-invert prose-lg max-w-none">
                {content || <DefaultContent post={post} />}
              </div>

              {/* Tags */}
              <div className="mt-12 pt-8 border-t border-gray-800">
                <h4 className="text-sm text-gray-500 mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </article>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-b from-background to-black border-t border-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-4">
            Ready to Apply What You've Learned?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Practice these concepts with AI-powered mock interviews. Get instant feedback and improve faster.
          </p>
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-semibold rounded-full hover:bg-accent/90 transition-colors"
          >
            Start Free Practice
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function DefaultContent({ post }: { post: BlogPost }) {
  return (
    <div>
      <p className="text-xl text-gray-300 mb-8">{post.description}</p>
      <p className="text-gray-400">Full content coming soon...</p>
    </div>
  )
}

// ============================================
// BLOG POST: Two Sum - 5 Solutions
// ============================================
function TwoSumContent() {
  return (
    <div className="space-y-8">
      <p className="text-xl text-gray-300 leading-relaxed">
        The Two Sum problem is the first problem most developers encounter on LeetCode—and for good reason. It teaches fundamental concepts that appear in countless interview questions. Let's explore 5 different solutions, from brute force to optimal.
      </p>

      <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
        <h3 className="text-lg font-bold text-white mb-3">The Problem</h3>
        <p className="text-gray-400 mb-4">
          Given an array of integers <code className="px-2 py-1 rounded bg-gray-800 text-accent">nums</code> and an integer <code className="px-2 py-1 rounded bg-gray-800 text-accent">target</code>, return indices of the two numbers that add up to target.
        </p>
        <pre className="p-4 rounded-lg bg-black text-sm overflow-x-auto">
          <code className="text-gray-300">{`Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: nums[0] + nums[1] = 2 + 7 = 9`}</code>
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12">Solution 1: Brute Force</h2>
      <p className="text-gray-400">
        The most intuitive approach—check every pair of numbers.
      </p>

      <pre className="p-4 rounded-lg bg-gray-900 border border-gray-800 text-sm overflow-x-auto">
        <code className="text-gray-300">{`function twoSum(nums: number[], target: number): number[] {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}`}</code>
      </pre>

      <div className="flex gap-4 text-sm">
        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400">Time: O(n²)</span>
        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400">Space: O(1)</span>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12">Solution 2: Hash Map (One Pass)</h2>
      <p className="text-gray-400">
        The optimal solution. Trade space for time by storing complements in a hash map.
      </p>

      <pre className="p-4 rounded-lg bg-gray-900 border border-gray-800 text-sm overflow-x-auto">
        <code className="text-gray-300">{`function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];

    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }

    map.set(nums[i], i);
  }

  return [];
}`}</code>
      </pre>

      <div className="flex gap-4 text-sm">
        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400">Time: O(n)</span>
        <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400">Space: O(n)</span>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12">Solution 3: Two Pointers (Sorted Array)</h2>
      <p className="text-gray-400">
        If the array is sorted (or you can sort it), use two pointers. Note: This returns values, not indices.
      </p>

      <pre className="p-4 rounded-lg bg-gray-900 border border-gray-800 text-sm overflow-x-auto">
        <code className="text-gray-300">{`function twoSumSorted(nums: number[], target: number): number[] {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const sum = nums[left] + nums[right];

    if (sum === target) {
      return [left, right];
    } else if (sum < target) {
      left++;
    } else {
      right--;
    }
  }

  return [];
}`}</code>
      </pre>

      <div className="flex gap-4 text-sm">
        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400">Time: O(n)</span>
        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400">Space: O(1)</span>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12">When to Use Each Solution</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 text-gray-400">Approach</th>
              <th className="text-left py-3 px-4 text-gray-400">Best When</th>
              <th className="text-left py-3 px-4 text-gray-400">Time</th>
              <th className="text-left py-3 px-4 text-gray-400">Space</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-gray-800/50">
              <td className="py-3 px-4">Brute Force</td>
              <td className="py-3 px-4">Never (just for understanding)</td>
              <td className="py-3 px-4 text-red-400">O(n²)</td>
              <td className="py-3 px-4 text-green-400">O(1)</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-3 px-4">Hash Map</td>
              <td className="py-3 px-4">Need original indices</td>
              <td className="py-3 px-4 text-green-400">O(n)</td>
              <td className="py-3 px-4 text-yellow-400">O(n)</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-3 px-4">Two Pointers</td>
              <td className="py-3 px-4">Array is sorted</td>
              <td className="py-3 px-4 text-green-400">O(n)</td>
              <td className="py-3 px-4 text-green-400">O(1)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12">Key Takeaways</h2>

      <ul className="space-y-3 text-gray-400">
        <li className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span><strong className="text-white">Hash maps trade space for time</strong>—a fundamental pattern in algorithm optimization.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span><strong className="text-white">The "complement" pattern</strong> appears in many problems (3Sum, 4Sum, subarray sum).</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span><strong className="text-white">Two pointers on sorted arrays</strong> is a powerful O(1) space technique.</span>
        </li>
      </ul>

      <div className="p-6 rounded-xl bg-accent/10 border border-accent/30 mt-12">
        <h3 className="text-lg font-bold text-accent mb-2">Practice This Pattern</h3>
        <p className="text-gray-400">
          Two Sum is the gateway to understanding hash-based solutions. Master it, and you'll recognize the pattern in dozens of other problems.
        </p>
      </div>
    </div>
  )
}

// ============================================
// BLOG POST: LeetCode vs CodeSparring
// ============================================
function LeetCodeVsCodeSparringContent() {
  return (
    <div className="space-y-8">
      <p className="text-xl text-gray-300 leading-relaxed">
        Both platforms help you prepare for coding interviews, but they take fundamentally different approaches. Here's an honest comparison to help you choose the right tool for your goals.
      </p>

      <h2 className="text-2xl font-bold text-white mt-12">The Core Difference</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-3">LeetCode</h3>
          <p className="text-gray-400">
            A massive problem database with 2,800+ problems. You pick what to practice, when to practice, and how much. It's a gym with every machine—you design your own workout.
          </p>
        </div>
        <div className="p-6 rounded-xl bg-accent/10 border border-accent/30">
          <h3 className="text-lg font-bold text-accent mb-3">CodeSparring</h3>
          <p className="text-gray-400">
            An AI-powered training system. It builds your workout plan, tracks your progress, and tells you exactly what to practice next. It's a personal trainer for coding interviews.
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12">Feature Comparison</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 text-gray-400">Feature</th>
              <th className="text-center py-3 px-4 text-gray-400">LeetCode</th>
              <th className="text-center py-3 px-4 text-accent">CodeSparring</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-gray-800/50">
              <td className="py-3 px-4">Problem count</td>
              <td className="py-3 px-4 text-center">2,800+</td>
              <td className="py-3 px-4 text-center">350+</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-3 px-4">Spaced repetition</td>
              <td className="py-3 px-4 text-center text-red-400">No</td>
              <td className="py-3 px-4 text-center text-green-400">Yes</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-3 px-4">AI interviewer</td>
              <td className="py-3 px-4 text-center text-red-400">No</td>
              <td className="py-3 px-4 text-center text-green-400">Yes</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-3 px-4">Voice practice</td>
              <td className="py-3 px-4 text-center text-red-400">No</td>
              <td className="py-3 px-4 text-center text-green-400">Yes</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-3 px-4">Personalized roadmap</td>
              <td className="py-3 px-4 text-center text-red-400">No</td>
              <td className="py-3 px-4 text-center text-green-400">Yes</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-3 px-4">Premium price</td>
              <td className="py-3 px-4 text-center">$35/mo</td>
              <td className="py-3 px-4 text-center text-green-400">$25/mo</td>
            </tr>
            <tr className="border-b border-gray-800/50">
              <td className="py-3 px-4">Community</td>
              <td className="py-3 px-4 text-center text-green-400">Large</td>
              <td className="py-3 px-4 text-center">Growing</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12">Who Should Use LeetCode?</h2>

      <ul className="space-y-3 text-gray-400">
        <li className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-gray-500 mt-2 flex-shrink-0" />
          <span>You're self-motivated and enjoy designing your own study plan</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-gray-500 mt-2 flex-shrink-0" />
          <span>You want access to the largest problem database</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-gray-500 mt-2 flex-shrink-0" />
          <span>You prefer reading community solutions and discussions</span>
        </li>
      </ul>

      <h2 className="text-2xl font-bold text-white mt-12">Who Should Use CodeSparring?</h2>

      <ul className="space-y-3 text-gray-400">
        <li className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span>You want a structured system that tells you what to practice</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span>You struggle with retention and forget problems you've solved</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span>You want to practice talking through problems (like a real interview)</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
          <span>You have a specific interview date and need optimized prep</span>
        </li>
      </ul>

      <h2 className="text-2xl font-bold text-white mt-12">The Verdict</h2>

      <p className="text-gray-400">
        <strong className="text-white">They're not mutually exclusive.</strong> Many developers use LeetCode as a problem library and CodeSparring as a training system. LeetCode gives you quantity; CodeSparring gives you a method.
      </p>

      <p className="text-gray-400 mt-4">
        If you're serious about retention and want to simulate real interviews, CodeSparring fills gaps that LeetCode doesn't address. If you want the largest problem set and enjoy self-directed learning, LeetCode is the industry standard.
      </p>

      <div className="p-6 rounded-xl bg-accent/10 border border-accent/30 mt-12">
        <h3 className="text-lg font-bold text-accent mb-2">Try Both</h3>
        <p className="text-gray-400">
          CodeSparring's free tier gives you 2 practice sessions per month. See if the AI interviewer approach clicks with your learning style before committing.
        </p>
      </div>
    </div>
  )
}

// ============================================
// BLOG POST: 15 DSA Patterns
// ============================================
function DSAPatternsContent() {
  return (
    <div className="space-y-8">
      <p className="text-xl text-gray-300 leading-relaxed">
        Stop memorizing 1,000 problems. Master these 15 patterns and you'll recognize solutions instantly. This is the mental framework that separates prepared candidates from everyone else.
      </p>

      <h2 className="text-2xl font-bold text-white mt-12">The Pattern-Based Approach</h2>

      <p className="text-gray-400">
        Interviewers don't expect you to have seen their exact question. They expect you to recognize patterns and adapt. Here are the 15 patterns that cover 90% of coding interview questions.
      </p>

      <div className="space-y-8 mt-8">
        {[
          {
            num: "01",
            name: "Sliding Window",
            when: "Contiguous sequences, subarrays, substrings",
            example: "Maximum sum subarray of size K",
            color: "accent"
          },
          {
            num: "02",
            name: "Two Pointers",
            when: "Sorted arrays, finding pairs",
            example: "Two Sum II, Container with Most Water",
            color: "neural"
          },
          {
            num: "03",
            name: "Fast & Slow Pointers",
            when: "Cycle detection, middle of linked list",
            example: "Linked List Cycle, Happy Number",
            color: "purple"
          },
          {
            num: "04",
            name: "Merge Intervals",
            when: "Overlapping intervals, scheduling",
            example: "Merge Intervals, Insert Interval",
            color: "amber"
          },
          {
            num: "05",
            name: "Cyclic Sort",
            when: "Numbers in range 1 to N",
            example: "Find Missing Number, Find Duplicates",
            color: "accent"
          },
          {
            num: "06",
            name: "In-place Linked List Reversal",
            when: "Reversing parts of linked list",
            example: "Reverse Linked List, Reverse Sublist",
            color: "neural"
          },
          {
            num: "07",
            name: "Tree BFS",
            when: "Level-by-level traversal",
            example: "Level Order Traversal, Zigzag Traversal",
            color: "purple"
          },
          {
            num: "08",
            name: "Tree DFS",
            when: "Path finding, tree depth",
            example: "Path Sum, Max Depth",
            color: "amber"
          },
          {
            num: "09",
            name: "Two Heaps",
            when: "Finding median in stream",
            example: "Find Median from Data Stream",
            color: "accent"
          },
          {
            num: "10",
            name: "Subsets",
            when: "Permutations, combinations",
            example: "Subsets, Permutations, Letter Case",
            color: "neural"
          },
          {
            num: "11",
            name: "Modified Binary Search",
            when: "Sorted or rotated arrays",
            example: "Search in Rotated Array, Peak Element",
            color: "purple"
          },
          {
            num: "12",
            name: "Top K Elements",
            when: "Finding K largest/smallest",
            example: "Top K Frequent, Kth Largest Element",
            color: "amber"
          },
          {
            num: "13",
            name: "K-way Merge",
            when: "Merging K sorted lists",
            example: "Merge K Sorted Lists, Smallest Range",
            color: "accent"
          },
          {
            num: "14",
            name: "Topological Sort",
            when: "Ordering with dependencies",
            example: "Course Schedule, Alien Dictionary",
            color: "neural"
          },
          {
            num: "15",
            name: "0/1 Knapsack (DP)",
            when: "Subset with constraints",
            example: "Partition Equal Subset Sum, Target Sum",
            color: "purple"
          },
        ].map((pattern) => (
          <div
            key={pattern.num}
            className="p-6 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start gap-4">
              <span className={`text-3xl font-bold text-${pattern.color}`}>{pattern.num}</span>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">{pattern.name}</h3>
                <p className="text-gray-400 text-sm mb-3">
                  <strong className="text-gray-300">When:</strong> {pattern.when}
                </p>
                <p className="text-gray-500 text-sm">
                  <strong className="text-gray-400">Examples:</strong> {pattern.example}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold text-white mt-12">How to Study These Patterns</h2>

      <ol className="space-y-4 text-gray-400">
        <li className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-sm flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
          <span><strong className="text-white">Learn one pattern at a time.</strong> Spend 2-3 days on each before moving on.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-sm flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
          <span><strong className="text-white">Solve 3-5 problems per pattern.</strong> Start easy, progress to medium.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-sm flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
          <span><strong className="text-white">Review using spaced repetition.</strong> Return to patterns before you forget them.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-sm flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
          <span><strong className="text-white">Practice pattern recognition.</strong> Before coding, identify which pattern applies.</span>
        </li>
      </ol>

      <div className="p-6 rounded-xl bg-accent/10 border border-accent/30 mt-12">
        <h3 className="text-lg font-bold text-accent mb-2">Let AI Guide Your Pattern Mastery</h3>
        <p className="text-gray-400">
          CodeSparring's spaced repetition algorithm schedules pattern reviews at the optimal time. It knows when you're about to forget and brings the pattern back just in time.
        </p>
      </div>
    </div>
  )
}
