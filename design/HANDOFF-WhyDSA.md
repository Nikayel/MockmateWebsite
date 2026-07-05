# CodeSparring — "Why DSA" page redesign (developer handoff)

Goal: rebuild the `/why-codesparring` page to the premium CodeSparring system — warm charcoal + single clay accent, Geist + Geist Mono, light/dark — led by a **3D "memory brain"** instead of a generic centered hero. **Restyle/restructure only; no routing, auth, or data changes.**

Uses the shared token system in `HANDOFF.md` (§1–2: color tokens, the smooth light/dark crossfade, fonts). Read that first. Defaults to **dark**.

Libraries: **Three.js** (r0.160, the 3D brain) and **Lucide** icons. No chart library — the old forgetting-curve chart was removed on purpose (too jagged / data-heavy / hard to read at a glance).

---

## 1. Layout (top → bottom)
1. **Nav** — sticky, glassy, same as the rest of the site (logo · Why DSA · Rounds · Compare · Pricing · theme toggle · Try free). "Why DSA" is the active link.
2. **Hero** — two columns: copy left, the **3D brain** right. NOT a centered-text-in-void hero (that read generic + high cognitive-load). One headline, one short subtitle, one primary CTA + a quiet text link, one trust line. That's it.
3. **How it works** — three "show, don't tell" cards (see §3).
4. **CTA band** — one line + clay button.
5. **Footer** — standard.

Keep it tight: do not stack eyebrow-pill + huge headline + 3-line subtitle + multi-step strip + two buttons in the hero. One idea, one action.

## 2. The 3D "memory brain" (hero visual)
A slowly-swaying, cursor-reactive brain that signifies remembrance — built from nodes ("synapses"), not a literal mesh.

- **Shape:** ~130 points distributed on a sphere, deformed into a brain: ellipsoid scale (wider X, shorter Y, longer front-back Z), gyri/sulci via layered sine "wrinkle" noise on the radius, a **central fissure** (push each point's X out from the midline by a small gap so two hemispheres read), and a midline groove. Mounted in a rounded panel with a radial mask so it fades into the card edges.
- **Synapse behavior (the meaning):** each node has its own decay/review cycle — its brightness `m = exp(-age/tau)` fades over a few seconds (forgetting), then on a per-node interval it **fires back to full clay** with a brief flash (review). Color lerps faded-grey → clay by brightness; opacity and scale track it too. At any moment some nodes are dim, some freshly refreshed → reads as "recall kept alive."
- **Neural connections:** faint clay `LineSegments` between nearby nodes (precompute pairs within a distance threshold).
- **Code features:** ~7 drifting **sprite glyphs** (`{ }`, `</>`, `=>`, `[ ]`, `( )`, `fn`, `0x`, `&&`, `//`) on slow orbits — canvas-textured, tinted clay via `SpriteMaterial.color`, gentle opacity bob. Ties memory to code.
- **Motion:** the group **sways** (`rotation.y = sin(t*0.22)*0.5`) rather than full-spinning, so the two-lobe brain stays recognizable; plus pointer parallax (lerp toward cursor) and a faint vertical float. Ambient mote field behind.
- **Theme-aware:** clay accent, faded-node color, and mote color all swap on light/dark. **Reduced-motion:** render one static frame, skip the loop.
- **Overlay (HTML, on top of the canvas):** small caption "Your recall, kept sharp", a pulsing "LIVE" chip, and a legend (dim dot = "Fading", clay dot = "Refreshed") so the visual is legible at a glance.

Perf: one `WebGLRenderer`, `setPixelRatio(min(dpr,2))`, dispose + `forceContextLoss` on unmount.

## 3. "How it works" cards — show, don't tell
Three **standalone elevated cards** (grid, `gap:16px`, each `border-radius:16px`, 1px border, soft **clay corner-glow** top-right, hover = lift `translateY(-5px)` + clay border + clay-soft glow shadow). Card 03 is clay-filled as the "active" step. Each card *shows* its step with a small product visual instead of an icon + blurb:
- **01 Find your weak patterns** — a cluster of pattern chips; the weak ones (Dynamic Prog, Graphs) flagged with a clay border + down-trend icon, the strong ones muted.
- **02 Get a spaced roadmap** — a horizontal spaced-review timeline (D0 → +1d → +3d → +1w → +2w) with completed reviews filled clay and intervals visibly **widening**.
- **03 Review before you forget** — a "due today" review card: pattern name + pulsing "due today" pill + a clay "Start review" button.

Copy note: the scheduler is described as **"our own algorithm"** (not "FSRS").

## 4. Acceptance
- Dark default, no flash; theme toggle crossfades the whole page including the 3D recolor.
- Brain reads as a two-lobe brain (not a blob or constellation), nodes visibly fade + refresh, glyphs drift, cursor parallax works, reduced-motion shows a clean static frame.
- Hero is one idea / one action; cards show real mini-UI, not generic icon-blurbs.
- No layout breakage 320px → ultrawide (cards reflow, hero stacks on narrow).
