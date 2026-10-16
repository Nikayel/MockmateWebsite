# Coding workspace design

The workspace gives reading, editing, running, and submitting the clearest emphasis. Desktop timer, focus, settings, and exit controls live in the interviewer header on the right. The language control stays beside the code in the editor header. When that panel is collapsed or hidden in focus mode, the editor header hosts those controls so the candidate can change settings or exit. Icon controls retain 44px targets and accessible names. Mobile keeps session controls above its panel navigation so settings and exit remain reachable from every panel. Occasional display controls live in Workspace settings. File resets live in Editor actions and use the existing reset handlers.

## Interaction contracts

- The left rail uses Problem and Sparra tabs. The code/chat icon and the accessible name identify the partner without an explanatory banner. Sable remains the interviewer on the right.
- Tabs support arrow-key navigation and explicit activation. Switching views preserves the problem's scroll/checklist state, conversation, and draft. Escape inside Sparra returns to the Problem tab and restores focus there. Editor Escape does not close the partner.
- The left rail remains collapsible and resizable. Workspace file navigation survives focus mode. Opening Sparra from focus mode restores the normal layout. A duplicate floating problem button is omitted when the brief is already visible.
- The console starts as a compact disclosure. Runs and new output open it; unrelated renders preserve a manual collapse. Restored results open immediately. The verdict remains visible when collapsed, including stdout-oracle mismatch/crash results. Clearing output collapses it.
- Run Tests and Submit Fix remain separate actions. Guided-lab test visibility, submission gating, execution, and scoring are unchanged.
- Debugging and feature tasks show a short, high-level goal, a run-before-editing instruction, and **Open task.md**. The task document owns the full assignment and completion criteria; README.md owns codebase context and system contracts. Neither the full narrative nor a second acceptance checklist appears in the introduction. The guided-lab rail remains available for BookClub.
- Mobile retains labeled Problem, Code, and Interview navigation. Settings and primary actions have 44px targets; menu controls remain available in both themes.
- Workspace files and tests require their scenario language. Display that language as fixed metadata with a lock and an explanation, rather than a disabled dropdown. Switchable problems use the same enabled language picker beside the code on desktop and mobile. The dropdown uses the shared Select primitive; its portal can fit the viewport without a nested settings submenu. Selecting a language updates the editor and saved preference through the shared `useEditorLanguageChange` handler.

## Color and implementation

`app/interview/workspace.css` owns the interview surface, text, border, action, status, editor, and syntax roles for both themes. Menus and dialogs apply the same scope through their portals. Surfaces are opaque and neutral, with clay reserved for action emphasis. File roles use labels/icons. Errors, warnings, and successful checks use semantic color plus text.

Conversation surfaces use a warm neutral canvas, opaque incoming bubbles, and a restrained clay tint for outgoing bubbles. Sender labels, left/right placement, spacing, and corner shape identify the speaker alongside color. Incoming/outgoing foreground and background roles live in the shared stylesheet. `ConversationMessage` applies the same treatment to Sable, Sparra, and the review discussion.

`InterviewerComposer` shows one idle action: a microphone for an empty draft, or Send for a typed draft. Only recording renders a voice transcript preview. A pending reply disables further submission and shows “Sable is replying” in the conversation; streaming replaces that wait indicator with the reply itself. The microphone has no request-loading or “Sending” state. Manual voice submission cancels the pre-send countdown before invoking the existing send handler. Recording retains explicit stop, cancel, and send controls, plus swipe cancellation. Delivery/read acknowledgements are not available in the client, so the UI makes no receipt claims.

LIVE indicators, persistent online/equalizer decoration, and submit-button glow are absent. The elapsed timer stays neutral; an actual strict deadline can use warning/error emphasis. Focus mode keeps controls at full opacity. Motion is reserved for interaction or meaningful work, with the existing reduced-motion support retained.

`ProblemPartnerPanel`, `WorkspaceMenu`, `EditorActionsMenu`, and `MobileWorkspaceNav` own their respective controls. `ConsoleHeader` separates disclosure/status controls from output rendering. `WorkspaceTaskBrief` owns the compact introduction. `withWorkspaceTaskDocument` derives complete task documents from existing public scenario fields for the older bug fixes and feature tasks; Python packs retain their authored task.md. Editor chrome lives in `components/editor/editor-theme.ts`; the syntax palette stays in CSS. Grading help reuses the existing criterion descriptions without presenting generic percentages as scenario-specific scoring weights.

## Design basis

- [Apple: Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) recommends choosing commands deliberately to avoid overcrowding and prioritizing frequently used controls.
- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supports moving occasional options behind a clear, predictable entry point while keeping frequent tasks direct.
- [Material: Color roles](https://m3.material.io/styles/color/the-color-system) distinguishes neutral surface roles from emphasis and error roles, implemented through shared tokens.
- [NN/g: Visual-design principles](https://www.nngroup.com/articles/principles-visual-design/) describes contrast, hierarchy, and proximity as tools for distinguishing functions and grouping related elements. This informs grouping commands inside panel headers and giving conversation turns a clear visual rhythm.
- [NN/g: Visibility of system status](https://www.nngroup.com/articles/visibility-system-status/) supports immediate feedback that describes the current activity. [WhatsApp's receipts](https://faq.whatsapp.com/665923838265756/) distinguish sending, delivery, and reading, while its [voice-message design](https://blog.whatsapp.com/making-voice-messages-better) separates recording and draft review from sending. We apply that state separation to capture, submission, and reply preparation.
- [WCAG: Contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) specifies 4.5:1 for ordinary text. [Use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) requires another means of conveying meaning.

The particular neutral/clay palette is a product design choice. These sources support the hierarchy and accessibility constraints; they do not prove a particular hue looks prestigious or lowers anxiety. The redesign has not yet been measured in a user study.

## Verification

`playwright.interview-review.config.ts` renders the real workspace/review components and CodeMirror. Local fixture callbacks simulate chat replies, reset operations, and runner output without accounts or paid AI calls.

Browser coverage includes both themes at 1440×900, 375×812, and 812×375; interviewer-header bounds at 1024, 1280, and 1440px; controls remaining reachable through focus and collapse; desktop keyboard and mobile direct-picker language changes; fixed workspace language metadata; tab keyboard interaction and retained state; file navigation; reset scope; settings and dialog focus; console reruns; submit through review/feedback; and foreground, muted text, primary action, code comment, error, warning, success, and conversation contrast pairs. The actual microphone hover state is checked for contrast. Delayed reply and voice-cancel/send fixtures exercise composer recovery, streaming, and a single send action.

Focused Vitest coverage checks the submitted-message microphone regression, typed-draft duplication, voice-countdown cancellation, initial/streaming reply states, console disclosure, partner form guards, theme direction, and voice fallback. TypeScript and focused ESLint are also checked.

## Debugging discovery and repository documents

The debugging picker combines track context and discovery controls in one panel. A short description, inline progress, search, result count, type filters, advanced-filter disclosure, and Cards/List switch share the same container. The switch has no separate row outside the panel and stays available for empty results. It shares a stored density preference with the result list through `useScenarioDensity`; the list retains its own progressive reveal. DSA's all-problems view reuses the same controls.

The Beta label sits beside the track title, with a quiet note explaining that we are working with recruiters to align the interviews with industry standards. It appears only before choosing a debugging problem. It does not claim certification or endorsement. Search and type selections are shown by their existing controls rather than repeated in a badge row. Collapsing advanced filters retains removable difficulty, language, and company selections.

This grouping applies [NN/g's proximity principle](https://www.nngroup.com/articles/gestalt-proximity/) and Apple's toolbar guidance: controls for the same task stay together, with secondary options disclosed on demand. The specific layout is a design judgment, not a measured claim about cognitive-load reduction. Discovery controls wrap on narrow screens, retain 44px targets, and use the existing semantic color tokens.

A dismissible release banner highlights the updated four-file Python cache incident. Viewing it filters the existing catalog to that question and focuses the results; starting remains a separate action with the existing entitlement checks. Dismissal is versioned and remembered in browser storage. Active filters hide the banner.

Repository `.md`, `.markdown`, and `.mdown` files offer **Make readable / View source** in both the workspace and uploaded-file viewer. The shared reading mode lazy-loads a plain GitHub-flavored Markdown renderer, preserves the current source, and uses semantic theme colors, 16px prose, a bounded reading width, and local scrolling for tables and code. Raw HTML is skipped and Markdown URLs retain the parser's safe URL handling. Lesson widgets and lesson-only source transformations are intentionally excluded from repository documents.

**Open task.md** selects the workspace document directly in readable mode and reveals the Code panel on mobile. It is available in focus mode and before starting the interview. Source edits remain in the workspace when opening or leaving the document. Older saved workspaces receive a missing public task document on demand without replacing their saved files. The full problem statement and assessment requirements remain available to interviewer/scoring consumers; the shorter task changes candidate-facing orientation only. All 28 debugging-track scenarios have a visible, read-only task.md. The four feature documents include their structured requirements and acceptance criteria, which previously lacked a full document surface.

Verification covers the catalog action and persistent dismissal, debugging-only Beta copy, integrated controls, keyboard selection, stored Cards/List preference, search and filter recovery, DSA progressive reveal, Markdown rendering and source restoration, GFM tables and indented code, unsafe HTML/links, and desktop/mobile layouts in both themes.
