/**
 * The scope guard has to actually refuse a stray path, and has to stay invisible to a normal commit.
 *
 * Both halves matter. A guard that refuses nothing is the paragraph in the prompt that already
 * failed four times; a guard that fires on ordinary human commits gets disabled within a day.
 *
 * Each case runs the real hook against a throwaway git repo, because the thing under test is its
 * interaction with git's index, and a mocked index would prove nothing about that.
 */
import { execFileSync, execSync } from "node:child_process"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

const HOOK = join(__dirname, "..", "check-commit-scope.mjs")

let repo: string

function git(args: string, cwd = repo) {
  return execSync(`git ${args}`, { cwd, encoding: "utf8" })
}

/** Run the hook the way the pre-commit hook does. Returns {code, stderr}. */
function runHook(scope?: string): { code: number; stderr: string } {
  try {
    execFileSync("node", [HOOK], {
      cwd: repo,
      encoding: "utf8",
      env: { ...process.env, ...(scope === undefined ? {} : { CS_COMMIT_SCOPE: scope }) },
    })
    return { code: 0, stderr: "" }
  } catch (error) {
    const err = error as { status: number; stderr: string }
    return { code: err.status, stderr: err.stderr }
  }
}

function write(path: string, body: string) {
  const full = join(repo, path)
  mkdirSync(join(full, ".."), { recursive: true })
  writeFileSync(full, body)
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "scope-guard-"))
  git("init -q")
  git("config user.email test@example.com")
  git("config user.name Test")
  write("README.md", "seed\n")
  git("add README.md")
  git("-c commit.gpgsign=false commit -q -m seed")
})

afterEach(() => rmSync(repo, { recursive: true, force: true }))

describe("commit scope guard", () => {
  it("is inert when no scope is declared, so ordinary commits are untouched", () => {
    write("anything.ts", "x\n")
    git("add anything.ts")
    // The env var is absent entirely, which is every human commit in this repo.
    expect(runHook(undefined).code).toBe(0)
  })

  it("is inert when the scope is set but empty", () => {
    write("anything.ts", "x\n")
    git("add anything.ts")
    expect(runHook("").code).toBe(0)
  })

  it("allows a commit staged entirely inside its declared file", () => {
    write("lib/level7.ts", "mine\n")
    git("add lib/level7.ts")
    expect(runHook("lib/level7.ts").code).toBe(0)
  })

  it("refuses a sibling's file, which is the actual incident", () => {
    // The Level 5 agent staged level7.ts and the commit message said Level 5.
    write("lib/level5.ts", "mine\n")
    write("lib/level7.ts", "not mine\n")
    git("add lib/level5.ts lib/level7.ts")
    const { code, stderr } = runHook("lib/level5.ts")
    expect(code).toBe(1)
    expect(stderr).toContain("lib/level7.ts")
    expect(stderr).not.toContain("lib/level5.ts\n    lib/level5.ts")
  })

  it("tells you how to fix it without destroying the sibling's work", () => {
    // A guard that sends a panicking agent to `git checkout` is worse than no guard.
    write("lib/level5.ts", "mine\n")
    write("lib/level7.ts", "not mine\n")
    git("add lib/level5.ts lib/level7.ts")
    const { stderr } = runHook("lib/level5.ts")
    expect(stderr).toContain("git restore --staged")
    expect(stderr).toContain("Do NOT")
  })

  it("supports a directory scope with a trailing slash", () => {
    write("lib/curriculum/a.ts", "a\n")
    write("lib/curriculum/b.ts", "b\n")
    git("add lib/curriculum/a.ts lib/curriculum/b.ts")
    expect(runHook("lib/curriculum/").code).toBe(0)
  })

  it("does not let a directory scope leak to a sibling directory sharing a prefix", () => {
    // "lib/curriculum/" must not authorise "lib/curriculum-backup/".
    write("lib/curriculum/a.ts", "a\n")
    write("lib/curriculum-backup/a.ts", "a\n")
    git("add lib/curriculum/a.ts lib/curriculum-backup/a.ts")
    const { code, stderr } = runHook("lib/curriculum/")
    expect(code).toBe(1)
    expect(stderr).toContain("lib/curriculum-backup/a.ts")
  })

  it("supports several paths separated by a colon", () => {
    write("lib/level7.ts", "a\n")
    write("docs/notes.md", "b\n")
    git("add lib/level7.ts docs/notes.md")
    expect(runHook("lib/level7.ts:docs/").code).toBe(0)
  })

  it("catches a deletion outside the scope, not only an edit", () => {
    // `git add -A` sweeps deletions too, and a swept deletion is the most destructive version.
    write("lib/level5.ts", "mine\n")
    git("add lib/level5.ts")
    git("-c commit.gpgsign=false commit -q -m base")
    git("rm -q README.md")
    write("lib/level5.ts", "changed\n")
    git("add lib/level5.ts")
    const { code, stderr } = runHook("lib/level5.ts")
    expect(code).toBe(1)
    expect(stderr).toContain("README.md")
  })
})
