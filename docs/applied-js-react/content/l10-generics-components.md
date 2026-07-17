> Module **10.3** (Generics in Components) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [10.2](./l10-unknown-guards.md) · Next: [10.4](./l10-typing-props-refs.md)

# L10 · Generics in Components

Generics are how a reusable `List`, `Select`, or custom hook stays type-safe for every caller instead of collapsing to `any[]`. After this module you can catch the three things that quietly kill that safety in real React code: the `<T>` arrow syntax that JSX parses as a tag, the `forwardRef`/`memo` wrappers that flatten a generic component's type parameter to `unknown`, and the tuple-returning hook whose `[value, setValue]` widens into a useless union array.

### ajr-l10-generic-components: Generic components and the tsx arrow gotcha

- **id:** `ajr-l10-generic-components`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** typescript, generics, components

#### Learn

A generic component is just a function component with a type parameter. The whole point is that the item type flows from the props the caller passes into the callbacks the component hands back. Here is a `List` that renders any array and calls a `render` prop per item:

```tsx
type ListProps<T> = {
  items: T[];
  render: (item: T) => React.ReactNode;
};

function List<T>({ items, render }: ListProps<T>) {
  return <ul>{items.map((item, i) => <li key={i}>{render(item)}</li>)}</ul>;
}
```

When you write `<List items={users} render={(u) => u.name} />`, TypeScript infers `T` at the call site from the type of `items`. If `users` is `User[]`, then `T = User`, and inside the `render` prop `u` is typed as `User`, so `u.name` is checked against the real shape. Swap the data to `products: Product[]` and now `T = Product`; if `Product` has no `name`, `u.name` is a compile error at exactly the spot that would have thrown at runtime. That inference from props into callbacks is the entire value of a generic component. Typing the props as `unknown[]` or `any[]` throws it away and every `render` callback goes untyped.

Now the gotcha that only bites in `.tsx` files. If you write the component as an arrow function, this fails to parse:

```tsx
const List = <T>(props: ListProps<T>) => { ... }; // error in .tsx
```

In a `.tsx` file the parser sees `<T>` and starts reading a JSX element (`<T>` looks like opening a `<T />` tag), then chokes on the arrow. The fix is to disambiguate the type parameter so it cannot be read as JSX. Two common forms:

```tsx
const List = <T,>(props: ListProps<T>) => { ... };            // trailing comma
const List = <T extends unknown>(props: ListProps<T>) => {};  // constraint
```

The trailing comma in `<T,>` tells the parser "this is a type parameter list, not a tag." A constraint like `<T extends unknown>` works for the same reason: JSX tag syntax has no `extends`, so the ambiguity disappears. A plain `function List<T>(...)` declaration never has this problem, because `function` is unambiguous, which is why many teams prefer the declaration form for generic components.

Interview nuance: the `<T,>` fix is purely a parser disambiguation in `.tsx`. It changes nothing about the emitted JavaScript or the runtime, and it is unnecessary in a `.ts` file. Being able to say "it is a JSX-versus-type-parameter ambiguity, not a type error" is the tell that you understand what is happening.

You usually want a constraint anyway. If `List` needs a stable key, constrain the parameter so callers must supply items with an `id`:

```tsx
function List<T extends { id: string }>({ items, render }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={item.id}>{render(item)}</li>)}</ul>;
}
```

Now `item.id` is known to exist, and any caller passing items without a string `id` is rejected at the call site.

Recap: a generic component infers `T` from its props and threads it into its callbacks, giving real per-item safety; in `.tsx` an arrow generic needs `<T,>` or a constraint so the parser does not read `<T>` as JSX, and a `T extends {...}` constraint documents what items the component requires.

#### See it live

**Demo (react-demo):** a `<List items={...} render={u => u.name} />` where a "type hover" panel shows the inferred type of the `render` parameter, plus a toggle that swaps `items` from users to products and a toggle that switches the arrow syntax between `<T>` (broken) and `<T,>` (fixed).

Widget: a two-pane card. The left pane shows the JSX call site `<List items={data} render={(u) => u.name} />`. Above the `u` parameter is a hover chip that displays the inferred type, reading `u: User` when the "data source" toggle is set to Users. Flip the toggle to Products and the chip updates to `u: Product`, and the `.name` access lights up red with an inline error `Property 'name' does not exist on type 'Product'`. A second toggle labeled "arrow syntax" switches the component definition shown in the right pane between `const List = <T>(...)` and `const List = <T,>(...)`; with `<T>` selected, a red squiggle marks the `<T>` and a message reads `JSX element 'T' has no corresponding closing tag`, and with `<T,>` selected the squiggle clears. A render-count badge on the list is incidental; the type chips and error markers are the point.

```tsx
type ListProps<T> = { items: T[]; render: (item: T) => React.ReactNode };

// Broken in .tsx: parser reads <T> as a JSX tag.
const ListBroken = <T>(props: ListProps<T>) => <ul>{props.items.map(props.render)}</ul>;

// Fixed: <T,> disambiguates the type parameter list.
const List = <T,>({ items, render }: ListProps<T>) =>
  <ul>{items.map((item, i) => <li key={i}>{render(item)}</li>)}</ul>;

// Call site drives inference: T = User here.
<List items={users} render={(u) => u.name} />;
```

**Watch:** hovering `u` shows `User` while the data source is Users, then `Product` after you swap the data, at which point `u.name` errors. That proves `T` is inferred at the call site and threaded into the `render` callback, not fixed at definition time. Toggling the arrow syntax shows the `<T>` version failing to parse and `<T,>` clearing it, proving the fix is a JSX-versus-type-parameter parser disambiguation. (This is a compile-time illustration: the type chips and error markers reproduce what your editor and `tsc` report, not a runtime value, since types are erased before the code runs.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write `function List<T>({ items, render })` so the item type flows from `items` into the `render` callback, then show why the arrow form `const List = <T>(...)` breaks in a `.tsx` file and give the two-character fix. Say how you would constrain `T` so items must have an `id`.

**Think about:**
- How does TypeScript infer the type parameter?
- Why does `<T>` break in `.tsx`?
- How do you constrain the param?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
type ListProps<T> = {
  items: T[];
  render: (item: T) => React.ReactNode;
};

// Declaration form: no arrow ambiguity at all.
function List<T extends { id: string }>({ items, render }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={item.id}>{render(item)}</li>)}</ul>;
}

// If you want the arrow form, disambiguate the type parameter:
const ListArrow = <T,>({ items, render }: ListProps<T>) =>
  <ul>{items.map((item, i) => <li key={i}>{render(item)}</li>)}</ul>;
```

Mechanism: TypeScript infers `T` at the call site from the argument you pass to `items`. `<List items={users} .../>` with `users: User[]` sets `T = User`, and because `render` is typed `(item: T) => ...`, the callback parameter is `User` inside the JSX. The type parameter is a single hole that the caller fills and the compiler threads into every position that mentions `T`. Nothing is decided at definition time; each call site gets its own `T`.

The `<T>` arrow breaks because in a `.tsx` file the parser first tries to read `<T>` as a JSX element (it looks like an opening tag) and then hits the arrow and fails. `.tsx` overloads angle brackets for JSX, so a bare type-parameter arrow is ambiguous. Writing `<T,>` (trailing comma) or `<T extends unknown>` removes the ambiguity because neither is valid JSX tag syntax, and the parser commits to reading a type parameter list. The declaration form `function List<T>` never has this problem because `function` is unambiguous.

How to spot it in review: a reusable `List`, `Table`, `Select`, or `Combobox` whose props are typed `items: any[]` or `unknown[]`. That is the smell of someone who hit the arrow error and reached for `any` instead of `<T,>`. The `render`/`onSelect`/`getKey` callbacks in those components will all be untyped as a result.

Production symptom (this is what the fix restores): item-type safety inside the `render` callback. With `any[]`, a typo like `render={(u) => u.naem}` compiles and ships, then renders `undefined` in the UI. With the generic, it fails in review.

Common misconception: that generic components must be typed with `any[]` to compile in `.tsx`. They do not. The compile error is a parser ambiguity fixed by `<T,>`, not a signal that generics are unsupported in JSX.

**Self-check rubric:**
- [ ] Wrote a generic `List<T>` whose `render` param is typed `T`.
- [ ] Explained that `T` is inferred at the call site from `items`.
- [ ] Explained `<T>` breaks because `.tsx` reads it as a JSX tag.
- [ ] Gave the `<T,>` (or `<T extends unknown>`) fix.
- [ ] Showed a constraint like `<T extends { id: string }>`.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Design-system `<DataTable>`." Your shared table is typed `type DataTableProps = { rows: any[]; columns: Column[]; onRowClick: (row: any) => void }` and every product team casts inside `onRowClick`. Rewrite it as a generic `DataTable<Row>` so `columns` accessor functions and `onRowClick` receive the real row type, keep it authorable as an arrow if the team prefers, and say why `any[]` was quietly costing the whole org.

**Model answer (revealed on demand):**

```tsx
type Column<Row> = {
  header: string;
  accessor: (row: Row) => React.ReactNode;
};

type DataTableProps<Row> = {
  rows: Row[];
  columns: Column<Row>[];
  onRowClick: (row: Row) => void;
};

function DataTable<Row extends { id: string }>({
  rows, columns, onRowClick,
}: DataTableProps<Row>) {
  return (
    <table>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} onClick={() => onRowClick(row)}>
            {columns.map((c, i) => <td key={i}>{c.accessor(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Arrow form for teams that prefer it: disambiguate with <Row,>.
const DataTableArrow = <Row extends { id: string }>(p: DataTableProps<Row>) =>
  <DataTable {...p} />;
```

Mechanism: `Row` is inferred from `rows` at each call site, then threaded into `Column<Row>` (so `accessor` gets the real row) and into `onRowClick`. A team using `DataTable` with `rows={invoices}` gets `Row = Invoice` everywhere, and `accessor: (row) => row.amount` is checked against `Invoice`. The constraint `Row extends { id: string }` lets the component use `row.id` as the key without any per-caller cast.

How to spot it in review: shared components with `any[]` props and consumers that cast in every callback (`(row as Invoice).amount`). Each cast is a place the compiler stopped helping.

Production symptom: `any[]` in one design-system component erases type safety for every team that consumes it, so a renamed field (`amount` to `total`) ships green and surfaces as blank cells or `undefined` clicks across many products at once. The generic version turns that same rename into a compile error in every consumer. Misconception to correct: that the arrow-generic parser error forced the original author into `any[]`. The two-character `<Row,>` fix was always available; `any[]` was a workaround for a syntax quirk, and it cost the org real safety.

### ajr-l10-forwardref-memo-generics: forwardRef/memo drop generics (React 19 fixes it)

- **id:** `ajr-l10-forwardref-memo-generics`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** typescript, generics, react19

#### Learn

You have a working generic `Select<T>`. The moment you wrap it in `forwardRef` (or `React.memo`) to accept a ref, the type parameter collapses to `unknown` and every consumer loses item-type safety. This is one of the most confusing TypeScript-plus-React failures because the component still works at runtime; only the types silently degrade.

Start with the plain generic component, which infers correctly:

```tsx
type SelectProps<T> = {
  options: T[];
  onSelect: (item: T) => void;
};

function Select<T>({ options, onSelect }: SelectProps<T>) {
  return <ul>{options.map((o, i) => <li key={i} onClick={() => onSelect(o)}>{String(o)}</li>)}</ul>;
}

// T = User, so item is User here.
<Select options={users} onSelect={(item) => console.log(item.name)} />;
```

Now wrap it to take a ref, the React 18 way:

```tsx
const SelectWithRef = React.forwardRef(function Select<T>(
  { options, onSelect }: SelectProps<T>,
  ref: React.Ref<HTMLUListElement>,
) {
  return <ul ref={ref}>{options.map((o, i) => <li key={i} onClick={() => onSelect(o)}>{String(o)}</li>)}</ul>;
});

// item is now unknown, not User.
<SelectWithRef options={users} onSelect={(item) => console.log(item.name)} />; // item.name errors
```

The reason is TypeScript's higher-order function inference. For `T` to flow from a call site through `forwardRef` back out to the consumer, TypeScript needs the wrapped thing to be a single, plain call signature that it can "repackage" while preserving the free type parameter. `forwardRef` (and `memo`) do not return a plain function; they return an object with extra members (`$$typeof`, `displayName`, `propTypes`, and so on). A callable object with extra members is not a bare generic signature, so TypeScript cannot preserve the free `T` and defaults it to its constraint, which is `unknown`. The component still renders any options at runtime, but `onSelect`'s `item` is now `unknown` at every call site, so consumers either cast or lose all checking.

Interview nuance: this is a limitation of higher-order type inference, not a React runtime bug. `forwardRef` works fine; it is the type-level reconstruction of a generic through a wrapper that fails. The pre-19 workarounds all reconstruct the generic type by hand: retype the wrapped component with a cast (`SelectWithRef as <T>(p: SelectProps<T> & { ref?: Ref<...> }) => JSX.Element`), or define a generic wrapper component that internally renders the ref-forwarding one. Both are boilerplate whose only job is to re-declare the `T` that `forwardRef` erased.

React 19 removes the need entirely. `ref` is now a regular prop on function components, so you can drop `forwardRef` and take `ref` as an ordinary prop on a plain generic function. Because the component is once again a single bare generic signature, inference survives:

```tsx
type SelectProps<T> = {
  options: T[];
  onSelect: (item: T) => void;
  ref?: React.Ref<HTMLUListElement>;
};

function Select<T>({ options, onSelect, ref }: SelectProps<T>) {
  return <ul ref={ref}>{options.map((o, i) => <li key={i} onClick={() => onSelect(o)}>{String(o)}</li>)}</ul>;
}

// item is User again.
<Select options={users} onSelect={(item) => console.log(item.name)} ref={listRef} />;
```

Recap: `forwardRef` and `memo` return callable objects with extra members, which breaks TypeScript's higher-order inference and defaults a generic component's `T` to `unknown`; pre-19 you hand-reconstruct the generic, and React 19 fixes it cleanly because `ref` is a plain prop and the component stays a single generic signature.

#### See it live

**Demo (react-demo):** two tabs rendering the same `Select<T>` with `options={users}`, one wrapped in `forwardRef` (React 18) and one taking `ref` as a prop (React 19), each with a type-hover chip on the `onSelect` item parameter.

Widget: a tabbed card. Tab A "forwardRef (React 18)" shows `<SelectWithRef options={users} onSelect={(item) => ...} ref={r} />`, and a hover chip over `item` reads `item: unknown`; the expression `item.name` is underlined red with `Property 'name' does not exist on type 'unknown'`. Tab B "ref-as-prop (React 19)" shows `<Select options={users} onSelect={(item) => ...} ref={r} />`, and the hover chip over `item` reads `item: User` with no error. A small caption under each tab states whether inference survived. Both tabs render an identical clickable list at runtime; only the type chip differs, which is the whole lesson.

```tsx
// Tab A: React 18 forwardRef, T collapses to unknown.
const SelectWithRef = React.forwardRef(function Select<T>(
  { options, onSelect }: SelectProps<T>,
  ref: React.Ref<HTMLUListElement>,
) { return <ul ref={ref}>{options.map((o, i) =>
    <li key={i} onClick={() => onSelect(o)}>{String(o)}</li>)}</ul>; });

// Tab B: React 19 ref-as-prop, T survives.
function Select<T>({ options, onSelect, ref }: SelectProps<T> & { ref?: React.Ref<HTMLUListElement> }) {
  return <ul ref={ref}>{options.map((o, i) =>
    <li key={i} onClick={() => onSelect(o)}>{String(o)}</li>)}</ul>;
}
```

**Watch:** the forwardRef tab shows `item: unknown` and an error on `item.name`, while the ref-as-prop tab shows `item: User` and no error, from the exact same `options={users}`. That proves the wrapper, not the component body, is what erased the generic, and that React 19's plain-function-with-ref-prop restores inference. (This is a compile-time illustration: the chips reproduce what `tsc` and your editor infer, since types are erased at runtime and both tabs behave identically when clicked.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why higher-order inference fails through `forwardRef` for a generic `Select<T>` that infers `onSelect`'s `item` as `unknown` instead of `User`, then rewrite it the React 19 way (drop `forwardRef`, take `ref` as a prop) so `T` survives, and note what the pre-19 workaround was.

**Think about:**
- Why does higher-order inference fail on `forwardRef`?
- What are the pre-19 workarounds?
- What changed in React 19?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
// React 19 fix: ref is a normal prop, component stays a bare generic function.
type SelectProps<T> = {
  options: T[];
  onSelect: (item: T) => void;
  ref?: React.Ref<HTMLUListElement>;
};

function Select<T>({ options, onSelect, ref }: SelectProps<T>) {
  return (
    <ul ref={ref}>
      {options.map((o, i) => (
        <li key={i} onClick={() => onSelect(o)}>{String(o)}</li>
      ))}
    </ul>
  );
}

// item is User again, no cast.
<Select options={users} onSelect={(item) => console.log(item.name)} ref={listRef} />;
```

Mechanism: TypeScript can only carry a free type parameter through a higher-order function when the wrapped value is a single plain call signature it can reconstruct. `forwardRef` (and `memo`) return a callable object decorated with extra members (`$$typeof`, `displayName`, and friends), which is no longer a bare generic signature, so TypeScript cannot preserve `T` and falls back to its constraint, `unknown`. The runtime is fine; only the type parameter is lost, so `onSelect`'s `item` becomes `unknown` and `item.name` fails to type-check.

Pre-19 workarounds all re-declare the generic by hand. The common ones: cast the wrapped component to a generic function type (`SelectWithRef as <T>(p: SelectProps<T> & { ref?: Ref<HTMLUListElement> }) => React.ReactElement`), or write a thin generic wrapper component that renders the `forwardRef`ed one internally, letting the wrapper's own `<T>` restore inference. Both are boilerplate whose sole purpose is to reintroduce the `T` the wrapper erased.

React 19 makes `ref` an ordinary prop, so you drop `forwardRef` entirely and write a plain generic function component that accepts `ref` in its props. Because it is once again a single generic signature with no decorating wrapper, higher-order inference is not even involved, and `T` flows normally.

How to spot it in review: a generic component behind `forwardRef` or `memo` whose consumers all cast the callback argument, or whose hover types read `unknown`. If every call site casts, the generic is not actually generic.

Production symptom: a shared `Select`, `Combobox`, or `Autocomplete` loses item-type safety exactly where library authors most need it, so a field rename on the option type ships silently and every consumer's `onSelect` handler reads `undefined`.

Common misconception: that `forwardRef` preserves generics. It preserves runtime behavior but flattens the type parameter to `unknown`; the generic looks intact in the source and is gone in the types.

**Self-check rubric:**
- [ ] Explained `forwardRef`/`memo` return objects with extra members, breaking higher-order inference.
- [ ] Stated `T` defaults to its constraint (`unknown`) as a result.
- [ ] Gave the React 19 fix: drop `forwardRef`, take `ref` as a prop.
- [ ] Named a pre-19 workaround (cast or generic wrapper component).
- [ ] Named the symptom: a generic component that loses item-type safety behind the wrapper.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Component-library `Combobox<T>` on React 18." Your published `Combobox` is `React.memo(forwardRef(function Combobox<T>(props, ref) {...}))`, and every downstream app casts `onChange`'s argument because it infers `unknown`. You cannot upgrade to React 19 this quarter. Provide a typed public API that restores generic inference for consumers today, and explain why both `memo` AND `forwardRef` in the stack matter.

**Model answer (revealed on demand):**

```tsx
// Internal, untyped-generic implementation stays as-is:
const ComboboxInner = React.memo(React.forwardRef(function Combobox<T>(
  props: ComboboxProps<T>,
  ref: React.Ref<HTMLInputElement>,
) {
  // ...implementation...
  return <input ref={ref} />;
})) as unknown as (<T>(p: ComboboxProps<T> & { ref?: React.Ref<HTMLInputElement> }) => React.ReactElement);

// Re-export the reconstructed generic signature as the public type.
export const Combobox = ComboboxInner;

// Consumer gets T = User back:
<Combobox options={users} onChange={(item) => item.name} ref={inputRef} />;
```

Mechanism: both `memo` and `forwardRef` return callable objects with extra members, so stacking them is doubly fatal to higher-order inference; TypeScript sees no bare generic signature at any layer and defaults `T` to `unknown`. The fix does not change the runtime at all; it re-asserts the type by casting the wrapped component to the generic call signature you want consumers to see (`<T>(p: ComboboxProps<T> & { ref? }) => ReactElement`). The `as unknown as` double cast is the honest way to say "I am overriding what inference produced," and it is safe here because the runtime behavior genuinely is generic; only the type reconstruction was lost.

How to spot it in review: a published component wrapped in `memo(forwardRef(...))` whose types export `unknown` for callback args, forcing every consumer to cast. The casts are spread across many repos, which is why fixing it at the library boundary is high-leverage.

Production symptom: every app consuming the library loses `onChange` item safety at once, so an option-type change ripples out as silent `undefined` reads in unrelated products. Fixing the exported signature restores checking for all of them without touching runtime. Misconception to correct: that you must wait for React 19. You can reconstruct the generic signature today with a single cast at the export site; React 19 just makes the cast unnecessary by letting `ref` be a plain prop on a bare generic function.

### ajr-l10-generic-hooks-tuples: Generic hooks and tuple-return inference

- **id:** `ajr-l10-generic-hooks-tuples`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** typescript, generics, hooks

#### Learn

Custom hooks that return `[value, setValue]` mirror `useState`, and they have a sharp inference trap: an array literal of mixed types widens to a union array, dropping the per-position types you wanted. Here is a `useToggle`:

```tsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((v) => !v);
  return [on, toggle]; // inferred as (boolean | (() => void))[]
}

const [on, toggle] = useToggle();
toggle(); // error: This expression is not callable. Not all constituents are callable.
```

The return type is `(boolean | (() => void))[]`, not `[boolean, () => void]`. TypeScript sees an array literal whose elements have different types and infers the closest common array type, which is an array of the union of those element types. Position information is gone: index `0` and index `1` are both `boolean | (() => void)`. So when you destructure, `toggle` is `boolean | (() => void)`, and calling it errors because a `boolean` is not callable. `on` has the same union, so `if (on)` also looks wrong to the compiler. The runtime is completely fine; the hook returns exactly what you think. Only the inferred type is wrong.

The fix is to tell TypeScript this is a tuple, where each position has its own type. Two ways:

```tsx
// A) Explicit tuple return type.
function useToggle(initial = false): [boolean, () => void] {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)];
}

// B) as const freezes the literal into a readonly tuple.
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((v) => !v);
  return [on, toggle] as const; // readonly [boolean, () => void]
}
```

Both preserve per-position types, so `toggle` is `() => void` and callable. The explicit annotation is the clearest for a public hook API because the return shape is documented in the signature. `as const` is terser and also makes the tuple `readonly`, which is usually fine for a returned pair the caller only destructures.

Interview nuance: `useState` itself returns a correctly typed tuple only because its type definition explicitly declares `[S, Dispatch<SetStateAction<S>>]`. TypeScript did not infer that tuple from a bare `return [state, setState]`; the library authors annotated it. Your custom hooks get no such help, so you must annotate or `as const` every tuple return yourself.

Threading a generic through the hook is the same idea plus a type parameter. A `useLocalStorage<T>` that returns `[value, setValue]` carries `T` from the initial value into the setter:

```tsx
function useLocalStorage<T>(key: string, initial: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);
  const set = (next: T) => { setValue(next); localStorage.setItem(key, JSON.stringify(next)); };
  return [value, set];
}

const [count, setCount] = useLocalStorage("count", 0); // count: number, setCount: (n: number) => void
```

`T` is inferred from `initial`, and the explicit tuple return type keeps `value` and `setValue` correctly typed at each position.

Recap: a mixed array literal widens to a union array and loses per-position types, so a `[value, setValue]` return infers `(A | B)[]` and the setter is not callable; fix it with an explicit tuple return type or `as const`, and remember `useState` only works because its own types hard-code the tuple.

#### See it live

**Demo (react-demo):** a `useToggle` used in a small toggle button, with a switch that flips the hook between a bare `return [on, toggle]` (widened) and `as const` / explicit tuple (fixed), and a type-hover chip on the destructured `toggle`.

Widget: a card with a toggle button wired to `useToggle`. Above the destructuring line `const [on, toggle] = useToggle()`, a hover chip shows the inferred type of `toggle`. A switch labeled "tuple return" flips the hook implementation. With the switch off, the chip reads `toggle: boolean | (() => void)` and the `onClick={toggle}` line is underlined red with `This expression is not callable`. Flip the switch on and the chip reads `toggle: () => void`, the red clears, and the button toggles a light on and off. A tiny second chip on `on` shows it flipping from the union type to `boolean`. The button works either way at runtime; the type chip and error marker are what change.

```tsx
// Off: widened union array.
function useToggleBad(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)]; // (boolean | (() => void))[]
}

// On: as const gives a readonly tuple.
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)] as const; // readonly [boolean, () => void]
}

const [on, toggle] = useToggle();
// <button onClick={toggle}>{on ? "On" : "Off"}</button>
```

**Watch:** with "tuple return" off, the hover chip on `toggle` reads `boolean | (() => void)` and `onClick={toggle}` errors as not callable, proving the mixed array literal widened and lost position `1`'s function type. Flip it on and `toggle` becomes `() => void` and the error clears, proving the explicit tuple or `as const` restores per-position types. (This is a compile-time illustration: the chips reproduce what `tsc` infers, since types are erased and the button toggles identically either way.)

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix `useToggle` whose `return [on, toggle]` infers `(boolean | (() => void))[]` so that calling `toggle` no longer errors. Give both fixes (explicit tuple return type and `as const`), explain why the array literal widened, and note how you would thread a generic `T` through a `useLocalStorage<T>` setter.

**Think about:**
- Why does a mixed array literal widen?
- How does `as const` help?
- How do you thread a generic through a custom hook setter?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
// Fix A: explicit tuple return type.
function useToggle(initial = false): [boolean, () => void] {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)];
}

// Fix B: as const.
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((v) => !v);
  return [on, toggle] as const; // readonly [boolean, () => void]
}

// Generic setter threaded through T:
function useLocalStorage<T>(key: string, initial: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);
  return [value, (next) => { setValue(next); localStorage.setItem(key, JSON.stringify(next)); }];
}
```

Mechanism: TypeScript infers the type of an array literal by widening to an array of the common element type. `[on, toggle]` has elements of type `boolean` and `() => void`, so the inferred type is `(boolean | (() => void))[]`: an array where every index is the union. Positions are erased, so destructured `toggle` is `boolean | (() => void)` and calling it fails because `boolean` is not callable. Nothing is wrong at runtime; the value returned is exactly the pair you built. The type is the only thing that widened.

An explicit return type `[boolean, () => void]` tells the compiler this is a tuple with distinct positions, so index `0` is `boolean` and index `1` is `() => void`. `as const` reaches the same result differently: it infers the literal as a `readonly` tuple with each element's narrowest type preserved in place. For a generic hook, add a type parameter and annotate the tuple with it: `useLocalStorage<T>(key, initial: T): [T, (next: T) => void]` infers `T` from `initial` and threads it into both the value position and the setter's parameter.

How to spot it in review: consumers of a custom hook casting a destructured return, or getting union-typed values off a `[a, b]` return, or a hook whose return type hover shows `(A | B)[]` instead of `[A, B]`. Any hook returning a fixed-length heterogeneous array needs a tuple annotation.

Production symptom: calling the returned setter errors or forces a cast at every call site, so teams either sprinkle `as` casts or, worse, retype the hook return as `any` and lose all safety on both positions.

Common misconception: that tuple positions are inferred automatically the way `useState` shows them. They are not. `useState` only returns a typed tuple because its own type definition hard-codes `[S, Dispatch<...>]`; a bare `return [a, b]` in your hook widens unless you annotate or use `as const`.

**Self-check rubric:**
- [ ] Explained a mixed array literal widens to a union array, losing positions.
- [ ] Gave the explicit tuple return type fix.
- [ ] Gave the `as const` fix and noted it is `readonly`.
- [ ] Threaded a generic `T` from initial value into the setter parameter.
- [ ] Noted `useState`'s tuple comes from its type def, not from inference.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Shared `useAsync<T>` in a hooks package." Your team's `useAsync` returns `[data, loading, error, refetch]` and every consumer destructures union-typed garbage: `refetch` is inferred not callable and `loading` is inferred `T | boolean | Error | (() => void)`. Rewrite the return so all four positions type correctly for any `T`, and explain why a four-element mixed array is an even worse widening trap than a two-element one.

**Model answer (revealed on demand):**

```tsx
type UseAsyncResult<T> = [
  data: T | undefined,
  loading: boolean,
  error: Error | null,
  refetch: () => void,
];

function useAsync<T>(fn: () => Promise<T>): UseAsyncResult<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refetch = () => {
    setLoading(true);
    fn().then(setData).catch(setError).finally(() => setLoading(false));
  };
  return [data, loading, error, refetch];
}

const [user, loading, error, refetch] = useAsync(fetchUser); // user: User | undefined, refetch: () => void
```

Mechanism: with four heterogeneous elements, a bare `return [...]` widens to `(T | undefined | boolean | Error | null | (() => void))[]`, so every one of the four destructured names gets that whole union. Every position is simultaneously wrong: `loading` is not usable as a boolean without narrowing, `error` is not narrowable to `Error | null`, and `refetch` is not callable. The more positions of differing types, the wider the union and the more useless each slot becomes, which is why four elements is strictly worse than two. The explicit tuple type `UseAsyncResult<T>` (with optional named labels for readability) pins each index to its real type, and `T` flows from `fn`'s return through `data`.

How to spot it in review: any hook returning three or more mixed values as a bare array, especially where consumers destructure and immediately cast or add `!` non-null assertions to make positions usable. Production symptom: every screen using the hook fights the types, so teams either cast at every call site or retype the return as `any[]`, which silently erases safety on data, loading, error, and refetch all at once. Misconception to correct: that returning an object would be the only fix. An object works, but the direct fix is a tuple type; the widening is not caused by using an array, it is caused by not annotating the array's positions.
