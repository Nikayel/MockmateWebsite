import { EditorView } from "@codemirror/view"

// Workspace roles override the chrome; other editor surfaces retain their defaults.
const EDITOR_FONT = '"Fira Code", "Consolas", "Monaco", monospace'

export const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--workspace-editor-bg, #1e1d1b)",
      color: "var(--workspace-editor-fg, #ece9e1)",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "var(--workspace-editor-fg, #ece9e1)",
      fontFamily: EDITOR_FONT,
      fontSize: "14px",
      lineHeight: "22px",
      padding: "8px 0",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--workspace-editor-fg, #ece9e1)",
      borderLeftWidth: "2px",
    },
    ".cm-activeLine": { backgroundColor: "transparent" },
    "&.cm-focused .cm-activeLine": {
      backgroundColor: "var(--workspace-editor-active, rgba(255, 255, 255, 0.035))",
    },
    ".cm-gutters": {
      backgroundColor: "var(--workspace-editor-gutter, #1a1917)",
      color: "var(--workspace-editor-line-number, #6a675f)",
      border: "none",
      borderRight: "1px solid rgba(255, 255, 255, 0.06)",
      paddingRight: "8px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--workspace-editor-active, rgba(255, 255, 255, 0.035))",
    },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "3ch", padding: "0 8px 0 0" },
    ".cm-scroller": { overflow: "auto", fontFamily: EDITOR_FONT },
    ".cm-selectionBackground": {
      backgroundColor: "var(--workspace-editor-selection, rgba(196, 112, 63, 0.20)) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "var(--workspace-editor-selection, rgba(196, 112, 63, 0.30)) !important",
    },
    ".cm-matchingBracket": { backgroundColor: "rgba(196, 112, 63, 0.30)", outline: "none" },
    ".cm-searchMatch": { backgroundColor: "rgba(76, 199, 155, 0.22)" },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(196, 112, 63, 0.38)",
    },
  },
  { dark: true }
)

export const lightTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--workspace-editor-bg, #f8f7f3)",
      color: "var(--workspace-editor-fg, #292824)",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "var(--workspace-editor-fg, #292824)",
      fontFamily: EDITOR_FONT,
      fontSize: "14px",
      lineHeight: "22px",
      padding: "8px 0",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--workspace-editor-fg, #292824)",
      borderLeftWidth: "2px",
    },
    ".cm-activeLine": { backgroundColor: "transparent" },
    "&.cm-focused .cm-activeLine": {
      backgroundColor: "var(--workspace-editor-active, rgba(196, 112, 63, 0.06))",
    },
    ".cm-gutters": {
      backgroundColor: "var(--workspace-editor-gutter, #f3f2ee)",
      color: "var(--workspace-editor-line-number, #a8a49c)",
      border: "none",
      borderRight: "1px solid rgba(0, 0, 0, 0.06)",
      paddingRight: "8px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--workspace-editor-active, rgba(196, 112, 63, 0.06))",
    },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "3ch", padding: "0 8px 0 0" },
    ".cm-scroller": { overflow: "auto", fontFamily: EDITOR_FONT },
    ".cm-selectionBackground": {
      backgroundColor: "var(--workspace-editor-selection, rgba(196, 112, 63, 0.16)) !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "var(--workspace-editor-selection, rgba(196, 112, 63, 0.24)) !important",
    },
    ".cm-matchingBracket": { backgroundColor: "rgba(196, 112, 63, 0.22)", outline: "none" },
    ".cm-searchMatch": { backgroundColor: "rgba(29, 158, 117, 0.18)" },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(196, 112, 63, 0.30)",
    },
  },
  { dark: false }
)
