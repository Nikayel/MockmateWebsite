/**
 * The whitelisted arithmetic mini-grammar behind calc-widget output expressions.
 *
 * Specs are DATA: an output's `expr` is a string like
 * "ceil(dau * actions / 86400 * peak)" evaluated against the current input values.
 * This is an OWNED recursive-descent parser/evaluator (the council explicitly
 * rejected an expr-eval dependency): numbers, identifiers, + - * / ^ (right-assoc),
 * unary minus, parentheses, and a fixed function whitelist. Anything else fails AT
 * PARSE TIME with a readable message, which the calc schema surfaces as a spec
 * error — an authored typo can never throw in a renderer or, worse, eval anything.
 *
 * Deterministic by construction: no Date, no random, no ambient state.
 */

export type ExprAst =
  | { kind: "num"; value: number }
  | { kind: "ident"; name: string }
  | { kind: "unary"; op: "-"; operand: ExprAst }
  | { kind: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: ExprAst; right: ExprAst }
  | { kind: "call"; fn: string; args: ExprAst[] }

/** Function whitelist: name -> arity. */
const FUNCTIONS: Record<string, number> = {
  ceil: 1,
  floor: 1,
  round: 1,
  sqrt: 1,
  log10: 1,
  min: 2,
  max: 2,
  pow: 2,
}

type Token = { t: "num"; v: number } | { t: "ident"; v: string } | { t: "op"; v: string }

export type ExprParseResult =
  | { ok: true; ast: ExprAst; identifiers: string[] }
  | { ok: false; error: string }

function tokenize(source: string): Token[] | string {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/[0-9.]/.test(ch)) {
      const m = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(source.slice(i))
      if (!m) return `invalid number at position ${i}`
      tokens.push({ t: "num", v: Number(m[0]) })
      i += m[0].length
      continue
    }
    if (/[a-zA-Z_]/.test(ch)) {
      const m = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(source.slice(i))!
      tokens.push({ t: "ident", v: m[0] })
      i += m[0].length
      continue
    }
    if ("+-*/^(),".includes(ch)) {
      tokens.push({ t: "op", v: ch })
      i++
      continue
    }
    return `unexpected character "${ch}" at position ${i}`
  }
  return tokens
}

/** Parse an expression; collects the identifiers it references (function names excluded). */
export function parseExpr(source: string): ExprParseResult {
  const tokens = tokenize(source)
  if (typeof tokens === "string") return { ok: false, error: tokens }
  if (tokens.length === 0) return { ok: false, error: "empty expression" }

  let pos = 0
  const identifiers = new Set<string>()
  const peek = () => tokens[pos]
  const takeOp = (v: string) => {
    const tk = tokens[pos]
    if (tk && tk.t === "op" && tk.v === v) {
      pos++
      return true
    }
    return false
  }

  function parseExpression(): ExprAst | string {
    let left = parseTerm()
    if (typeof left === "string") return left
    for (;;) {
      if (takeOp("+")) {
        const right = parseTerm()
        if (typeof right === "string") return right
        left = { kind: "binary", op: "+", left, right }
      } else if (takeOp("-")) {
        const right = parseTerm()
        if (typeof right === "string") return right
        left = { kind: "binary", op: "-", left, right }
      } else break
    }
    return left
  }

  function parseTerm(): ExprAst | string {
    let left = parseFactor()
    if (typeof left === "string") return left
    for (;;) {
      if (takeOp("*")) {
        const right = parseFactor()
        if (typeof right === "string") return right
        left = { kind: "binary", op: "*", left, right }
      } else if (takeOp("/")) {
        const right = parseFactor()
        if (typeof right === "string") return right
        left = { kind: "binary", op: "/", left, right }
      } else break
    }
    return left
  }

  // factor := '-' factor | primary ('^' factor)?
  // Unary minus applies AFTER a power on its right (-2^2 is -(2^2) = -4, matching
  // convention), while an exponent may itself be negative (2^-3 works).
  function parseFactor(): ExprAst | string {
    if (takeOp("-")) {
      const operand = parseFactor()
      if (typeof operand === "string") return operand
      return { kind: "unary", op: "-", operand }
    }
    const base = parsePrimary()
    if (typeof base === "string") return base
    if (takeOp("^")) {
      const exponent = parseFactor()
      if (typeof exponent === "string") return exponent
      return { kind: "binary", op: "^", left: base, right: exponent }
    }
    return base
  }

  function parsePrimary(): ExprAst | string {
    const tk = peek()
    if (!tk) return "unexpected end of expression"
    if (tk.t === "num") {
      pos++
      return { kind: "num", value: tk.v }
    }
    if (tk.t === "ident") {
      pos++
      if (takeOp("(")) {
        const arity = FUNCTIONS[tk.v]
        if (arity === undefined) return `unknown function "${tk.v}"`
        const args: ExprAst[] = []
        if (!takeOp(")")) {
          for (;;) {
            const arg = parseExpression()
            if (typeof arg === "string") return arg
            args.push(arg)
            if (takeOp(",")) continue
            if (takeOp(")")) break
            return `expected "," or ")" in ${tk.v}(...)`
          }
        }
        if (args.length !== arity)
          return `${tk.v}() takes ${arity} argument${arity === 1 ? "" : "s"}, got ${args.length}`
        return { kind: "call", fn: tk.v, args }
      }
      identifiers.add(tk.v)
      return { kind: "ident", name: tk.v }
    }
    if (tk.t === "op" && tk.v === "(") {
      pos++
      const inner = parseExpression()
      if (typeof inner === "string") return inner
      if (!takeOp(")")) return 'missing closing ")"'
      return inner
    }
    return `unexpected "${tk.v}"`
  }

  const ast = parseExpression()
  if (typeof ast === "string") return { ok: false, error: ast }
  if (pos < tokens.length) {
    const leftover = tokens[pos]
    return {
      ok: false,
      error: `unexpected trailing "${leftover.t === "num" ? leftover.v : leftover.v}"`,
    }
  }
  return { ok: true, ast, identifiers: [...identifiers] }
}

/** Evaluate a parsed expression. Every identifier must exist in `env` (schema-guaranteed). */
export function evaluateExpr(ast: ExprAst, env: Record<string, number>): number {
  switch (ast.kind) {
    case "num":
      return ast.value
    case "ident": {
      const v = env[ast.name]
      return v === undefined ? NaN : v
    }
    case "unary":
      return -evaluateExpr(ast.operand, env)
    case "binary": {
      const l = evaluateExpr(ast.left, env)
      const r = evaluateExpr(ast.right, env)
      switch (ast.op) {
        case "+":
          return l + r
        case "-":
          return l - r
        case "*":
          return l * r
        case "/":
          return l / r
        case "^":
          return Math.pow(l, r)
      }
      break
    }
    case "call": {
      const args = ast.args.map((a) => evaluateExpr(a, env))
      switch (ast.fn) {
        case "ceil":
          return Math.ceil(args[0])
        case "floor":
          return Math.floor(args[0])
        case "round":
          return Math.round(args[0])
        case "sqrt":
          return Math.sqrt(args[0])
        case "log10":
          return Math.log10(args[0])
        case "min":
          return Math.min(args[0], args[1])
        case "max":
          return Math.max(args[0], args[1])
        case "pow":
          return Math.pow(args[0], args[1])
      }
    }
  }
  return NaN
}
