# SD Learn 60-second demo playlist

The pitch-demo path through the interactive SD curriculum (INTERACTIVITY-PLAN.md,
Iteration 5). Three stops, one interactive kind each, all reachable in one tap from
the `/learn/system-design` landing strip ("60-second tour").

| Stop | Lesson | Widget | The 10-second beat |
|---|---|---|---|
| 1 | `/learn/system-design/interview-method/sd-l0-fermi-estimation` | `calc` | Guess the QPS, then drag DAU one power of ten and watch the whole chain move |
| 2 | `/learn/system-design/interview-method/sd-l0-clarify-scope` | `check` | Commit the tempting wrong opening move, get told exactly why it tempts |
| 3 | `/learn/system-design/scaling-data/sd-l3-consistent-hashing` | `hash-ring` | Add a node under mod-N, watch 80% of keys shatter; flip to the ring, watch ~20% move |

## Demo rules (from the pitch council)

- Everything above is intentionally ungated (no sign-in) and fully client-side after
  page load: widget state never touches the network, positions are seeded, no AI calls
  on this path. Hotspot-safe.
- Pre-warm by loading each page once before going on stage (Next chunks + fonts cache).
- The money line at stop 3: "every distributed cache and Dynamo-style store is built
  on the thing you just did."

## Verification checklist (run before any live demo)

- [ ] DevTools offline mode after initial load: all three widgets stay fully
      interactive (structural guarantee: widgets are client state only; re-verify
      after any dependency change).
- [ ] Reduced-motion mode: widgets remain fully functional (instant state swaps).
- [ ] Dark and light themes both legible (node hues chosen for both).
