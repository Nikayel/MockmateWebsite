# CodeSparring — Bug Fix workspace redesign (developer handoff)

Goal: restyle the existing **Bug Fix / debugging interview workspace** (`/interview?...&scenario=bugfix-...`) to the premium CodeSparring system — warm charcoal + single clay accent, Geist + Geist Mono, glassy chrome, light/dark. **Visual/layout only. Do not change any behavior, data, grading, routes, or APIs.** Same panels, same content, same actions — just the look.

This builds on the token system in `HANDOFF.md` (§1–2). Read that first; this doc adds the workspace-specific surfaces, the syntax-highlight tokens, and the layout. The theme tokens + smooth crossfade transition from `HANDOFF.md` apply here unchanged.

The workspace **defaults to dark** (premium code-editor feel) with the same light/dark toggle as the rest of the app.

---

## 1. Workspace tokens (add to the theme)

These extend the base tokens with editor surfaces + syntax colors. Map onto your existing CSS-variable names; don't fork the system.

```css
/* dark (workspace default) */
.dark {
  --topbar:#1f1e1b; --rail:#1c1b18; --editor:#1b1a17;
  --panel:#232220;  --panel-2:#2a2926; --field:#201f1c;
  --border:#38362f; --line:rgba(236,233,225,.07);
  --foreground:#ece9e1; --muted:#b3afa4; --faint:#8a8780;
  --accent:#d0824f; --accent-soft:rgba(208,130,79,.14);
  --green:#5bbf99; --red:#e0917a; --glow:rgba(208,130,79,.4); --scroll:#454239;
  /* syntax */
  --kw:#d0824f; --str:#9cc89a; --com:#7d7a72; --fn:#e3c08a; --num:#d8a06a; --gutter:#615d54;
}
/* light */
:root {
  --topbar:#fdfcf9; --rail:#f6f5f1; --editor:#ffffff;
  --panel:#ffffff;  --panel-2:#eceae3; --field:#f4f2ec;
  --border:#e2dfd6; --line:rgba(38,36,31,.07);
  --foreground:#292824; --muted:#6c685f; --faint:#a8a39a;
  --accent:#c4703f; --accent-soft:#f5eee8;
  --green:#1d9e75; --red:#cf5a4e; --glow:rgba(196,112,63,.18); --scroll:#d0ccc2;
  /* syntax */
  --kw:#bd6a39; --str:#3a7d4e; --com:#a8a39a; --fn:#9a6a1f; --num:#9a6a1f; --gutter:#c2bdb2;
}
```

Fonts: body/UI = **Geist**; all code, the timer, line numbers, labels, and `code`-style inline tokens = **Geist Mono**.

---

## 2. Layout — 3 columns, fixed desktop proportions

The workspace is a full-height desktop tool. Structure:

```
root (h-screen, flex column, min-width:1180px)
├── header                      (h-56px, sticky, glassy)
└── body  grid: [272px | 1fr | 312px]   (flex:1, min-h:0)
    ├── Guided-lab rail   (272px, scroll-y)
    ├── Center (flex column, min-w:0)
    │   ├── tab/breadcrumb bar (h-42px)
    │   ├── editor row (flex:1): [file tree 196px | code 1fr, overflow:auto]
    │   ├── console (h-150px)
    │   └── action bar (h-58px)
    └── Interviewer rail  (312px, flex column)
```

**Critical sizing rule (this was the bug in the first pass):** the two side rails + the file tree are fixed px, so on a laptop the **code column is what gives**. Never let it collapse. Put `min-width: 1180px` on the workspace root and let the **outer container scroll horizontally** as one unit (don't `overflow:hidden` the body — use `overflow-x:auto; overflow-y:hidden`). That keeps the intended IDE proportions; the code column never drops below ~400px. Alternatively make it responsive (collapse the file tree under a breakpoint), but do not let the editor shrink to the gutter.

```css
html { height:100%; overflow:hidden; }
body { height:100%; overflow-x:auto; overflow-y:hidden; }   /* scrolls the whole workspace if < 1180px */
```

Each column scrolls **internally** (`overflow-y:auto`) at `height: calc(100vh - 56px)`; the page itself never scrolls vertically. Custom scrollbars: 9px, thumb = `var(--scroll)`, transparent track.

### Collapsible & resizable panels (do this — it's the real fix)
Rather than fight the fixed-width problem, let the user control it. This is standard IDE behaviour and the cleanest answer to "the code panel is too small."

- **Resizable rails:** drive the grid from CSS variables — `grid-template-columns: var(--w-lab) minmax(0,1fr) var(--w-int)` (defaults 272 / 312px). Place a 7px `cursor:col-resize` handle at each rail's inner edge; on drag, update the variable (clamp lab 210–440, interviewer 250–460). The center code column is `1fr`, so it absorbs whatever the rails give up.
- **Collapsible panels:** a collapse chevron in each rail header sets its width var to `0` and hides the panel, revealing a slim vertical re-open tab pinned to that edge (icon + rotated "LAB" / "AI"). The **file tree** gets a toggle in the editor tab bar that hides it (`display:none`) so the code spans the full center.
- **Persist** widths + collapsed/tree state to `localStorage` so the layout survives reloads.
- Implement with pointer events + `setPointerCapture` (works for mouse + touch); no drag library needed.

This means even on a small laptop the candidate can collapse the lab and interviewer and code full-bleed — and expand them back when they need the guidance or want to talk to Sable.

---

## 3. Region-by-region

**Top bar** (`--topbar`, glassy: `backdrop-filter: blur(14px)`, bottom `1px var(--border)`):
- Left: logo dot + "CodeSparring" · divider · clay `bug` icon · scenario name · `Medium` pill (clay-soft) · `Python` pill (bordered, `code-2` icon).
- Right: timer chip (mono, green dot) · Help / Calm / Focus chips (bordered, hover → clay border) · theme toggle (moon/sun) · Close.

**Guided-lab rail** (`--rail`):
- "GUIDED LAB · 1 of 4" label + a thin clay progress bar.
- Milestone stepper: current = clay border + clay-soft bg + numbered clay chip; locked = `lock` icon, 0.55 opacity. (Keep your real milestone titles.)
- Current milestone heading + subtitle, then knowledge **cards** (`--panel`, `1px --border`, radius 12): clay icon + title + body. Inline code tokens use Geist Mono in `--foreground`.
- "Before you move on" checklist: clicking toggles a clay check box and advances the progress bar.

**Center — tab bar:** breadcrumb `app/services/stats_service.py` (mono, clay `file-code-2`) + `edit` pill; right side a small "grading" dot meter + a pulsing green `LIVE` badge.

**Center — file tree** (196px, `--rail`): folder rows (clay `folder` icon for `app`, faint for `reference`/`tests`), the active file in a clay-soft pill with a clay dot. Indent with left padding.

**Center — code editor** (`--editor`, `overflow:auto`):
- Two columns: a non-selectable line-number **gutter** (`--gutter`, mono, right-aligned) + the code `<pre>` (`white-space:pre`).
- Syntax via spans on the tokens: keywords `--kw`, strings/docstrings `--str`, comments `--com`, function names `--fn`, numbers `--num`, default text `--foreground`.
- Highlight the **bug token** (e.g. `started_at`) with a faint red wash + 2px `--red` underline; make it focusable/clickable for the "flag the bug" interaction.

**Center — console** (`--bg`, top `1px --border`): header (`terminal` icon + "CONSOLE" + status) and a mono output area. On Run-tests: show a spinner → a real failing-test block (red `FAILED`, the assertion, `2 passed, 1 failed`).

**Center — action bar** (`--topbar`): left hint "Finish all lab milestones to submit"; right "Run tests" (bordered secondary) + "Submit fix" (clay primary, `--glow` shadow, disabled/0.55 until milestones done).

**Interviewer rail** (`--rail`, flex column):
- Header: round avatar ("S" / Sable) with a green presence dot, name "CodeSparring AI", subtitle "Sable · reacting live", a tiny clay waveform.
- Messages feed (`flex:1; overflow-y:auto`): AI bubbles = clay-soft with a clay-tint border (radius `14 14 14 4`); user bubbles = `--panel-2`, right-aligned (radius `14 14 4 14`). New bubbles animate in (translateY only — see note).
- Composer: "Tap to speak" mic button + a text input with a clay send button.

---

## 4. Theme & motion

- Toggle flips `.dark` on `<html>`; persist to `localStorage`. The global color-property transition from `HANDOFF.md` §2 makes the whole workspace crossfade.
- Keep animations **transform-only** for entrance (translate/scale), not opacity, so nothing can get stranded invisible. Respect `prefers-reduced-motion`.
- Icons: Lucide (`bug`, `code-2`, `life-buoy`, `wind`, `maximize-2`, `moon`/`sun`, `folder`, `file-code-2`, `terminal`, `play`, `send`, `mic`, `lock`, `layers-3`, `file-text`, `calendar`, `book-open`, `flask-conical`).

---

## 5. Do-not-touch
- No behavior, grading, routing, socket/streaming, or data changes — restyle the existing components in place.
- Don't rename or fork theme tokens; extend the same system.
- Only new dependency, if any, is the icon set you already use.
- Accent stays the single clay token — no new colors, no gradients-as-brand.

### Acceptance check
- Code editor renders full-width with visible syntax-highlighted code at ≥1180px; below that the **whole workspace** scrolls horizontally (editor never collapses to the gutter).
- Theme toggle crossfades the entire workspace incl. syntax colors; dark is the default, no flash on load.
- All existing interactions (run tests, chat, milestone/checklist, submit gating) work exactly as before.
- Three columns each scroll internally; the page never scrolls vertically.
