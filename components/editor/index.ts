// CodeMirror 6 Editor - Replacing Monaco for better performance and smaller bundle size
export {
  CodeMirrorEditor,
  CodeMirrorErrorBoundary,
  EDITOR_OPTIONS,
  cleanupOrphanedModels,
} from "./CodeMirrorEditor"
export type { CodeMirrorEditorProps, CodeMirrorEditorRef } from "./CodeMirrorEditor"

/**
 * @deprecated Import `CodeMirrorEditor` instead.
 *
 * There is no Monaco in this repository: no `monaco-editor` dependency, no
 * `@monaco-editor/react`, nothing. This alias is a leftover from the migration
 * to CodeMirror 6 and it names a vendor we do not ship, which is how
 * "Web-based Monaco code editor" ended up on the paid pricing page as a feature
 * claim. Names that lie about what they are get believed by the next reader.
 *
 * Kept only because `components/CodeViewerSidePanel.tsx` still imports it.
 * Retire it when that import is updated; the two other Monaco aliases
 * (`MonacoErrorBoundary`, `MonacoEditorProps`) had zero consumers and are gone.
 */
export { CodeMirrorEditor as MonacoEditor } from "./CodeMirrorEditor"
