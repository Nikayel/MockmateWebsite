> Module **10.6** (Real-World Types) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [10.5](./l10-strictness-flags.md) · Next: [11.1](./l11-rsc-boundary.md)

# L10 · Real-World Types

TypeScript in a React app fails quietly in three places that a passing `tsc` will not catch for you: a reducer whose action type is a loose string so `dispatch` can send any payload, a context defaulted to `{} as T` that swears it is never null while it truly is, and props passed through a variable so a renamed prop typo compiles and ships. After this module you can spot each of these in review and say exactly why the type checker looked the other way.

### ajr-l10-usereducer-action-union: Typing useReducer with a discriminated action union

- **id:** `ajr-l10-usereducer-action-union`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** typescript, useReducer, discriminated-union

#### Learn

`useReducer` is only as safe as the type you give its action. The lazy version looks fine and is a trap:

```tsx
type Action = { type: string; payload?: any };

function reducer(state: State, action: Action) {
  switch (action.type) {
    case "add":
      return { ...state, todos: [...state.todos, action.payload] };
    case "remove":
      return { ...state, todos: state.todos.filter(t => t.id !== action.payload) };
    default:
      return state;
  }
}
```

With `type: string` and `payload: any`, `dispatch` accepts literally anything. `dispatch({ type: "remove" })` with no id compiles. `dispatch({ type: "add", payload: 42 })` compiles even though `add` needs a todo object. Inside the reducer, `action.payload` is `any`, so `action.payload.id` never complains and you read `undefined` at runtime.

The fix is a discriminated union: one object shape per action, all sharing a literal `type` field that acts as the discriminant.

```tsx
type Todo = { id: string; text: string };

type Action =
  | { type: "add"; item: Todo }
  | { type: "remove"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      return { ...state, todos: [...state.todos, action.item] };
    case "remove":
      return { ...state, todos: state.todos.filter(t => t.id !== action.id) };
    default:
      return assertNever(action);
  }
}

function assertNever(x: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(x)}`);
}
```

Now three things hold. First, `dispatch` autocompletes the correct payload: type `"add"` and it demands `item: Todo`; type `"remove"` and it demands `id: string`. Second, inside `case "add"` the compiler has *narrowed* `action` to the `add` variant, so `action.item` exists and `action.id` is a compile error. The literal `type` value is the key that selects one arm of the union. Third, typing the reducer return as `State` catches a case that forgets a field or returns the wrong shape.

The `assertNever(action)` in `default` is the exhaustiveness check. If every case is handled, `action` is narrowed to `never` by the time control reaches `default`, so `assertNever` accepts it. The day someone adds `{ type: "clear" }` to the union but forgets a `case`, `action` in `default` is no longer `never`, and `assertNever` fails to compile. Your build breaks instead of silently ignoring the new action.

**Interview nuance:** the discriminant must be a *literal* type (`"add"`, not `string`) for narrowing to work. `type: string` widens the field and TypeScript can no longer tell the arms apart, so you lose narrowing entirely even if the shapes differ.

**Interview nuance:** `assertNever` is a runtime function but its value is compile-time. It costs nothing in review to add and converts "silent missing case" into "red build," which is the whole point.

Recap: type the action as a discriminated union with a literal `type`, annotate the reducer return as `State`, and put `assertNever` in `default` so a bad payload cannot be dispatched and a new unhandled action cannot compile.

#### See it live

**Demo (react-demo):** a reducer-driven todo list where `dispatch({ type: "remove" })` without an `id` shows a red type error, and hovering a case reveals the narrowed action.

A split widget. Left: a small todo list backed by `useReducer` with the discriminated `Action` union above, plus two dispatch buttons ("Add todo", "Remove selected"). Right: a mock editor pane showing the `dispatch(...)` call the buttons run. A dropdown lets the learner pick a payload: a valid `{ type: "remove", id }`, a broken `{ type: "remove" }` (missing id), and a mistyped `{ type: "add", id: "x" }` (should be `item`). When a broken payload is selected, a red squiggle and an error tooltip render under the offending line ("Property 'id' is missing" / "'id' does not exist on type add action"), and the "Dispatch" button is disabled, mirroring what the compiler would refuse. A hover target over `case "add":` pops a badge reading `action: { type: "add"; item: Todo }` and over `case "remove":` reads `action: { type: "remove"; id: string }`, so the learner sees the narrowing per case. A separate "Add a `clear` action to the union" toggle makes the `default` arm light up red with `Argument of type '{ type: "clear" }' is not assignable to parameter of type 'never'`.

```tsx
type Action =
  | { type: "add"; item: Todo }
  | { type: "remove"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":    return { ...state, todos: [...state.todos, action.item] };
    case "remove": return { ...state, todos: state.todos.filter(t => t.id !== action.id) };
    default:       return assertNever(action);
  }
}
```

**Watch:** selecting the missing-id payload paints a red error and disables dispatch, proving `dispatch` will not accept an `add`/`remove` action without its exact payload. Hovering each case shows only that variant's fields, proving the literal `type` narrows the union. Note that this is an approximation of the TypeScript compiler's behavior rendered in the widget: the error tooltips and the `never` failure are illustrated to match what `tsc` reports, not produced by a live type checker in the browser.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Type `type Action = {type:"add", item} | {type:"remove", id}` and write a reducer that switches on `action.type` with exhaustiveness, and show that `dispatch` autocompletes the right payload for each action.

**Think about:**
- How does `action.type` narrow the action inside a case?
- What does typing the reducer return catch?
- Why prefer this over `payload: any`?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
type Todo = { id: string; text: string };
type State = { todos: Todo[] };

type Action =
  | { type: "add"; item: Todo }
  | { type: "remove"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      // action is narrowed to { type: "add"; item: Todo } here
      return { ...state, todos: [...state.todos, action.item] };
    case "remove":
      // action is narrowed to { type: "remove"; id: string } here
      return { ...state, todos: state.todos.filter(t => t.id !== action.id) };
    default:
      return assertNever(action);
  }
}

function assertNever(x: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(x)}`);
}

// dispatch({ type: "add", item: { id: "1", text: "ship" } }); // ok
// dispatch({ type: "remove", id: "1" });                       // ok
// dispatch({ type: "remove" });        // error: 'id' is missing
// dispatch({ type: "add", id: "1" });  // error: 'item' is missing
```

WHY at the mechanism level: `action.type` is a *literal* type on each union member, so it is a valid discriminant. When you `switch (action.type)` and enter `case "add"`, TypeScript's control-flow analysis narrows `action` to only the member whose `type` is `"add"`. That member has `item`, not `id`, so `action.item` is available and `action.id` is a compile error. `dispatch` types its argument as `Action`, so at the call site the compiler demands the exact payload for whichever `type` literal you wrote. Annotating the return as `State` means a case that forgets `todos` or returns the wrong shape fails to compile, not at runtime.

HOW to spot it in review: search for `payload: any` or `type: string` on action types, and for reducers with a `default: return state` and no `never` check. Both are the smell.

PRODUCTION SYMPTOM: reducers read fields that do not exist on the action they actually received, so state gets an `undefined` id or a missing item, filters remove nothing or everything, and the UI drifts out of sync with no error in the console.

MISCONCEPTION corrected: `{ type: string; payload: any }` is not "good enough typing." It types the envelope and throws away the contents. `any` disables checking on the payload entirely, which is exactly the field you most need checked.

**Self-check rubric:**
- [ ] `Action` is a union of object types, each with a distinct string-*literal* `type`.
- [ ] Each `case` uses only that variant's fields (referencing another variant's field is a compile error).
- [ ] The reducer return type is annotated as `State`.
- [ ] `default` calls `assertNever(action)` for exhaustiveness.
- [ ] Adding a new action without a matching `case` breaks the build.
- [ ] No `any` appears anywhere on the action type.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Scale it up. A checkout reducer at a payments company has actions `addItem`, `removeItem`, `applyCoupon`, `setShippingMethod`, and `checkoutSucceeded`. A teammate ships `applyCoupon` with `{ type: "applyCoupon"; payload: any }` because "the coupon shape is still changing." Predict the first production incident, then refactor the union so the moving shape stays safe.

**Model answer (revealed on demand):**

The first incident: `applyCoupon` dispatches with a coupon object whose field was renamed from `percentOff` to `percent`. Because `payload: any`, the reducer's `state.total * (1 - action.payload.percentOff / 100)` reads `undefined`, `total * NaN` becomes `NaN`, and the order total renders as `NaN` or `$0.00`. Nothing errors; a customer checks out for zero or the request 500s downstream when the gateway rejects `NaN`.

The fix is not to abandon typing because the shape is unstable, it is to name the unstable shape:

```tsx
type Coupon = { code: string; percent: number };

type CheckoutAction =
  | { type: "addItem"; item: LineItem }
  | { type: "removeItem"; id: string }
  | { type: "applyCoupon"; coupon: Coupon }
  | { type: "setShippingMethod"; method: ShippingMethod }
  | { type: "checkoutSucceeded"; orderId: string };

function reducer(state: State, action: CheckoutAction): State {
  switch (action.type) {
    case "applyCoupon":
      return { ...state, discount: state.total * (action.coupon.percent / 100) };
    // ...other cases...
    default:
      return assertNever(action);
  }
}
```

When `percentOff` is renamed to `percent`, `Coupon` changes in one place and every dispatch site that still passes `percentOff` fails to compile immediately. That is the opposite of `any`, which would let the rename slip through to a live total. The discriminated union with an `assertNever` default also guarantees that adding `checkoutSucceeded` later cannot silently fall through to `return state`: the build breaks until the case exists. The rule for review: an evolving payload is the strongest argument *for* a named type, not against one, because the compiler is the only thing that will find every stale call site when the shape moves.

### ajr-l10-context-typing-guard-hook: Context typing: createContext null + guard hook

- **id:** `ajr-l10-context-typing-guard-hook`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** typescript, context, patterns

#### Learn

Every React context needs a default value, and TypeScript wants that default to match the context type. The tempting shortcut is to assert one into existence:

```tsx
type AuthCtx = { user: { name: string }; logout: () => void };

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function useAuth() {
  return useContext(AuthContext);
}
```

`{} as AuthCtx` is a *runtime lie*. You told the compiler "this is a full `AuthCtx`," but at runtime it is an empty object with no `user` and no `logout`. As long as every consumer sits inside an `<AuthProvider>`, the real provider value overrides the default and nothing goes wrong. The moment a component calls `useAuth()` *outside* the provider (a test, a story, a misplaced component, a modal that mounts in a portal above the provider), `useContext` returns that empty-object default. Your code runs `auth.user.name` and crashes with `Cannot read properties of undefined (reading 'name')`, deep inside the consuming component, far from the actual mistake.

The honest pattern is to type the default as `null` and force consumers through a guard hook:

```tsx
const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx; // narrowed to AuthCtx, never null
}
```

Two things happen. At the type level, `createContext<AuthCtx | null>(null)` tells the truth: before a provider mounts, the value really is `null`. At the consumer level, the guard hook checks for `null` once, throws a named error if it is missing, and after that `if` the compiler *narrows* `ctx` from `AuthCtx | null` down to `AuthCtx`. So `useAuth()` returns a non-null value and every consumer gets `auth.user.name` with no optional chaining and no lie. If the provider is missing, they get `useAuth must be used within an AuthProvider` at the exact call site, in plain English, instead of a null-property crash three components deep.

**Interview nuance:** the guard hook is where you pair context with a discriminated union. If auth can be loading, signed-in, or signed-out, type the context as `AuthState | null` where `AuthState` is a union on a `status` field, then consumers `switch` on `status` with full narrowing. The `null` still means "no provider," which is a different failure from "provider present, user signed out."

**Interview nuance:** returning `ctx!` (non-null assertion) instead of a real `if` check compiles the same but skips the runtime guard, so out-of-provider use crashes again. The `throw` is what turns a silent bug into a loud, self-describing one.

Recap: default the context to `null` with `createContext<T | null>(null)`, and wrap `useContext` in a guard hook that throws a named error on `null` and returns a narrowed non-null value, so misuse is a clear early error instead of a deep crash.

#### See it live

**Demo (react-demo):** a component calling `useAuth` outside its provider, toggling between the `{} as AuthCtx` default (version A) and the `null` + guard hook (version B).

A widget with a toggle "Render `<Profile />` outside `<AuthProvider>`" and a radio for "Context style: A) `{} as AuthCtx`  vs  B) `null` + guard hook." `Profile` renders `auth.user.name`. When "outside provider" is on: version A renders a red runtime crash box reading `TypeError: Cannot read properties of undefined (reading 'name')` with a stack pointing into `Profile`, deep and cryptic. Version B renders a clean error box reading `Error: useAuth must be used within an AuthProvider`, pointing at the `useAuth()` call, and the widget labels it "caught early, names the fix." A second toggle puts `Profile` back inside the provider so both versions render `Signed in as Ada`, showing that the happy path is identical and only the failure differs.

```tsx
// A) lies about the default
const AuthContext = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(AuthContext);

// B) honest default + guard
const AuthContext = createContext<AuthCtx | null>(null);
export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
```

**Watch:** flipping to "outside provider" makes version A throw a deep, unhelpful `undefined` crash while version B throws a named provider error at the call site, proving the `null` default plus guard converts a mystery crash into a self-describing one. This demo runs real React error boundaries in the browser, so the two error messages are genuinely thrown, not illustrated; only the source-line annotations are added for clarity.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Rewrite an `AuthContext` typed `createContext<AuthCtx | null>(null)` and a `useAuth` hook that throws if the value is null and returns a non-null `AuthCtx`, and explain why `{} as AuthCtx` was worse.

**Think about:**
- Why is `{} as AuthCtx` a runtime lie?
- What does the guard hook narrow?
- Where do you pair this with a discriminated union?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
type AuthCtx = { user: { name: string }; logout: () => void };

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children, value }: { children: React.ReactNode; value: AuthCtx }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx; // type is AuthCtx here, not AuthCtx | null
}
```

WHY at the mechanism level: `createContext` needs a default for consumers rendered with no matching provider above them. `{} as AuthCtx` satisfies the compiler with a cast but hands consumers an object missing every field, so `auth.user` is `undefined` and `auth.user.name` throws where it is read, not where the provider is missing. Typing the default as `AuthCtx | null` and passing `null` makes the type match reality: no provider means `null`. The guard hook reads the context once, and the `if (ctx === null) throw` lets TypeScript's control-flow analysis narrow `ctx` to `AuthCtx` on the line after the check, so `useAuth` returns a value that is provably non-null. Consumers never see `null` and never optional-chain.

HOW to spot it in review: grep for `createContext(` followed by `as ` or by an object literal default; both are usually a lie. Also flag context types where every field is optional (`user?: ...`), which is the same lie spread across properties so consumers optional-chain everything.

PRODUCTION SYMPTOM: a `Cannot read properties of undefined` crash deep inside a consumer, most often triggered by a component that got moved out of the provider subtree, a portal/modal, or a test that mounts the component alone. The stack points at the consumer, not the missing provider, so debugging goes to the wrong file first.

MISCONCEPTION corrected: "defaulting context to `{} as T` is fine because a provider always wraps the app." It is fine until it is not: portals, tests, storybook, and refactors all render consumers without the provider, and the cast guarantees those cases crash cryptically instead of erroring clearly.

**Self-check rubric:**
- [ ] `createContext` is typed `<AuthCtx | null>` with a `null` default, no `as` cast.
- [ ] `useAuth` throws a named error mentioning the provider when the value is `null`.
- [ ] `useAuth`'s return type is `AuthCtx`, and consumers need no optional chaining.
- [ ] The narrowing comes from a real `if (... === null) throw`, not `ctx!`.
- [ ] Rendering a consumer outside the provider yields the named error, not an undefined crash.

#### Practice: real-world variant (save, then reveal)

**Prompt:** A design-system team ships a `ThemeContext` used by 40 packages. It is typed `createContext<Theme>({} as Theme)`. A consumer team mounts a `<Toast>` through `ReactDOM.createPortal` into `document.body`, above the `<ThemeProvider>`. Predict the bug report and fix the context so the failure is unmissable and the fix is discoverable.

**Model answer (revealed on demand):**

The bug report: "Toasts render with no theme, then crash on some pages." The portal mounts `<Toast>` as a direct child of `document.body`, which is *outside* the React subtree wrapped by `<ThemeProvider>`. React context follows the component tree, not the DOM tree in the obvious sense, and a portal's context is still taken from where the portal element is declared, so if the `<Toast>` element itself is created outside the provider it reads the default. With `{} as Theme`, `theme.colors.background` is `undefined.background` and the toast throws deep in the design system's render, which the app team cannot debug because the stack is all vendor code.

The fix mirrors the lesson at library scale:

```tsx
const ThemeContext = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (theme === null) {
    throw new Error(
      "useTheme must be used within <ThemeProvider>. If you render through a portal, keep the portalled element inside the provider subtree.",
    );
  }
  return theme;
}
```

Now the 40 consuming packages get a single, self-describing error that even names the portal pitfall, instead of 40 different `Cannot read properties of undefined` stacks. Because the message tells them *where* the boundary is, the fix (declare the `<Toast>` element inside the provider, or wrap the portal content in its own provider) is discoverable without reading design-system source. For a library this is not optional politeness: a cryptic default crash generates support tickets, while a named guard error is self-service. If the theme also has variants (light, dark, high-contrast), type it as a discriminated union on `mode` behind the same `Theme | null`, so `null` still means "no provider" and the union handles "which theme," two failures that must not be conflated.

### ajr-l10-excess-property-checks: Structural typing and excess-property checks

- **id:** `ajr-l10-excess-property-checks`  ·  **difficulty:** medium  ·  **est:** 10 min  ·  **demo:** react-demo  ·  **skills:** typescript, structural-typing, props

#### Learn

TypeScript is *structural*: a value is assignable to a type if it has at least the required members, extra members and all. So `{ color: "red", size: 3 }` is assignable to `{ color: string }`, because the extra `size` does not stop it from being a valid `{ color: string }`. That rule alone would let a typo like `colour` sail through, so TypeScript adds a special case: *excess-property checks*. When you assign a *fresh object literal* directly to a typed target, TS additionally flags any property that is not in the target type.

The catch is the word "fresh literal." The check only fires on an object literal written directly at the assignment or call site. Here is the contrast that ships bugs:

```tsx
type ButtonProps = { color: string };

function Button(props: ButtonProps) {
  return <button style={{ color: props.color }}>Click</button>;
}

// A) inline literal: excess-property check FIRES
<Button colour="red" />;
// Error: 'colour' does not exist in type 'ButtonProps'. Did you mean 'color'?

// B) through a variable: check is OFF
const p = { colour: "red" };
<Button {...p} />;
// Compiles. Button gets no `color`, renders default-colored. Bug ships.
```

In case A, `colour="red"` is a fresh literal being passed to a `ButtonProps` parameter, so the excess-property check runs and catches the typo with a helpful "Did you mean 'color'?" In case B, `p` is a *variable* of inferred type `{ colour: string }`. When you spread it into `<Button {...p} />`, TypeScript asks the structural question only: does `{ colour: string }` satisfy `ButtonProps`? `ButtonProps` requires `color`, which is... wait. Here `color` is required, so B actually errors on the *missing* `color`. The truly silent case is when the prop is optional:

```tsx
type ButtonProps = { color?: string };
const p = { colour: "red" };
<Button {...p} />; // compiles clean, color is undefined, typo ignored
```

Now `color` is optional, so `{ colour: string }` structurally satisfies `ButtonProps` (it has no *required* members missing), and the extra `colour` is dropped silently through the variable. The button renders its default color, the intended `red` never applies, and `tsc` is green. This is the real-world shape: optional props plus a spread variable plus a renamed prop equals a bug that only QA or a user will find.

**Interview nuance:** the fix that keeps the check is `satisfies`. Writing `const p = { colour: "red" } satisfies ButtonProps` runs the excess-property check on `p` at its declaration, catching `colour` immediately, while still inferring `p`'s precise type. Plain `const p: ButtonProps = {...}` also catches it but widens `p` to `ButtonProps`.

**Interview nuance:** this is why "just spread the config object" is riskier than it looks around renamed or optional props. The spread is exactly where TypeScript stops checking for extras.

Recap: excess-property checks catch typos only on fresh object literals at the assignment/call site; assigning through a variable and spreading falls back to pure structural typing, so a renamed optional prop is silently dropped. Pass literals inline, or gate the variable with `satisfies`, to keep the check on.

#### See it live

**Demo (react-demo):** a `Button` reading `color`, passed `colour` inline (errors) versus via a spread variable (compiles, no color applied).

A widget with a `Button` whose background comes from a `color` prop, and two panes. Pane A shows `<Button colour="red" />` with a live red squiggle under `colour` and a tooltip "Object literal may only specify known properties, and 'colour' does not exist in type 'ButtonProps'. Did you mean 'color'?" Pane B shows `const p = { colour: "red" }; <Button {...p} />` with no error marker and a rendered button that stays the *default* gray, next to a caption "compiles clean, `color` is undefined." A toggle "Make `color` optional" flips `ButtonProps` between `color: string` (pane B errors on missing `color`) and `color?: string` (pane B compiles silently), so the learner sees exactly when the spread goes quiet. A "Fix with `satisfies`" button rewrites pane B to `const p = { colour: "red" } satisfies ButtonProps` and the squiggle reappears under `colour`.

```tsx
type ButtonProps = { color?: string };
function Button({ color }: ButtonProps) {
  return <button style={{ background: color ?? "#ccc" }}>Click</button>;
}

// inline literal: excess-property check fires
<Button colour="red" />;             // error under `colour`
// spread variable: check off, typo dropped
const p = { colour: "red" };
<Button {...p} />;                    // compiles, button stays #ccc
```

**Watch:** the inline `colour` shows a red typo error while the spread-variable `colour` compiles clean and the button visibly stays the default gray, proving TypeScript only checks extras on fresh literals and drops them through variables. Toggling `color` to optional is what makes pane B go fully silent. This widget approximates the TypeScript compiler: the squiggles and tooltips reproduce what `tsc` reports, and the rendered gray button shows the real runtime result of the dropped prop, but no live type checker runs in the page.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Show that `<Button colour="red" />` errors inline but `const p = { colour: "red" }; <Button {...p} />` compiles and never applies the color, and explain the fresh-literal rule that produces the difference.

**Think about:**
- When do excess-property checks fire?
- Why does spreading a variable turn them off?
- How do you reduce the blind spot?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
type ButtonProps = { color?: string };

function Button({ color }: ButtonProps) {
  return <button style={{ background: color ?? "#ccc" }}>Click</button>;
}

// Inline literal -> excess-property check fires:
<Button colour="red" />;
//        ~~~~~~ 'colour' does not exist in type 'ButtonProps'. Did you mean 'color'?

// Through a variable -> structural check only, typo dropped silently:
const p = { colour: "red" };
<Button {...p} />; // compiles; color is undefined; button renders #ccc

// Fix A: keep it inline (literal is checked).
// Fix B: gate the variable so the check runs at its declaration:
const q = { colour: "red" } satisfies ButtonProps;
//          ~~~~~~ caught here, at the const, with full type inference preserved
```

WHY at the mechanism level: TypeScript's assignability is structural, so a value only needs the target's required members. Because that would silently permit typos, TS adds excess-property checking as a special rule that runs *only* on fresh object literals assigned or passed directly to a typed target. `colour="red"` inline is a fresh literal, so the extra `colour` is flagged. Once you store the object in `const p`, `p` has an inferred type of its own, and passing/spreading it is a plain structural assignability question: does `{ colour: string }` satisfy `ButtonProps`? With `color` optional, yes, so the extra `colour` is allowed and simply not part of `ButtonProps`, so it never reaches the component.

HOW to spot it in review: look for props passed via `{...spread}` or a variable, especially near recently renamed props or optional props. Any place a config object is built once and spread is a place excess-property checking is off.

PRODUCTION SYMPTOM: a mistyped prop is silently ignored at runtime. The component renders its default (default color, no `onClick`, missing `aria-label`) and `tsc` stays green, so it slips past CI and lands in front of users or QA.

MISCONCEPTION corrected: "TypeScript catches extra/misspelled props everywhere." It catches them only on fresh literals at the call site. Structural typing is the default, and the excess-property check is the exception, not the rule.

**Self-check rubric:**
- [ ] The inline `<Button colour="red" />` is explained as a fresh literal that triggers the check.
- [ ] The spread-variable case is shown to compile and to leave the prop unapplied at runtime.
- [ ] The answer states the check fires only on fresh object literals at the assignment/call site.
- [ ] The optional-prop detail (why the spread goes fully silent) is called out.
- [ ] A concrete fix is given: pass inline, or use `satisfies` / an explicit annotation on the variable.

#### Practice: real-world variant (save, then reveal)

**Prompt:** An analytics team logs events with `track(payload: TrackEvent)` where `TrackEvent = { event: string; userId?: string; revenue?: number }`. An engineer builds the payload in a helper, spreads in overrides, and renames `revenue` to `amount` in the type but misses the helper. Predict the data-quality incident and fix the pattern so the rename cannot ship silently.

**Model answer (revealed on demand):**

The incident: dashboards show revenue quietly dropping to zero for one event type. The helper builds `{ event: "purchase", revenue: 49 }` and spreads it into `track({ ...base, ...overrides })`. After `TrackEvent.revenue` is renamed to `amount`, the spread still compiles because `revenue` is now just an unknown extra property flowing through a variable, and `amount` is optional, so nothing is missing structurally. `track` receives an object with no `amount`, the warehouse column is null, and revenue reporting silently understates until finance notices the gap weeks later. There is no crash and no `tsc` error, which is the worst kind of data bug: invisible and retroactive.

The fix is to close the fresh-literal gap at the point the payload is constructed:

```tsx
type TrackEvent = { event: string; userId?: string; amount?: number };

// Gate the built object so excess props are checked at construction:
function purchaseEvent(amount: number): TrackEvent {
  return { event: "purchase", revenue: amount } satisfies TrackEvent;
  //                          ~~~~~~~ Error: 'revenue' does not exist in type 'TrackEvent'
}
```

Annotating the return type (`: TrackEvent`) or using `satisfies TrackEvent` on the returned literal turns the helper's object back into a checked literal, so the stale `revenue` fails to compile the instant the type is renamed. For the override case, prefer building the final object as one inline literal passed straight to `track(...)` rather than spreading partial variables, or type each intermediate with `satisfies` so every layer is checked. The review rule: any object destined for a typed sink (an event tracker, an API body, a form submission) should be constructed as a checked literal or gated with `satisfies`, because a spread through an untyped variable is exactly where a rename slips past the compiler and corrupts data instead of crashing.
