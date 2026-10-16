/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { MarkdownFileView } from "../MarkdownFileView"

afterEach(cleanup)

describe("Markdown reading mode", () => {
  it("uses the current source, renders GFM, and preserves code whitespace", async () => {
    const content =
      "# Instructions\n\n| Step | Command |\n| --- | --- |\n| Run | `python3 main.py` |\n\n    print('indented code')\n\n- [x] Read the task"
    const view = render(
      <MarkdownFileView fileName="README.MD" content={content}>
        <pre>Original source</pre>
      </MarkdownFileView>
    )
    fireEvent.click(screen.getByRole("button", { name: "Make readable" }))
    expect(await screen.findByRole("heading", { name: "Instructions" })).toBeTruthy()
    expect(screen.getByRole("table")).toBeTruthy()
    expect(screen.getByText("print('indented code')").closest("pre")).toBeTruthy()
    view.rerender(
      <MarkdownFileView fileName="README.MD" content="# Updated instructions">
        <pre>Changed source</pre>
      </MarkdownFileView>
    )
    expect(screen.getByRole("heading", { name: "Updated instructions" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "View source" }))
    expect(screen.getByText("Changed source")).toBeTruthy()
  })

  it("keeps non-Markdown files in the editor", () => {
    render(
      <MarkdownFileView fileName="src/main.py" content="# Python comment">
        <pre>Code editor</pre>
      </MarkdownFileView>
    )
    expect(screen.queryByRole("button", { name: "Make readable" })).toBeNull()
    expect(screen.getByText("Code editor")).toBeTruthy()
  })

  it("does not execute raw HTML or unsafe Markdown links", async () => {
    render(
      <MarkdownFileView
        fileName="task.markdown"
        content={
          "# Task\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))\n\n[Docs](https://example.com/docs)"
        }
      >
        <pre>Source</pre>
      </MarkdownFileView>
    )
    fireEvent.click(screen.getByRole("button", { name: "Make readable" }))
    const article = await screen.findByRole("article", { name: "task.markdown preview" })
    expect(article.querySelector("script")).toBeNull()
    expect(screen.getByText("Unsafe").getAttribute("href")).not.toContain("javascript:")
    expect(screen.getByRole("link", { name: "Docs" }).getAttribute("rel")).toBe(
      "noopener noreferrer"
    )
  })
})
