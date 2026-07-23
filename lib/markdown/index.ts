import remarkGfm from "remark-gfm"
import { remarkDetailsCards } from "./remark-details-cards"
import { remarkNoIndentedCode } from "./remark-no-indented-code"

export { preprocessAsciiArt } from "./ascii-preprocessor"
export { markdownComponents } from "./components"
export { remarkNoIndentedCode } from "./remark-no-indented-code"
export { remarkDetailsCards } from "./remark-details-cards"

/**
 * The canonical remark plugin list for lesson markdown. MarkdownRenderer and every
 * pipeline-replicating test import THIS instead of hand-assembling the array, so the
 * pipelines cannot drift. (MarkdownRenderer splices the lazily loaded math plugin in
 * before remarkNoIndentedCode when the content needs it.)
 */
export const lessonRemarkPlugins = [
  remarkGfm,
  remarkDetailsCards as unknown as typeof remarkGfm,
  remarkNoIndentedCode as unknown as typeof remarkGfm,
]
