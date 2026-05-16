export interface ContextualHint {
  level: number
  hint: string
}

export function generateContextualHints(
  problemText: string,
  _problemTitle: string,
  userCode: string,
  difficulty: string,
  problemType: string,
  _bugCategory?: string
): ContextualHint[] {
  const hints: ContextualHint[] = []
  const textLower = problemText.toLowerCase()
  const codeLower = userCode.toLowerCase()

  if (problemType === "bugfix") {
    hints.push({
      level: 1,
      hint: "Start by understanding what the code is supposed to do. Read the expected behavior carefully and compare it with the actual output.",
    })

    if (
      textLower.includes("off-by-one") ||
      textLower.includes("boundary") ||
      textLower.includes("index")
    ) {
      hints.push({
        level: 2,
        hint: "Check array/loop boundaries carefully. Are you starting at 0 or 1? Is the condition < or <=? Off-by-one errors often hide in loop conditions and array indices.",
      })
    }

    if (
      textLower.includes("null") ||
      textLower.includes("undefined") ||
      textLower.includes("reference")
    ) {
      hints.push({
        level: 2,
        hint: "Look for places where variables might be null or undefined. Check function return values and object property access. Add defensive null checks where needed.",
      })
    }

    if (
      textLower.includes("type") ||
      textLower.includes("coercion") ||
      textLower.includes("conversion")
    ) {
      hints.push({
        level: 2,
        hint: "Watch for type coercion issues. Are you comparing with == instead of ===? Is a string being treated as a number? Check implicit type conversions.",
      })
    }

    if (
      textLower.includes("async") ||
      textLower.includes("promise") ||
      textLower.includes("callback")
    ) {
      hints.push({
        level: 2,
        hint: "Async bugs are tricky. Check if you're missing await keywords, handling promise rejections, or dealing with race conditions.",
      })
    }

    if (
      textLower.includes("loop") ||
      textLower.includes("infinite") ||
      textLower.includes("recursion")
    ) {
      hints.push({
        level: 2,
        hint: "Check your loop termination conditions and recursive base cases. Make sure variables are being updated correctly inside loops.",
      })
    }

    if (userCode.length > 50) {
      if (
        codeLower.includes("for") &&
        !codeLower.includes("break") &&
        !codeLower.includes("return")
      ) {
        hints.push({
          level: 3,
          hint: "Your loop doesn't have an early exit. Check if it might run longer than expected or miss a termination condition.",
        })
      }

      if (codeLower.includes("array") || codeLower.includes("[")) {
        hints.push({
          level: 3,
          hint: "When working with arrays, verify: 1) Index is within bounds, 2) Empty array is handled, 3) Single element case works, 4) Loop bounds are correct.",
        })
      }
    }

    if (hints.length === 1) {
      hints.push({
        level: 2,
        hint: "Try adding console.log statements to trace variable values. Compare what you expect vs what actually happens at each step.",
      })
    }

    return hints
  }

  if (problemType === "system-design") {
    if (!textLower.includes("requirement") && !codeLower.includes("requirement")) {
      hints.push({
        level: 1,
        hint: "Start by clarifying requirements. Ask about scale (users, requests per second), functional requirements, and non-functional requirements (latency, availability).",
      })
    }

    if (
      !codeLower.includes("component") &&
      !codeLower.includes("service") &&
      !codeLower.includes("api")
    ) {
      hints.push({
        level: 2,
        hint: "Think about the major components: API layer, application servers, databases, caches, message queues. How do they communicate?",
      })
    }

    if (
      !codeLower.includes("scale") &&
      !codeLower.includes("shard") &&
      !codeLower.includes("load balancer")
    ) {
      hints.push({
        level: 3,
        hint: "Consider scalability: How would you handle 10x traffic? Think about horizontal scaling, load balancing, database sharding, and caching strategies.",
      })
    }

    if (hints.length === 0) {
      hints.push({
        level: 1,
        hint: "For system design, start with requirements clarification, then high-level architecture, then deep dive into specific components.",
      })
    }

    return hints
  }

  if (textLower.includes("two sum") || textLower.includes("pair") || textLower.includes("sum")) {
    hints.push({
      level: 1,
      hint: "Think about what data structure would let you look up values quickly. What's the complement you're looking for?",
    })
  }

  if (textLower.includes("palindrome")) {
    hints.push({
      level: 1,
      hint: "Consider comparing characters from the outside in. What makes a palindrome special?",
    })
  }

  if (textLower.includes("linked list")) {
    hints.push({
      level: 1,
      hint: "Think about what pointers you need. Would a slow/fast pointer approach help here?",
    })
  }

  if (textLower.includes("binary search") || textLower.includes("sorted")) {
    hints.push({
      level: 1,
      hint: "When data is sorted, you can eliminate half the search space at each step.",
    })
  }

  if (textLower.includes("subarray") || textLower.includes("window")) {
    hints.push({
      level: 1,
      hint: "Consider the sliding window technique. What expands and contracts the window?",
    })
  }

  if (userCode.length > 50) {
    if (codeLower.includes("for") && codeLower.includes("for")) {
      hints.push({
        level: 2,
        hint: "You have nested loops. Could a hash map reduce one of these iterations from O(n) to O(1)?",
      })
    }

    if (!codeLower.includes("if") && !codeLower.includes("return")) {
      hints.push({
        level: 2,
        hint: "Consider edge cases. What happens with empty input? Null values? Single elements?",
      })
    }

    if (codeLower.includes("array") && !codeLower.includes("map") && !codeLower.includes("set")) {
      hints.push({
        level: 2,
        hint: "Arrays are great, but sometimes a Map or Set can improve lookup performance.",
      })
    }
  }

  if (difficulty === "hard" || difficulty === "medium") {
    if (textLower.includes("optimal") || textLower.includes("efficient")) {
      hints.push({
        level: 3,
        hint: `For ${problemType} problems like this, the optimal solution often uses ${
          textLower.includes("sum")
            ? "a hash map for O(1) lookups"
            : textLower.includes("sort")
              ? "sorting first, then two pointers"
              : textLower.includes("path")
                ? "dynamic programming or BFS"
                : "a combination of the right data structure and algorithm"
        }.`,
      })
    }
  }

  if (hints.length === 0) {
    hints.push({
      level: 1,
      hint: "Start by breaking down the problem. What's the input? What's the expected output? What are the constraints?",
    })
  }

  return hints
}
