"use client"

import nextDynamic from "next/dynamic"
import { forwardRef } from "react"
import type { CodeMirrorEditorProps, CodeMirrorEditorRef } from "@/components/editor"

/**
 * Code-split wrapper around {@link CodeMirrorEditor}.
 *
 * CodeMirror plus its base grammar is a ~312 KB chunk. The /interview initial
 * view is the scenario browser, and the editor is only mounted once a scenario
 * is selected, so we load it via `next/dynamic` with `ssr: false` to keep that
 * chunk out of the page's critical bundle. The surrounding Card frame in
 * `EditorColumn` stays eager and acts as the skeleton; a full-height muted
 * placeholder fills the editor box while the chunk resolves, so nothing shifts.
 *
 * The imperative `CodeMirrorEditorRef` handle (view + gotoLine) is preserved.
 * React 19 passes `ref` as a normal prop, so `next/dynamic`'s loadable spreads it
 * onto the underlying `React.lazy` component, which forwards it to the
 * `memo(forwardRef)` editor. The explicit `forwardRef` here keeps this a fully
 * typed, drop-in replacement for `CodeMirrorEditor` at the call site.
 */
const DynamicCodeMirrorEditor = nextDynamic(
  () => import("@/components/editor").then((mod) => mod.CodeMirrorEditor),
  {
    ssr: false,
    loading: () => <div className="bg-muted/20 h-full w-full animate-pulse" aria-hidden="true" />,
  }
)

export const LazyCodeMirrorEditor = forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(
  function LazyCodeMirrorEditor(props, ref) {
    return <DynamicCodeMirrorEditor {...props} ref={ref} />
  }
)
