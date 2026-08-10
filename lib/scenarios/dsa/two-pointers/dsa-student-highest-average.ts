import type { DSAScenario } from "../../types"

export const dsaStudentHighestAverageScenario: DSAScenario = {
  id: "dsa-student-highest-average",
  title: "Student with Highest Average Score",
  type: "dsa",
  pattern: "two-pointers",
  difficulty: "medium",
  companies: ["ZipRecruiter"],
  description: "Find the student with the highest average score from a list of records",
  tags: ["array", "hash-table", "sorting"],
  estimatedTime: 20,
  problemStatement: `You are given a list of student score records. Each record contains a student name and a score. A student may have multiple scores.

Calculate the average score for each student and return the name of the student with the highest average. If there's a tie, return the name that comes first alphabetically.`,
  examples: [
    {
      input: 'records = [["Alice", 90], ["Bob", 85], ["Alice", 95], ["Bob", 80]]',
      output: '"Alice"',
      explanation:
        "Alice's average: (90 + 95) / 2 = 92.5. Bob's average: (85 + 80) / 2 = 82.5. Alice wins.",
    },
    {
      input: 'records = [["Charlie", 100], ["David", 100]]',
      output: '"Charlie"',
      explanation: "Both have average 100. Charlie comes first alphabetically.",
    },
  ],
  constraints: [
    "1 <= records.length <= 10^4",
    "Each record is [name, score]",
    "1 <= name.length <= 20",
    "0 <= score <= 100",
  ],
  hints: [
    "Use a hash map to group scores by student name",
    "Calculate average for each student",
    "Track the maximum average and handle ties alphabetically",
  ],
  starterCode: {
    javascript: `function highestAverage(records) {
  // Write your solution here

}`,
    typescript: `function highestAverage(records: [string, number][]): string {
  // Write your solution here

}`,
    python: `def highest_average(records):
    # Write your solution here
    pass`,
    java: `class Solution {
    public String highestAverage(String[][] records) {
        // Write your solution here
        return "";
    }
}`,
    cpp: `class Solution {
public:
    string highestAverage(vector<vector<string>>& records) {
        // Write your solution here
        return "";
    }
};`,
    csharp: `public class Solution {
    public string HighestAverage(string[][] records) {
        // Write your solution here
        return "";
    }
}`,
    go: `func highestAverage(records [][]string) string {
    // Write your solution here
    return ""
}`,
    rust: `impl Solution {
    pub fn highest_average(records: Vec<Vec<String>>) -> String {
        // Write your solution here
        String::new()
    }
}`,
  },
  optimalComplexity: {
    time: "O(n)",
    space: "O(k) where k is number of unique students",
  },
  testCases: [
    {
      input: {
        records: [
          ["Alice", 90],
          ["Bob", 85],
          ["Alice", 95],
          ["Bob", 80],
        ],
      },
      expected: "Alice",
      description: "Alice has higher average",
    },
    {
      input: {
        records: [
          ["Charlie", 100],
          ["David", 100],
        ],
      },
      expected: "Charlie",
      description: "Tie - alphabetically first",
    },
    {
      input: { records: [["Zoe", 50]] },
      expected: "Zoe",
      description: "Single student",
    },
    {
      input: {
        records: [
          ["A", 80],
          ["B", 90],
          ["A", 100],
        ],
      },
      expected: "A",
      description: "A's average 90 equals B's single score",
    },
    // In every case above the winner was also the first name in the list, the one with the
    // highest TOTAL, and the one holding the single highest score, so all three shortcuts
    // agreed with the real answer. Here P posts the top score of 100 and the larger total,
    // but a 0 drags P's average to 50, so Q wins on 60.
    {
      input: {
        records: [
          ["P", 100],
          ["P", 0],
          ["Q", 60],
        ],
      },
      expected: "Q",
      description: "Top single score and top total both belong to the loser",
    },
  ],
  fuzzyStatement: "Given a list of student scores, find who has the highest average.",
  clarifyingQuestions: [
    {
      topic: "tie_breaker",
      question: "What if multiple students have the same highest average?",
      answer: "Return the name that comes first alphabetically.",
      required: true,
    },
    {
      topic: "single_score",
      question: "Can a student have only one score?",
      answer: "Yes, a student may have just one score. Their average is that single score.",
      required: false,
    },
    {
      topic: "return_format",
      question: "Should I return the student's name or their average?",
      answer: "Return only the student's name as a string.",
      required: true,
    },
  ],
  commonWrongApproaches: [
    {
      description: "Not handling tie-breaker alphabetically",
      codeSignals: ["max only", "no sort", "first found"],
      intervention:
        "What happens if two students have the same average? How do you decide which name to return?",
    },
    {
      description: "Integer division causing precision loss",
      codeSignals: ["sum // count", "int(sum/count)", "sum / count (integer)"],
      intervention:
        "Be careful with integer vs floating-point division. Averages like 92.5 need decimal precision.",
    },
  ],
  whatIfQuestions: [
    "What if a student appears only once in the records?",
    "What if two students have exactly the same average?",
    "What if all students have different averages?",
    "What if a student has scores of 0?",
  ],
  midCodingProbes: [
    {
      trigger: "building hash map",
      question: "What are you storing in your map - the total score, or a list of scores?",
    },
    {
      trigger: "calculating average",
      question:
        "How are you calculating the average - are you using integer or floating-point division?",
    },
    {
      trigger: "finding maximum",
      question: "How are you handling the tie-breaker when averages are equal?",
    },
  ],
  correctPatternNotes: [
    "Using a hash map with name as key and (sum, count) as value is efficient",
    "Using floating-point division for average calculation is necessary",
    "Sorting alphabetically or using string comparison for tie-breaking is correct",
  ],
}
