import type { AddFunctionalityScenario } from "../types"

export const textSearchScenario: AddFunctionalityScenario = {
  id: "add-feature-text-search",
  title: "Add Fuzzy Matching to Text Search",
  type: "add-functionality",
  difficulty: "medium",
  companies: ["Algolia", "Elasticsearch", "Google", "Slack"],
  description: "Implement fuzzy text search with Levenshtein distance",
  tags: ["search", "algorithms", "string-matching"],
  estimatedTime: 35,
  problemStatement: `You're building a search feature for an application. The existing search only supports exact matching, but users want fuzzy search to handle typos.

**Your task:**
1. Study the existing TextSearch class
2. Implement fuzzy matching using Levenshtein distance
3. Return results ranked by relevance (exact matches first, then by edit distance)
4. Support configurable maximum edit distance

**Context:** This search powers a product catalog. Users often mistype product names.`,
  featureRequirements: [
    "search(query, maxDistance) - fuzzy search with max edit distance",
    "Implement Levenshtein distance calculation",
    "Rank results: exact match > prefix match > fuzzy match",
    "Return relevance score with each result",
    "Case-insensitive matching",
  ],
  existingCode: {
    javascript: `// textSearch.js - Text search with fuzzy matching
// TODO: Implement fuzzy matching with Levenshtein distance

class TextSearch {
  constructor() {
    this.items = [];
  }

  /**
   * Add item to searchable index
   * @param {string} text - Text to index
   * @param {any} data - Associated data
   */
  addItem(text, data = null) {
    this.items.push({
      text: text.toLowerCase(),
      originalText: text,
      data,
    });
  }

  /**
   * Search for items matching query
   * @param {string} query - Search query
   * @param {number} maxDistance - Maximum edit distance for fuzzy match (default 2)
   * @returns {Array} Results with { text, data, score, matchType }
   */
  search(query, maxDistance = 2) {
    const queryLower = query.toLowerCase();
    const results = [];

    for (const item of this.items) {
      // TODO: Implement matching logic
      // 1. Check exact match (score: 100, matchType: 'exact')
      // 2. Check prefix match (score: 80, matchType: 'prefix')
      // 3. Check fuzzy match using Levenshtein (score: based on distance, matchType: 'fuzzy')

      // Placeholder - only exact match
      if (item.text === queryLower) {
        results.push({
          text: item.originalText,
          data: item.data,
          score: 100,
          matchType: 'exact',
        });
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} a
   * @param {string} b
   * @returns {number} Edit distance
   */
  levenshteinDistance(a, b) {
    // TODO: Implement Levenshtein distance algorithm
    // Use dynamic programming approach
    return Infinity; // Placeholder
  }

  /**
   * Calculate fuzzy score based on edit distance
   * @param {number} distance
   * @param {number} maxDistance
   * @returns {number} Score between 0-70
   */
  calculateFuzzyScore(distance, maxDistance) {
    if (distance > maxDistance) return 0;
    // Linear score: distance 0 = 70, distance maxDistance = 10
    return Math.round(70 - (distance / maxDistance) * 60);
  }
}

// Test helper function - DO NOT MODIFY
function testTextSearch(operations) {
  const search = new TextSearch();
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'add':
        search.addItem(op.text, op.data);
        results.push({ type: 'add', text: op.text });
        break;
      case 'search':
        const matches = search.search(op.query, op.maxDistance || 2);
        results.push({
          type: 'search',
          query: op.query,
          results: matches.map(m => ({
            text: m.text,
            score: m.score,
            matchType: m.matchType,
          })),
        });
        break;
      case 'distance':
        const dist = search.levenshteinDistance(op.a, op.b);
        results.push({ type: 'distance', a: op.a, b: op.b, distance: dist });
        break;
    }
  }

  return results;
}`,
    python: `# text_search.py - Text search with fuzzy matching
# TODO: Implement fuzzy matching with Levenshtein distance

class TextSearch:
    def __init__(self):
        self.items = []

    def add_item(self, text, data=None):
        """
        Add item to searchable index
        Args:
            text: Text to index
            data: Associated data
        """
        self.items.append({
            'text': text.lower(),
            'original_text': text,
            'data': data,
        })

    def search(self, query, max_distance=2):
        """
        Search for items matching query
        Args:
            query: Search query
            max_distance: Maximum edit distance for fuzzy match (default 2)
        Returns: List of results with { text, data, score, match_type }
        """
        query_lower = query.lower()
        results = []

        for item in self.items:
            # TODO: Implement matching logic
            # 1. Check exact match (score: 100, match_type: 'exact')
            # 2. Check prefix match (score: 80, match_type: 'prefix')
            # 3. Check fuzzy match using Levenshtein (score: based on distance, match_type: 'fuzzy')

            # Placeholder - only exact match
            if item['text'] == query_lower:
                results.append({
                    'text': item['original_text'],
                    'data': item['data'],
                    'score': 100,
                    'match_type': 'exact',
                })

        # Sort by score descending
        return sorted(results, key=lambda x: -x['score'])

    def levenshtein_distance(self, a, b):
        """
        Calculate Levenshtein distance between two strings
        Returns: Edit distance
        """
        # TODO: Implement Levenshtein distance algorithm
        # Use dynamic programming approach
        return float('inf')  # Placeholder

    def calculate_fuzzy_score(self, distance, max_distance):
        """
        Calculate fuzzy score based on edit distance
        Returns: Score between 0-70
        """
        if distance > max_distance:
            return 0
        # Linear score: distance 0 = 70, distance max_distance = 10
        return round(70 - (distance / max_distance) * 60)


# Test helper function - DO NOT MODIFY
def test_text_search(operations):
    search = TextSearch()
    results = []

    for op in operations:
        if op['type'] == 'add':
            search.add_item(op['text'], op.get('data'))
            results.append({'type': 'add', 'text': op['text']})
        elif op['type'] == 'search':
            matches = search.search(op['query'], op.get('maxDistance', 2))
            results.append({
                'type': 'search',
                'query': op['query'],
                'results': [{
                    'text': m['text'],
                    'score': m['score'],
                    'matchType': m.get('match_type', m.get('matchType')),
                } for m in matches],
            })
        elif op['type'] == 'distance':
            dist = search.levenshtein_distance(op['a'], op['b'])
            results.append({'type': 'distance', 'a': op['a'], 'b': op['b'], 'distance': dist})

    return results`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "utils/stringMetrics.js",
        content: `// String comparison utilities

/**
 * Check if string starts with prefix (case-insensitive)
 */
function startsWith(str, prefix) {
  return str.toLowerCase().startsWith(prefix.toLowerCase());
}

/**
 * Check if string contains substring (case-insensitive)
 */
function contains(str, substring) {
  return str.toLowerCase().includes(substring.toLowerCase());
}

/**
 * Levenshtein distance reference implementation
 * This is for understanding - implement your own in TextSearch
 *
 * Algorithm:
 * 1. Create matrix of size (m+1) x (n+1)
 * 2. Initialize first row and column with indices
 * 3. Fill matrix using recurrence:
 *    dp[i][j] = min(
 *      dp[i-1][j] + 1,     // deletion
 *      dp[i][j-1] + 1,     // insertion
 *      dp[i-1][j-1] + cost // substitution (cost = 0 if chars match, 1 otherwise)
 *    )
 * 4. Return dp[m][n]
 */

module.exports = { startsWith, contains };`,
        description: "String utilities and Levenshtein algorithm explanation",
      },
    ],
    python: [
      {
        fileName: "utils/string_metrics.py",
        content: `# String comparison utilities

def starts_with(string, prefix):
    """Check if string starts with prefix (case-insensitive)"""
    return string.lower().startswith(prefix.lower())

def contains(string, substring):
    """Check if string contains substring (case-insensitive)"""
    return substring.lower() in string.lower()

# Levenshtein distance reference implementation
# This is for understanding - implement your own in TextSearch
#
# Algorithm:
# 1. Create matrix of size (m+1) x (n+1)
# 2. Initialize first row and column with indices
# 3. Fill matrix using recurrence:
#    dp[i][j] = min(
#      dp[i-1][j] + 1,     # deletion
#      dp[i][j-1] + 1,     # insertion
#      dp[i-1][j-1] + cost # substitution (cost = 0 if chars match, 1 otherwise)
#    )
# 4. Return dp[m][n]`,
        description: "String utilities and Levenshtein algorithm explanation",
      },
    ],
  },
  hints: [
    "For Levenshtein: create 2D array dp[a.length+1][b.length+1]",
    "Initialize dp[i][0] = i and dp[0][j] = j",
    "For prefix match: check if item.text.startsWith(query)",
    "Check matches in order: exact first, then prefix, then fuzzy",
    "Only add to results if score > 0 or within maxDistance",
  ],
  testCases: [
    {
      input: {
        operations: [
          { type: "add", text: "apple" },
          { type: "add", text: "application" },
          { type: "add", text: "banana" },
          { type: "search", query: "apple" },
        ],
      },
      expected: [
        { type: "add", text: "apple" },
        { type: "add", text: "application" },
        { type: "add", text: "banana" },
        {
          type: "search",
          query: "apple",
          results: [{ text: "apple", score: 100, matchType: "exact" }],
        },
      ],
      description: "Exact match returns highest score",
    },
    {
      input: {
        operations: [
          { type: "add", text: "apple" },
          { type: "add", text: "application" },
          { type: "search", query: "app" },
        ],
      },
      expected: [
        { type: "add", text: "apple" },
        { type: "add", text: "application" },
        {
          type: "search",
          query: "app",
          results: [
            { text: "apple", score: 80, matchType: "prefix" },
            { text: "application", score: 80, matchType: "prefix" },
          ],
        },
      ],
      description: "Prefix match returns medium score",
    },
    {
      input: { operations: [{ type: "distance", a: "kitten", b: "sitting" }] },
      expected: [{ type: "distance", a: "kitten", b: "sitting", distance: 3 }],
      description: "Levenshtein distance calculation",
    },
  ],
  acceptanceCriteria: [
    "Exact matches return score 100",
    "Prefix matches return score 80",
    "Fuzzy matches return score based on edit distance",
    "Results are sorted by score descending",
    "Levenshtein distance is calculated correctly",
  ],
}
