/**
 * Illustrative preview content for the Python Path's sticky preview panel (HANDOFF §B).
 *
 * This is presentational — a faux code sample + audience line per level — NOT curriculum content.
 * Everything authoritative (lesson counts, time, topic chips) is still read live from the registry;
 * this module only supplies the syntax-highlighted "what this level feels like" sample.
 */
import { c, fn, k, num, p, s, type CodeLine } from "@/components/tutorials/CodeWindow"
import type { PythonLevelId } from "./types"

export interface LevelPreview {
  /** Filename shown in the faux window chrome. */
  filename: string
  /** Token-colored source lines. */
  sample: CodeLine[]
  /** One-line "who this is for". */
  audience: string
}

export const LEVEL_PREVIEWS: Record<PythonLevelId, LevelPreview> = {
  1: {
    filename: "foundations.py",
    audience: "New to Python, or coming from another language",
    sample: [
      [c("# variables, types, and a first function")],
      [k("def "), fn("to_fahrenheit"), p("(celsius):")],
      [p("    return celsius "), p("* "), num("9 "), p("/ "), num("5 "), p("+ "), num("32")],
      [],
      [p("temps "), p("= ["), num("0"), p(", "), num("20"), p(", "), num("37")],
      [p("for "), p("t "), k("in "), p("temps:")],
      [p("    "), fn("print"), p("(t, "), s('"→"'), p(", "), fn("to_fahrenheit"), p("(t))")],
    ],
  },
  2: {
    filename: "idioms.py",
    audience: "Know the basics — ready to write code, not just read it",
    sample: [
      [c("# read a concept, then write it yourself")],
      [k("def "), fn("normalize"), p("(name: "), fn("str"), p(") -> "), fn("str"), p(":")],
      [p("    return name."), fn("strip"), p("()."), fn("title"), p("()")],
      [],
      [c("# instant check on every run")],
      [k("assert "), fn("normalize"), p("("), s('"  ada  "'), p(") == "), s('"Ada"')],
    ],
  },
  3: {
    filename: "patterns.py",
    audience: "Comfortable writing functions, learning the idioms teams use",
    sample: [
      [k("from "), p("dataclasses "), k("import "), p("dataclass")],
      [],
      [p("@"), fn("dataclass")],
      [k("class "), fn("Order"), p(":")],
      [p("    id: "), fn("int")],
      [p("    total: "), fn("float")],
      [p("    paid: "), fn("bool"), p(" = "), k("False")],
      [],
      [
        p("due "),
        p("= ["),
        p("o "),
        k("for "),
        p("o "),
        k("in "),
        p("orders "),
        k("if not "),
        p("o.paid]"),
      ],
    ],
  },
  4: {
    filename: "billing/discounts.py",
    audience: "Ready to work like an engineer across real files, proven by tests",
    sample: [
      [k("from "), p(".pricing "), k("import "), p("apply_discount")],
      [],
      [k("def "), fn("checkout"), p("(cart, code):")],
      [
        p("    subtotal "),
        p("= "),
        fn("sum"),
        p("(i.price "),
        k("for "),
        p("i "),
        k("in "),
        p("cart)"),
      ],
      [p("    return "), fn("apply_discount"), p("(subtotal, code)")],
      [],
      [c("# tests/test_checkout.py proves it")],
      [k("assert "), fn("checkout"), p("(cart, "), s('"SAVE10"'), p(") == "), num("45.0")],
    ],
  },
}
