import { describe, expect, it } from "vitest"
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
})
