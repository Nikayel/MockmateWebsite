/**
 * Guards a class of bug the reference-solution gate structurally cannot catch.
 *
 * `python-reference-solutions.test.ts` executes exercises against the HOST python3,
 * which has the full standard library and whatever is installed. Learners run against
 * Pyodide in a browser worker, which does not. `public/workers/python-sandbox-worker.js`
 * calls `loadPyodide()` and then `runPythonAsync` directly: it never calls
 * `loadPackage` or `loadPackagesFromImports`, which Pyodide has required explicitly
 * since 0.18. So anything not baked into `python_stdlib.zip` is simply absent.
 *
 * The failure mode is the worst shape available: an exercise importing `sqlite3` passes
 * CI green and then raises ModuleNotFoundError for every learner who opens the lesson.
 * Nothing else in the suite would notice.
 *
 * Verified empirically against pyodide 0.26.4 booted the same way the worker boots it:
 * sqlite3, numpy, and pandas all raise ModuleNotFoundError, while csv, json, io, and
 * dataclasses import fine.
 */
import { describe, it, expect } from "vitest"
import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"
import type { PythonExercise } from "../types"

/**
 * Modules that are NOT importable in the browser sandbox.
 *
 *  - `sqlite3`, `ssl`, `lzma`, `decimal`-adjacent C modules: shipped by Pyodide as
 *    "unvendored" stdlib, fetched on demand, and the worker never fetches.
 *  - everything else: third-party wheels, same story.
 *
 * A lesson may still TEACH these (the curriculum does teach sqlite3, numpy, and pandas,
 * with the real library shown in a plain ```python fence and the mechanic graded with a
 * pure-Python model). What it must not do is put the import in code that RUNS.
 */
const UNAVAILABLE_IN_PYODIDE = [
  "sqlite3",
  "ssl",
  "lzma",
  "numpy",
  "pandas",
  "scipy",
  "matplotlib",
  "requests",
  "httpx",
  "pydantic",
  "aiohttp",
  "bs4",
  "sklearn",
  "PIL",
  "typer",
  "flask",
  "django",
]

/** `import x`, `import x as y`, `from x import y`, `import a, x`. */
function importsIn(source: string): string[] {
  const found: string[] = []
  const importRe = /^[ \t]*import[ \t]+([A-Za-z0-9_. ,]+)/gm
  const fromRe = /^[ \t]*from[ \t]+([A-Za-z0-9_.]+)[ \t]+import/gm

  let match: RegExpExecArray | null
  while ((match = importRe.exec(source))) {
    for (const part of match[1].split(",")) {
      const root = part.trim().split(/[. ]/)[0]
      if (root) found.push(root)
    }
  }
  while ((match = fromRe.exec(source))) {
    const root = match[1].split(".")[0]
    if (root) found.push(root)
  }
  return found
}

/** Every string that is executed as Python by the learner's browser. */
function executableSources(): Array<{ where: string; source: string }> {
  const out: Array<{ where: string; source: string }> = []

  const addExercise = (lessonId: string, phase: string, exercise: PythonExercise) => {
    out.push({ where: `${lessonId} ${phase} starterCode`, source: exercise.starterCode ?? "" })
    if (exercise.referenceSolution) {
      out.push({
        where: `${lessonId} ${phase} referenceSolution`,
        source: exercise.referenceSolution,
      })
    }
    for (const file of exercise.workspace?.files ?? []) {
      if (file.path.endsWith(".py")) {
        out.push({ where: `${lessonId} ${phase} ${file.path}`, source: file.content })
      }
    }
    for (const file of exercise.workspace?.referenceFiles ?? []) {
      if (file.path.endsWith(".py")) {
        out.push({ where: `${lessonId} ${phase} ref:${file.path}`, source: file.content })
      }
    }
  }

  for (const level of PYTHON_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        // demoCode now RUNS: the teach panel renders it in an editable runner.
        if (lesson.teach.demoCode) {
          out.push({ where: `${lesson.id} teach demoCode`, source: lesson.teach.demoCode })
        }
        addExercise(lesson.id, "apply", lesson.apply)
        addExercise(lesson.id, "practice", lesson.practice)
        for (const [i, drill] of (lesson.extraPractice ?? []).entries()) {
          addExercise(lesson.id, `extraPractice[${i}]`, drill)
        }
      }
    }
  }
  return out
}

describe("Python exercises only import what the browser sandbox has", () => {
  it("never imports a module Pyodide cannot resolve", () => {
    const banned = new Set(UNAVAILABLE_IN_PYODIDE)
    const violations: string[] = []

    for (const { where, source } of executableSources()) {
      for (const moduleName of importsIn(source)) {
        if (banned.has(moduleName)) violations.push(`${where}: imports ${moduleName}`)
      }
    }

    // If this fails, the lesson will pass CI (host python3 has the module) and raise
    // ModuleNotFoundError for every learner. Teach the library in a plain ```python
    // fence instead, and grade a pure-Python model of the same mechanic.
    expect(violations).toEqual([])
  })

  it("detects the import forms authors actually write", () => {
    expect(importsIn("import sqlite3")).toContain("sqlite3")
    expect(importsIn("import numpy as np")).toContain("numpy")
    expect(importsIn("from pandas import DataFrame")).toContain("pandas")
    expect(importsIn("import os, sqlite3")).toContain("sqlite3")
    expect(importsIn("    import sqlite3")).toContain("sqlite3")
    expect(importsIn("from collections.abc import Iterable")).toContain("collections")
    // A mention inside prose or a string is not an import statement.
    expect(importsIn("# you would import sqlite3 here")).not.toContain("sqlite3")
  })
})
