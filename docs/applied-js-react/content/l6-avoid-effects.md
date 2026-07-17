> Module **6.3** (When NOT to Use an Effect) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [6.2](./l6-cleanup-races.md) · Next: [6.4](./l6-refs-timing.md)

# L6 · When NOT to Use an Effect

Most `useEffect` calls that only read reactive values and call `setState` are not synchronization, they are computation done in the wrong place. After this module you can catch the two most common versions: an effect that mirrors props/state into more state (derived state), and a stack of effects that each feed the next (a render waterfall), and you can rewrite both into render-time values plus one event handler.

### ajr-l6-derived-state-not-effect: You might not need an effect (derived state)

- **id:** `ajr-l6-derived-state-not-effect`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, derived-state, effects

#### Learn

There is a reflex a lot of engineers have: "I have some value that depends on other state, so I will put it in its own `useState` and keep it in sync with a `useEffect`." That reflex is almost always wrong, and it has a measurable cost.

Here is the canonical anti-pattern, a form that shows a full name built from two fields:

```tsx
function NameForm() {
  const [first, setFirst] = useState("Ada");
  const [last, setLast] = useState("Lovelace");
  const [fullName, setFullName] = useState(""); // extra state

  useEffect(() => {
    setFullName(first + " " + last); // sync it
  }, [first, last]);

  return (
    <>
      <input value={first} onChange={(e) => setFirst(e.target.value)} />
      <input value={last} onChange={(e) => setLast(e.target.value)} />
      <p>{fullName}</p>
    </>
  );
}
```

Type one character in `first`. Trace what React does. `setFirst` schedules a render, so React renders once with the new `first` but the *old* `fullName` (the effect has not run yet, effects run after commit). React commits that first pass to the DOM, so for one frame the paragraph shows a stale name. Then the effect fires, calls `setFullName`, which schedules a *second* render and a second commit. Every keystroke costs two render-and-commit cycles instead of one, and there is a one-frame window where `fullName` lags behind the inputs.

The fix is to delete the state and the effect and compute the value during render:

```tsx
const fullName = first + " " + last;
```

Now there is one source of truth. When `first` changes, the single render already has the correct `fullName`, because it is just an expression evaluated top to bottom. One render, one commit, no stale frame. If the computation were genuinely expensive (parsing, filtering thousands of rows) you would wrap it in `useMemo`, but `useMemo` is still render-time computation, not an effect. It never adds a render pass.

The decision rule that prevents this whole class of bug: if a value can be computed from existing props/state, compute it in render (memoize if heavy). If it results from a user interaction, put it in the event handler. Reach for an effect only to synchronize with something *outside* React: the network, a subscription, the DOM, a timer. "Deriving one piece of state from another" is not outside React.

The same lesson applies to the POST-on-submit effect people often pair with this: sending data in a `useEffect(() => { post(form) }, [submitted])` triggered by a `submitted` flag. That is an event (the user clicked submit), so it belongs in the button's `onClick`, not an effect keyed on a boolean you flipped.

**Interview nuance:** "how do you reset derived state when a prop changes?" With derived-in-render values there is nothing to reset, they recompute for free. The state you *do* keep (like an editable draft that should reset per user) is reset by giving the component a `key={userId}` so React remounts it, not by an effect that watches the prop and calls `setState`.

Recap: mirroring reactive values into more state via an effect adds a render pass and a stale frame; derive in render (memoize if heavy), put user actions in handlers, and reserve effects for external systems.

#### See it live

**Demo (react-demo):** two side-by-side NameForms, one using a `fullName` state synced by `useEffect`, one deriving `fullName` in render, each with a live render-count badge and a keystroke counter.

A widget with two cards labeled **A) effect-synced** and **B) derived-in-render**. Each card has two text inputs (`first`, `last`), a paragraph showing the full name, and a badge in the corner reading `renders: N`. A shared "keystrokes: K" counter sits at the top and increments once per key the learner types into either card. The badges are driven by a render counter that increments every time each component function runs. The two cards are built around these bodies:

```tsx
// A) effect-synced
const [fullName, setFullName] = useState("");
useEffect(() => setFullName(first + " " + last), [first, last]);
renderCountA.current += 1; // drives badge A

// B) derived-in-render
const fullName = first + " " + last;
renderCountB.current += 1; // drives badge B
```

**Watch:** type the same word into both cards. The `renders` badge on card A climbs about twice as fast as on card B (two commits per keystroke versus one), and if the widget slows the frames down you can see A's paragraph show the previous value for a beat before catching up, while B is always in sync. This is real React behavior (effects run after commit, so the sync always trails by one render), it proves the effect version double-commits and briefly shows a stale value while the derived version commits once and is never stale.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Delete the `fullName` state and its effect and compute `const fullName = first + " " + last` in render; then move a POST-on-submit effect into the button `onClick`. Explain why the effect version rendered twice per keystroke.

**Think about:**
- Why does the effect version render twice?
- What is the decision rule for effect vs derive vs event?
- How do you reset derived state on prop change?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The effect version renders twice because effects run *after* commit. `setFirst` triggers render one, which commits with the old `fullName` (the effect has not run yet). Then the effect fires and calls `setFullName`, triggering render two, which commits the corrected name. Two render-and-commit cycles per keystroke, plus a one-frame stale display in between.

Corrected code, derive in render and move the POST to the handler:

```tsx
function NameForm() {
  const [first, setFirst] = useState("Ada");
  const [last, setLast] = useState("Lovelace");
  const fullName = first + " " + last; // derived, no extra state

  const onSubmit = () => {
    post("/api/name", { fullName }); // event logic lives in the handler
  };

  return (
    <>
      <input value={first} onChange={(e) => setFirst(e.target.value)} />
      <input value={last} onChange={(e) => setLast(e.target.value)} />
      <p>{fullName}</p>
      <button onClick={onSubmit}>Save</button>
    </>
  );
}
```

**WHY at the mechanism level:** `fullName` is a pure function of `first` and `last`, so it can be an expression in the render body, which React evaluates on the same pass that produced the new inputs. An effect, by contrast, is scheduled to run after the commit, so any `setState` it does is a second round-trip. Computing in render collapses two passes into one and removes the stale window entirely. `useMemo` would be the escalation for an expensive derivation, but it is still render-time and adds zero commits.

**How to spot it in review:** a `useEffect` whose entire body is `setX(...)` computed from other reactive values in its own dependency array. That effect is doing render-time work on a delay. Also watch for a `useState` that never appears in an `onChange` or handler, only in an effect's setter.

**Production symptom:** every keystroke (or slider drag, or tab switch) commits twice, doubling render cost on hot paths, and the derived label flickers one frame behind the inputs. On a big form this shows up as laggy typing and a visible flash of the old value.

**Common misconception corrected:** "syncing state with an effect is the normal, idiomatic way to compute a value." It is not. It is an anti-pattern the React docs specifically call out ("You Might Not Need an Effect"). Effects are for synchronizing with systems *outside* React; deriving one value from other values is plain rendering.

**Self-check rubric:**
- [ ] I explained the two commits come from effects running after commit.
- [ ] My fix deletes the state and the effect and derives in render.
- [ ] I moved the POST into the `onClick`, not an effect on a flag.
- [ ] I gave the effect-vs-derive-vs-event decision rule.
- [ ] I said prop-driven reset uses `key`, not a watch-and-setState effect.

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a Checkout page, an engineer keeps `total` in `useState` and syncs it with `useEffect(() => setTotal(sum(items) * (1 - discount)), [items, discount])`, and also keeps `isValid` in state synced by another effect off `total`. QA reports the "Place order" button flickers between enabled and disabled for a frame after each cart edit, and the displayed total briefly shows the pre-edit amount. Diagnose it and rewrite so both values are correct on the first render.

**Model answer (revealed on demand):**

Both `total` and `isValid` are derived state mirrored through effects, so a single cart edit fans out across multiple commits. Editing `items` renders once with the *old* `total`, commits (stale total shown), then the total effect sets `total`, which renders again and runs the `isValid` effect, which sets `isValid` and renders a third time. The button reads the old `isValid` for a frame or two, hence the flicker, and the total shows the pre-edit value on that first commit.

Rewrite both as render-time derivations so the very first render after an edit is already correct:

```tsx
function Checkout({ items, discount }: Props) {
  const total = sum(items) * (1 - discount); // derive, memoize if sum() is heavy
  const isValid = total > 0 && items.length > 0;

  return (
    <>
      <span>{formatMoney(total)}</span>
      <button disabled={!isValid} onClick={placeOrder}>Place order</button>
    </>
  );
}
```

Now editing `items` produces one render in which `total` and `isValid` are both freshly computed from the new `items`. One commit, no chain, no stale frame, no flicker. If `sum(items)` is genuinely expensive over a large cart, wrap `total` in `useMemo(() => sum(items) * (1 - discount), [items, discount])`, but keep `isValid` as a plain expression off `total`; it is trivial.

**WHY at the mechanism level:** each mirrored value added another effect-driven render round-trip, and chaining `isValid` off `total` meant the second value could not even start updating until the first effect had committed. Deriving both in render evaluates them in dependency order within a single pass.

**Production symptom:** a submit button that flickers enabled/disabled after every cart change (a real double-submit and misclick risk if the user taps during the wrong frame), and a total that lags one frame, which on a payment screen erodes trust and can show the wrong number at the instant a user clicks pay.

### ajr-l6-effect-chains-cascade: Effect chains and cascading renders

- **id:** `ajr-l6-effect-chains-cascade`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, effects, performance

#### Learn

The derived-state anti-pattern from the previous lesson gets much worse when you stack it: one effect sets state that a second effect depends on, which sets state a third effect depends on. Each link is another full render round-trip, and one user action turns into a visible waterfall of commits.

Here is a shipping-address form that shows the shape:

```tsx
function AddressForm() {
  const [country, setCountry] = useState("US");
  const [region, setRegion] = useState("");
  const [tax, setTax] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // A: country changes -> reset region
  useEffect(() => { setRegion(defaultRegionFor(country)); }, [country]);
  // B: region changes -> recompute tax
  useEffect(() => { setTax(taxRateFor(country, region)); }, [country, region]);
  // C: tax changes -> validate
  useEffect(() => { setError(tax > 0 ? null : "Region required"); }, [tax]);

  return /* ...inputs... */;
}
```

Change `country` once. Count the commits. Render 1 commits with the new `country` (region/tax/error still old). Effect A runs, sets `region`, render 2. Effect B sees the new `region`, sets `tax`, render 3. Effect C sees the new `tax`, sets `error`, render 4. One `onChange` produced four sequential render-and-commit passes, and during passes 1 through 3 the UI is internally inconsistent: a country from the new selection paired with a region, tax, and error from the old one. If any effect in the chain also fetched, you would fire redundant requests against those intermediate states.

Every one of these values is derivable from `country` and `region`, and the reset is a user event. Collapse the whole thing:

```tsx
function AddressForm() {
  const [country, setCountry] = useState("US");
  const [region, setRegion] = useState(defaultRegionFor("US"));

  const tax = taxRateFor(country, region);           // derived
  const error = tax > 0 ? null : "Region required";  // derived

  const onCountryChange = (next: string) => {
    setCountry(next);
    setRegion(defaultRegionFor(next)); // both updates, one event, one render
  };

  return /* ...inputs wired to onCountryChange... */;
}
```

Now `tax` and `error` are expressions computed during render, so they are always consistent with `country` and `region`. The one thing that is real state, `region`, is reset inside the event handler that caused the change. Two `setState` calls in the same handler are *batched* into a single render, so changing country costs exactly one commit and the UI is never in a half-updated state.

**Interview nuance:** "why are effect chains brittle, beyond being slow?" Because ordering and consistency become emergent, not explicit. The sequence only works if React happens to run the effects in the order you assumed, every intermediate commit is a state your components must tolerate, and adding a fourth link silently adds a fifth render. Render-time derivation makes the data flow a straight line you can read top to bottom; a handler makes the multi-step update atomic and intentional.

Recap: an effect that sets state re-runs any effect depending on that state, so chained effects create an N-pass render waterfall with inconsistent intermediate commits; derive the dependent values in render and do the multi-step update in the one event handler that triggered it.

#### See it live

**Demo (react-demo):** the AddressForm above with a render/commit counter, a step log, and a toggle that swaps the three-effect chain for the derived-plus-handler version.

A widget with a country dropdown, a region input, a read-only tax and error display, a big `commits: N` badge, and a scrolling **step log** that appends a line each time a render or effect runs (for example `render #1 (country=CA, tax=stale)`, `effect A -> setRegion`, `render #2`, ...). A toggle labeled "Refactor: derive in render" switches the component between the two implementations:

```tsx
// chained: three effects, each dep is the previous effect's target
useEffect(() => setRegion(defaultRegionFor(country)), [country]);
useEffect(() => setTax(taxRateFor(country, region)), [country, region]);
useEffect(() => setError(tax > 0 ? null : "Region required"), [tax]);

// refactored: derived values + one handler that batches both setStates
const tax = taxRateFor(country, region);
const error = tax > 0 ? null : "Region required";
const onCountryChange = (next) => { setCountry(next); setRegion(defaultRegionFor(next)); };
```

**Watch:** with the chain on, pick a new country once and the `commits` badge jumps by 4 in a visible staircase, and the step log shows four renders with the intermediate ones flagged as inconsistent (new country, stale tax). Flip "Refactor: derive in render," pick another country, and `commits` increments by exactly 1 with a single clean render line. This is real React behavior (each effect `setState` is a genuine render round-trip and batched handler updates coalesce), it proves the chain fans one action into four sequential commits and the refactor collapses it to one.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Collapse a chain of effects (change A -> set B -> set C -> validate) into values computed in render plus a single event handler, and say how many render passes the original caused and why.

**Think about:**
- How many render passes does the chain cause?
- What can be computed in render instead?
- Why are effect chains brittle?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The chain causes four render passes for one user action. The initial `setState` (change A) is render one. Effect A's `setB` is render two. Effect B (depending on B) does `setC`, render three. Effect C validates by `setError`, render four. Each effect's setter is a full render-and-commit round trip that then re-runs the next effect down the chain, and passes one through three commit an inconsistent UI (the new A with stale C and error).

Corrected code derives the dependent values in render and does the multi-step update in the handler:

```tsx
function Form() {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(defaultBFor(initialA));

  const c = computeC(a, b);                 // was effect B's setC
  const error = validate(c);                // was effect C's setError

  const onChangeA = (next: string) => {
    setA(next);
    setB(defaultBFor(next)); // was effect A's setB, now explicit + batched
  };

  return /* inputs wired to onChangeA */;
}
```

**WHY at the mechanism level:** an effect runs after commit and, when it calls `setState`, schedules another render, which then re-runs any effect that lists that new state in its deps. So chained effects are a linked list of render round-trips: N links means N-plus-1 commits. Moving `c` and `error` into render makes them plain expressions evaluated in dependency order on a single pass. Putting the two real state updates (`a` and `b`) in the same handler lets React batch them into one render, so the whole interaction is atomic.

**How to spot it in review:** a stack of `useEffect`s where each one's dependency array is the state that the previous effect's setter writes. That "each dep is the last effect's target" shape is the signature of a cascade. Also look for effects that reset one piece of state whenever another changes; that is usually an event in disguise.

**Production symptom:** slow, hard-to-trace updates (a single click causing a burst of renders in the Profiler), and momentarily inconsistent UI where some fields reflect the new input and others still show the old value, which can flash wrong totals, wrong validation, or fire redundant fetches against intermediate states.

**Common misconception corrected:** "chaining effects is a clean, declarative way to sequence dependent updates." It is the opposite: the sequencing is implicit and fragile, every intermediate state is a commit you must handle, and each added step multiplies renders. Straight-line render derivation plus a single handler is the declarative version.

**Self-check rubric:**
- [ ] I counted the passes (one per link plus the triggering setState).
- [ ] I identified which values are derivable in render (C and the validation).
- [ ] My fix puts the multi-step state update in one batched handler.
- [ ] I explained why each effect setState re-runs the next effect.
- [ ] I named the inconsistent-intermediate-commit symptom, not just "slow."

#### Practice: real-world variant (save, then reveal)

**Prompt:** On an Analytics Dashboard, selecting a date range triggers a five-effect chain: setRange -> effect recomputes `buckets` -> effect recomputes `series` -> effect recomputes `yAxisDomain` -> effect recomputes `summaryStats` -> effect re-runs the `fetch` for the visible metric. Users report the chart "flashes through several intermediate states" and sometimes fires two or three network requests per range change. Refactor it and explain why the redundant fetches happen.

**Model answer (revealed on demand):**

The five effects form a cascade off a single `setRange`, so one selection produces roughly six commits, and because the fetch sits at the end of the chain it can fire against more than one intermediate state as the earlier effects settle. The redundant requests happen because the fetch effect depends on values (`summaryStats` or `series`) that are themselves being reset by upstream effects across multiple renders; each time an upstream value lands, the fetch effect's deps change again and it re-runs, so the range change kicks off two or three overlapping requests before the state converges.

Everything except the network call is a pure derivation of `range` and the raw dataset, so collapse the middle of the chain into render:

```tsx
function Dashboard({ raw, metric }: Props) {
  const [range, setRange] = useState(defaultRange);

  const buckets = useMemo(() => bucketize(raw, range), [raw, range]);
  const series = useMemo(() => toSeries(buckets, metric), [buckets, metric]);
  const yAxisDomain = useMemo(() => domainOf(series), [series]);
  const summaryStats = useMemo(() => summarize(series), [series]);

  // the ONLY real effect: sync with the network, keyed on the real inputs
  useEffect(() => {
    const controller = new AbortController();
    fetchMetric({ metric, range }, controller.signal).then(setRemoteMetric);
    return () => controller.abort();
  }, [metric, range]);

  return /* chart reading series, yAxisDomain, summaryStats */;
}
```

Now `buckets`, `series`, `yAxisDomain`, and `summaryStats` are memoized render-time values that update together in the single render triggered by `setRange`. The one legitimate effect (the fetch, which really is synchronizing with an external system) depends only on the stable inputs `metric` and `range`, so a range change fires it exactly once, and the cleanup aborts any in-flight request so an out-of-order response cannot win.

**WHY at the mechanism level:** the derivations never needed to be state, so they never needed effects; keeping the fetch keyed on `range`/`metric` (not on downstream derived values that churn across renders) is what reduces it to a single request. The `AbortController` cleanup closes the race the old chain created between overlapping fetches.

**Production symptom:** the chart visibly steps through partial states (new range, old axis, old series) on every selection, wasted duplicate API calls that inflate cost and can render stale data if an earlier request resolves last, and a Profiler flame showing a burst of six renders per interaction.

---
