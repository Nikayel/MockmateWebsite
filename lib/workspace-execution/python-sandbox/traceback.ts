import { PYTHON_WRAPPER_LINE_OFFSET } from "./dsa-wrapper"

/**
 * Rewrites a raw Pyodide traceback into the candidate's coordinate space.
 *
 * A DSA run executes the candidate's code inside a 70-line wrapper, through Pyodide's own
 * evaluator. When it throws, the raw traceback leads with frames the candidate cannot act
 * on — `/lib/python312.zip/_pyodide/_base.py` internals, then the wrapper's invocation
 * frame — and every line number is wrapper-shifted. The console once showed that text
 * nearly verbatim, so a one-character bug (`for course in numCourses:`) surfaced as
 * "Type Error on line 527" above four repeats of Pyodide's call stack.
 *
 * This keeps only frames in the candidate's own code: `File "<exec>"` frames whose
 * wrapper-adjusted line lands inside their file. Pyodide internals and wrapper frames are
 * dropped entirely. Indented source-echo/caret lines (SyntaxError context) survive only
 * under a kept frame, and the final exception line always survives — it is what
 * `isHarnessError` and the console's error-type buckets classify on.
 *
 * Fault attribution note: a traceback with NO surviving candidate frame is not proof of a
 * harness fault — "Exception: No callable function found" is the candidate's to fix — so
 * this function only reshapes text and never decides blame. `isHarnessError` stays the one
 * authority for that.
 *
 * Anything that is not a Python traceback (timeout notices, worker-boot failures, assert
 * messages) passes through untouched.
 */

const TRACEBACK_HEADER = "Traceback (most recent call last):"
const FRAME_LINE = /^\s*File "(.*?)", line (\d+)(?:, in (.*?))?\s*$/

export function sanitizePythonTraceback(raw: string, userCodeLineCount: number): string {
  if (!raw || !raw.includes('File "')) return raw

  const kept: string[] = []
  let keepingFrame = false
  let sawUserFrame = false

  for (const line of raw.split("\n")) {
    const frame = line.match(FRAME_LINE)
    if (frame) {
      const [, file, lineText, functionName] = frame
      const adjusted = parseInt(lineText, 10) - PYTHON_WRAPPER_LINE_OFFSET
      const isUserFrame = file === "<exec>" && adjusted >= 1 && adjusted <= userCodeLineCount
      keepingFrame = isUserFrame
      if (isUserFrame) {
        sawUserFrame = true
        kept.push(
          functionName && functionName !== "<module>"
            ? `  line ${adjusted}, in ${functionName}`
            : `  line ${adjusted}`
        )
      }
      continue
    }

    if (line.trim() === "" || line.startsWith(TRACEBACK_HEADER)) continue

    // Indented lines are source echo / carets belonging to the frame above them.
    if (/^\s/.test(line)) {
      if (keepingFrame) kept.push(line)
      continue
    }

    // Column-0 line: the exception message (or a chained-exception separator). Always kept.
    keepingFrame = false
    kept.push(line)
  }

  // Nothing recognizable survived — hand back the raw text rather than an empty string.
  if (kept.length === 0) return raw

  return sawUserFrame ? [TRACEBACK_HEADER, ...kept].join("\n") : kept.join("\n")
}
