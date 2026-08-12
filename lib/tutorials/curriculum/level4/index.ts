/**
 * Level 4: Codebase (workspace). Senior-track depth across real files: advanced OOP, metaprogramming,
 * concurrency, performance, and production tooling.
 *
 * Authored by Agent 2 following the workspace authoring contract documented in `../level3/index.ts`:
 * every package dir needs an `__init__.py`; the runner (`role:"test"`, `hidden:true`) prints
 * `__WORKSPACE_TEST_RESULTS__:` + JSON. Workspace tests run real Python `assert`s (so floats are
 * compared exactly, so keep graded values integer or rounded). Each lesson pairs a single-file `apply`
 * warm-up with a multi-file `practice` challenge.
 */
import type { PythonLevel } from "../../types"
import { abcProtocolsLesson } from "./abc-protocols"
import { solidPatternsLesson } from "./solid-patterns"
import { decoratorsAdvancedLesson } from "./decorators-advanced"
import { descriptorsMetaclassesLesson } from "./descriptors-metaclasses"
import { concurrencyLesson } from "./concurrency"
import { asyncioLesson } from "./asyncio"
import { performanceLesson } from "./performance"
import { configLoggingLesson } from "./config-logging"
import { testingToolingLesson } from "./testing-tooling"
import { packagingCapstoneLesson } from "./packaging-capstone"

export const level4: PythonLevel = {
  id: 4,
  slug: "engineering",
  title: "Level 4: Engineering",
  tagline: "Advanced OOP, decorators, concurrency, async, profiling, and packaging.",
  defaultExecutionMode: "workspace",
  estimatedHours: 4,
  modules: [
    {
      id: "py-l4-advanced-oop",
      title: "Advanced OOP & Design Patterns",
      description: "Program to interfaces with ABCs/Protocols and apply SOLID patterns.",
      lessons: [abcProtocolsLesson, solidPatternsLesson],
    },
    {
      id: "py-l4-metaprogramming",
      title: "Decorators & Metaprogramming",
      description: "Parameterized decorators, descriptors, and how classes are created.",
      lessons: [decoratorsAdvancedLesson, descriptorsMetaclassesLesson],
    },
    {
      id: "py-l4-concurrency-async",
      title: "Concurrency & Async",
      description: "Parallelize with threads and run concurrent I/O with asyncio.",
      lessons: [concurrencyLesson, asyncioLesson],
    },
    {
      id: "py-l4-performance-production",
      title: "Performance & Production Practices",
      description: "Profile and cache hot paths, and load typed config with safe secret handling.",
      lessons: [performanceLesson, configLoggingLesson],
    },
    {
      id: "py-l4-quality-packaging",
      title: "Quality, Packaging & Capstone",
      description: "Mock dependencies, use modern tooling, and ship a typed, tested package.",
      lessons: [testingToolingLesson, packagingCapstoneLesson],
    },
  ],
}
