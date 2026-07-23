/**
 * Whitelisted `<details>/<summary>` support for lesson markdown — the accordion
 * pattern for reference-sheet lessons (INTERACTIVITY-PLAN.md, Iteration 3).
 *
 * MarkdownRenderer deliberately does NOT enable raw HTML (no rehype-raw): lesson
 * markdown shares the pipeline with other surfaces, and general raw-HTML rendering
 * would widen the trust boundary. Instead this remark transform recognizes EXACTLY
 * one authored shape and rewrites it into a custom `details-card` element that
 * `markdownComponents` renders as a native <details>/<summary> card:
 *
 *     <details>
 *     <summary>Card title</summary>
 *
 *     Any markdown body (lists, tables, paragraphs)...
 *
 *     </details>
 *
 * Authoring rules the shape depends on: the opening `<details>` and its
 * `<summary>…</summary>` sit together at the start of an HTML block (blank line
 * AFTER the summary), the body is ordinary markdown, and `</details>` sits alone
 * after a blank line. Anything else (nesting, attributes, inline body on the open
 * block) is left untouched, which react-markdown then skips as raw HTML — visible
 * immediately in review rather than half-rendering.
 *
 * Types are declared locally because `unified`/`mdast` are transitive (non-hoisted)
 * dependencies and cannot be imported directly under pnpm (same convention as
 * remark-no-indented-code).
 */

interface MdNode {
  type: string
  value?: string
  children?: MdNode[]
  data?: {
    hName?: string
    hProperties?: Record<string, unknown>
  }
}

interface RootLike {
  type: "root"
  children: MdNode[]
}

/** `<details>` + `<summary>Title</summary>` as one HTML block (title captured). */
const OPEN = /^<details>\s*\n?\s*<summary>([\s\S]+?)<\/summary>\s*$/
const CLOSE = /^<\/details>\s*$/

export function remarkDetailsCards() {
  return (tree: RootLike): void => {
    const out: MdNode[] = []
    const nodes = tree.children
    let i = 0
    while (i < nodes.length) {
      const node = nodes[i]
      const openMatch = node.type === "html" && node.value ? OPEN.exec(node.value) : null
      if (!openMatch) {
        out.push(node)
        i++
        continue
      }
      // Find the matching close among the following siblings.
      let closeIndex = -1
      for (let j = i + 1; j < nodes.length; j++) {
        const candidate = nodes[j]
        if (candidate.type === "html" && candidate.value && CLOSE.test(candidate.value)) {
          closeIndex = j
          break
        }
        // A second open before a close means a malformed/nested block: bail on this one.
        if (candidate.type === "html" && candidate.value && OPEN.test(candidate.value)) break
      }
      if (closeIndex === -1) {
        // Unclosed: leave everything untouched (renders as skipped HTML, caught in review).
        out.push(node)
        i++
        continue
      }
      out.push({
        type: "detailsCard",
        data: { hName: "details-card", hProperties: { title: openMatch[1].trim() } },
        children: nodes.slice(i + 1, closeIndex),
      })
      i = closeIndex + 1
    }
    tree.children = out
  }
}
