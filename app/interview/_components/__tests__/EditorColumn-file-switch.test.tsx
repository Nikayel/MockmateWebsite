/** @vitest-environment jsdom */
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { createRef, type ComponentProps } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { undo } from "@codemirror/commands"
import type { Scenario } from "@/lib/scenarios"
import { EditorColumn } from "../EditorColumn"

vi.mock("../LazyCodeMirrorEditor", async () => ({
  LazyCodeMirrorEditor: (await import("@/components/editor")).CodeMirrorEditor,
}))
vi.mock("../_sub/ConsoleOutput", () => ({ ConsoleOutput: () => null }))
vi.mock("../_sub/TestResultsPanel", () => ({ TestResultsPanel: () => null }))
vi.mock("../SparraPartnerWidget", () => ({ SparraPartnerWidget: () => null }))
vi.mock("@/components/GradingCriteria", () => ({ GradingCriteriaTooltip: () => null }))
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "dark" }) }))

afterEach(cleanup)

// jsdom has no text geometry; CodeMirror measures selection rectangles on animation frames.
beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
})

function buildProps(): ComponentProps<typeof EditorColumn> {
  const files = [
    { path: "cache_store.py", role: "editable" as const, content: "class CacheStore: pass" },
    { path: "log_reader.py", role: "editable" as const, content: "def read_events(path): pass" },
  ]
  return {
    activePanel: "editor",
    selectedScenario: {
      id: "cache-report",
      type: "bugfix",
      executionMode: "workspace",
      workspace: {
        language: "python",
        primaryFilePath: files[0].path,
        visibleTestPaths: [],
        files,
      },
    } as Scenario,
    activeWorkspaceFile: files[0],
    workspaceContext: files,
    selectedLanguage: "python",
    editorLanguage: "javascript",
    code: files[0].content,
    onCodeChange: vi.fn(),
    isInterviewStarted: true,
    showScenarioBrowser: false,
    showFeedback: false,
    showPostInterviewDiscussion: false,
    isActiveWorkspaceFileEditable: true,
    onStartInterview: vi.fn(),
    editorConsoleOutputs: [],
    testResults: [],
    testSummary: { total: 0, passed: 0, failed: 0, passRate: 0 },
    packRun: null,
    isRunningTests: false,
    onClearConsole: vi.fn(),
    onSubmitSystemDesign: vi.fn(),
    onRunCode: vi.fn(),
    onSubmitCode: vi.fn(),
    onSelectedLanguageChange: vi.fn(),
    isAIPartnerExpanded: false,
    onAIPartnerExpandedChange: vi.fn(),
    chatMessages: [],
    chatEndRef: createRef(),
    chatInput: "",
    onChatInputChange: vi.fn(),
    isLoadingChat: false,
    onSendPartnerMessage: vi.fn(),
    editorRef: createRef(),
  }
}

describe("workspace editor file isolation", () => {
  it("opens the selected file immediately after typing and cannot undo into another file", async () => {
    const props = buildProps()
    const { rerender } = render(<EditorColumn {...props} />)
    const ref = props.editorRef!
    await waitFor(() => expect(ref.current?.view).toBeTruthy())
    const storeView = ref.current!.view!
    const editedStore = "class CacheStore: # candidate edit\n    pass"
    act(() =>
      storeView.dispatch({
        changes: { from: 0, to: storeView.state.doc.length, insert: editedStore },
      })
    )
    expect(props.onCodeChange).toHaveBeenLastCalledWith(editedStore)

    const reader = props.workspaceContext![1]
    // A stale global buffer must never override the newly selected file.
    rerender(<EditorColumn {...props} activeWorkspaceFile={reader} code={editedStore} />)
    await waitFor(() => expect(ref.current?.view).not.toBe(storeView))
    const readerView = ref.current!.view!
    expect(readerView.state.doc.toString()).toBe(reader.content)
    act(() => {
      undo(readerView)
    })
    expect(readerView.state.doc.toString()).toBe(reader.content)
    // Opening a file is not an edit, and must not write the old buffer to it.
    expect(props.onCodeChange).toHaveBeenCalledTimes(1)

    const savedStore = { ...props.activeWorkspaceFile!, content: editedStore }
    rerender(<EditorColumn {...props} activeWorkspaceFile={savedStore} code={reader.content} />)
    await waitFor(() => expect(ref.current?.view?.state.doc.toString()).toBe(editedStore))
  })

  it("makes a reference file read-only when switching away from an editable file", async () => {
    const props = buildProps()
    const { rerender } = render(<EditorColumn {...props} />)
    await waitFor(() => expect(props.editorRef?.current?.view).toBeTruthy())
    const reference = { ...props.workspaceContext![1], role: "readonly" as const }
    rerender(
      <EditorColumn
        {...props}
        activeWorkspaceFile={reference}
        isActiveWorkspaceFileEditable={false}
      />
    )
    await waitFor(() => expect(props.editorRef?.current?.view?.state.readOnly).toBe(true))
    expect(props.editorRef?.current?.view?.state.doc.toString()).toBe(reference.content)
  })
})
