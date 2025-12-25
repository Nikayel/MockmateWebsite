// CodeMirror 6 Editor - Replacing Monaco for better performance and smaller bundle size
export {
  CodeMirrorEditor,
  CodeMirrorErrorBoundary,
  EDITOR_OPTIONS,
  cleanupOrphanedModels
} from "./CodeMirrorEditor"
export type { CodeMirrorEditorProps } from "./CodeMirrorEditor"

// Backwards compatibility aliases
export { CodeMirrorEditor as MonacoEditor } from "./CodeMirrorEditor"
export { CodeMirrorErrorBoundary as MonacoErrorBoundary } from "./CodeMirrorEditor"
export type { CodeMirrorEditorProps as MonacoEditorProps } from "./CodeMirrorEditor"
