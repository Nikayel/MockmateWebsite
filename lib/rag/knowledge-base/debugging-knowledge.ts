/**
 * Debugging Knowledge Base
 *
 * Comprehensive knowledge about common bugs and debugging strategies for RAG retrieval.
 * Based on industry-standard bug categories from:
 * - OWASP common vulnerabilities
 * - Microsoft Bug Patterns
 * - Google Code Review Guidelines
 * - "Effective Debugging" by Diomidis Spinellis
 */

import type { DebuggingKnowledge, BugCategory } from "./types"

// Re-export types for convenience
export type { BugCategory } from "./types"

/**
 * Complete debugging knowledge database
 */
export const DEBUGGING_KNOWLEDGE: DebuggingKnowledge[] = [
  {
    bugCategory: "off-by-one",
    displayName: "Off-by-One Errors",
    description:
      "Errors where a loop iterates one time too many or too few, or array access is one index off. One of the most common bugs in programming.",
    commonCauses: [
      "Using <= instead of < in loop conditions",
      "Starting loop at 1 instead of 0 (or vice versa)",
      "Accessing array[length] instead of array[length-1]",
      "Fence-post errors: counting items vs gaps between items",
      "Inclusive vs exclusive range boundaries",
    ],
    symptoms: [
      "Array index out of bounds exceptions",
      "Missing first or last element in output",
      "Incorrect count by exactly 1",
      "Processing one extra or one fewer item",
    ],
    debuggingApproach: [
      "1. Check loop boundaries: start index, end condition, increment",
      "2. Trace through with smallest valid input (empty, single element)",
      "3. Trace through with boundary values (first, last elements)",
      "4. Draw out the iteration visually for array indices",
      "5. Verify: does loop run exactly N times for N elements?",
    ],
    redFlags: [
      "i <= arr.length in loop conditions",
      "arr[i+1] without bounds checking",
      "for i in range(1, n) when 0-indexing expected",
      "Mixing 0-based and 1-based indexing",
      "slice(0, n-1) when you want all n elements",
    ],
    fixStrategies: [
      "Use half-open intervals [start, end) consistently",
      "Prefer < over <= for upper bounds",
      "Test with empty arrays and single-element arrays",
      "Use named constants for boundaries",
      "Consider using forEach/map instead of manual indexing",
    ],
    preventionTips: [
      "Always test edge cases: empty, one element, two elements",
      "Use language idioms (forEach, map) when possible",
      "Write boundary conditions FIRST, then fill in the logic",
      "Review all +1 and -1 adjustments carefully",
    ],
    codeExamples: [
      {
        buggy: `for (let i = 0; i <= arr.length; i++) {
  console.log(arr[i]); // Crashes on last iteration
}`,
        fixed: `for (let i = 0; i < arr.length; i++) {
  console.log(arr[i]);
}`,
        explanation: "<= causes access to arr[arr.length] which is undefined/crash",
      },
      {
        buggy: `// Count pairs in array
let pairs = 0;
for (let i = 0; i < arr.length; i++) {
  pairs++; // Wrong: counts elements, not pairs
}`,
        fixed: `// Count pairs in array
let pairs = 0;
for (let i = 0; i < arr.length - 1; i++) {
  pairs++; // Correct: n-1 pairs between n elements
}`,
        explanation: "Fence-post error: n elements have n-1 pairs between them",
      },
    ],
    relatedBugs: ["boundary-error", "infinite-loop", "logic-error"],
    difficulty: "easy",
    frequency: 10,
  },
  {
    bugCategory: "null-pointer",
    displayName: "Null/Undefined Reference Errors",
    description:
      'Attempting to access properties or methods on null, undefined, or None values. The "billion dollar mistake" according to its inventor Tony Hoare.',
    commonCauses: [
      "Not checking if object exists before accessing properties",
      "Assuming API/function always returns a value",
      "Uninitialized variables",
      "Optional chaining not used",
      "Race conditions where data not yet loaded",
    ],
    symptoms: [
      "TypeError: Cannot read property X of undefined/null",
      "NullPointerException",
      "AttributeError: NoneType has no attribute",
      "Unexpected undefined values propagating through code",
    ],
    debuggingApproach: [
      "1. Find exact line where null access occurs (stack trace)",
      "2. Trace backwards: where did this value come from?",
      "3. Check all code paths: which one returns null/undefined?",
      "4. Add defensive checks at the source, not just symptoms",
      "5. Consider: should this EVER be null? If not, fix the source.",
    ],
    redFlags: [
      "obj.prop without null check",
      "Array methods on potentially undefined arrays",
      "Chained property access: a.b.c.d",
      "Assuming array/object is never empty",
      "Not handling Promise rejection cases",
    ],
    fixStrategies: [
      "Use optional chaining: obj?.prop",
      "Use nullish coalescing: value ?? defaultValue",
      "Add early returns/guards: if (!obj) return;",
      "Initialize with sensible defaults",
      "Use TypeScript strict null checks",
    ],
    preventionTips: [
      "Enable strict null checking in TypeScript",
      "Always handle the null/error case explicitly",
      "Use Maybe/Optional types in strongly typed languages",
      "Write defensive code at system boundaries",
    ],
    codeExamples: [
      {
        buggy: `function getName(user) {
  return user.profile.name; // Crashes if user or profile is null
}`,
        fixed: `function getName(user) {
  return user?.profile?.name ?? 'Unknown';
}`,
        explanation: "Optional chaining (?.) safely handles null/undefined at each level",
      },
      {
        buggy: `const items = data.results;
items.forEach(item => process(item)); // Crashes if results undefined`,
        fixed: `const items = data?.results ?? [];
items.forEach(item => process(item));`,
        explanation: "Provide empty array default when results might be missing",
      },
    ],
    relatedBugs: ["initialization-error", "type-error", "async-error"],
    difficulty: "easy",
    frequency: 10,
  },
  {
    bugCategory: "type-error",
    displayName: "Type Errors & Coercion Bugs",
    description:
      "Bugs from unexpected type conversions, wrong types passed to functions, or type assumptions that fail at runtime.",
    commonCauses: [
      "Implicit type coercion (especially in JavaScript)",
      "String vs Number confusion",
      "Truthy/falsy value misunderstanding",
      "API returning different types than expected",
      "Parsing strings without validation",
    ],
    symptoms: [
      "NaN appearing in calculations",
      '"[object Object]" in strings',
      "Unexpected boolean coercion results",
      '"12" + 3 = "123" instead of 15',
    ],
    debuggingApproach: [
      "1. Use typeof/instanceof to check actual types",
      "2. Log values AND their types at key points",
      "3. Check API documentation for return types",
      "4. Trace the value from origin to error point",
      "5. Look for implicit conversions (==, +, etc.)",
    ],
    redFlags: [
      "Using == instead of ===",
      "String concatenation with + when math intended",
      "Not parsing API string responses to numbers",
      "Assuming Array.find() returns array element (can be undefined)",
      'Boolean checks on values that could be 0 or ""',
    ],
    fixStrategies: [
      "Use explicit type conversion: Number(), String(), Boolean()",
      "Always use === for comparison",
      "Parse and validate inputs at system boundaries",
      "Use TypeScript for compile-time type checking",
      "Add runtime type checks for external data",
    ],
    preventionTips: [
      "Use TypeScript or Flow for static type checking",
      "Validate and parse external inputs immediately",
      "Be explicit about conversions",
      'Test with edge case values: 0, "", null, undefined, NaN',
    ],
    codeExamples: [
      {
        buggy: `const sum = userInput + 10; // "5" + 10 = "510"`,
        fixed: `const sum = Number(userInput) + 10; // 5 + 10 = 15`,
        explanation: "Always parse string inputs before arithmetic",
      },
      {
        buggy: `if (count == "0") { // True for count = 0 (number)
  handleZero();
}`,
        fixed: `if (count === 0) { // Only true for actual zero
  handleZero();
}`,
        explanation: "== performs type coercion, === checks type and value",
      },
    ],
    relatedBugs: ["comparison-error", "initialization-error"],
    difficulty: "medium",
    frequency: 8,
  },
  {
    bugCategory: "logic-error",
    displayName: "Logic Errors",
    description:
      "Code runs without crashing but produces wrong results due to flawed algorithm or business logic implementation.",
    commonCauses: [
      "Misunderstanding the requirements",
      "Wrong algorithm choice",
      "Incorrect conditional logic",
      "Missing edge cases in logic",
      "Copy-paste errors with incomplete modifications",
    ],
    symptoms: [
      "Wrong output for certain inputs",
      "Tests fail but no runtime errors",
      "Works for simple cases, fails for complex ones",
      "Inconsistent behavior across different scenarios",
    ],
    debuggingApproach: [
      "1. Create test cases from requirements, verify expected outputs",
      "2. Find the SIMPLEST failing case",
      "3. Trace through logic step by step with that input",
      "4. Compare your logic against the requirements, not your code",
      "5. Question your assumptions: what if X is negative? Zero? Very large?",
    ],
    redFlags: [
      "Complex nested conditionals",
      "Multiple return statements with similar conditions",
      "Business logic without corresponding test cases",
      "Copy-pasted code blocks with slight variations",
      "Magic numbers without explanation",
    ],
    fixStrategies: [
      "Write tests FIRST that encode the expected behavior",
      "Simplify complex conditionals into named functions",
      "Use truth tables for complex boolean logic",
      "Rubber duck debugging: explain the logic out loud",
      "Draw state diagrams for stateful logic",
    ],
    preventionTips: [
      "Write tests before implementation (TDD)",
      "Code review focusing on logic, not just style",
      "Keep functions small and single-purpose",
      "Document the WHY in comments, not the WHAT",
    ],
    codeExamples: [
      {
        buggy: `// Check if leap year
function isLeapYear(year) {
  return year % 4 === 0; // Missing 100/400 rules
}`,
        fixed: `function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}`,
        explanation: "Leap year logic has multiple conditions often forgotten",
      },
      {
        buggy: `// Find max in array
let max = 0; // Wrong for negative-only arrays
for (const num of arr) {
  if (num > max) max = num;
}`,
        fixed: `let max = arr[0]; // Start with first element
for (let i = 1; i < arr.length; i++) {
  if (arr[i] > max) max = arr[i];
}`,
        explanation: "Initializing max to 0 fails for all-negative arrays",
      },
    ],
    relatedBugs: ["boundary-error", "comparison-error"],
    difficulty: "medium",
    frequency: 9,
  },
  {
    bugCategory: "boundary-error",
    displayName: "Boundary & Edge Case Errors",
    description:
      "Bugs that occur at the boundaries of input ranges: empty collections, maximum values, zero, negative numbers, special characters.",
    commonCauses: [
      "Not testing with empty inputs",
      "Integer overflow/underflow",
      "Division by zero",
      "Negative index handling",
      "Special values: NaN, Infinity, MAX_SAFE_INTEGER",
    ],
    symptoms: [
      'Works for "normal" inputs, fails at extremes',
      "Infinite loops with certain inputs",
      "Unexpected behavior with empty collections",
      "Crashes with very large numbers",
    ],
    debuggingApproach: [
      "1. Test with: empty, one element, very large, negative, zero",
      "2. Identify all input boundaries from requirements",
      "3. Test both sides of each boundary",
      "4. Check integer limits and floating point precision",
      "5. Test with special characters in strings",
    ],
    redFlags: [
      "No empty input check",
      "Division without zero check",
      "Array access without length check",
      "Using parseInt without NaN check",
      "Assuming positive numbers only",
    ],
    fixStrategies: [
      "Add explicit boundary checks at function entry",
      "Use guard clauses for edge cases",
      "Document valid input ranges",
      "Use BigInt for large integer math",
      "Consider using assertion libraries",
    ],
    preventionTips: [
      "Create a boundary test checklist for all functions",
      'Test with: null, undefined, 0, -1, "", [], {}, MAX_INT, MIN_INT',
      "Use property-based testing to find edge cases",
      "Add input validation at public API boundaries",
    ],
    codeExamples: [
      {
        buggy: `function average(arr) {
  return arr.reduce((a, b) => a + b) / arr.length; // Crashes on empty
}`,
        fixed: `function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}`,
        explanation: "Empty array reduce without initial value crashes",
      },
      {
        buggy: `function percentage(part, total) {
  return (part / total) * 100; // NaN or Infinity if total is 0
}`,
        fixed: `function percentage(part, total) {
  if (total === 0) return 0;
  return (part / total) * 100;
}`,
        explanation: "Division by zero returns Infinity, propagates errors",
      },
    ],
    relatedBugs: ["off-by-one", "logic-error", "type-error"],
    difficulty: "medium",
    frequency: 8,
  },
  {
    bugCategory: "infinite-loop",
    displayName: "Infinite Loops",
    description:
      "Loops that never terminate due to incorrect exit conditions, counter updates, or break logic.",
    commonCauses: [
      "Loop counter not incrementing",
      "Exit condition never becomes true",
      "Modifying loop variable incorrectly",
      "Circular references in data structures",
      "Recursive function without base case",
    ],
    symptoms: [
      "Program hangs/freezes",
      "CPU usage spikes to 100%",
      "Browser tab becomes unresponsive",
      "Stack overflow (for infinite recursion)",
    ],
    debuggingApproach: [
      "1. Add logging inside loop to track iterations",
      "2. Check: is the counter being modified correctly?",
      "3. Check: can the exit condition ever be true?",
      "4. For recursion: verify base case is reachable",
      "5. Add a maximum iteration safety limit while debugging",
    ],
    redFlags: [
      "while(true) without break statement",
      "Loop variable modified inside nested block",
      "Recursive call with same or larger input",
      "for...in on object with circular reference",
      "Await inside loop without proper termination",
    ],
    fixStrategies: [
      "Always verify loop counter modification",
      "Add timeout/max iteration safeguards",
      "Use for...of instead of while when possible",
      "Ensure recursive calls reduce problem size",
      "Check for circular references before traversing",
    ],
    preventionTips: [
      "Prefer declarative loops (forEach, map) over while",
      "Always test with inputs that might not terminate",
      "Add watchdog timers for long-running loops",
      "Code review should trace all possible loop paths",
    ],
    codeExamples: [
      {
        buggy: `let i = 0;
while (i < 10) {
  if (arr[i] === target) return i;
  // Forgot to increment i
}`,
        fixed: `let i = 0;
while (i < 10) {
  if (arr[i] === target) return i;
  i++; // Always increment
}`,
        explanation: "Missing increment causes infinite loop",
      },
      {
        buggy: `function countdown(n) {
  console.log(n);
  countdown(n - 1); // No base case
}`,
        fixed: `function countdown(n) {
  if (n <= 0) return; // Base case
  console.log(n);
  countdown(n - 1);
}`,
        explanation: "Recursion needs a base case to terminate",
      },
    ],
    relatedBugs: ["off-by-one", "logic-error"],
    difficulty: "easy",
    frequency: 7,
  },
  {
    bugCategory: "async-error",
    displayName: "Async/Await & Promise Errors",
    description:
      "Bugs related to asynchronous code: race conditions, unhandled rejections, callback ordering, and async/await misuse.",
    commonCauses: [
      "Forgetting await keyword",
      "Not handling Promise rejections",
      "Race conditions in parallel operations",
      "Callback hell with incorrect ordering",
      "Stale closure capturing wrong values",
    ],
    symptoms: [
      "Promise { <pending> } appearing in logs",
      "Unhandled promise rejection warnings",
      "Functions returning before async work completes",
      "Data inconsistency from race conditions",
    ],
    debuggingApproach: [
      "1. Check every async function call has await (if needed)",
      "2. Add .catch() or try/catch to all Promises",
      "3. Log timestamps to understand execution order",
      "4. Use Promise.all() for parallel operations that need coordination",
      "5. Check if closures capture variables by reference vs value",
    ],
    redFlags: [
      "async function called without await",
      "Promise without .catch() or try/catch",
      "Async operations in forEach (doesnt await)",
      "setTimeout/setInterval accessing changing state",
      "Multiple setState calls without batching awareness",
    ],
    fixStrategies: [
      "Always await async functions (unless intentionally parallel)",
      "Use Promise.all() for parallel operations",
      "Add global unhandled rejection handler",
      "Use for...of loop instead of forEach for async",
      "Copy loop variables to avoid stale closures",
    ],
    preventionTips: [
      "Use TypeScript which catches missing awaits",
      "Lint rules for unhandled promises",
      "Write async code sequentially first, optimize later",
      "Test async code with artificial delays",
    ],
    codeExamples: [
      {
        buggy: `async function getUsers() {
  const response = fetch('/api/users'); // Missing await
  return response.json(); // Error: response is a Promise
}`,
        fixed: `async function getUsers() {
  const response = await fetch('/api/users');
  return response.json();
}`,
        explanation: "Missing await returns Promise instead of resolved value",
      },
      {
        buggy: `// Process items in parallel - order not guaranteed
items.forEach(async (item) => {
  await processItem(item); // forEach doesn't wait
});
console.log('Done'); // Runs before processing finishes`,
        fixed: `for (const item of items) {
  await processItem(item);
}
console.log('Done'); // Runs after all items processed`,
        explanation: "forEach with async doesnt await - use for...of instead",
      },
    ],
    relatedBugs: ["race-condition", "scope-error"],
    difficulty: "hard",
    frequency: 9,
  },
  {
    bugCategory: "race-condition",
    displayName: "Race Conditions",
    description:
      "Bugs where the behavior depends on the timing/ordering of events, leading to unpredictable results.",
    commonCauses: [
      "Shared mutable state between async operations",
      "Read-modify-write without locking",
      "Assuming order of parallel operations",
      "UI state updated during ongoing requests",
      "Database operations without transactions",
    ],
    symptoms: [
      "Intermittent failures (works sometimes, fails other times)",
      "Data corruption or inconsistency",
      "Duplicate operations",
      "Stale data displayed in UI",
    ],
    debuggingApproach: [
      "1. Add timestamps to all async operations",
      "2. Introduce artificial delays to expose race conditions",
      "3. Check for shared mutable state",
      "4. Review all parallel operations for dependencies",
      '5. Look for "check then act" patterns without atomicity',
    ],
    redFlags: [
      "Global or shared mutable state",
      "if (exists) { modify }; patterns without locking",
      "Multiple async operations modifying same resource",
      "UI buttons that trigger multiple requests",
      "Counter++ in concurrent code",
    ],
    fixStrategies: [
      "Use atomic operations or transactions",
      "Implement proper locking/mutex mechanisms",
      "Make operations idempotent",
      "Use request cancellation for superseded operations",
      "Queue operations that must be sequential",
    ],
    preventionTips: [
      "Minimize shared mutable state",
      "Use immutable data structures",
      "Design APIs to be idempotent",
      "Add debouncing for user-triggered operations",
    ],
    codeExamples: [
      {
        buggy: `// Race condition: multiple clicks send multiple requests
async function handleClick() {
  const result = await fetchData();
  setData(result);
}`,
        fixed: `let requestId = 0;
async function handleClick() {
  const thisRequest = ++requestId;
  const result = await fetchData();
  if (thisRequest === requestId) { // Only update if latest
    setData(result);
  }
}`,
        explanation: "Track request ID to ignore stale responses",
      },
    ],
    relatedBugs: ["async-error", "logic-error"],
    difficulty: "hard",
    frequency: 6,
  },
  {
    bugCategory: "scope-error",
    displayName: "Scope & Closure Errors",
    description:
      "Bugs from variable scoping issues: shadowing, hoisting, closure capturing, and block vs function scope.",
    commonCauses: [
      "Variable shadowing (same name in nested scope)",
      "var hoisting confusion",
      "Closure capturing loop variable by reference",
      "this binding in callbacks",
      "Modifying outer scope unintentionally",
    ],
    symptoms: [
      "Variable has unexpected value",
      "All closures have same (last) value",
      '"this" is undefined in callbacks',
      "Function uses wrong variable due to shadowing",
    ],
    debuggingApproach: [
      "1. Check for variable declarations with same name in nested scopes",
      "2. Trace variable lifecycle: declaration, assignment, access",
      "3. For closures: what value did the variable have at capture time?",
      '4. Check "this" binding in callbacks and event handlers',
      "5. Use browser debugger to inspect scope chain",
    ],
    redFlags: [
      "Using var instead of let/const",
      "Loop variable used inside setTimeout/callbacks",
      "Function declarations inside loops",
      'Arrow functions where "this" binding needed (or vice versa)',
      "Same variable name in function and outer scope",
    ],
    fixStrategies: [
      "Always use let/const instead of var",
      "Use unique, descriptive variable names",
      'Use arrow functions to preserve "this"',
      "Copy loop variables for closure capture",
      "Use ESLint no-shadow rule",
    ],
    preventionTips: [
      "Enable linting rules for shadowing",
      "Use const by default, let only when needed",
      "Understand the difference between var/let/const",
      'Be explicit about "this" binding',
    ],
    codeExamples: [
      {
        buggy: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // Prints 3, 3, 3
}`,
        fixed: `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // Prints 0, 1, 2
}`,
        explanation: "var is function-scoped; let is block-scoped per iteration",
      },
      {
        buggy: `const obj = {
  name: 'Test',
  greet: function() {
    setTimeout(function() {
      console.log(this.name); // undefined - wrong 'this'
    }, 100);
  }
};`,
        fixed: `const obj = {
  name: 'Test',
  greet: function() {
    setTimeout(() => {
      console.log(this.name); // 'Test' - arrow preserves 'this'
    }, 100);
  }
};`,
        explanation: 'Arrow functions inherit "this" from enclosing scope',
      },
    ],
    relatedBugs: ["async-error", "logic-error"],
    difficulty: "medium",
    frequency: 7,
  },
  {
    bugCategory: "comparison-error",
    displayName: "Comparison & Equality Errors",
    description:
      "Bugs from incorrect comparisons: wrong operators, floating point issues, object equality, and sorting problems.",
    commonCauses: [
      "Using = instead of == or ===",
      "Floating point precision issues",
      "Comparing objects by reference instead of value",
      "Incorrect sort comparator function",
      "NaN comparisons (NaN !== NaN)",
    ],
    symptoms: [
      "Conditions always true or always false",
      "Sort produces wrong order",
      "0.1 + 0.2 !== 0.3",
      "Object comparison fails unexpectedly",
    ],
    debuggingApproach: [
      "1. Log actual values and their types before comparison",
      "2. Check for accidental assignment (= vs ==)",
      "3. For floating point: log actual values to many decimals",
      "4. For objects: are you comparing reference or value?",
      "5. Test sort with known input/output pairs",
    ],
    redFlags: [
      "if (x = y) - assignment in condition",
      "Comparing floating point with ===",
      "obj1 === obj2 for deep equality",
      "sort() without comparator on numbers",
      "Comparing to NaN with ===",
    ],
    fixStrategies: [
      "Use epsilon comparison for floats: Math.abs(a - b) < 0.0001",
      "Use JSON.stringify or deep-equal for object comparison",
      "Always provide sort comparator: (a, b) => a - b",
      "Use Number.isNaN() instead of === NaN",
      "Use linter rules to catch assignment in conditions",
    ],
    preventionTips: [
      "Enable assignment-in-condition linting",
      "Use decimal libraries for financial calculations",
      "Create utility functions for common comparisons",
      "Write tests for sort behavior",
    ],
    codeExamples: [
      {
        buggy: `const nums = [10, 2, 30, 4];
nums.sort(); // [10, 2, 30, 4] -> "10", "2", "30", "4" -> [10, 2, 30, 4]`,
        fixed: `const nums = [10, 2, 30, 4];
nums.sort((a, b) => a - b); // [2, 4, 10, 30]`,
        explanation: "Default sort converts to strings; provide numeric comparator",
      },
      {
        buggy: `if (0.1 + 0.2 === 0.3) { // false!
  console.log('Equal');
}`,
        fixed: `const EPSILON = 0.0001;
if (Math.abs((0.1 + 0.2) - 0.3) < EPSILON) {
  console.log('Equal');
}`,
        explanation: "Floating point math has precision limits; use epsilon",
      },
    ],
    relatedBugs: ["type-error", "logic-error"],
    difficulty: "medium",
    frequency: 7,
  },
  {
    bugCategory: "initialization-error",
    displayName: "Initialization Errors",
    description: "Bugs from uninitialized variables, wrong initial values, or missing setup code.",
    commonCauses: [
      "Variable declared but not assigned",
      "Wrong default value (0 vs -Infinity for max)",
      "Missing constructor initialization",
      "Forgetting to reset state between operations",
      "Dependency injection not configured",
    ],
    symptoms: [
      "undefined or null where value expected",
      "Wrong results on first run, correct after",
      "State from previous operation leaking",
      "NaN from uninitialized number operations",
    ],
    debuggingApproach: [
      "1. Check variable is assigned before first use",
      "2. Verify default values are sensible for all cases",
      "3. Check object properties are initialized in constructor",
      "4. Look for state not being reset between operations",
      "5. Trace object creation and initialization flow",
    ],
    redFlags: [
      "let x; without assignment",
      "let max = 0; for finding maximum (fails for negative)",
      "Class properties not in constructor",
      "Global state used across requests",
      "Accumulator not reset between function calls",
    ],
    fixStrategies: [
      "Always initialize variables at declaration",
      "Use Infinity/-Infinity for min/max problems",
      "Initialize all class properties in constructor",
      "Reset state at start of functions, not end",
      "Use factory functions for fresh state",
    ],
    preventionTips: [
      "Enable no-undef and prefer-const linting",
      "Initialize state in a dedicated init function",
      "Use TypeScript strict mode to catch uninitialized",
      "Test functions with fresh state each time",
    ],
    codeExamples: [
      {
        buggy: `function findMax(arr) {
  let max = 0; // Wrong for [-5, -3, -1]
  for (const n of arr) {
    if (n > max) max = n;
  }
  return max; // Returns 0 instead of -1
}`,
        fixed: `function findMax(arr) {
  if (arr.length === 0) return undefined;
  let max = -Infinity; // Or arr[0]
  for (const n of arr) {
    if (n > max) max = n;
  }
  return max;
}`,
        explanation: "Initialize max to -Infinity or first element, not 0",
      },
    ],
    relatedBugs: ["null-pointer", "logic-error"],
    difficulty: "easy",
    frequency: 8,
  },
  {
    bugCategory: "exception-handling",
    displayName: "Exception Handling Errors",
    description:
      "Bugs from missing, incorrect, or overly broad exception handling that masks errors or fails to handle edge cases.",
    commonCauses: [
      "Empty catch blocks that swallow errors",
      "Catching too broad (catch Exception)",
      "Not rethrowing after logging",
      "Finally block with return overriding catch",
      "Async exceptions not caught",
    ],
    symptoms: [
      "Silent failures with no error messages",
      "Unexpected behavior with no stack trace",
      "Wrong error type caught",
      "Resources not cleaned up on error",
    ],
    debuggingApproach: [
      "1. Remove catch blocks temporarily to see actual errors",
      "2. Log full error object, not just message",
      "3. Check if async code has proper error handling",
      "4. Verify finally blocks dont interfere with returns",
      "5. Test error paths explicitly",
    ],
    redFlags: [
      "catch (e) {} - empty catch block",
      "catch (Exception e) - too broad",
      "catch without logging or rethrowing",
      "Async function without try/catch",
      "Return in finally block",
    ],
    fixStrategies: [
      "Never use empty catch blocks",
      "Catch specific exception types",
      "Log errors with full context before handling",
      "Use finally for cleanup, not control flow",
      "Wrap async code in try/catch",
    ],
    preventionTips: [
      "Enable no-empty linting for catch blocks",
      "Create centralized error handling",
      "Define custom error types for your domain",
      "Test error scenarios explicitly",
    ],
    codeExamples: [
      {
        buggy: `try {
  riskyOperation();
} catch (e) {
  // Swallowed - no logging, no handling
}`,
        fixed: `try {
  riskyOperation();
} catch (e) {
  console.error('Operation failed:', e);
  throw e; // Or handle appropriately
}`,
        explanation: "Never swallow exceptions; log and handle or rethrow",
      },
    ],
    relatedBugs: ["async-error", "null-pointer"],
    difficulty: "medium",
    frequency: 6,
  },
  {
    bugCategory: "wrong-operator",
    displayName: "Wrong Operator Errors",
    description: "Bugs from using the wrong operator: && vs ||, + vs -, bitwise vs logical, etc.",
    commonCauses: [
      "Confusing && and ||",
      "Using & instead of && (bitwise vs logical)",
      "Wrong arithmetic operator",
      "Increment/decrement confusion (++i vs i++)",
      "Assignment vs comparison (= vs ==)",
    ],
    symptoms: [
      "Logic always takes one branch",
      "Unexpected numeric results",
      "Conditions behave opposite to expected",
      "Bitwise operations where boolean expected",
    ],
    debuggingApproach: [
      "1. Check each operator matches intent",
      "2. Test with true/false combinations",
      "3. Verify order of operations is correct",
      "4. Test increment/decrement side effects",
      "5. Use parentheses to clarify intent",
    ],
    redFlags: [
      "& or | in boolean contexts",
      "Chained comparisons: a < b < c",
      "Missing parentheses in complex expressions",
      "++ or -- used for side effects and value",
    ],
    fixStrategies: [
      "Use explicit parentheses for complex expressions",
      "Split complex conditions into named variables",
      "Avoid using ++/-- for both side effect and value",
      "Use Boolean() to convert to boolean explicitly",
    ],
    preventionTips: [
      "Review all operators during code review",
      "Use linting for confusing operators",
      "Test all branches of conditional logic",
      "Be explicit with parentheses",
    ],
    codeExamples: [
      {
        buggy: `// Check if in range
if (0 < x < 10) { // Always true! Evaluates as (0 < x) < 10
  inRange();
}`,
        fixed: `if (0 < x && x < 10) { // Correct range check
  inRange();
}`,
        explanation: "Chained comparisons dont work as expected in most languages",
      },
      {
        buggy: `if (a & b) { // Bitwise AND, not logical
  doSomething();
}`,
        fixed: `if (a && b) { // Logical AND
  doSomething();
}`,
        explanation: "& is bitwise, && is logical; easy to mistype",
      },
    ],
    relatedBugs: ["comparison-error", "logic-error"],
    difficulty: "easy",
    frequency: 5,
  },
  {
    bugCategory: "memory-leak",
    displayName: "Memory Leaks",
    description:
      "Bugs where memory is allocated but never freed, causing gradual memory growth and eventual crashes.",
    commonCauses: [
      "Event listeners not removed",
      "Closures holding references to large objects",
      "Global variables accumulating data",
      "Timers not cleared (setInterval)",
      "DOM references kept after element removal",
    ],
    symptoms: [
      "Memory usage grows over time",
      "Performance degrades with usage",
      "Out of memory errors after extended use",
      "Browser tab becomes sluggish",
    ],
    debuggingApproach: [
      "1. Use browser memory profiler to take heap snapshots",
      "2. Compare snapshots before/after operations",
      '3. Look for "detached" DOM nodes',
      "4. Check for growing arrays/maps in global scope",
      "5. Review all event listener registrations",
    ],
    redFlags: [
      "addEventListener without corresponding removeEventListener",
      "setInterval without clearInterval",
      "Closures in long-lived callbacks",
      "Caching without eviction policy",
      "Storing references in global scope",
    ],
    fixStrategies: [
      "Always clean up event listeners in cleanup functions",
      "Use WeakMap/WeakSet for object caches",
      "Clear intervals and timeouts on unmount",
      "Implement cache size limits",
      "Use AbortController for fetch cleanup",
    ],
    preventionTips: [
      "Follow the pattern: if you allocate, you deallocate",
      "Use React useEffect cleanup functions",
      "Regular memory profiling in development",
      "Code review for resource cleanup",
    ],
    codeExamples: [
      {
        buggy: `// React component with memory leak
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
}, []);`,
        fixed: `useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);`,
        explanation: "Always return cleanup function from useEffect",
      },
    ],
    relatedBugs: ["scope-error", "async-error"],
    difficulty: "hard",
    frequency: 5,
  },
]

/**
 * Get debugging knowledge by bug category
 */
export function getDebuggingKnowledge(category: BugCategory): DebuggingKnowledge | undefined {
  return DEBUGGING_KNOWLEDGE.find((k) => k.bugCategory === category)
}

/**
 * Get all debugging knowledge sorted by frequency (most common first)
 */
export function getAllDebuggingKnowledge(): DebuggingKnowledge[] {
  return [...DEBUGGING_KNOWLEDGE].sort((a, b) => b.frequency - a.frequency)
}

/**
 * Get debugging knowledge by difficulty
 */
export function getDebuggingKnowledgeByDifficulty(
  difficulty: "easy" | "medium" | "hard"
): DebuggingKnowledge[] {
  return DEBUGGING_KNOWLEDGE.filter((k) => k.difficulty === difficulty)
}

/**
 * Get related bugs for a given category
 */
export function getRelatedBugs(category: BugCategory): DebuggingKnowledge[] {
  const knowledge = getDebuggingKnowledge(category)
  if (!knowledge) return []
  return knowledge.relatedBugs
    .map((c) => getDebuggingKnowledge(c))
    .filter((k): k is DebuggingKnowledge => k !== undefined)
}

/**
 * Format debugging knowledge for RAG context
 */
export function formatDebuggingKnowledgeForContext(knowledge: DebuggingKnowledge): string {
  return `
## ${knowledge.displayName}

${knowledge.description}

### Common Causes
${knowledge.commonCauses.map((c) => `- ${c}`).join("\n")}

### Debugging Approach
${knowledge.debuggingApproach.join("\n")}

### Red Flags to Watch For
${knowledge.redFlags.map((r) => `- ${r}`).join("\n")}

### Fix Strategies
${knowledge.fixStrategies.map((s) => `- ${s}`).join("\n")}
`.trim()
}
