import { describe, expect, it } from "vitest"
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildPackOracleEntrypoint, decodePackStdout, parseRunCmd } from "../pack-oracle-runner"

describe("parseRunCmd", () => {
  it("drops the interpreter and yields script + argv", () => {
    expect(parseRunCmd("python3 src/main.py fixtures/input.txt")).toEqual({
      script: "src/main.py",
      argv: ["src/main.py", "fixtures/input.txt"],
    })
  })

  it("handles a bare script and no interpreter", () => {
    expect(parseRunCmd("main.py data.txt")).toEqual({
      script: "main.py",
      argv: ["main.py", "data.txt"],
    })
  })

  it("handles multiple arguments", () => {
    expect(parseRunCmd("python src/run.py a b c")).toEqual({
      script: "src/run.py",
      argv: ["src/run.py", "a", "b", "c"],
    })
  })
})

describe("buildPackOracleEntrypoint", () => {
  it("embeds the script and argv and prints the base64 stdout marker", () => {
    const entry = buildPackOracleEntrypoint("python3 src/main.py fixtures/input.txt")
    expect(entry).toContain("runpy.run_path(__pack_script, run_name='__main__')")
    expect(entry).toContain('"src/main.py"')
    expect(entry).toContain('["src/main.py","fixtures/input.txt"]')
    expect(entry).toContain("__PACK_STDOUT__:")
    expect(entry).toContain("contextlib.redirect_stdout")
  })

  it("resolves sibling imports like a normal Python script and restores interpreter state", () => {
    const root = mkdtempSync(join(tmpdir(), "pack-imports-"))
    try {
      mkdirSync(join(root, "src"))
      writeFileSync(join(root, "src/cache_store.py"), "def count():\n    return 2\n")
      writeFileSync(join(root, "src/main.py"), "from cache_store import count\nprint(count())\n")
      const entry = buildPackOracleEntrypoint("python3 src/main.py")
      const driver = `import sys
previous_path = list(sys.path)
previous_argv = sys.argv
${entry}
assert sys.path == previous_path, "wrapper leaked script import paths"
assert sys.argv is previous_argv, "wrapper leaked script arguments"
`
      const stdout = execFileSync("python3", ["-c", driver], {
        cwd: root,
        encoding: "utf8",
        timeout: 5000,
      })
      expect(decodePackStdout(stdout.split("\n"))).toBe("2\n")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("restores interpreter state when the learner's program raises", () => {
    const root = mkdtempSync(join(tmpdir(), "pack-crash-"))
    try {
      writeFileSync(join(root, "main.py"), 'raise ValueError("learner error")\n')
      const entry = buildPackOracleEntrypoint("python3 main.py fixture.txt")
      const driver = `import sys
previous_path = list(sys.path)
previous_argv = sys.argv
try:
${entry
  .split("\n")
  .map((line) => "    " + line)
  .join("\n")}
except ValueError:
    pass
assert sys.path == previous_path
assert sys.argv is previous_argv
print("restored")
`
      expect(
        execFileSync("python3", ["-c", driver], { cwd: root, encoding: "utf8", timeout: 5000 })
      ).toBe("restored\n")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("decodePackStdout", () => {
  it("round-trips exact bytes including newlines through base64", () => {
    const original = "=== Totals ===\nacme: 42\nglobex: 17\n"
    const enc = Buffer.from(original, "utf-8").toString("base64")
    const logs = ["some other log", `__PACK_STDOUT__:${enc}`]
    expect(decodePackStdout(logs)).toBe(original)
  })

  it("preserves unicode content", () => {
    const original = "café ✓\n"
    const enc = Buffer.from(original, "utf-8").toString("base64")
    expect(decodePackStdout([`__PACK_STDOUT__:${enc}`])).toBe(original)
  })

  it("returns null when no marker is present", () => {
    expect(decodePackStdout(["just logs", "no marker here"])).toBeNull()
  })

  it("preserves an empty-stdout run (empty string, not null)", () => {
    const enc = Buffer.from("", "utf-8").toString("base64")
    expect(decodePackStdout([`__PACK_STDOUT__:${enc}`])).toBe("")
  })

  it("takes the LAST marker so an earlier forged one cannot win", () => {
    // The wrapper prints its marker after the program finishes. A candidate who emits a
    // fake marker earlier (e.g. base64 of the expected output) must not forge a match.
    const forged = Buffer.from("acme: 42\n", "utf-8").toString("base64")
    const real = Buffer.from("acme: 7\n", "utf-8").toString("base64")
    const logs = [`__PACK_STDOUT__:${forged}`, "some program output", `__PACK_STDOUT__:${real}`]
    expect(decodePackStdout(logs)).toBe("acme: 7\n")
  })
})
