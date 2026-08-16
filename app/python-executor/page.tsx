import Link from "next/link"

import { PythonExecutorWorkspace } from "@/components/tutorials/PythonExecutorWorkspace"

/**
 * `/python-executor` — the free browser Python scratchpad, plus the copy that explains it.
 *
 * ## Why this route has prose at all
 *
 * The whole tool is a client-side editor, so the HTML a crawler receives carried 72 visible
 * characters: a breadcrumb, two panel labels, and the word "Run". `pnpm seo:audit` failed the build
 * on it (THIN_CONTENT, 200-character floor) and it was right to. A submitted URL whose served bytes
 * say nothing about the page is a URL an index drops, and this one is submitted in `app/sitemap.ts`
 * deliberately, alongside `/rounds`, `/labs` and `/referral-terms`.
 *
 * The alternative was `robots: index:false` plus removal from the sitemap, which is what
 * `app/interview/layout.tsx` does for the live interview shell. That is the right call for a surface
 * with nothing to say. It is the wrong call here: a free Python runtime that needs no account is a
 * real thing to land on, and the four paragraphs below are facts about it that a visitor genuinely
 * wants (no sign-in, runs locally, first run downloads a runtime, no pip).
 *
 * ## The shape, and what it must not break
 *
 * `PythonExecutorWorkspace` is exactly one viewport tall and does not scroll inside itself. That is
 * a deliberate UX decision and it survives: the prose sits BELOW the tool in normal document flow,
 * so the first screen is unchanged and a reader reaches the copy only by scrolling past it.
 *
 * Two constraints on anything edited here:
 *
 *  - `<main>` must enclose both halves. The audit measures the first `<main>` in the document, and
 *    when the tool owned that element the prose would not have counted no matter where it sat.
 *  - Exactly one `<h1>`, and it is the screen-reader-only one inside the tool. Headings down here
 *    start at `<h2>`. Two `<h1>`s is its own audit failure.
 */
export default function PythonExecutorPage() {
  return (
    <main>
      <PythonExecutorWorkspace />

      <section className="border-border bg-background border-t">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="font-heading text-foreground text-2xl font-bold">
            About the Python Executor
          </h2>

          <div className="text-muted-foreground mt-4 space-y-4 leading-relaxed">
            <p>
              The Python Executor is a free scratchpad for running Python. There is no account to
              create, no sign-in wall, and no run limit. Type code in the editor, press Run, and
              read stdout, stderr, and the value of the last expression in the Output panel
              underneath.
            </p>
            <p>
              It runs in your browser, not on our servers. The runtime is{" "}
              <a
                href="https://pyodide.org/"
                rel="noopener noreferrer"
                target="_blank"
                className="text-accent-strong underline underline-offset-2"
              >
                Pyodide
              </a>
              , which is CPython 3.12 compiled to WebAssembly, loaded into a web worker on the page.
              Your code is executed on your own machine and is never sent anywhere. The first run of
              a session downloads the runtime once, which is why it takes a few seconds; every run
              after that starts immediately.
            </p>
            <p>
              The CPython standard library comes with it, so <code>json</code>, <code>re</code>,{" "}
              <code>collections</code>, <code>itertools</code>, <code>math</code> and the rest are
              importable. What is not available is anything outside the sandbox: no network sockets,
              no files from your disk, and no third-party packages installed with pip. Code that
              needs those belongs in a local interpreter.
            </p>
            <p>
              Your editor contents and both note panels are saved to your browser&apos;s local
              storage, so a reload keeps the work in front of you. If you want structured practice
              instead of a blank file, the{" "}
              <Link
                href="/learn/python"
                className="text-accent-strong underline underline-offset-2"
              >
                free Python course
              </Link>{" "}
              teaches the same runtime lesson by lesson, and the{" "}
              <Link href="/learn" className="text-accent-strong underline underline-offset-2">
                Learn hub
              </Link>{" "}
              lists the SQL, data engineering, and system design courses beside it.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
