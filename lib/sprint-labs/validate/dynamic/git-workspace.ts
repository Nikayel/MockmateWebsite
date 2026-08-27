/**
 * The one real-`git`-process boundary for `lab validate --dynamic` (PLAN.md Task 7). Every other
 * module under `dynamic/` composes these primitives; none of them shells out to `git` directly.
 *
 * Per docs/sprint-labs/AGENT-CONTEXT.md §4 launch blocker 6 and EXECUTION-STATE.md's deviation D5,
 * a Sprint Labs workspace is provisioned by **`git init` + file copy, never a clone** (a workbook's
 * `repo/` seed is plain files, not a committed git repo — D5 confirms this even for the real
 * Meridian seed, and `workbooks/_fixture-workbook` has no `repo/` at all). This module mirrors that
 * exact provisioning shape for CI replay: `createGitWorkspace` does a real `git init` in a fresh
 * `mkdtemp` directory, `writeWorkspaceFiles` copies files onto disk, `commitAll` snapshots them —
 * never a `git clone`, never a copied `.git` directory. `provisioning.ts`'s fresh-workspace
 * git-object scan asserts this construction is exactly what it claims to be.
 *
 * `applyDiff` is the "real `git apply` in the temp dir" WORKBOOK-SPEC.md §6 requires. A critical,
 * empirically-verified detail (see task-7-report.md): `git apply` must run with the workspace
 * directory itself as `-C` — i.e., the directory git considers ITS OWN REPO ROOT (no subdirectory
 * prefix). Run from a subdirectory of some OTHER repo (no owned `.git`, so git walks up and finds an
 * ancestor repo), `git apply` silently treats every hunk as **out of the current prefix's cone** and
 * prints `Skipped patch '<path>'` while still exiting 0 — a silent no-op, not an error. Confirmed by
 * direct reproduction: the identical diff applied from a repo's OWN root applies cleanly; applied
 * from a prefixed subdirectory of any repo (including a fresh, otherwise-unrelated one), it is
 * silently skipped. `createGitWorkspace` therefore ALWAYS calls `git init` directly on the `mkdtemp`
 * directory (never a further subdirectory of it), so every `git apply` call here has an empty
 * prefix by construction.
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, sep } from "node:path"

import { isValidWorkspacePath } from "@/lib/workspace-execution/validators"

export interface GitWorkspace {
  /** Absolute path to the workspace's own repo root (always the `git init` target itself). */
  readonly dir: string
}

export interface MaterializedFile {
  path: string
  content: string
}

export interface ApplyDiffResult {
  applied: boolean
  /** stderr/stdout from a failed `git apply`, or the exception message, when `applied` is false. */
  error?: string
}

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "lab-validate",
  GIT_AUTHOR_EMAIL: "lab-validate@codesparring.local",
  GIT_COMMITTER_NAME: "lab-validate",
  GIT_COMMITTER_EMAIL: "lab-validate@codesparring.local",
}

function runGit(dir: string, args: string[]): string {
  return execFileSync("git", args, { cwd: dir, env: GIT_ENV, encoding: "utf8" })
}

/** Real `git init` in a fresh `mkdtemp` directory — never a clone, never a copied `.git`. */
export function createGitWorkspace(): GitWorkspace {
  const dir = mkdtempSync(join(tmpdir(), "lab-validate-"))
  runGit(dir, ["init", "-q"])
  runGit(dir, ["-c", "commit.gpgsign=false", "commit", "-q", "--allow-empty", "-m", "seed"])
  return { dir }
}

/** Writes every file to disk under the workspace root, creating parent directories as needed.
 *  Rejects a path that fails the shared workspace-path validator (absolute, `..`, empty segment,
 *  embedded NUL) the same way the browser runner does, rather than trusting authored content. */
export function writeWorkspaceFiles(ws: GitWorkspace, files: MaterializedFile[]): void {
  for (const file of files) {
    if (!isValidWorkspacePath(file.path)) {
      throw new Error(`Refusing to write an invalid workspace path: ${file.path}`)
    }
    const fullPath = join(ws.dir, file.path)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, file.content, "utf8")
  }
}

/** `git add -A && git commit`, snapshotting the working tree exactly as it stands. A no-op commit
 *  (nothing changed since the last one) is swallowed rather than thrown — callers commit after
 *  every step for a clean history, and a step that changed nothing (e.g. an empty seed) is not an
 *  error. */
export function commitAll(ws: GitWorkspace, message: string): void {
  runGit(ws.dir, ["add", "-A"])
  try {
    runGit(ws.dir, ["-c", "commit.gpgsign=false", "commit", "-q", "-m", message])
  } catch (error) {
    const text = errorText(error)
    if (!/nothing to commit/.test(text)) throw error
  }
}

function errorText(error: unknown): string {
  if (error && typeof error === "object") {
    const withBuffers = error as { stderr?: unknown; stdout?: unknown; message?: unknown }
    const stderr = Buffer.isBuffer(withBuffers.stderr) ? withBuffers.stderr.toString("utf8") : ""
    const stdout = Buffer.isBuffer(withBuffers.stdout) ? withBuffers.stdout.toString("utf8") : ""
    const combined = `${stderr}${stdout}`.trim()
    if (combined) return combined
    if (typeof withBuffers.message === "string") return withBuffers.message
  }
  return String(error)
}

/**
 * Applies a unified diff to the workspace via a real `git apply`, from the workspace's own repo
 * root (see this file's header for why that matters). The diff text is piped over stdin
 * (`git apply -`) rather than written to a file the workspace might itself try to track.
 *
 * Returns a structured result instead of throwing: a ticket whose `setup.diff`/`reference.diff`
 * fails to apply is a validation FINDING (`dynamic-diff-apply-failed` — see red-green.ts), not a
 * crash of the whole `lab validate` run.
 */
export function applyDiff(ws: GitWorkspace, diffText: string): ApplyDiffResult {
  try {
    execFileSync("git", ["apply", "--whitespace=nowarn", "-"], {
      cwd: ws.dir,
      env: GIT_ENV,
      input: diffText,
      encoding: "utf8",
      // A ticket whose diff fails to apply is an EXPECTED outcome this function reports as data
      // (see the doc comment above), not a crash -- without an explicit stdio override,
      // execFileSync still lets a failing child's stderr reach this process's own stderr, which
      // would spam plain "error: ... No such file or directory" lines into `lab validate`'s
      // output for every ticket a stub/gap legitimately produces one for. Piping stderr keeps it
      // out of the terminal; `errorText` below still reads it from the caught exception.
      stdio: ["pipe", "pipe", "pipe"],
    })
    return { applied: true }
  } catch (error) {
    return { applied: false, error: errorText(error) }
  }
}

/** Reads every tracked-or-not file back from disk (excluding `.git`), relative-path + content. */
export function readAllFiles(ws: GitWorkspace): MaterializedFile[] {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ws.dir,
    env: GIT_ENV,
    encoding: "utf8",
  })
  const paths = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return paths.map((relativePath) => ({
    path: relativePath.split(sep).join("/"),
    content: readFileSync(join(ws.dir, relativePath), "utf8"),
  }))
}

/** Runs `git cat-file --batch-all-objects --batch-check` and returns every blob's content as text —
 *  the provisioning fresh-workspace scan's own input (see provisioning.ts). A binary-looking blob
 *  (fails UTF-8 decode) is skipped rather than thrown, since it cannot contain a text signature
 *  anyway. */
export function readAllGitObjectBlobs(ws: GitWorkspace): string[] {
  const listing = execFileSync("git", ["cat-file", "--batch-all-objects", "--batch-check"], {
    cwd: ws.dir,
    env: GIT_ENV,
    encoding: "utf8",
  })

  const blobShas = listing
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => / blob /.test(line))
    .map((line) => line.split(" ")[0])
    .filter((sha): sha is string => Boolean(sha))

  return blobShas.flatMap((sha) => {
    try {
      return [
        execFileSync("git", ["cat-file", "-p", sha], {
          cwd: ws.dir,
          env: GIT_ENV,
          encoding: "utf8",
        }),
      ]
    } catch {
      return []
    }
  })
}

/** Best-effort recursive cleanup — call in a `finally`, never let a teardown failure mask the
 *  gate's own result. */
export function cleanupGitWorkspace(ws: GitWorkspace): void {
  rmSync(ws.dir, { recursive: true, force: true })
}

/** Path of `absolutePath` relative to the workspace root, POSIX-separated — used when reading a
 *  ticket's `tests/visible/**`/`tests/hidden/**` off disk (dynamic/hidden-tests.ts) so those paths
 *  compose with `readAllFiles`'s output using the same separator convention. */
export function toWorkspaceRelativePath(root: string, absolutePath: string): string {
  return relative(root, absolutePath).split(sep).join("/")
}
