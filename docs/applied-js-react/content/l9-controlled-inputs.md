> Module **9.3** (Controlled Inputs) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [9.2](./l9-retained-memory.md) · Next: [9.4](./l9-events-submit.md)

# L9 · Controlled Inputs

Controlled inputs look trivial until the value comes from a fetch, the field reformats as you type, or the control is a checkbox instead of a text box. After this module you can catch the three bugs that ship most often: an input that silently flips from uncontrolled to controlled when async data lands, a `value` with no `onChange` (or a formatter) that freezes or jumps the caret, and a checkbox or number input bound as if it were plain text so the stored data is `"on"`, `"25"`, or `NaN`.

### ajr-l9-controlled-uncontrolled-switch: Controlled to uncontrolled switch

- **id:** `ajr-l9-controlled-uncontrolled-switch`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, forms, controlled

#### Learn

React decides whether an `<input>` is *controlled* or *uncontrolled* on every single render, and it decides based on one thing: is the `value` prop `null`/`undefined`, or is it a real string? If `value` is `undefined`, React treats the input as uncontrolled and lets the DOM own the text. If `value` is a string, React treats it as controlled and forces the DOM to match that string. The bug is switching between those two states during the component's life.

Here is the setup that ships to production constantly:

```tsx
function Profile({ userId }: { userId: string }) {
  const [user, setUser] = useState<{ name: string } | undefined>();
  useEffect(() => {
    fetchUser(userId).then(setUser); // resolves after ~1s
  }, [userId]);

  return <input value={user?.name} onChange={handleChange} />;
}
```

On the first render `user` is `undefined`, so `user?.name` is `undefined`, so `value={undefined}`: React sees an uncontrolled input. One second later the fetch resolves, `user` becomes `{ name: "Ada" }`, and now `value="Ada"`: React sees a controlled input. You just changed the input's identity mid-life. React logs: `Warning: A component is changing an uncontrolled input to be controlled.` Worse, the DOM value that the user may have already typed can get blown away when React takes control, and the caret can jump.

The fix is to pick one mode for the field's entire lifetime. If you want it controlled (the usual choice with `onChange`), never let `value` be `undefined`:

```tsx
<input value={user?.name ?? ""} onChange={handleChange} />
```

The `?? ""` coerces the pre-fetch state to an empty string, so the input is controlled from the very first render. The alternative is to gate rendering: return a skeleton until `user` exists, then mount the input once with real data. Either works; mixing them does not.

**Interview nuance:** the fallback differs by control type. For a text input use `?? ""`. For a checkbox the controlled prop is `checked`, so default `checked={user?.agree ?? false}`, not `value`. For a number input `value` is still a string in the DOM, so default `?? ""` (an empty string, not `0`, so the field can be blank). Handing `value={0}` when you meant "empty" shows a literal zero the user has to delete.

**Interview nuance:** `value={undefined}` is not "a controlled input holding undefined." There is no such thing. `undefined` and `null` are the *signal* that means "this input is uncontrolled." That is why the warning talks about a mode change, not a value change.

Recap: React reads controlled-ness from whether `value` is nullish per render; going from `undefined` to a string flips the mode and warns; default the value (`?? ""`) or gate the render so the mode is stable for the field's whole life.

#### See it live

**Demo (react-demo):** an input whose `value` starts `undefined` and becomes `"Ada"` after a simulated 1s fetch, with a toggle for the `?? ""` fix.

A widget with a single text input, a red console-warning banner above it (dark, monospace, hidden until a warning fires), and a "Loading user..." spinner that runs for 1000ms before the fake fetch resolves to `{ name: "Ada" }`. A checkbox labeled "Apply the `?? \"\"` fix" switches the input between the two bindings. There is a "Refetch" button to replay the sequence. The input is built around this snippet, and the widget swaps which `value` line is active based on the checkbox:

```tsx
const [user, setUser] = useState<{ name: string } | undefined>();
useEffect(() => {
  const t = setTimeout(() => setUser({ name: "Ada" }), 1000);
  return () => clearTimeout(t);
}, [tick]); // tick bumps on Refetch

// fix off:  <input value={user?.name} onChange={...} />
// fix on:   <input value={user?.name ?? ""} onChange={...} />
```

**Watch:** with the fix off, hit Refetch and start typing during the 1s window. When the fetch lands, the red banner lights up with the "uncontrolled to controlled" warning and your caret glitches or your text gets replaced by "Ada". Turn the fix on and repeat: the banner stays dark and typing survives the fetch. This is an honest illustration of React's real warning (the banner is a scripted stand-in for the DevTools console message, since the sandboxed console is not shown), but the caret/reset behavior it demonstrates is the actual DOM behavior.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `<input value={user?.name} onChange={...} />` where `user` starts `undefined`, by defaulting the value to `""` or gating render until data loads. Say why the original warns and what it does to a user mid-type.

**Think about:**
- How does React decide controlled-ness each render?
- What is the fix for numbers and checkboxes?
- Why does `value={undefined}` equal uncontrolled?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The input starts uncontrolled because on the first render `user` is `undefined`, so `value={undefined}`, and React reads a nullish `value` as "the DOM owns this field." When the fetch resolves, `value` becomes the string `"Ada"`, so React now reads it as controlled and takes ownership. That mid-life mode switch is exactly what React warns about, and taking control can overwrite whatever the user typed and move the caret.

Fix by keeping the field controlled from render one:

```tsx
<input value={user?.name ?? ""} onChange={handleChange} />
```

Or gate the render so the input mounts once, already populated:

```tsx
if (!user) return <InputSkeleton />;
return <input value={user.name} onChange={handleChange} />;
```

**WHY at the mechanism level:** React does not store a persistent "this is a controlled input" flag from mount. It recomputes controlled-ness every render purely from whether `value` (or `checked`) is `null`/`undefined`. `?? ""` guarantees a non-nullish string on the first render, so the decision is "controlled" every time and never flips.

**How to spot it in review:** any `value={someState}` (or `value={obj?.field}`) where `someState` can be `undefined` or `null`, especially when it is seeded from a fetch, a query result, or an optional field. The tell is an optional chain or a state initialized without a default.

**Production symptom:** a console warning ("changing an uncontrolled input to be controlled") plus caret jumps or lost keystrokes right when async data lands, which QA often reports as "the form clears itself after it loads."

**Common misconception corrected:** `value={undefined}` is not a valid controlled value. There is no controlled input holding `undefined`. Nullish `value` is the literal signal for "uncontrolled," which is why the fix is to make it a string, not to "set it to undefined on purpose."

**Self-check rubric:**
- [ ] I stated React decides controlled-ness from whether `value` is nullish, per render.
- [ ] I gave the `?? ""` default (or a render gate) as the fix.
- [ ] I named the correct default for numbers (`?? ""`) and checkboxes (`checked ?? false`).
- [ ] I explained the mode switch overwrites the DOM value / moves the caret.
- [ ] I corrected the "undefined is a controlled value" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Ship-blocker at a fintech settings page. A `<PaymentForm>` loads the saved profile with SWR: `const { data } = useSWR("/api/profile", fetcher)`. It renders `<input value={data.email} .../>`, `<input type="number" value={data.limit} .../>`, and `<input type="checkbox" checked={data.autopay} .../>`. On slow connections users report the whole form "flashes and wipes what I typed" a second after load, and the number field shows `0` before data arrives. Fix all three fields and explain the shared root cause.

**Model answer (revealed on demand):**

All three fields are uncontrolled on the first render because `data` is `undefined` while SWR is fetching, then flip to controlled when `data` arrives. Same root cause across the form: nullish controlled props on render one, real values later.

```tsx
const { data } = useSWR("/api/profile", fetcher);
const profile = data ?? { email: "", limit: undefined, autopay: false };

<input value={profile.email ?? ""} onChange={onEmail} />
<input type="number" value={profile.limit ?? ""} onChange={onLimit} />
<input type="checkbox" checked={profile.autopay ?? false} onChange={onAutopay} />
```

The email defaults to `""`. The number field defaults to `""` (not `0`), which is why the "shows 0 before load" complaint disappears: an empty string renders a blank number field, while `0` renders a literal zero. The checkbox uses `checked` with a `false` default, because a checkbox's controlled prop is `checked`, not `value`; binding it via `value` would leave it perpetually uncontrolled and warn separately.

The cleaner pattern at scale is to gate once: `if (!data) return <FormSkeleton />;` so the form mounts a single time with real data and no field ever changes mode. On a settings page a skeleton is usually better UX than an empty flash-then-fill anyway.

**WHY at the mechanism level:** SWR returns `data === undefined` during the first fetch, so every `value`/`checked` reads nullish and React marks each control uncontrolled. When `data` resolves, React re-decides and takes control of each field in the same commit, overwriting any in-progress DOM value: that is the "flash and wipe." Defaulting or gating removes the nullish first render, so the mode is stable and there is nothing to overwrite.

**Production symptom:** users on slow networks lose keystrokes typed during the load window, a phantom `0` in numeric fields, and a cluster of "uncontrolled to controlled" warnings in error logging (Sentry) correlated with high-latency sessions.

### ajr-l9-value-onchange-trap: The value/onChange trap and caret jump

- **id:** `ajr-l9-value-onchange-trap`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, forms, inputs

#### Learn

A controlled input has a hard rule: whatever is in `value` is what the DOM shows, every render, full stop. React overwrites the DOM's text from `value` on each commit. That single fact explains two classic bugs.

Bug one, the frozen input. If you write `value={state}` with no `onChange`, you have told React "the text is always `state`." The user presses a key, the browser tentatively updates the DOM, but there is no handler to update `state`, so on the next render React writes the old `state` back and the character vanishes. The field is read-only in practice.

```tsx
<input value={query} /> // frozen: typing does nothing
```

The fix is to wire `onChange` so state tracks the keystrokes. If you actually *want* a non-editable field showing a value, say so explicitly with `readOnly` (which silences React's own warning about this exact mistake):

```tsx
<input value={query} onChange={(e) => setQuery(e.target.value)} />
// or, deliberately non-editable:
<input value={query} readOnly />
```

**Interview nuance:** React's `onChange` is not the DOM's `change` event. The DOM `change` fires on blur (when the field loses focus). React's `onChange` is wired to the native `input` event, so it fires on *every keystroke*. If you expected `onChange` to fire only when the user leaves the field, you want `onBlur`.

Bug two, the caret jump. Because React rewrites the DOM value from `value` on every render, if your `onChange` *reformats* the string, the caret gets repositioned. Consider a currency field that inserts commas as you type:

```tsx
function Amount() {
  const [value, setValue] = useState("");
  return (
    <input
      value={value}
      onChange={(e) => setValue(format(e.target.value))} // "1000" -> "1,000"
    />
  );
}
```

Type into the middle of "1,000" and the caret leaps to the end after every key. Why: the browser sets the caret at position N after your keystroke, then React overwrites the whole value string (now a different length because a comma was added or moved), and the browser has no way to know where "position N" maps to in the new string, so it defaults the caret to the end.

Two fixes. The simplest is to format on blur, not on every keystroke: keep the raw digits in state while typing, and reformat in `onBlur`. The user types freely, and the pretty formatting appears when they leave the field. If you must reformat live, you have to save and restore the selection yourself around the state update, adjusting for the length change:

```tsx
onChange={(e) => {
  const el = e.target;
  const pos = el.selectionStart ?? 0;
  const before = el.value.length;
  const next = format(el.value);
  setValue(next);
  requestAnimationFrame(() => {
    const delta = next.length - before;
    el.setSelectionRange(pos + delta, pos + delta);
  });
}}
```

Recap: a controlled input's DOM value is overwritten from state each render, so `value` without `onChange` freezes it (use `onChange`, or `readOnly` if intentional), and reformatting on every keystroke changes the string length and kicks the caret to the end (format on blur, or preserve and restore the selection).

#### See it live

**Demo (react-demo):** a frozen `value`-only input, then a currency formatter that jumps the caret, with a selection-preserving fix you can toggle.

A widget with three stacked inputs, each with a label:
1. **Frozen** (`value={q}`, no `onChange`): typing produces nothing.
2. **Live formatter, naive** (`onChange={e => setValue(format(e.target.value))}`): reformats to comma-grouped currency on every key.
3. **Live formatter, fixed** (same, but restores the selection in `requestAnimationFrame`).

Each input shows a small caption underneath with the current caret index (`selectionStart`) so the jump is visible as a number, not just a feeling. A "Format on blur instead" toggle collapses inputs 2 and 3 into a single field that stays raw while typing and formats on blur. The formatter is built around:

```tsx
const format = (raw: string) =>
  raw.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
// naive:  onChange={(e) => setValue(format(e.target.value))}
// fixed:  save selectionStart, setValue, restore in requestAnimationFrame
```

**Watch:** in input 1, keys do nothing and the caret caption never moves, proving the missing `onChange` freezes the field. In input 2, type "1234567" and click into the middle: after each key the caret index snaps back to the end (you watch the caption jump to the max index). In input 3, do the same and the caret index stays where you put it. This is real DOM behavior driven by React overwriting the value each render; nothing here is approximated.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Wire `onChange` to a frozen `<input value={state} />`, then fix a currency formatter that jumps the cursor by preserving the selection or by formatting on blur. Explain why the frozen input cannot be typed in and why the caret jumps.

**Think about:**
- Why does `value` without `onChange` freeze the input?
- What causes the caret jump?
- Does React `onChange` map to the DOM `input` or `change` event?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The frozen input cannot be typed in because `value={state}` makes it controlled: React writes `state` into the DOM on every render. With no `onChange`, keystrokes never update `state`, so the next render restores the old value and the character disappears. Wire `onChange` (or mark it `readOnly` if it is meant to be non-editable):

```tsx
<input value={query} onChange={(e) => setQuery(e.target.value)} />
```

The caret jumps in the formatter because reformatting changes the string length. The browser places the caret at position N after the keystroke; React then overwrites the entire `value` with a reformatted string of a different length, and the caret defaults to the end. Fix by formatting on blur:

```tsx
const [raw, setRaw] = useState("");
<input
  value={raw}
  onChange={(e) => setRaw(e.target.value.replace(/\D/g, ""))}
  onBlur={() => setRaw((r) => format(r))}
/>
```

or by restoring the selection around the update, adjusting for the length delta:

```tsx
onChange={(e) => {
  const el = e.target, pos = el.selectionStart ?? 0, before = el.value.length;
  const next = format(el.value);
  setValue(next);
  requestAnimationFrame(() => {
    const delta = next.length - before;
    el.setSelectionRange(pos + delta, pos + delta);
  });
}}
```

**WHY at the mechanism level:** a controlled input is not "the DOM plus React watching it." React *owns* the DOM value and re-imposes `value` on every commit. Freezing happens because state never changes; the caret jump happens because the imposed string has a new length and the native caret position no longer maps.

**How to spot it in review:** `value=` with no `onChange` and no `readOnly` (frozen), and any `onChange` that transforms `e.target.value` before storing it (`.toUpperCase()`, comma grouping, phone masks) without touching the selection or deferring to blur.

**Production symptom:** an input nobody can type into, or a cursor that leaps to the end on every keypress so users cannot edit the middle of what they typed. Mask fields (currency, phone, card number) are the usual offenders.

**Common misconception corrected:** React's `onChange` does not fire on blur like the native `change` event. It is bound to the native `input` event and fires on every keystroke. If you want blur semantics, use `onBlur`.

**Self-check rubric:**
- [ ] I explained the frozen input as React re-imposing `value` with no state update.
- [ ] I wired `onChange` (and mentioned `readOnly` for intentional freezing).
- [ ] I attributed the caret jump to a length change plus full value overwrite.
- [ ] I gave a working fix (format on blur, or save/restore selection).
- [ ] I corrected the "`onChange` fires on blur" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Checkout page, phone-number field. Product wants live masking: as the user types `5551234567` it should render `(555) 123-4567`. QA files a P1: on iOS and desktop, editing the area code is impossible because the caret flies to the end after each digit, and pasting a number sometimes drops characters. You have `onChange={(e) => setPhone(mask(e.target.value))}`. Fix it so live masking works and editing the middle is possible, and explain the trade-off you would actually ship.

**Model answer (revealed on demand):**

The caret flies to the end because `mask()` changes the string length on nearly every keystroke (adding `(`, `)`, spaces, and a dash), and React overwrites the whole `value`, so the native caret position no longer maps and defaults to the end. Live masking with correct caret handling requires restoring the selection, but a robust version must count *digits* before the caret, not raw characters, because the mask characters shift positions:

```tsx
function onChange(e: React.ChangeEvent<HTMLInputElement>) {
  const el = e.target;
  const caret = el.selectionStart ?? 0;
  const digitsBefore = el.value.slice(0, caret).replace(/\D/g, "").length;
  const next = mask(el.value);
  setPhone(next);
  requestAnimationFrame(() => {
    // walk the masked string until we have passed digitsBefore digits
    let seen = 0, i = 0;
    for (; i < next.length && seen < digitsBefore; i++) {
      if (/\d/.test(next[i])) seen++;
    }
    el.setSelectionRange(i, i);
  });
}
```

Counting digits (not characters) is what makes editing the area code work: inserting a digit at the front shifts every mask symbol, so a character-based `pos + delta` drifts, while "put the caret after the Nth digit" is stable.

The trade-off I would actually ship: unless design insists on live masking, format on blur and keep the field raw (or lightly grouped) while typing. It is dramatically less code, has zero caret bugs, and survives paste, autofill, and mobile IMEs (which fire composition events that break naive caret math). Live masking is a real feature but a real maintenance cost; I would push for on-blur formatting and only build the digit-counting version if the live mask is a hard product requirement.

**WHY at the mechanism level:** React re-imposes the masked `value` every render, so any caret fix must run *after* the commit (hence `requestAnimationFrame` or a layout effect) and must be expressed in a coordinate that survives reformatting, which is digit count, not character offset.

**Production symptom:** users cannot correct a mistyped area code, paste loses trailing digits, and mobile users on IME keyboards see characters reorder, all clustering as "phone field is broken" tickets that are hard to reproduce on a fast desktop.

### ajr-l9-input-type-traps: Input-type traps: checkbox, number, multi-select

- **id:** `ajr-l9-input-type-traps`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, forms, inputs

#### Learn

"Controlled input" is not one contract. Each control type has its own controlled prop and its own idea of what `e.target` gives you. Bind them all as if they were text boxes and you store the wrong data: a boolean saved as the string `"on"`, an age saved as `"25"` or `NaN`, a multi-select that only ever captures one value.

**Checkbox.** The controlled prop is `checked`, not `value`, and you read `e.target.checked` (a boolean), not `e.target.value`. A checkbox's `value` attribute defaults to the literal string `"on"`, so if you bind `value` and read `e.target.value` you will store `"on"` regardless of state.

```tsx
// WRONG: stores "on"
<input type="checkbox" value={agree} onChange={(e) => setAgree(e.target.value)} />
// RIGHT: stores a boolean
<input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
```

**Number.** A number input's `e.target.value` is still a *string* (`"25"`), even with `type="number"`. Do arithmetic on it and you get string concatenation or `NaN`. Use `e.target.valueAsNumber`, which the DOM parses for you, but guard the empty case: an empty number field gives `valueAsNumber === NaN`, so you need to decide what "blank" means (usually `undefined` or `""`, not `0`).

```tsx
// WRONG: age is a string, or NaN math later
<input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
// RIGHT: real number, empty handled
<input
  type="number"
  value={age ?? ""}
  onChange={(e) => {
    const n = e.target.valueAsNumber;
    setAge(Number.isNaN(n) ? undefined : n);
  }}
/>
```

**Multi-select.** A `<select multiple>` does not report its choices through `e.target.value` (that only gives the first selected option). The selected options live on `e.target.selectedOptions`, an `HTMLCollection` you spread and map. Store an array, and set `value` to an array too.

```tsx
<select
  multiple
  value={tags} // an array of strings
  onChange={(e) => setTags([...e.target.selectedOptions].map((o) => o.value))}
>
```

**Interview nuance:** the theme is that `e.target.value` is a lowest-common-denominator string API. The DOM exposes typed accessors (`checked`, `valueAsNumber`, `valueAsDate`, `selectedOptions`) precisely because `value` cannot represent a boolean, a number, or a set. Reaching for the typed accessor is not a nicety; it is how you avoid storing `"on"` and `"25"`.

**Interview nuance:** "number inputs give you numbers" is false. `type="number"` controls the keyboard and validation UI, not the JavaScript type of `.value`. Only `.valueAsNumber` returns a number.

Recap: each control has its own controlled contract. Checkbox uses `checked` and `e.target.checked`; number keeps `value` as a string so read `valueAsNumber` and guard `NaN`; multi-select reads `[...selectedOptions].map(o => o.value)` and stores an array.

#### See it live

**Demo (react-demo):** a form mixing a checkbox, a number input, and a multi-select, with a live JSON state panel and a "correct bindings" toggle.

A widget with a small form (Agree checkbox, Age number field, Interests multi-select) and, beside it, a live `<pre>` panel showing the current state object as formatted JSON that updates on every interaction. A toggle labeled "Use correct bindings" flips all three fields between the wrong and right implementations. The form is built around:

```tsx
// WRONG bindings
onChange={(e) => setAgree(e.target.value)}          // checkbox
onChange={(e) => setAge(e.target.value)}            // number
onChange={(e) => setTags(e.target.value)}           // multi-select

// RIGHT bindings
onChange={(e) => setAgree(e.target.checked)}
onChange={(e) => setAge(Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber)}
onChange={(e) => setTags([...e.target.selectedOptions].map((o) => o.value))}
```

**Watch:** with wrong bindings, tick the checkbox and the JSON panel shows `"agree": "on"` (a string, not `true`); type in the age and it shows `"age": "25"` (quoted string) or `"age": null` when blank; select two interests and `"interests"` stays stuck on a single value. Flip "Use correct bindings" and redo the same clicks: the panel now shows `"agree": true`, `"age": 25` (no quotes), and `"interests": ["react", "sql"]` as a real array. This is real behavior; the JSON panel is just `JSON.stringify(state)` so you can see the stored types directly.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix a form so a checkbox binds `checked`/`e.target.checked`, a number reads `valueAsNumber` (handling empty), and a multi-select stores an array. Explain, for each, what the wrong binding stores and why.

**Think about:**
- What does `e.target.value` return for a checkbox and a number?
- How do you read a multi-select?
- How do you handle empty number input?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Each control needs its own binding:

```tsx
// checkbox: controlled by `checked`, read `e.target.checked`
<input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />

// number: value stays a string in the DOM, read `valueAsNumber`, guard NaN
<input
  type="number"
  value={age ?? ""}
  onChange={(e) => {
    const n = e.target.valueAsNumber;
    setAge(Number.isNaN(n) ? undefined : n);
  }}
/>

// multi-select: read selectedOptions, store and bind an array
<select
  multiple
  value={tags}
  onChange={(e) => setTags([...e.target.selectedOptions].map((o) => o.value))}
/>
```

**WHY at the mechanism level:** `e.target.value` is a string API shared by every input type, so it cannot carry a boolean, a number, or a multi-selection. A checkbox's `value` attribute is the literal `"on"`, so `e.target.value` returns `"on"` whether or not it is checked; the boolean lives on `checked`. A number input keeps `.value` as a string (`type="number"` only affects the UI and validation), so arithmetic on it concatenates or produces `NaN`; `.valueAsNumber` is the parsed number, and it is `NaN` when the field is empty, which is why you guard it. A `<select multiple>` can hold several selections, but `.value` reports only the first; the full set is on `.selectedOptions`.

**How to spot it in review:** `e.target.value` on a `type="checkbox"`, any arithmetic or numeric comparison on a `type="number"` field's `.value`, and single-string state (or `e.target.value`) behind a `<select multiple>`. Also `value={...}` on a checkbox instead of `checked={...}`.

**Production symptom:** booleans stored and sent to the API as `"on"` (so backend truthiness checks pass even when unchecked in some encodings), ages and prices stored as strings that break `>` comparisons and sorting or land as `NaN`, and multi-selects that silently save only one choice so users lose selections.

**Common misconception corrected:** `type="number"` does not give you a number. `.value` is still a string; only `.valueAsNumber` is a number, and it is `NaN` when empty.

**Self-check rubric:**
- [ ] Checkbox: `checked` prop and `e.target.checked` (not `value`).
- [ ] Number: `valueAsNumber` with an explicit empty/`NaN` guard.
- [ ] Multi-select: `[...selectedOptions].map(o => o.value)`, array in and out.
- [ ] I stated what each wrong binding actually stores (`"on"`, `"25"`/`NaN`, one value).
- [ ] I corrected the "number inputs give numbers" misconception.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Analytics onboarding form posts to `/api/signup`. The backend rejects ~8% of submissions with validation errors nobody can reproduce locally. The payload logs show `{ marketingOptIn: "on", teamSize: "12", roles: "engineer" }` even though the user picked two roles. The React form uses `e.target.value` for every field: a consent checkbox, a `type="number"` team size, and a `<select multiple>` of roles. Fix the bindings, and explain how each wrong type slips past local testing but fails at the API boundary.

**Model answer (revealed on demand):**

The three fields are all bound through the string `value` channel, so each stores the wrong type:

```tsx
<input
  type="checkbox"
  checked={form.marketingOptIn}
  onChange={(e) => update("marketingOptIn", e.target.checked)} // boolean
/>
<input
  type="number"
  value={form.teamSize ?? ""}
  onChange={(e) => {
    const n = e.target.valueAsNumber;
    update("teamSize", Number.isNaN(n) ? undefined : n); // number or undefined
  }}
/>
<select
  multiple
  value={form.roles}
  onChange={(e) =>
    update("roles", [...e.target.selectedOptions].map((o) => o.value)) // string[]
  }
/>
```

`marketingOptIn: "on"` is the checkbox's literal `value` attribute leaking through because the code read `e.target.value` instead of `e.target.checked`. `teamSize: "12"` is the number input's string `.value`; the API's Zod schema `z.number()` rejects the string. `roles: "engineer"` is a single string because `e.target.value` on a multi-select returns only the first option, so the second role is silently dropped and a `z.array(z.string())` check fails.

**WHY it slips past local testing:** locally you probably test the happy path with one role selected and a filled-in number, where a string `"12"` may coerce far enough to look fine and a single role happens to match the shape. The failures cluster on real users who leave the number blank (`NaN`/`""`), pick multiple roles, or hit a strict schema, which is why it is an ~8% tail you cannot reproduce by hand. The types are wrong on every submit; only some backends and inputs expose it.

**Production symptom:** a steady percentage of rejected signups, booleans arriving as `"on"`/absent, numbers as quoted strings that fail schema validation, and multi-selects that undercount, all invisible until you inspect the actual request payload rather than the UI.

**How to spot it in review:** grep the form for `e.target.value` and check the input type on each: any checkbox, `type="number"`, or `<select multiple>` using it is a bug. Prefer the typed accessors (`checked`, `valueAsNumber`, `selectedOptions`) at the boundary so the state already holds API-shaped data.
