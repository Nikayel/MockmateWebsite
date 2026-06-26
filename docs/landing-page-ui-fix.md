# Landing Page UI Fix — Plan, Checklist & Tickets

**Owner:** Nikayel
**Status:** Active
**Last updated:** 2026-06-26
**Scope:** Marketing landing page + the design system and component tooling that supports it (typography, theme-aware light mode, charts/dashboards, motion, component libraries).

---

## 1. Goal

Bring the landing page and its supporting surfaces to a premium, Apple-calm, low-cognitive-load standard that is consistent in **both light and dark mode**, communicates the "real engineering work" wedge clearly, and is built on a maintainable design system + component tooling instead of hand-rolled one-offs.

### Success criteria
- One clear focal point per section; no section reuses the same value prop more than once.
- Fully readable in light **and** dark mode (no white-on-white, no invisible borders).
- One unified type scale and token system used everywhere (no hardcoded `zinc-*`/`text-white` on theme surfaces).
- Data surfaces (readiness, pattern mastery, trends) use a real chart system, not bespoke SVG.
- Motion is restrained and respects `prefers-reduced-motion`.
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95 on `/` (desktop + mobile).

---

## 2. Current state (already shipped this cycle)

| Area | Status |
|---|---|
| Hero cognitive-load reduction (2-layer bg, single accent, calm twin-panel strip) | ✅ Done |
| Apple-style navbar (edge-to-edge, calm links, restrained CTA, focus rings) | ✅ Done |
| Company-tailored roadmap hint section | ✅ Done |
| Relevance-gap section (slot #2 after hero) | ✅ Done |
| Forgetting curve moved to DSA story + reframed | ✅ Done |
| Metrics section → Apple bento (one focal ring) | ✅ Done |
| Light-mode fixes: problem-teaser, ai-assisted, `/interview-prep` | ✅ Done |
| Section reorder (comparison as closer) | ✅ Done |
| Labs anon gating + `caseLabRuns` Firestore rule | ✅ Done |
| `/pricing` 500 fix (unsplash host allowlist) | ✅ Done |

### Known-open (this plan covers these)
- Typography/fonts not yet consolidated into one intentional system.
- Always-dark marketing sections (features, comparison, metrics) are not theme-aware → light mode alternates dark/light bands.
- Data surfaces still hand-rolled SVG (readiness ring, pattern bars).
- No component-library tooling wired (Tremor, shadcn/21st.dev MCP).
- Pricing comparison uses mislabeled stock photos, not real screenshots.
- Unverifiable marketing stats ("+18 pts", "10k+ outcomes") still present.
- No signature interaction (pinned Case Lab milestone scroll).
- No `/features` deep page.

---

## 3. Design principles (the spine)

1. **One idea per screen.** Generous whitespace; let sections breathe (Apple).
2. **Show the real product, don't illustrate it.** Reuse real components in read-only "demo mode" over fake mockups where possible.
3. **One accent.** Warm clay (`--accent`); periwinkle and stray purples are demoted/removed.
4. **Theme-aware by default.** Semantic tokens only on theme surfaces; no hardcoded neutrals.
5. **Restraint over motion.** One signature animation per page, everything else calm; honor reduced-motion.
6. **Plain language.** No internal jargon (`SM-2`/`FSRS`) in user copy; fewer em-dashes.

---

## 4. Design system decisions

### 4.1 Typography (fonts)
**Current:** `font-heading` = Work Sans, `font-sans` = Open Sans, `--font-ui` = Geist, `--font-mono` = Geist Mono.

**Decision (to ratify in LPUI-101):** consolidate to a tighter, more premium pairing and a strict scale.
- **Recommended:** Headings = **Geist** (or keep Work Sans if brand-locked) with tight tracking on large sizes; Body/UI = **Geist / Inter**; Code = **Geist Mono**. Rationale: Geist reads more modern/premium than Open Sans for a dev-tool brand and unifies UI + marketing.
- **Type scale (Apple-style):** display `clamp(2.75rem,6.5vw,4.25rem)` tracking `-0.04em`; H2 `clamp(2rem,4vw,3rem)` tracking `-0.03em`; body `1rem–1.125rem` line-height `1.6–1.75`; eyebrow `12–13px` tracking `0.04–0.18em`.
- **Rules:** body line-length 65–75ch; min 16px body on mobile; one display weight (700/800), one body weight (400/500).

### 4.2 Color & tokens
- Single source of truth: `app/globals.css` `:root` / `.dark`. Everything maps through `@theme inline`.
- Allowed brand colors: clay `--accent`, neutrals, `--neural` (success only), status colors. **No** new hardcoded hexes in components.

### 4.3 Spacing & whitespace
- Section padding: `py-24`–`py-36` for marketing; consistent `max-w-5xl/6xl` containers.
- 8px spacing grid (already in `lib/design-tokens.ts`).

### 4.4 Motion
- framer-motion entrance reveals only; durations 150–400ms; one signature scroll moment (LPUI-601).
- All animations gated by `prefers-reduced-motion`.

---

## 5. Tooling & component libraries (researched)

| Tool | Role | Notes |
|---|---|---|
| **shadcn/ui** | Foundation primitives (in use) | Keep as the base all components adapt to. |
| **Tremor** (Vercel, free, Recharts-based) | Charts/dashboards/KPI | Best fit for data surfaces; Recharts already in bundle. |
| **shadcn MCP** | AI-native component install | Official, free. Wire into Claude Code. |
| **21st.dev Magic MCP** | AI-native marketing sections | Freemium. Hero/bento/pricing/testimonial blocks. |
| **Magic UI** | Framer-Motion micro-interactions | Bento, number tickers, marquee. Free. |
| **Aceternity UI** | High-impact hero/scroll animation | Use sparingly (one signature moment). |

### Guardrails (mandatory for any imported component)
1. **Re-tokenize:** convert all hardcoded colors → semantic tokens before merge.
2. **De-noise:** strip default-heavy motion to match Apple-calm; add reduced-motion guard.
3. **Prefer accessible bases** (Tremor/Radix) for interactive elements.
4. **Own + isolate:** land in `components/ui/` or `components/marketing/`; no scattering.
5. **No external-asset traps:** real screenshots over stock; allowlist any remote host (see `/pricing` incident).

---

## 6. Epics

| Epic | Title | Priority |
|---|---|---|
| LPUI-E1 | Design system & typography | P0 |
| LPUI-E2 | Finish theme-aware light mode | P0 |
| LPUI-E3 | Component-library tooling (Tremor + MCP) | P1 |
| LPUI-E4 | Data surfaces rebuilt with Tremor | P1 |
| LPUI-E5 | Marketing sections polish | P1 |
| LPUI-E6 | Signature interaction (pinned milestone scroll) | P2 |
| LPUI-E7 | Credibility & content | P1 |
| LPUI-E8 | Accessibility & performance | P0 |
| LPUI-E9 | QA, verification & launch | P0 |

---

## 7. Tickets (JIRA-style)

> Format: `ID — [type] summary` · **Status** · **Priority** · **Points** · **Depends on** · Description · Acceptance criteria.

### LPUI-E1 · Design system & typography

#### LPUI-101 — [Spike/Decision] Ratify typography system
**Status:** To Do · **P0 · 2pts · Depends:** —
Decide heading/body/code pairing and the canonical type scale; document in `globals.css` comments + this doc.
- [ ] Pairing chosen and approved (Geist-led recommended)
- [ ] Type scale tokens defined (display/H2/H3/body/eyebrow sizes, tracking, line-height)
- [ ] Google Fonts / next/font wiring updated; old fonts removed if dropped
- [ ] No layout shift (font-display swap + fallback metrics)

#### LPUI-102 — [Task] Apply type scale across landing sections
**Status:** To Do · **P0 · 3pts · Depends:** LPUI-101
- [ ] Every heading uses `font-heading` + scale token (no ad-hoc `text-3xl` drift)
- [ ] Body copy uses consistent size/line-height; line-length ≤ 75ch
- [ ] Eyebrows standardized (size, tracking, case)

#### LPUI-103 — [Task] Token/lint guard against hardcoded colors
**Status:** To Do · **P1 · 2pts · Depends:** —
- [ ] ESLint/stylelint rule (or CI grep) flags `text-white`, `text-zinc-*`, `bg-black` on theme surfaces
- [ ] Documented exceptions list (intentional dark tiles)

### LPUI-E2 · Finish theme-aware light mode

#### LPUI-201 — [Task] Make Features section theme-aware
**Status:** To Do · **P0 · 3pts**
- [ ] `#121110` pinned bg → semantic surface (or intentional dark tile, documented)
- [ ] All `text-zinc-*`/`text-white` → tokens; readable in light mode
- [ ] Orbital timeline + selector legible in both themes

#### LPUI-202 — [Task] Make Metrics bento theme-aware
**Status:** To Do · **P1 · 2pts**
- [ ] Bento cells use `bg-card`/`border-border`; ring + bars legible in light
- [ ] One accent retained (clay)

#### LPUI-203 — [Task] Comparison section light-mode review
**Status:** To Do · **P1 · 1pt**
- [ ] Confirm the intentional dark tile is the desired choice in light mode, or convert
- [ ] Add the "real codebase" differentiator row (carried from earlier plan)

#### LPUI-204 — [Task] Whole-page light/dark rhythm audit
**Status:** To Do · **P1 · 2pts · Depends:** LPUI-201, LPUI-202
- [ ] Decide uniform vs intentional alternating band rhythm; apply consistently
- [ ] Screenshot every section in both themes

### LPUI-E3 · Component-library tooling

#### LPUI-301 — [Task] Wire shadcn MCP + 21st.dev Magic MCP into Claude Code
**Status:** To Do · **P1 · 2pts**
- [ ] MCP servers configured in project settings
- [ ] Verified: agent can pull + install a sample block
- [ ] Short README on how to request components

#### LPUI-302 — [Task] Add Tremor and theme it to brand tokens
**Status:** To Do · **P1 · 3pts**
- [ ] Tremor installed; Tailwind config integrated
- [ ] Tremor theme mapped to `--accent`/neutrals (clay charts, not default blue)
- [ ] Dark + light verified

### LPUI-E4 · Data surfaces with Tremor

#### LPUI-401 — [Story] Rebuild `/practice` dashboard with Tremor
**Status:** To Do · **P1 · 5pts · Depends:** LPUI-302
- [ ] Readiness → `DonutChart`/`ProgressCircle`
- [ ] Pattern mastery → `Tracker`/`BarList`
- [ ] Trends → `SparkAreaChart`
- [ ] ReviewCalendar kept or replaced consistently
- [ ] Accessible (keyboard + table fallback)

#### LPUI-402 — [Task] Metrics marketing section uses real demo components
**Status:** To Do · **P2 · 3pts · Depends:** LPUI-401**
- [ ] Bento cells render real (read-only) dashboard widgets in "demo mode" instead of static mocks
- [ ] No fabricated numbers without a source (see LPUI-701)

### LPUI-E5 · Marketing sections polish

#### LPUI-501 — [Task] Explicit "How it works" 3-step section
**Status:** To Do · **P1 · 3pts**
- [ ] Pick scenario → work with reactive AI → scored like a real loop
- [ ] Apple-calm layout, one idea per row
- [ ] Pulls a 21st.dev/Magic UI step pattern, re-tokenized

#### LPUI-502 — [Task] `/features` deep page
**Status:** To Do · **P2 · 5pts**
- [ ] All 6 formats + roadmap engine + retention + scoring, full treatment
- [ ] Homepage "Features" link routes here; bug-fix/case-labs are headliners

#### LPUI-503 — [Task] Replace pricing comparison stock photos
**Status:** To Do · **P1 · 2pts**
- [ ] Real product screenshots (or remove the slider)
- [ ] Correct labels; no mislabeled stock imagery

### LPUI-E6 · Signature interaction

#### LPUI-601 — [Story] Pinned Case Lab milestone scroll
**Status:** To Do · **P2 · 8pts**
- [ ] Sticky/pinned visual; Clarify→…→Review advances on scroll
- [ ] Build step shows failing test → green
- [ ] Reduced-motion fallback (static)
- [ ] Mobile fallback (stacked, no pin)

### LPUI-E7 · Credibility & content

#### LPUI-701 — [Task] Stats credibility pass
**Status:** To Do · **P1 · 2pts**
- [ ] Substantiate or remove "+18 pts after 5 sessions", "10k+ outcomes", "3 learning modes"
- [ ] Replace with true mechanism claims where unverifiable

#### LPUI-702 — [Task] Social-proof slot
**Status:** To Do · **P2 · 2pts**
- [ ] Designed slot for 3 real testimonials/logos when available
- [ ] No placeholder fake quotes shipped

### LPUI-E8 · Accessibility & performance

#### LPUI-801 — [Task] Accessibility pass
**Status:** To Do · **P0 · 3pts**
- [ ] Contrast ≥ 4.5:1 all text (both themes)
- [ ] Focus-visible rings on all interactive elements
- [ ] Reduced-motion respected everywhere
- [ ] Headings/landmarks/alt-text correct

#### LPUI-802 — [Task] Performance pass
**Status:** To Do · **P1 · 2pts**
- [ ] No CLS from fonts/images; reserve space for async content
- [ ] Images: next/image, correct sizes, allowlisted hosts
- [ ] Bundle check after Tremor/lib additions

### LPUI-E9 · QA, verification & launch

#### LPUI-901 — [Task] Cross-device + cross-theme QA
**Status:** To Do · **P0 · 3pts · Depends:** all**
- [ ] 375 / 768 / 1024 / 1440 screenshots, light + dark
- [ ] Lint + typecheck + `pnpm build` green
- [ ] Lighthouse targets met
- [ ] No 500s on any marketing route (regression guard for `/pricing`)

---

## 8. Execution phases

1. **Phase 1 (P0 foundation):** LPUI-101/102 (type), LPUI-201/202 (theme-aware), LPUI-801 (a11y).
2. **Phase 2 (tooling + data):** LPUI-301/302 (MCP + Tremor), LPUI-401 (practice dashboard).
3. **Phase 3 (marketing depth):** LPUI-501 (how it works), LPUI-503 (pricing screenshots), LPUI-701 (stats).
4. **Phase 4 (depth + signature):** LPUI-502 (/features), LPUI-601 (pinned scroll), LPUI-702 (social proof).
5. **Phase 5 (ship):** LPUI-901 QA + launch.

---

## 9. Master checklist (pre-merge / QA)

- [ ] One type scale applied; no ad-hoc heading sizes
- [ ] No hardcoded `text-white`/`zinc-*`/`bg-black` on theme surfaces
- [ ] Every section readable in light **and** dark
- [ ] One focal point per section; no repeated value props
- [ ] One accent (clay); no stray periwinkle/purple
- [ ] Charts via Tremor, themed to brand
- [ ] Imported components re-tokenized + de-noised
- [ ] All interactive elements have focus-visible rings
- [ ] `prefers-reduced-motion` respected
- [ ] Images use next/image with allowlisted hosts; real (not stock) where claimed
- [ ] No fabricated stats without a source
- [ ] Lint + typecheck + build green
- [ ] Lighthouse: Perf ≥ 90, A11y ≥ 95
- [ ] No 500s on `/`, `/pricing`, `/interview-prep`, `/labs`

---

## 10. Definition of Done
A ticket is Done when: code merged to `main`, light + dark verified, lint/typecheck/build green, acceptance criteria checked, and (for visible changes) a before/after screenshot attached.

## 11. Risks
- **Token drift** from copy-pasted library components → mitigated by LPUI-103 guard.
- **Motion overload** from Aceternity/Magic UI → mitigated by de-noise guardrail + reduced-motion.
- **Bundle bloat** from Tremor + libs → mitigated by LPUI-802.
- **Concurrent interview-refactor work** in the same repo → coordinate to avoid conflicts.
