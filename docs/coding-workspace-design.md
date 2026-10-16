# Coding workspace design

The workspace gives reading, editing, running, and submitting the clearest emphasis. Occasional display controls live in Workspace settings. File resets live in Editor actions and use the existing reset handlers.

## Interaction contracts

- The left rail uses Problem and Sparra tabs. The code/chat icon and the accessible name identify the partner without an explanatory banner. Sable remains the interviewer on the right.
- Tabs support arrow-key navigation and explicit activation. Switching views preserves the problem's scroll/checklist state, conversation, and draft. Escape inside Sparra returns to the Problem tab and restores focus there. Editor Escape does not close the partner.
- The left rail remains collapsible and resizable. Workspace file navigation survives focus mode. Opening Sparra from focus mode restores the normal layout. A duplicate floating problem button is omitted when the brief is already visible.
- The console starts as a compact disclosure. Runs and new output open it; unrelated renders preserve a manual collapse. Restored results open immediately. The verdict remains visible when collapsed, including stdout-oracle mismatch/crash results. Clearing output collapses it.
- Run Tests and Submit Fix remain separate actions. Guided-lab test visibility, submission gating, execution, and scoring are unchanged.
- The brief prioritizes the task, observed behavior, reproduction steps, and acceptance criteria. Incident details remain open by default because they contain constraints and context. Only an exact repeated scenario heading is removed; program and data-contract sections stay intact.
- Mobile retains labeled Problem, Code, and Interview navigation. Settings and primary actions have 44px targets; menu controls remain available in both themes.

## Color and implementation

`app/interview/workspace.css` owns the interview surface, text, border, action, status, editor, and syntax roles for both themes. Menus and dialogs apply the same scope through their portals. Surfaces are opaque and neutral, with clay reserved for action emphasis. File roles use labels/icons. Errors, warnings, and successful checks use semantic color plus text.

LIVE indicators, persistent online/equalizer decoration, colored chat backgrounds, and submit-button glow are absent. The elapsed timer stays neutral; an actual strict deadline can use warning/error emphasis. Focus mode keeps controls at full opacity. Motion is reserved for interaction or meaningful work, with the existing reduced-motion support retained.

`ProblemPartnerPanel`, `WorkspaceMenu`, `EditorActionsMenu`, and `MobileWorkspaceNav` own their respective controls. `ConsoleHeader` separates disclosure/status controls from output rendering. Brief evidence, details, and narrative extraction are grouped in `_sub/bugfix-brief/`. Editor chrome lives in `components/editor/editor-theme.ts`; the syntax palette stays in CSS. Grading help reuses the existing criterion descriptions without presenting generic percentages as scenario-specific scoring weights.

## Design basis

- [Apple: Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) recommends choosing commands deliberately to avoid overcrowding and prioritizing frequently used controls.
- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supports moving occasional options behind a clear, predictable entry point while keeping frequent tasks direct.
- [Material: Color roles](https://m3.material.io/styles/color/the-color-system) distinguishes neutral surface roles from emphasis and error roles, implemented through shared tokens.
- [WCAG: Contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) specifies 4.5:1 for ordinary text. [Use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) requires another means of conveying meaning.

The particular neutral/clay palette is a product design choice. These sources support the hierarchy and accessibility constraints; they do not prove a particular hue looks prestigious or lowers anxiety. The redesign has not yet been measured in a user study.

## Verification

`playwright.interview-review.config.ts` renders the real workspace/review components and CodeMirror. Local fixture callbacks simulate chat replies, reset operations, and runner output without accounts or paid AI calls.

Browser coverage includes both themes at 1440×900, 375×812, and 812×375; tab keyboard interaction and retained state; focus/collapse/file navigation; reset scope; settings and dialog focus; console reruns; submit through review/feedback; and foreground, muted text, primary action, code comment, error, warning, and success contrast pairs.

Focused Vitest coverage checks console disclosure and new-run recovery, partner form guards, narrative preservation, onboarding, theme direction, voice fallback, and the shared Sprint Labs workspace. TypeScript and focused ESLint are also checked.
