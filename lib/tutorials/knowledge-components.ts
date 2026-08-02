/**
 * The controlled knowledge-component (KC) vocabulary for Learn.
 *
 * WHY: `TutorialLesson.skills` is free-form strings rendered as chips. Across the Python
 * tree that produced a long tail of near-duplicates ("typing" vs "type-hints", "test
 * design" with a space, "collections" vs "standard-library") and dozens of singletons.
 * Free strings are fine for a chip and useless as an analysis key: knowledge tracing
 * needs repeated observations of the SAME component, and a vocabulary where half the
 * terms appear once can never accumulate them.
 *
 * The mapping is applied AT WRITE TIME, on the telemetry path, not by rewriting every
 * lesson. That choice matters: authored `skills` stay exactly as written (they are
 * learner-facing chips and a human curated them), while every response row also carries
 * a canonical `knowledge_components` array that analysis can group by. Retagging 55
 * lessons would have churned content for no learner-visible gain and would still leave
 * the next author free to invent a new synonym.
 *
 * Unmapped skills are reported, never silently dropped: `unmappedSkills` powers a test
 * that keeps the vocabulary honest as new lessons land.
 */

/**
 * Canonical components. Coarse on purpose: a KC has to collect enough observations per
 * learner to support a mastery estimate, so "sequences" earns its place and "zip" does
 * not. Prefixed by track so the SQL and System Design trees can extend this later
 * without colliding.
 */
export const KNOWLEDGE_COMPONENTS = [
  "py.values-and-types",
  "py.strings",
  "py.sequences",
  "py.mappings-and-sets",
  "py.control-flow",
  "py.functions",
  "py.references-and-mutability",
  "py.recursion",
  "py.comprehensions",
  "py.generators",
  "py.closures-and-decorators",
  "py.oop",
  "py.data-modeling",
  "py.errors",
  "py.io-and-files",
  "py.modules-and-packaging",
  "py.typing",
  "py.testing",
  "py.regex",
  "py.logging",
  "py.cli",
  "py.http-and-apis",
  "py.concurrency",
  "py.performance",
  "py.metaprogramming",
  "py.tooling",
  "py.code-review",
] as const

export type KnowledgeComponent = (typeof KNOWLEDGE_COMPONENTS)[number]

/**
 * Authored skill string to canonical component. Keys are compared after lowercasing and
 * collapsing spaces/underscores to hyphens, so "Test Design", "test design", and
 * "test_design" all resolve.
 */
const SKILL_TO_KC: Record<string, KnowledgeComponent> = {
  // values and types
  variables: "py.values-and-types",
  numbers: "py.values-and-types",
  arithmetic: "py.values-and-types",
  integers: "py.values-and-types",
  floats: "py.values-and-types",
  booleans: "py.values-and-types",
  none: "py.values-and-types",
  truthiness: "py.values-and-types",
  identity: "py.values-and-types",
  equality: "py.values-and-types",
  "type-coercion": "py.values-and-types",
  "type-conversion": "py.values-and-types",
  "type-checking": "py.values-and-types",
  rounding: "py.values-and-types",
  precision: "py.values-and-types",

  // strings
  strings: "py.strings",
  "string-methods": "py.strings",
  "string-parsing": "py.strings",
  "string-formatting": "py.strings",
  "f-strings": "py.strings",
  formatting: "py.strings",
  slicing: "py.strings",
  indexing: "py.strings",
  "text-processing": "py.strings",
  encoding: "py.strings",
  unicode: "py.strings",

  // sequences
  lists: "py.sequences",
  tuples: "py.sequences",
  iteration: "py.sequences",
  looping: "py.sequences",
  enumerate: "py.sequences",
  zip: "py.sequences",
  unpacking: "py.sequences",
  sorted: "py.sequences",
  sorting: "py.sequences",
  ranges: "py.sequences",
  range: "py.sequences",

  // mappings and sets
  dicts: "py.mappings-and-sets",
  dictionaries: "py.mappings-and-sets",
  sets: "py.mappings-and-sets",
  membership: "py.mappings-and-sets",
  uniqueness: "py.mappings-and-sets",
  collections: "py.mappings-and-sets",
  counter: "py.mappings-and-sets",
  defaultdict: "py.mappings-and-sets",
  deque: "py.mappings-and-sets",
  hashing: "py.mappings-and-sets",

  // control flow
  conditionals: "py.control-flow",
  "control-flow": "py.control-flow",
  branching: "py.control-flow",
  loops: "py.control-flow",
  "short-circuit": "py.control-flow",

  // functions
  functions: "py.functions",
  arguments: "py.functions",
  parameters: "py.functions",
  defaults: "py.functions",
  "return-values": "py.functions",
  lambda: "py.functions",
  lambdas: "py.functions",
  "higher-order-functions": "py.functions",
  scope: "py.functions",
  args: "py.functions",
  kwargs: "py.functions",

  // references and mutability
  mutability: "py.references-and-mutability",
  immutability: "py.references-and-mutability",
  references: "py.references-and-mutability",
  aliasing: "py.references-and-mutability",
  copying: "py.references-and-mutability",
  deepcopy: "py.references-and-mutability",

  recursion: "py.recursion",
  "call-stack": "py.recursion",

  comprehensions: "py.comprehensions",
  "list-comprehensions": "py.comprehensions",

  generators: "py.generators",
  yield: "py.generators",
  iterators: "py.generators",
  laziness: "py.generators",

  closures: "py.closures-and-decorators",
  decorators: "py.closures-and-decorators",
  "late-binding": "py.closures-and-decorators",
  functools: "py.closures-and-decorators",

  // oop
  classes: "py.oop",
  objects: "py.oop",
  inheritance: "py.oop",
  composition: "py.oop",
  polymorphism: "py.oop",
  "dunder-methods": "py.oop",
  properties: "py.oop",
  classmethod: "py.oop",
  staticmethod: "py.oop",
  super: "py.oop",
  mro: "py.oop",
  protocols: "py.oop",
  abc: "py.oop",
  "abstract-classes": "py.oop",
  encapsulation: "py.oop",
  solid: "py.oop",
  "strategy-pattern": "py.oop",
  "design-patterns": "py.oop",
  "context-managers": "py.oop",

  dataclasses: "py.data-modeling",
  enums: "py.data-modeling",
  "data-modeling": "py.data-modeling",
  namedtuple: "py.data-modeling",

  exceptions: "py.errors",
  "try-except": "py.errors",
  tracebacks: "py.errors",
  "error-handling": "py.errors",
  debugging: "py.errors",
  tracing: "py.errors",
  raising: "py.errors",

  files: "py.io-and-files",
  "file-io": "py.io-and-files",
  json: "py.io-and-files",
  csv: "py.io-and-files",
  pathlib: "py.io-and-files",
  paths: "py.io-and-files",
  serialization: "py.io-and-files",

  modules: "py.modules-and-packaging",
  imports: "py.modules-and-packaging",
  packages: "py.modules-and-packaging",
  packaging: "py.modules-and-packaging",
  uv: "py.modules-and-packaging",
  pyproject: "py.modules-and-packaging",
  venv: "py.modules-and-packaging",
  pip: "py.modules-and-packaging",
  "project-structure": "py.modules-and-packaging",
  "twelve-factor": "py.modules-and-packaging",
  configuration: "py.modules-and-packaging",

  "type-hints": "py.typing",
  typing: "py.typing",
  annotations: "py.typing",
  mypy: "py.typing",
  generics: "py.typing",
  optional: "py.typing",

  testing: "py.testing",
  pytest: "py.testing",
  tdd: "py.testing",
  fixtures: "py.testing",
  mocking: "py.testing",
  assertions: "py.testing",
  verification: "py.testing",
  "test-design": "py.testing",
  coverage: "py.testing",
  parametrize: "py.testing",

  regex: "py.regex",
  re: "py.regex",
  "pattern-matching": "py.regex",
  // `match`/`case` is structural pattern matching and belongs with control flow, not
  // with regular expressions. Spelled out because the bare "pattern-matching" tag above
  // reads as if it would cover it, and filing a match statement under regex would be
  // wrong in a way nobody would notice from the chip.
  "structural-pattern-matching": "py.control-flow",

  logging: "py.logging",
  "structured-logging": "py.logging",
  observability: "py.logging",

  cli: "py.cli",
  argparse: "py.cli",
  typer: "py.cli",
  "sys-argv": "py.cli",

  http: "py.http-and-apis",
  httpx: "py.http-and-apis",
  rest: "py.http-and-apis",
  apis: "py.http-and-apis",
  pydantic: "py.http-and-apis",
  validation: "py.http-and-apis",
  requests: "py.http-and-apis",

  concurrency: "py.concurrency",
  threading: "py.concurrency",
  asyncio: "py.concurrency",
  async: "py.concurrency",
  await: "py.concurrency",
  gil: "py.concurrency",
  multiprocessing: "py.concurrency",
  parallelism: "py.concurrency",

  performance: "py.performance",
  profiling: "py.performance",
  caching: "py.performance",
  complexity: "py.performance",
  "big-o": "py.performance",
  optimization: "py.performance",
  "lru-cache": "py.performance",

  metaprogramming: "py.metaprogramming",
  descriptors: "py.metaprogramming",
  metaclasses: "py.metaprogramming",
  reflection: "py.metaprogramming",

  ruff: "py.tooling",
  linting: "py.tooling",
  tooling: "py.tooling",
  formatting_tools: "py.tooling",
  "pre-commit": "py.tooling",

  "code-review": "py.code-review",
  judgment: "py.code-review",
  communication: "py.code-review",
  "performance-review": "py.code-review",
  "defensive-programming": "py.code-review",
  "api-verification": "py.testing",
  "api-integration": "py.http-and-apis",
  "input-validation": "py.http-and-apis",
  "json-parsing": "py.io-and-files",
  "stdlib-semantics": "py.modules-and-packaging",
  reliability: "py.errors",
  retries: "py.errors",
  "code-reading": "py.code-review",
  "ai-collaboration": "py.code-review",
  "reviewing-generated-code": "py.code-review",
  "edge-cases": "py.code-review",
  specification: "py.code-review",
  "failure-modes": "py.code-review",

  // ---- the authored long tail ----
  // Every one of these appeared once or twice in the shipped tree. They are the reason
  // the free-form field could not serve as an analysis key, and folding them in is the
  // whole job of this table.
  assignment: "py.values-and-types",
  comparisons: "py.values-and-types",
  "boolean-logic": "py.values-and-types",
  "floor-division": "py.values-and-types",
  modulo: "py.values-and-types",
  "is-operator": "py.values-and-types",

  parsing: "py.strings",

  append: "py.sequences",
  len: "py.sequences",

  "dict-items": "py.mappings-and-sets",
  "key-value": "py.mappings-and-sets",
  get: "py.mappings-and-sets",
  merge: "py.mappings-and-sets",

  for: "py.control-flow",
  accumulator: "py.control-flow",

  "default-arguments": "py.functions",
  "default-parameters": "py.functions",
  map: "py.functions",

  "base-case": "py.recursion",
  filtering: "py.comprehensions",

  attributes: "py.oop",
  "class-attributes": "py.oop",
  "context-manager": "py.oop",
  dispatch: "py.oop",
  eq: "py.oop",
  "factory-pattern": "py.oop",
  init: "py.oop",
  interfaces: "py.oop",
  methods: "py.oop",
  property: "py.oop",
  self: "py.oop",
  design: "py.oop",

  errors: "py.errors",
  bisection: "py.errors",
  "minimal-reproduction": "py.errors",
  "minimal-change": "py.code-review",
  "custom-exceptions": "py.errors",
  "error-boundaries": "py.errors",
  raise: "py.errors",
  robustness: "py.errors",

  io: "py.io-and-files",
  print: "py.io-and-files",

  "standard-library": "py.modules-and-packaging",
  secrets: "py.modules-and-packaging",
  capstone: "py.modules-and-packaging",

  "boundary-analysis": "py.testing",
  invariants: "py.testing",
  "property-testing": "py.testing",
  "regression-tests": "py.testing",
  "differential-testing": "py.testing",
  "brute-force": "py.testing",

  findall: "py.regex",
  sub: "py.regex",

  commands: "py.cli",
  "data-boundary": "py.http-and-apis",

  "async-await": "py.concurrency",
  coroutines: "py.concurrency",
  "concurrent-futures": "py.concurrency",

  // Choosing a structure for its cost profile is the performance lesson, not a
  // collections lesson: it is where Big-O is taught.
  "data-structures": "py.performance",

  // Naming and commenting are how code communicates to the next reader, which is the
  // same competence the review lessons assess.
  naming: "py.code-review",
  comments: "py.code-review",
}

/** Lowercase, and collapse spaces/underscores to hyphens, so synonyms resolve. */
function canonicalKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
}

/** The canonical component for one authored skill string, or null if unmapped. */
export function toKnowledgeComponent(skill: string): KnowledgeComponent | null {
  return SKILL_TO_KC[canonicalKey(skill)] ?? null
}

/**
 * Canonical components for a lesson's authored skills, de-duplicated and stable-ordered.
 * Unmapped skills are dropped from the RESULT (they would be noise as an analysis key)
 * but the raw `skills` array is persisted alongside, so nothing is actually lost.
 */
export function toKnowledgeComponents(skills: string[] | undefined): KnowledgeComponent[] {
  if (!skills?.length) return []
  const seen = new Set<KnowledgeComponent>()
  for (const skill of skills) {
    const kc = toKnowledgeComponent(skill)
    if (kc) seen.add(kc)
  }
  return [...seen].sort()
}

/** Authored skills with no canonical mapping. Powers the vocabulary-coverage test. */
export function unmappedSkills(skills: string[]): string[] {
  return [...new Set(skills.filter((skill) => !toKnowledgeComponent(skill)))].sort()
}
