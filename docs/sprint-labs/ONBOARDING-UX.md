# Sprint Labs onboarding UX: "Welcome to Meridian. You're hired."

The moment a user picks **Sprint** from the Labs chooser, they do not land on a
board. They get **onboarded to a company** — a short, cinematic "first day" that
turns a codebase into a place you were hired into, then hands off to calm,
focused work.

## The one design law here: cognitive load is the enemy

Every choice below serves one goal — **reveal the world in layers, never dump
it.** One idea per beat. One line at a time. One focal point on screen. The
cinematic is a *60-90 second* arrival, not the product; the product is the flat,
fast ticket workspace it hands off to. If a beat does not lower the load of the
next screen, it is cut.

## The 3D decision (honest, and narrow)

- **Use it once:** the "here's your codebase" **system map** (beat 3). A spatial
  layout of the ~6 top-level modules that the camera moves through, lighting one
  at a time. Spatial memory is cheap memory — this is the one place 3D *reduces*
  load instead of adding it, and it makes the architecture stick.
- **Nowhere else.** Tickets, code, the board, the diff — all flat, fast, 2D. 3D
  on the working surface is cost with no payoff.
- **Constraints that make it safe, not a gimmick:**
  - Lazy-loaded *after* the first text beats, so first paint is instant.
  - **Skippable** ("Skip the tour") and **remembered** — full cinematic once,
    a compact "Back to Meridian" resume on every return.
  - `prefers-reduced-motion` collapses the whole thing to a calm static/2D
    version. No WebGL / low power -> the same 2D fallback. The map's *content*
    (the module labels) is identical in both, so nobody misses information.
  - Library: `three.js` via `@react-three/fiber` + `drei` (declarative, fits the
    React app). Budget a hard ceiling on bundle + a single reusable scene.

## The five beats

Each beat is one screen, auto-advances with a manual "next," ~10-20s, skippable.

1. **The offer.** Black-calm screen. One line fades in: *"Meridian Insurance —
   Claims Platform."* Then: *"You're hired. Backend engineer, starting today."*
   Sets the fiction and the role. No UI chrome yet.

2. **The company.** What Meridian does and why correctness matters, in 2-3 lines
   revealed one at a time: it processes insurance claims; money, tenants, and
   deadlines are all real; the code you inherit was written by people who left.
   A faint ambient backdrop, nothing to read but the current line.

3. **The system map (the 3D beat).** *"Here's the codebase you'll live in."* The
   ~6 modules laid out in space — HTTP layer, claims service, billing/money,
   delivery worker, the database, the test suite. The camera drifts to each in
   turn; the lit one carries a one-line label (*"claims service — creates and
   reads claims"*), the rest dim. **One module lit at a time** is the whole
   cognitive-load trick. Ends on the full map, briefly, then dims.

4. **Your pair.** Sable introduces itself: *"I'm Sable. I'll pair with you. Ask
   me anything about this repo."* The tone shifts from cinematic to working — the
   bridge out of the movie.

5. **First standup -> handoff.** The standup/board slides in, the cinematic
   furniture clears, and beat 5 *is* the real UI. One ticket is highlighted:
   *"Start here."* Onboarding is over; the calm workspace has begun.

## Managing the return visit

Onboarding is a first-run event, not a toll booth. First time: the full 75s
cinematic. Every time after: a 2-second "Back to Meridian, sprint N" resume card,
skippable, that drops straight to the board. Store the seen-state per user; a
"replay intro" link lives in the workbook menu for anyone who wants it again.

## The file-level "this is this," without a manual

Do not narrate every file. Explain the ~6 modules in the map (beat 3), then let
the rest be discovered:

- **First open of the workspace:** the file tree carries inline one-line hints on
  the top-level folders only (*"src/db — the database layer"*), which fade after
  first view.
- **On demand:** Sable answers "what is this file" in context — that is what the
  pair is for, and it scales to 60 files without a wall of tooltips.

## Production notes

- Build the flow as a self-contained onboarding route/overlay that the Sprint
  entry mounts, gated on `SPRINT_LABS_ENABLED` like everything else.
- First paint must be text (beats 1-2); the WebGL scene hydrates behind them.
- Respect `prefers-reduced-motion` and no-WebGL with the identical-content 2D
  fallback from day one, not as an afterthought.
- Keep the working surface (post-handoff) exactly as flat and fast as it is now.

## Prototype

An interactive mockup of beats 1-5 accompanies this plan so the feel is
reviewable before any of it is built. It uses CSS-3D for the system map to stay
self-contained; production swaps that one scene for `three.js`.
