> Module **10.1** (UI State Types) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [9.5](./l9-forms-focus-a11y.md) · Next: [10.2](./l10-unknown-guards.md)

# L10 · UI State Types

After this module you can catch the family of bugs that come from letting your types describe more states than your UI actually has: a spinner rendering on top of an error on top of stale data, a new status shipping a silent blank screen, and a `useState([])` whose setter refuses the real data you fetched. You will model UI status as a discriminated union, enforce that every variant is handled with `never`, and pin down `useState` inference so the compiler catches the bad render before it can build.

### ajr-l10-discriminated-union-state: Discriminated union for UI status

- **id:** `ajr-l10-discriminated-union-state`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** typescript, discriminated-union, state

#### Learn

Most async UI starts life as a boolean bag:

```tsx
type State = { isLoading: boolean; error?: Error; data?: User };
```

It reads fine, and it is a trap. Count the states it allows. Three independent fields (one boolean, two optionals treated as present/absent) give you `2 * 2 * 2 = 8` combinations. How many are actually legal? Four: idle (nothing set), loading, error, and success. The other four are nonsense that the type still permits: `isLoading: true` with an `error`, `isLoading: true` with `data`, an `error` and `data` at the same time, and the empty "loaded nothing, no error, not loading" state. Every one of those is a render you never want, and your JSX has to defend against each by hand.

The fix is to make the illegal states unrepresentable by collapsing the fields onto a single discriminant:

```tsx
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: User };
```

`status` is the discriminant, and it must be a **literal type** (`"idle"`, not `string`). That is what lets TypeScript narrow: inside `if (state.status === "success")` the compiler knows you are in exactly that member of the union, so `state.data` is a `User`, guaranteed present, no `data!` non-null assertion anywhere. A bare `string` discriminant would match every member and narrow nothing.

Now render off the discriminant, not off correlated flags:

```tsx
switch (state.status) {
  case "idle": return <Idle />;
  case "loading": return <Spinner />;
  case "error": return <ErrorView error={state.error} />;
  case "success": return <UserCard user={state.data} />;
}
```

There is no path here that shows a spinner and an error together, because there is no value that carries both. You did not add a guard; you removed the possibility.

**Interview nuance:** the payoff is not "TypeScript catches the bug later." Types are erased at build time and do not exist at runtime. The payoff is that the bad render is **unbuildable**: `{ status: "loading", error }` is a type error at the point you try to construct it, so the impossible UI never reaches a browser. That distinction ("made unrepresentable" vs "validated at runtime") is exactly what a senior reviewer is listening for.

**Interview nuance:** this is the runtime-cost-free version of Parse-Don't-Validate. The union does the narrowing once, at the boundary where you set state, instead of re-checking `if (data)` in every consumer.

Recap: n correlated booleans/optionals allow `2^n` states but only a few are legal; a discriminated union on a literal `status` collapses the space to the legal set, and narrowing on the discriminant makes each variant's payload provably present so you can delete your `!` assertions and your defensive guards.

#### See it live

**Demo (react-demo):** two side-by-side panels wired to three checkboxes (`isLoading`, `error`, `data`): the left renders a boolean-bag component, the right renders a discriminated-union component, so you can try to produce an impossible combination in each.

The widget renders two `Preview` columns. Above them sit three checkboxes. The left column feeds their values straight into a boolean-bag renderer. The right column feeds a `<select>` of the four `status` literals (the checkboxes are disabled on that side, replaced by the single dropdown) so illegal combos are literally not expressible in the control.

```tsx
type BagState = { isLoading: boolean; error?: Error; data?: User };

function BagPreview({ s }: { s: BagState }) {
  return (
    <div>
      {s.isLoading && <div className="spinner">loading…</div>}
      {s.error && <div className="error">{s.error.message}</div>}
      {s.data && <div className="card">{s.data.name}</div>}
    </div>
  );
}

type UnionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: User };

function UnionPreview({ s }: { s: UnionState }) {
  switch (s.status) {
    case "idle": return <div>idle</div>;
    case "loading": return <div className="spinner">loading…</div>;
    case "error": return <div className="error">{s.error.message}</div>;
    case "success": return <div className="card">{s.data.name}</div>;
  }
}
```

**Watch:** tick all three checkboxes on the bag side and the left panel stacks a spinner over an error over a stale card at the same time, which is the production bug. On the union side the control only offers one `status` at a time, so that stack is not reachable; the closest you can do is switch between the four legal previews. This demo illustrates a **compile-time** guarantee (the `{ status: "loading", error }` combination is a type error, which a browser cannot show you), so the union side enforces legality through the disabled/dropdown control rather than by catching an error at runtime. The badge under the union panel reads "impossible states: 0 representable."

#### Apply: think, then answer (save, then reveal)

**Prompt:** Refactor `{ isLoading: boolean; error?: Error; data?: User }` into a discriminated union on `status` and render off `status`, then state the exact impossible state you eliminated.

**Think about:**
- How many states do n booleans allow versus how many are legal?
- Why must the discriminant be a literal type?
- What does the union do to `data!` assertions?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Corrected type and render:

```tsx
type UserState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: User };

function render(state: UserState) {
  switch (state.status) {
    case "idle": return <Idle />;
    case "loading": return <Spinner />;
    case "error": return <ErrorView error={state.error} />; // error: Error, no ?
    case "success": return <UserCard user={state.data} />;   // data: User, no !
  }
}
```

WHY at the mechanism level: the original three fields allow `2^3 = 8` combinations, of which only four are legal. The union declares those four members explicitly, so no other value has a type. Because `status` is a literal type, TypeScript uses it as the discriminant: comparing `state.status === "success"` narrows the whole variable to the `success` member, which makes `state.data` a `User` with no optionality. That is why every `data!` non-null assertion disappears; the payload is provably present inside its branch. The impossible state you eliminated most visibly is `{ isLoading: true, error: someError, data: someUser }`, that is, "loading and errored and loaded at once," plus its cousins like error-and-data together.

HOW to spot it in review: look for a single state type carrying multiple correlated optional fields or booleans (`isLoading`, `isError`, `error?`, `data?`) where setting one implies the others must be a certain way. That correlation is the tell that the fields should be one discriminant.

PRODUCTION SYMPTOM: components render impossible UI, most classically a spinner painted over an error message over a stale data card when a retry sets `isLoading: true` without clearing the previous `error`/`data`.

COMMON MISCONCEPTION corrected: "the type will catch the bug at runtime." Types are erased; there is no `status` check happening at runtime unless you write one. The union's value is that the illegal render is unrepresentable at build time, so it never compiles, not that it is caught later.

**Self-check rubric:**
- [ ] The type is a union of object members, each with a literal `status`.
- [ ] `error` and `data` live only on the members that own them, not as top-level optionals.
- [ ] Rendering switches on `state.status` with no `!` or `?.` on the payloads.
- [ ] You named a concrete eliminated combo (for example loading + error + data).
- [ ] You said the guarantee is compile-time / unrepresentable, not runtime-caught.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Checkout flow, three async steps." Your checkout state currently tracks `isValidating`, `isSubmitting`, `paymentError?`, `receipt?`, and `retryCount`. A bug report says users sometimes see the "Payment failed" banner and the "Order confirmed" receipt on the same screen. Model this as a discriminated union that makes that pair impossible, and decide where `retryCount` lives.

**Model answer (revealed on demand):**

The two booleans plus two optionals allow the illegal `paymentError` and `receipt` present together, which is exactly the reported "failed + confirmed" screen. Collapse the phases onto one discriminant and attach each payload to the phase that owns it:

```tsx
type CheckoutState =
  | { status: "editing" }
  | { status: "validating" }
  | { status: "submitting"; attempt: number }
  | { status: "failed"; error: PaymentError; attempt: number }
  | { status: "confirmed"; receipt: Receipt };
```

`retryCount` is not a top-level field; it is meaningful only while you are submitting or after a failure, so it rides as `attempt` on `submitting` and `failed`. On `confirmed` there is no `attempt` and no `error`, so the banner-plus-receipt render has no value that can produce it.

WHY at the mechanism level: the failed and confirmed states are now distinct members with disjoint payloads. There is no single `CheckoutState` value that carries both `error` and `receipt`, so the JSX that reads `state.error` only type-checks inside `case "failed"`, and `state.receipt` only inside `case "confirmed"`. The compiler forbids the mixed screen at construction time.

HOW to spot it in review: a state with two or more boolean phase flags plus optional result fields, especially when a bug describes two mutually exclusive outcomes appearing together. Also watch for `retryCount`-style counters kept at the top level "because we might need them," which quietly re-widens the state space.

PRODUCTION SYMPTOM: a retry sets `isSubmitting`/`paymentError` without clearing the earlier `receipt`, so a customer sees a confirmed order and a failure banner and files a support ticket about being double-charged (or not charged).

MISCONCEPTION corrected: you do not need `retryCount` at the top level to "remember" it across phases; you carry it only on the phases where it is defined, and it is simply absent (unrepresentable) on `confirmed`, which is the correct model.

### ajr-l10-exhaustiveness-never: Exhaustiveness checking with never

- **id:** `ajr-l10-exhaustiveness-never`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** typescript, exhaustiveness, never

#### Learn

A discriminated union stops impossible states. It does not, by itself, stop you from forgetting to handle a state you added later. That is the second bug: six months on, someone adds `{ status: "cancelled" }` to the union, and your `switch` that handled four cases now silently falls through and renders nothing. TypeScript said nothing, because a `switch` with no exhaustiveness enforcement is happy to handle a subset.

The enforcement mechanism is `never`. TypeScript narrows a union as you eliminate members: after `case "idle"`, `case "loading"`, `case "error"`, and `case "success"`, the value in the `default` branch has no members left, so its type is `never`. If you try to assign that leftover to a `never`-typed variable, it type-checks today. The moment someone adds a fifth variant, the leftover in `default` becomes that fifth member, which is **not assignable to `never`**, and the file stops compiling.

The canonical pattern is a tiny helper:

```tsx
function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
}

function render(state: State) {
  switch (state.status) {
    case "idle": return <Idle />;
    case "loading": return <Spinner />;
    case "error": return <ErrorView error={state.error} />;
    case "success": return <UserCard user={state.data} />;
    default: return assertNever(state);
  }
}
```

Two things make this work, and both are easy to defeat. First, **every handled branch must `return` or `throw`.** If one `case` falls through without returning, that member is still "live" when control reaches `default`, so the value there is not `never`, and the check passes even though a case is unhandled. Exhaustiveness depends on the narrowing being complete. Second, the discriminant must actually be checked in the `switch` head, not something else.

**Interview nuance:** `default: return null` is the anti-pattern this replaces. It looks harmless and even defensive, but it is exactly what turns a new-variant bug into a silent blank screen. `return null` accepts any leftover type, including a brand-new variant, so the compiler has no reason to complain. `assertNever(state)` makes the same spot a compile error. The rule of thumb: a `default` in a discriminated-union switch should either be impossible-by-design (assertNever) or a deliberately handled real case, never a quiet fallback.

**Interview nuance:** `assertNever` is both a compile-time gate and a runtime tripwire. If a value the types said could not exist reaches it at runtime (bad data from the network, an `as` cast that lied), it throws loudly instead of rendering nothing, which turns a silent blank into a visible, traceable error.

Recap: exhaustiveness is enforced by assigning the `default` leftover to `never`; once every variant is handled the leftover is `never` and compiles, and adding a variant makes it non-assignable and breaks the build. It only holds if every branch returns/throws, and `default: return null` is the trap that silently disables it.

#### See it live

**Demo (react-demo):** two sibling `switch` renderers over the same `status` union. The left uses `default: assertNever(state)`; the right uses `default: return null`. A toggle "add 5th variant (`refreshing`)" injects a new member into the shared union type, and an inline type-error panel shows each switch's diagnostic.

The widget shows two code panels and one toggle. Both panels render the same four `status` cases. When you flip "add 5th variant," the shared `State` type gains `{ status: "refreshing" }`, and the demo surfaces the simulated TypeScript diagnostic for each panel under it, plus what each renders at runtime for a `refreshing` value.

```tsx
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: User };
// toggle adds:  | { status: "refreshing" }

function Exhaustive({ state }: { state: State }) {
  switch (state.status) {
    case "idle": return <Idle />;
    case "loading": return <Spinner />;
    case "error": return <ErrorView error={state.error} />;
    case "success": return <UserCard user={state.data} />;
    default: return assertNever(state); // ← breaks here when a variant is added
  }
}

function Loose({ state }: { state: State }) {
  switch (state.status) {
    case "idle": return <Idle />;
    case "loading": return <Spinner />;
    case "error": return <ErrorView error={state.error} />;
    case "success": return <UserCard user={state.data} />;
    default: return null; // ← stays quiet, renders nothing for "refreshing"
  }
}
```

**Watch:** with four variants both panels compile and render identically. Flip the toggle and the left panel lights up a red badge reading `Argument of type '{ status: "refreshing" }' is not assignable to parameter of type 'never'`, while the right panel shows no error and a runtime preview that is blank for the `refreshing` value. This is a **compile-time** guarantee, so the red badge is a simulated TypeScript diagnostic (the demo cannot run `tsc` in the browser), not a runtime exception; it proves that the exhaustive switch converts "new variant" into a build break while the loose switch converts it into a silent blank screen.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add a `default: const _exhaustive: never = state` branch to a `status` switch, then add a fifth variant and predict the exact compile error; contrast a sibling switch that ends in `default: return null`.

**Think about:**
- How does TypeScript narrow the union to `never`?
- What defeats exhaustiveness (for example a missing `return`)?
- Why is `default: return null` dangerous?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Corrected switch:

```tsx
function render(state: State) {
  switch (state.status) {
    case "idle": return <Idle />;
    case "loading": return <Spinner />;
    case "error": return <ErrorView error={state.error} />;
    case "success": return <UserCard user={state.data} />;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
```

PREDICTED ERROR after adding `{ status: "refreshing" }`: TypeScript reports on the `const _exhaustive: never = state` line: `Type '{ status: "refreshing" }' is not assignable to type 'never'.` The sibling switch that ends in `default: return null` produces no error at all and returns `null` for a `refreshing` value at runtime.

WHY at the mechanism level: inside `switch (state.status)`, each `case` that returns removes that member from the type of `state` for the code that follows. After the four returning cases, control-flow analysis has eliminated all four original members, so in `default` the type of `state` is `never`. Assigning `never` to a `never` variable is allowed, so it compiles. Add a fifth member and control flow can no longer prove it was handled, so in `default` `state` is `{ status: "refreshing" }`, and that is not assignable to `never`; the assignment is the error site.

HOW to spot it in review: a `switch` over a discriminated union whose `default` returns a fallback value (`null`, `<Empty/>`) instead of asserting `never`, and any branch that does work but forgets to `return`/`throw` (a fall-through leaves its member live and quietly defeats the check).

PRODUCTION SYMPTOM: a teammate ships a new status, the app compiles green, and the new state renders a blank region or a default placeholder with no error, so it reaches users and is only caught by a bug report.

MISCONCEPTION corrected: "a switch that handles today's cases keeps handling the union as it grows." It does not. Without the `never` assignment there is no force coupling the switch to the union, so growth silently outpaces the switch. Also note the `never` check must sit on an assignment or an `assertNever(state)` call; a `default` that merely returns cannot enforce it.

**Self-check rubric:**
- [ ] `default` assigns `state` to a `never` variable or calls `assertNever(state)`.
- [ ] Every non-default branch returns or throws (no fall-through).
- [ ] You predicted the specific "not assignable to type 'never'" error and named the line it lands on.
- [ ] You explained narrowing-to-never via control flow, not "TS just knows."
- [ ] You called out `default: return null` as the silent-blank trap.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Notification renderer, plugin teams." Your app renders notifications by `type` (`"mention" | "reaction" | "follow" | "system"`) in a big switch, and multiple teams add new notification types without touching your renderer. You cannot review every PR. Design the renderer so a new type is a build failure in CI rather than an empty notification cell, and explain what happens if a new type still arrives at runtime from an older client.

**Model answer (revealed on demand):**

Make the union the single source of truth and terminate the switch with `assertNever`:

```tsx
type Notification =
  | { type: "mention"; from: User }
  | { type: "reaction"; emoji: string; from: User }
  | { type: "follow"; from: User }
  | { type: "system"; message: string };

function assertNever(x: never): never {
  throw new Error(`Unhandled notification type: ${(x as { type?: string }).type}`);
}

function NotificationRow({ n }: { n: Notification }) {
  switch (n.type) {
    case "mention": return <Mention from={n.from} />;
    case "reaction": return <Reaction emoji={n.emoji} from={n.from} />;
    case "follow": return <Follow from={n.from} />;
    case "system": return <SystemMsg text={n.message} />;
    default: return assertNever(n);
  }
}
```

WHY at the mechanism level: when a team adds `{ type: "poll"; ... }` to `Notification`, the `default` branch's `n` is now `{ type: "poll"; ... }` instead of `never`, so `assertNever(n)` fails to type-check. Your `pnpm typecheck` in CI turns red on their PR, at your file, even though they never opened it. The union coupling is what makes the failure land in the right place: they changed the type, so every non-exhaustive consumer breaks the build.

HOW to spot it in review: a `type`-keyed renderer with a `default` that renders a generic fallback, and notification/event/message unions that live in a shared package many teams import (the blast radius that makes exhaustiveness worth enforcing).

PRODUCTION SYMPTOM without it: a new notification type ships, older code renders an empty row, and users see phantom blank entries in their feed that they cannot click or dismiss.

RUNTIME angle: types are erased, so an older client that has not shipped the `poll` case will receive a `poll` payload from the server anyway. Here `assertNever` earns its keep at runtime: instead of a silent blank row it throws a labeled error you can catch at a boundary and render a safe "Unsupported notification, update your app" fallback, which is a visible, diagnosable failure rather than a phantom cell.

### ajr-l10-usestate-inference-traps: useState inference traps

- **id:** `ajr-l10-usestate-inference-traps`  ·  **difficulty:** easy  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** typescript, useState, inference

#### Learn

`useState` infers its type from the initial value you pass. That inference is convenient for `useState(0)` and `useState("")`, and quietly wrong for the three initializers people reach for most in real components: nothing, `[]`, and `null`.

Walk the traps:

```tsx
const [a] = useState();        // a: undefined            (no initializer)
const [b, setB] = useState([]); // b: never[]             (empty array literal)
const [c] = useState(null);    // c: null                 (just null)
const [d] = useState("a");     // d: string               (widened from "a")
```

`useState([])` is the classic. With no context, TypeScript infers the empty array literal as `never[]`, the array that can hold nothing. So `setB` has type `Dispatch<SetStateAction<never[]>>`, and the moment you call `setB([{ id: 1 }])` you get `Type '{ id: number }' is not assignable to type 'never'.` The setter rejects your real data, because you told it (via inference) that the array can never contain anything.

`useState()` with no argument infers `S = undefined`, so the state is `undefined` and the setter only accepts `undefined`. `useState(null)` infers `null`, same problem, the setter only ever accepts `null`, never the object you intend to load. And `useState("a")` widens the literal `"a"` to `string`, which is usually what you want for a free-text field but is wrong when you meant a small set of literals (a status, a tab name), because now any string is assignable.

The fix in every widening/narrowing case is to pass the type argument explicitly and let the initial value satisfy it:

```tsx
const [items, setItems] = useState<Item[]>([]);          // setItems([{id:1}]) ok
const [user, setUser] = useState<User | null>(null);     // null now, User later
const [tab, setTab] = useState<"list" | "grid">("list"); // literal set preserved
```

The rule: **pass the generic whenever the initial value is narrower than the values the state will hold.** `[]` is narrower than `Item[]`. `null` is narrower than `User | null`. `"list"` (once you want a fixed set) is narrower than the union. When the initial value already represents the full type (`useState(0)`, `useState({ name: "", age: 0 })` for a stable object shape), inference is fine and the generic is noise.

**Interview nuance:** `useState<User | null>(null)` is the canonical "load later" pattern, and it is better than `useState<User>()` (undefined initial) because `null` is an explicit "no user yet" you check for, while `undefined` blurs "not loaded" with "field missing." Being deliberate about `null` vs `undefined` here is a small senior tell.

**Interview nuance:** the dangerous "fix" is silencing the `never[]` error with `setItems(realData as any)`. That compiles, but it reopens the exact runtime hole the type was meant to close: now nothing checks that `realData` matches `Item[]`, so a shape mismatch surfaces as a runtime crash in a consumer instead of a red squiggle at the setter. The correct fix is always the generic, never the cast.

Recap: `useState()` infers `undefined`, `useState([])` infers `never[]` (its setter rejects real items), `useState(null)` infers `null`, and a primitive literal widens to its base type. Pass the type argument whenever the initializer is narrower than the eventual state, use `useState<T | null>(null)` for load-later, and never paper over the `never[]` error with `as any`.

#### See it live

**Demo (react-demo):** two hooks side by side, `useState([])` versus `useState<Item[]>([])`, each with a "load data" button that calls `setItems([{ id: 1, name: "Ada" }])`, plus an "inferred type" hover panel showing what TypeScript gives each state and setter.

The widget shows two cards. Each has a "load one item" button and a panel that displays the inferred type of the state and the setter (as TypeScript would show on hover). The left card is `useState([])`; clicking its button attempts `setItems([{ id: 1, name: "Ada" }])` and surfaces the assignability error. The right card is `useState<Item[]>([])` and loads successfully, rendering the item.

```tsx
type Item = { id: number; name: string };

// A) inferred: never[]
function Untyped() {
  const [items, setItems] = useState([]);
  // hover: items: never[]   setItems: Dispatch<SetStateAction<never[]>>
  return (
    <button onClick={() => setItems([{ id: 1, name: "Ada" }])}>
      {/* ❌ Type '{ id: number; name: string }' is not assignable to type 'never' */}
      load ({items.length})
    </button>
  );
}

// B) explicit generic: Item[]
function Typed() {
  const [items, setItems] = useState<Item[]>([]);
  // hover: items: Item[]   setItems: Dispatch<SetStateAction<Item[]>>
  return (
    <button onClick={() => setItems([{ id: 1, name: "Ada" }])}>
      load ({items.length}) {/* ✓ compiles and updates */}
    </button>
  );
}
```

**Watch:** hover the left state and the panel reads `never[]` with a setter of `Dispatch<SetStateAction<never[]>>`; its button shows the simulated diagnostic `'{ id: number; name: string }' is not assignable to type 'never'`, and the count stays at 0. Hover the right state and it reads `Item[]`; its button loads the item and the count ticks to 1. This is a **compile-time** inference behavior, so the error badge is a simulated TypeScript diagnostic rather than a thrown runtime error; it proves that the bare `useState([])` produces a setter that rejects real data while the generic version accepts it.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `const [items, setItems] = useState([])` so that `setItems([{ id: 1 }])` is allowed, and explain why `useState(null)` and `useState("a")` widen the wrong way.

**Think about:**
- What does TypeScript infer for `useState()`, `useState([])`, and `useState(null)`?
- When do you pass the type argument?
- What is the canonical null-initial pattern?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Corrected hook:

```tsx
type Item = { id: number };
const [items, setItems] = useState<Item[]>([]);
setItems([{ id: 1 }]); // ✓ now allowed
```

WHY at the mechanism level: `useState`'s type parameter is inferred from the initializer. An empty array literal `[]` in an inference position with no contextual type is inferred as `never[]`, the array whose element type is `never`. That flows into the setter as `Dispatch<SetStateAction<never[]>>`, so `setItems([{ id: 1 }])` fails: `{ id: 1 }` is not assignable to `never`. Passing `useState<Item[]>([])` supplies the type explicitly, `[]` satisfies `Item[]`, and the setter becomes `Dispatch<SetStateAction<Item[]>>`, which accepts the item.

The other two: `useState(null)` infers `S = null`, so the state is exactly `null` and the setter accepts only `null`, never the object you plan to load; the fix is `useState<User | null>(null)`. `useState("a")` infers `S = string` because a string literal in a mutable binding position **widens** to its base type; that is fine for free text but wrong when you meant a fixed set, where you want `useState<"a" | "b">("a")` to keep the literal union. The through-line: inference gives you the type of the initial value, which is often narrower (`never[]`, `null`) or wider (`string`) than the values the state must actually hold.

HOW to spot it in review: any `useState([])`, `useState()`, or `useState(null)` with no generic, and any `as any` sitting on a `setState` call, which is almost always a bandage over one of these inference traps.

PRODUCTION SYMPTOM: the `never[]` error gets silenced with `setItems(data as any)`, which compiles but removes all checking, so a later shape mismatch (an API field renamed) crashes at render in a consumer that read `items[0].name` instead of failing at the setter.

MISCONCEPTION corrected: "inference always gives a useful type, so I never need the generic." Inference gives the type of the initializer, and for empty/absent/null/primitive initials that type is the wrong width. Pass the generic whenever the initial value is narrower (or wider) than the eventual state.

**Self-check rubric:**
- [ ] The fix passes an explicit generic `useState<Item[]>([])`, not a cast.
- [ ] You named the inferred type `never[]` and the setter `Dispatch<SetStateAction<never[]>>`.
- [ ] You gave `useState<User | null>(null)` as the load-later pattern.
- [ ] You explained `"a"` widening to `string` and when that is wrong.
- [ ] You flagged `as any` as reopening a runtime hole rather than fixing it.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Data table with typed rows." A teammate ships `const [rows, setRows] = useState([])` and, to make the fetch compile, wrote `setRows(await res.json() as any)`. QA now reports the table occasionally crashes with `Cannot read properties of undefined (reading 'name')`. Diagnose the chain from the `useState([])` to the crash, give the correct fix, and say why the crash surfaces far from the real mistake.

**Model answer (revealed on demand):**

Correct fix, at both the state declaration and the boundary:

```tsx
type Row = { id: number; name: string };

const [rows, setRows] = useState<Row[]>([]);

const res = await fetch("/api/rows");
const data: unknown = await res.json();
setRows(parseRows(data)); // validate at the boundary, then set
```

DIAGNOSIS of the chain: `useState([])` inferred `never[]`, so `setRows` only accepts `never[]`. Real JSON is not assignable to `never[]`, which is the error the teammate hit. Instead of adding the generic they cast with `as any`, which does two things: it makes `setRows` accept anything, and it makes `rows` effectively `any[]` downstream. Now nothing verifies that each row has `name`. If the API returns a row missing `name` (or a different shape), it lands in state unchecked, and the cell that reads `row.name` reads `undefined`, or reads a property of an `undefined` row, and throws at render.

WHY the crash is far from the mistake: `as any` erases the type exactly at the point where the bad data entered, so there is no error at the setter. The type system had one chance to object (the `never[]` squiggle) and the cast silenced it. The failure then travels with the data until some consumer dereferences the missing field, which can be a different component, a different file, and a much later moment, which is why the stack trace points at the table cell and not at the fetch.

The real fix is the explicit generic plus validation at the trust boundary (a `parseRows` guard or a Zod schema over `unknown`), so the shape is checked once where the data arrives. That both satisfies `useState<Row[]>` honestly and turns a malformed payload into a caught, labeled boundary error instead of a render-time crash.

MISCONCEPTION corrected: "`as any` and the generic are two ways to fix the same error." They are opposites. The generic keeps the check and moves it to the boundary; `as any` deletes the check and defers the failure to a random consumer at runtime.
