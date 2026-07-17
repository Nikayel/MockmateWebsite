> Module **10.4** (Typing the Surface) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [10.3](./l10-generics-components.md) · Next: [10.5](./l10-strictness-flags.md)

# L10 · Typing the Surface

The public surface of a component is its props and its ref, and that surface is where most React TypeScript pain actually lives. After this module you can catch the four mistakes that make a well-typed component miserable to use: `children` typed too narrowly so real content is rejected, a polymorphic `as` prop that lies about which HTML attributes are valid, an event handler that silently drops to `any` the moment you extract it, and `useRef` written the pre-React-19 way so the compiler and the runtime disagree about null.

### ajr-l10-typing-children: Typing children: ReactNode vs JSX.Element

- **id:** `ajr-l10-typing-children`  ·  **difficulty:** easy  ·  **est:** 10 min  ·  **demo:** react-demo  ·  **skills:** typescript, children, props

#### Learn

`children` is the most common prop you will ever type, and the most commonly mistyped. The instinct is `children: JSX.Element`, because "children are JSX." That type is wrong for almost every wrapper you write, and the compiler will start rejecting perfectly valid usage.

Here is the trap:

```tsx
function Card({ children }: { children: JSX.Element }) {
  return <section className="card">{children}</section>;
}
```

`JSX.Element` (identical to `React.ReactElement`) means "exactly one React element object." So the compiler accepts `<Card><span>hi</span></Card>` and rejects nearly everything else a real caller writes:

```tsx
<Card>hello</Card>                     // ❌ string is not JSX.Element
<Card>{count}</Card>                    // ❌ number is not JSX.Element
<Card>{cond && <X />}</Card>            // ❌ false is not JSX.Element
<Card><A /><B /></Card>                 // ❌ an array of elements is not one element
<Card>{items.map(i => <Row key={i} />)}</Card> // ❌ array again
```

Every one of those is legal React. The problem is that `JSX.Element` describes a single element, but what React can actually render is a much wider set: elements, strings, numbers, `null`, `undefined`, booleans, and arrays of all of those. That wider union has a name: `React.ReactNode`. That is the correct type for `children` on any wrapper.

```tsx
function Card({ children }: { children: React.ReactNode }) {
  return <section className="card">{children}</section>;
}
```

Now all five callers above type-check. The shortcut for "my props plus optional `ReactNode` children" is the built-in helper:

```tsx
type CardProps = React.PropsWithChildren<{ title: string }>;
// equivalent to: { title: string; children?: React.ReactNode }
```

Note `PropsWithChildren` makes `children` *optional*. If your component must have children, declare `children: React.ReactNode` explicitly (still allows the empty case) or `children: React.ReactNode` and validate at runtime; for a strict "at least one child" contract there is no clean static type, so most teams keep it required-but-broad.

When *do* you want the narrow type? When the component genuinely needs a single element to clone or inspect: a `<Tooltip>{trigger}</Tooltip>` that calls `React.cloneElement(children, ...)` needs `children: React.ReactElement` so `cloneElement` is sound. And for a render-prop, children is a *function*, not a node at all:

```tsx
type ToggleProps = {
  children: (state: { on: boolean; toggle: () => void }) => React.ReactNode;
};
// <Toggle>{({ on, toggle }) => <button onClick={toggle}>{on ? "On" : "Off"}</button></Toggle>
```

**Interview nuance:** `ReactNode` includes `undefined`, `null`, and `boolean`, which is *why* `{cond && <X/>}` works: the `false` branch is a legal `ReactNode` that React renders as nothing. `JSX.Element` excludes all three, so conditional children break under it. That single fact explains most "why won't my Card accept this" tickets.

Recap: use `React.ReactNode` for `children` on wrappers (or `PropsWithChildren`), reserve `ReactElement`/`JSX.Element` for the rare component that manipulates one specific element, and type render-prop children as a function returning `ReactNode`.

#### See it live

**Demo (react-demo):** a `Card` typed with `children: JSX.Element` rejecting text/number/fragment/conditional children, then a toggle switches it to `ReactNode` and everything passes, plus a render-prop example.

A two-column widget. The left column is a fake editor showing five `<Card>...</Card>` call sites (a string, a number, `{cond && <X/>}`, two sibling elements, and a `.map`). A segmented toggle at the top switches the declared `children` type between `JSX.Element` and `ReactNode`. Each call site has a status chip: a red "TS2322" chip when the current type rejects it, a green check when it passes. A third tab shows a render-prop `Toggle` with a live On/Off button so the learner sees children-as-function actually run. The chips are driven by this model:

```tsx
type Mode = "element" | "node";
const results: Record<string, Mode[]> = {
  '<Card>hello</Card>':            ["node"],           // fails under element
  '<Card>{count}</Card>':          ["node"],           // fails under element
  '<Card>{cond && <X/>}</Card>':   ["node"],           // fails under element
  '<Card><A/><B/></Card>':         ["node"],           // fails under element
  '<Card>{items.map(...)}</Card>': ["node"],           // fails under element
};
// chip = results[site].includes(mode) ? "pass" : "TS2322"
```

**Watch:** in `JSX.Element` mode, four of five call sites light up red with the exact "Type 'string' is not assignable to type 'ReactElement'" family of errors; flip the toggle to `ReactNode` and all five turn green at once. This is an honest illustration: the red chips are scripted stand-ins for the compiler diagnostics (the sandbox does not run `tsc` live), but the pass/fail split is exactly what TypeScript produces for these declarations. The render-prop tab genuinely runs so you can confirm function-children are a different shape entirely.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix a `Card` typed `children: JSX.Element` that breaks on `<Card>hello {cond && <X/>}</Card>`, and add a second component with render-prop children typed as a function. Say why the narrow type rejected valid content.

**Think about:**
- What is `ReactNode` vs `JSX.Element`/`ReactElement`?
- When do you actually want a single-element type?
- What does `PropsWithChildren` give you?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`<Card>hello {cond && <X/>}</Card>` passes `children` an *array* of `["hello ", false | <X/>]`, and neither a string nor `false` nor an array is a `JSX.Element`, so the compiler errors with "Type is not assignable to type 'ReactElement'." The declared type is narrower than what React can render.

Fix by widening to the real renderable union:

```tsx
function Card({ children }: React.PropsWithChildren) {
  return <section className="card">{children}</section>;
}
// or explicitly: { children: React.ReactNode }

function Toggle({ children }: {
  children: (state: { on: boolean; toggle: () => void }) => React.ReactNode;
}) {
  const [on, setOn] = React.useState(false);
  return <>{children({ on, toggle: () => setOn(v => !v) })}</>;
}
```

**Why at the mechanism level:** `ReactNode` is the union React's reconciler actually accepts as a child: `ReactElement | string | number | boolean | null | undefined | ReactNode[]`. `JSX.Element` is just `ReactElement`, one node object. Conditional children rely on `boolean` and mixed text+element children produce arrays and strings, all of which `ReactElement` excludes. Render-prop children are not nodes at all; they are functions the component calls, so they get a function type.

**How to spot it in review:** any wrapper, layout, or container component whose props say `children: JSX.Element` (singular). That is almost always a bug waiting for the first caller who passes text or a conditional. `children: ReactNode` should be the default; `ReactElement` needs a justification (usually a `cloneElement`).

**Production symptom (fixed):** consumers stop wrapping content in unnecessary `<>...</>` fragments or casting with `as any` just to satisfy `Card`. The component becomes usable with normal JSX.

**Common misconception corrected:** "children are JSX, so `JSX.Element` is the right type." No. Children are *renderable content*, a superset of a single element. The type that matches what React renders is `ReactNode`.

**Self-check rubric:**
- [ ] Changed `children` to `ReactNode` (or `PropsWithChildren`), not left as `JSX.Element`.
- [ ] Explained that mixed text+conditional children produce a string/boolean/array, none of which are `ReactElement`.
- [ ] Typed the render-prop child as a function returning `ReactNode`.
- [ ] Named `cloneElement`/single-element manipulation as the case for `ReactElement`.
- [ ] Noted `PropsWithChildren` makes `children` optional.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design-system review at scale. Your `<Menu>` component takes `children: ReactElement<MenuItemProps>[]` so it can read each item's `value` prop via `child.props.value` for keyboard navigation. A teammate reports `<Menu>{loading ? <Spinner/> : items.map(i => <MenuItem .../>)}</Menu>` fails to compile, and separately that `<Menu><MenuItem/>{null}</Menu>` fails. Decide whether to widen the type and how to keep the `child.props.value` access safe.

**Model answer (revealed on demand):**

The strict `ReactElement<MenuItemProps>[]` type is doing real work here: `Menu` inspects children to build its keyboard model, so it cannot accept arbitrary `ReactNode`. But the array-only, MenuItem-only type is too strict for real call sites: a conditional injects a `Spinner` or a bare `null`, and mixed children collapse to a non-array.

The right move is to accept `ReactNode` on the *type* surface and narrow at *runtime*, because "children shaped exactly like this" is not statically enforceable once conditionals are involved:

```tsx
function Menu({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(
    (c): c is React.ReactElement<MenuItemProps> =>
      React.isValidElement(c) && c.type === MenuItem
  );
  // items is now safely ReactElement<MenuItemProps>[]; read item.props.value
}
```

**Why:** `React.Children.toArray` flattens the string/array/conditional mess into a real array and drops `null`/`undefined`/`boolean`, which is exactly the `<Menu><MenuItem/>{null}</Menu>` case. The `isValidElement` + `c.type === MenuItem` type guard recovers the strong `ReactElement<MenuItemProps>` type where you need `props.value`, without forcing every caller to pass a pristine array. Keeping the *prop* type strict felt safer but shifted the pain onto every consumer, and it still broke the moment anyone wrote a conditional. The production symptom of the strict version is teammates disabling the check with `as any[]` or wrapping items in fragments that then break the `React.Children` iteration. The misconception is that a precise child-array type buys you safety; in practice it buys you broken call sites, and the durable pattern is broad-in, narrow-with-a-guard.

### ajr-l10-polymorphic-as-prop: Polymorphic as-prop components

- **id:** `ajr-l10-polymorphic-as-prop`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** typescript, polymorphic, props

#### Learn

A polymorphic component renders as different HTML elements depending on an `as` prop: `<Box as="a" href="/x" />`, `<Box as="button" disabled />`, `<Box as="div" />`. The hard part is the type: when `as="a"`, `href` must be valid; when `as="div"`, `href` must be an error; and the forwarded `ref` must be `HTMLAnchorElement` vs `HTMLDivElement` accordingly. The lazy version throws it all away:

```tsx
// ❌ the "give up" version
function Box(props: { as?: keyof JSX.IntrinsicElements } & Record<string, any>) {
  const { as: Tag = "div", ...rest } = props;
  return <Tag {...rest} />;
}
```

This compiles and accepts `<Box as="div" href="/nope" />` happily, because `rest` is `any`. Every per-element guarantee is gone.

The real pattern is a generic over the element type, pulling that element's own props with `ComponentPropsWithoutRef`:

```tsx
import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";

type BoxProps<E extends ElementType> = {
  as?: E;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<E>, "as" | "children">;

function Box<E extends ElementType = "div">({ as, ...rest }: BoxProps<E>) {
  const Tag = as ?? "div";
  return <Tag {...rest} />;
}
```

The generic `E` captures the chosen tag at the call site. `ComponentPropsWithoutRef<E>` resolves to that element's intrinsic attributes: `ComponentPropsWithoutRef<"a">` includes `href`, `ComponentPropsWithoutRef<"button">` includes `disabled`, `ComponentPropsWithoutRef<"div">` includes neither. The `Omit<..., "as" | "children">` prevents your own props from colliding with the element's. Now `<Box as="a" href="/x" />` is valid and `<Box as="div" href="/x" />` errors with "Property 'href' does not exist."

Refs are the second half. Because the DOM node differs per tag, you need `ComponentPropsWithRef` (or `ComponentPropsWithoutRef` plus an explicit `ref?: Ref<...>`), and in a real design system you wrap with `forwardRef` and reach for a `PolymorphicRef<E>` helper:

```tsx
type PolymorphicRef<E extends ElementType> =
  ComponentPropsWithRef<E>["ref"];
```

So `ref` resolves to `Ref<HTMLAnchorElement>` when `as="a"` and `Ref<HTMLButtonElement>` when `as="button"`. (In React 19 you can skip `forwardRef` and take `ref` as a normal prop, which makes this noticeably less ceremonial, covered in the next lesson.)

**Interview nuance:** the DX cost is real and worth naming. Full polymorphism balloons hover tooltips, slows editor completion, and produces error messages that are genuinely hard to read (`Omit<DetailedHTMLProps<...>>` walls of text). Many teams deliberately do *not* go fully polymorphic; they ship two or three concrete components (`Button`, `LinkButton`) instead. Knowing when the type gymnastics are not worth it is a senior signal, not a gap.

Recap: type polymorphic components with `<E extends ElementType>` + `Omit<ComponentPropsWithoutRef<E>, "as" | "children">` so per-element attributes are enforced, forward the ref via `ComponentPropsWithRef<E>["ref"]`, and remember the DX cost sometimes argues for concrete components instead.

#### See it live

**Demo (react-demo):** a `Box` with an `as` dropdown (`div` / `a` / `button`) and two toggle props, `href` and `disabled`, showing which combinations are valid and what element the `ref` resolves to.

A widget with a dropdown for `as` (div, a, button) and two checkboxes labeled `pass href` and `pass disabled`. Below, a live "type panel" shows the resolved constraint: a validity chip (green valid / red invalid) for the current `as` + props combination, plus a "ref type:" readout that updates to `HTMLDivElement`, `HTMLAnchorElement`, or `HTMLButtonElement`. A rendered preview shows the actual element (a real `<a>` navigates, a real `<button>` can be disabled). Built around:

```tsx
const validity: Record<string, { href: boolean; disabled: boolean; ref: string }> = {
  div:    { href: false, disabled: false, ref: "HTMLDivElement" },
  a:      { href: true,  disabled: false, ref: "HTMLAnchorElement" },
  button: { href: false, disabled: true,  ref: "HTMLButtonElement" },
};
// chip = (!hrefOn || validity[as].href) && (!disabledOn || validity[as].disabled)
```

**Watch:** turn on `pass href` with `as="div"` and the chip goes red with "Property 'href' does not exist on type"; switch `as` to `a` and it goes green. Turn on `pass disabled` and only `as="button"` keeps it valid. The "ref type:" line changes with every `as` selection. This is an honest illustration: the chips and ref readout are scripted stand-ins for what `tsc` reports for `BoxProps<E>` (the sandbox does not run the type checker), but the valid/invalid matrix is exactly what the generic produces. The rendered preview element is real.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Type a `<Box as>` component with `ComponentPropsWithoutRef<E>` so `<Box as="a" href="/x" />` is valid but `<Box as="div" href="/x" />` errors, and make the forwarded `ref` resolve to the correct element per `as`. Say why the `Record<string, any>` version failed to catch anything.

**Think about:**
- How do you pull the intrinsic props of the chosen tag?
- How do you forward the correct ref type?
- What is the compile-time and DX cost?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The `Record<string, any>` version fails because `any` disables every check: `rest` swallows `href`, `disabled`, and anything else, so no per-element attribute is ever validated. You need a generic so the type of `rest` *depends on* the chosen tag.

```tsx
import {
  forwardRef, type ElementType,
  type ComponentPropsWithoutRef, type ComponentPropsWithRef, type ReactNode,
} from "react";

type BoxProps<E extends ElementType> = {
  as?: E;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<E>, "as" | "children">;

type PolymorphicRef<E extends ElementType> = ComponentPropsWithRef<E>["ref"];

const Box = forwardRef(
  <E extends ElementType = "div">(
    { as, ...rest }: BoxProps<E>,
    ref: PolymorphicRef<E>,
  ) => {
    const Tag = as ?? "div";
    return <Tag ref={ref} {...rest} />;
  },
);
```

**Why at the mechanism level:** `E extends ElementType` binds a fresh type variable to whatever you pass as `as` at the call site. `ComponentPropsWithoutRef<E>` is a conditional/mapped lookup into React's per-element prop tables, so it resolves to `AnchorHTMLAttributes` for `"a"` (has `href`) and `HTMLAttributes` for `"div"` (no `href`). `Omit<..., "as" | "children">` stops your own two props from clashing. The ref is typed by reading `["ref"]` off `ComponentPropsWithRef<E>`, which is exactly `Ref<HTMLAnchorElement>` for `"a"`, so `ref` matches the DOM node React actually attaches.

**How to spot it in review:** an `as` prop typed `keyof JSX.IntrinsicElements` combined with props typed `any`, `Record<string, any>`, or a spread with no per-element constraint. That is the tell for "polymorphic in name only."

**Production symptom (fixed):** invalid attributes per element are caught at build time (`href` on a `div`, `disabled` on an `a`), and `ref` callbacks receive the correctly typed node instead of a generic `HTMLElement` you have to cast.

**Common misconception corrected:** "one `any`-typed props object works for polymorphic components." It compiles, but it validates nothing; the entire point of the pattern is per-element props, and `any` throws that away. If you do not want the generic complexity, ship concrete components instead; do not fake it with `any`.

**Self-check rubric:**
- [ ] Introduced `<E extends ElementType>`, not a fixed `keyof JSX.IntrinsicElements` union.
- [ ] Used `ComponentPropsWithoutRef<E>` (with `Omit` of `as`/`children`) for the props.
- [ ] Typed the ref via `ComponentPropsWithRef<E>["ref"]` so it varies per tag.
- [ ] Explained that `any` disabled all per-element checking.
- [ ] Acknowledged the DX cost and that concrete components are a valid alternative.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design-system `<Text as>` that must also accept *other components*, not just intrinsic tags: `<Text as={NextLink} href="/x" />` should validate `NextLink`'s props, and `<Text as="h1" />` should validate heading attributes. Extend the polymorphic type to cover custom components, and decide how to handle the `color` prop your `Text` owns that some elements also define.

**Model answer (revealed on demand):**

`ElementType` already covers both intrinsic tags (`"h1"`) and component types (`typeof NextLink`), and `ComponentPropsWithoutRef<E>` works for both: for a component it resolves to that component's props, so `href` is validated against `NextLink`'s own signature. The `<E extends ElementType>` generic needs no change; the win is that it was designed for this from the start.

The real problem is prop collisions. Your `Text` owns a `color` prop (a design-token union like `"muted" | "danger"`), but `<a>` and many components *also* define `color` (a CSS/string attribute). If you naively intersect, TypeScript takes the intersection of the two `color` types, which is usually `never`, and the prop becomes unusable. Resolve it by `Omit`-ing your owned keys from the element props so your definition wins:

```tsx
type Merge<E extends ElementType, Own> = Own & Omit<ComponentPropsWithoutRef<E>, keyof Own | "as">;

type TextProps<E extends ElementType> = Merge<
  E,
  { as?: E; color?: "muted" | "danger"; children?: ReactNode }
>;
```

**Why:** `Omit<ComponentPropsWithoutRef<E>, keyof Own | "as">` strips every key your component defines from the element's props *before* intersecting, so `color` has exactly one definition, yours, and there is no `never` collision. This is the standard "owned props take precedence" merge that libraries like Radix and Chakra use. The production symptom of getting this wrong is a `color` prop that accepts nothing (`never`) or, worse, silently widens to `string` and loses your token autocomplete. The misconception is that intersecting props is safe; when both sides define the same key with different types, intersection narrows to `never`, so precise merges must `Omit` first. Name the DX ceiling too: once you support arbitrary components, error messages get long, and it is reasonable to cap `as` to a curated set for a `Text` primitive.

### ajr-l10-event-handler-inference: Extracted event handlers lose inference

- **id:** `ajr-l10-event-handler-inference`  ·  **difficulty:** medium  ·  **est:** 10 min  ·  **demo:** react-demo  ·  **skills:** typescript, events, inference

#### Learn

Write an event handler inline and TypeScript knows the event type for free:

```tsx
<input onChange={(e) => setValue(e.target.value)} />
// e is React.ChangeEvent<HTMLInputElement>, no annotation needed
```

You never annotated `e`, yet `e.target.value` is a typed `string` and a typo like `e.target.valeu` is a compile error. That is *contextual typing*: because the arrow function sits directly in the `onChange` prop position, TypeScript looks at what `onChange` expects (`(e: ChangeEvent<HTMLInputElement>) => void`) and flows that parameter type into your inline callback.

Now extract the handler, the refactor everyone does to tidy JSX:

```tsx
function handleChange(e) {          // ❌ e is implicitly any
  setValue(e.target.value);
}
// ...
<input onChange={handleChange} />
```

The moment the function is a standalone declaration, there is no `onChange` context at the point of definition, so contextual typing has nothing to work from. Under `noImplicitAny` this is a compile error; without it (or in a loosely configured file) `e` silently becomes `any`, and `any` is contagious: `e.target`, `e.target.value`, and a typo like `e.target.valeu` all pass with zero complaint. The bug ships as `value === undefined`.

The fix is to annotate the parameter yourself:

```tsx
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  setValue(e.target.value);
}
```

The event/element pairs you reach for most:

```tsx
onChange  → React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
onClick   → React.MouseEvent<HTMLButtonElement>
onSubmit  → React.FormEvent<HTMLFormElement>
onKeyDown → React.KeyboardEvent<HTMLInputElement>
```

An alternative that keeps inference is to type the *variable*, not the parameter, using React's handler types:

```tsx
const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
  setValue(e.target.value); // e inferred again, because the variable's type provides context
};
```

**Interview nuance:** prefer `e.currentTarget` over `e.target` when you need the element the handler is attached to. `currentTarget` is precisely typed to the element the handler is on (the `HTMLInputElement`), while `e.target` is the element that originated the event, which for bubbling events can be a descendant and is typed more loosely (`EventTarget`) in some handler shapes. For a form's `onSubmit`, `e.currentTarget` is the `<form>`; `e.target` may be the button that was clicked. Reaching for `currentTarget` avoids a class of "why is `.value` not on this type" surprises.

Recap: inline handlers get their event type from contextual typing; extracting the function removes that context, so annotate the parameter (`e: React.ChangeEvent<HTMLInputElement>`) or type the variable (`React.ChangeEventHandler<...>`), and prefer `currentTarget` for the attached element.

#### See it live

**Demo (react-demo):** two inputs side by side, one with an inline handler (`e` inferred) and one with an extracted un-annotated handler (`e` is `any`), with a hover-style readout of `e`'s type and a deliberate typo test.

A widget with two labeled inputs: **Inline** and **Extracted (untyped)**. Under each is a "type of `e`:" readout: the inline one shows `React.ChangeEvent<HTMLInputElement>`, the extracted one shows `any` in red. A "run typo test" button flips both handlers to read `e.target.valeu` (misspelled) and shows whether each catches it: the inline column shows a red "TS2551: did you mean 'value'?", the extracted column shows a green-but-wrong "compiles, value is undefined" note. Built around:

```tsx
// A) inline: contextual typing supplies the parameter type
<input onChange={(e) => setValue(e.target.value)} />  // e: ChangeEvent<HTMLInputElement>

// B) extracted, unannotated: no context at definition site
function handleChange(e) { setValue(e.target.value); } // e: any
<input onChange={handleChange} />
```

**Watch:** both inputs type normally, but hit "run typo test" and the split is stark: the inline handler's typo is a compile error (caught), while the extracted handler's identical typo compiles and produces `undefined` at runtime (the "Extracted" input's readout flips to `value: undefined`). This is an honest illustration: the type readouts and the TS2551 message are scripted stand-ins for the compiler (the sandbox does not run `tsc`), but the runtime half is real: the extracted input genuinely stores `undefined` when the property name is wrong, which is exactly the production failure.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix an extracted `function handleChange(e) { setV(e.target.value) }` where `e` is implicitly `any`, by annotating it `e: React.ChangeEvent<HTMLInputElement>`. Explain why the inline version needed no annotation but the extracted one does, and what breaks if `noImplicitAny` is off.

**Think about:**
- Why does inline infer `e` but extraction not?
- Which event and element types do you use for change, click, and submit?
- Why is `e.currentTarget` more reliably typed?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Inline, the callback sits in the `onChange` prop slot, so TypeScript uses *contextual typing*: it reads `onChange`'s expected signature and flows `ChangeEvent<HTMLInputElement>` into `e`. Extracted, `handleChange` is defined with no surrounding `onChange` context, so there is nothing to infer from and `e` defaults to `any` (a hard error under `noImplicitAny`, a silent `any` without it).

```tsx
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  setV(e.target.value);
}
// or type the variable so inference returns:
const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => setV(e.target.value);
```

**Why at the mechanism level:** contextual typing is a definition-site feature. It only fires when the function *expression* is written in a position with a known expected type (a JSX prop, an argument, a typed variable). A standalone `function` declaration has no such position, so the parameter falls back to its default, `any`. Annotating restores the exact type; typing the variable restores inference by giving the expression an expected type again.

**How to spot it in review:** named handler functions (`function handleX(e)` or `const handleX = (e) =>`) with an un-annotated event parameter. If you see the parameter used as `e.target.value` with no type on `e`, it is either an error you have suppressed or a silent `any`.

**Production symptom:** with `any`, property typos on the event (`e.target.valeu`, `e.taget`) compile fine and evaluate to `undefined`, so the field's value is silently `undefined`, form state is wrong, and nothing surfaces until QA or a user reports blank data. The type system that would have caught it was switched off by the stray `any`.

**Common misconception corrected:** "extracting a handler keeps its inferred event type." It does not. The inferred type existed *because* of the inline position; remove the position and you remove the inference. You must re-supply the type at the new definition site.

**Self-check rubric:**
- [ ] Annotated the parameter `e: React.ChangeEvent<HTMLInputElement>` (or typed the variable as `ChangeEventHandler`).
- [ ] Explained contextual typing as a definition-site feature that needs an expected type.
- [ ] Correctly paired change/click/submit with their event and element types.
- [ ] Named the `any`-is-contagious runtime symptom (`undefined` value from a typo).
- [ ] Mentioned `noImplicitAny` as the difference between an error and a silent `any`.

#### Practice: real-world variant (save, then reveal)

**Prompt:** A shared `useForm` hook exposes `register(name)` returning `{ onChange, onBlur }`, and a teammate extracts a `handleSubmit(e)` plus per-field validators pulled out of the JSX, all un-annotated, in a file where `noImplicitAny` happens to be `false`. Predict the concrete failures across a `<form>`, a `<select>`, and a checkbox, and give the typed rewrite.

**Model answer (revealed on demand):**

With `noImplicitAny: false`, none of these error at compile time, so the failures are all runtime and all silent. `handleSubmit(e)` with `e: any` will not flag a missing `e.preventDefault()` typo (`e.preventDefualt()` compiles, the form does a full-page reload, and the SPA state is blown away). A `<select>` change handler typed loosely reads `e.target.value` fine but cannot distinguish `HTMLSelectElement`, so a refactor to multi-select (`e.target.selectedOptions`) has no guardrail. A checkbox handler that reads `e.target.value` instead of `e.target.checked` compiles and stores the literal string `"on"` forever.

Typed rewrite:

```tsx
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  // e.currentTarget is the <form>, precisely typed
}
function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) { setCity(e.target.value); }
function handleAgree(e: React.ChangeEvent<HTMLInputElement>) { setAgree(e.target.checked); }
```

**Why:** each annotation restores the element-specific surface that `any` erased: `FormEvent<HTMLFormElement>` makes `preventDefault` and a typed `currentTarget` real, `HTMLSelectElement` exposes `selectedOptions`, and `HTMLInputElement` exposes `checked` (which `any` never distinguished from `value`). The production symptoms are the classic trio: a form that reloads the page, a select that breaks on the multi-select refactor, and a checkbox stored as `"on"`. The misconception is that turning `noImplicitAny` off is a harmless convenience; it converts a wall of compile errors into a set of silent runtime bugs that all look like "the data is just wrong." The durable fix is to annotate handlers (or type them as `React.FormEventHandler` / `React.ChangeEventHandler`) and, longer term, turn `noImplicitAny` back on for the file.

### ajr-l10-useref-types-react19: useRef types in React 19 (required arg, cleanup)

- **id:** `ajr-l10-useref-types-react19`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** typescript, refs, react19

#### Learn

React 19 changed the types and the calling convention around refs, and code written for React 18 now either fails to compile or carries dead ceremony. Three things moved.

**1. `useRef` now requires an argument.** In React 18 you could write `useRef<HTMLInputElement>()` with no argument. In React 19 the no-arg overload for a typed ref is gone; you must pass an initial value:

```tsx
const ref = useRef<HTMLInputElement>();       // ❌ React 19: Expected 1 argument, but got 0
const ref = useRef<HTMLInputElement>(null);   // ✅ DOM ref, .current starts null
```

This makes the null-ness honest. A DOM ref's `.current` genuinely *is* `null` between the first render and when React attaches the node, so the type is `RefObject<HTMLInputElement>` with `.current: HTMLInputElement | null`. Code that did `ref.current!` in render to silence the null was lying; before mount it really is null.

**2. `ref` is now a normal prop; `forwardRef` is legacy.** In React 19 function components receive `ref` as an ordinary prop, so you type it directly and delete the `forwardRef` wrapper:

```tsx
function TextField({ ref, ...props }: { ref?: React.Ref<HTMLInputElement> } & Props) {
  return <input ref={ref} {...props} />;
}
```

Leftover `forwardRef` wrappers still work but are a code smell in a React 19 codebase; the ref-as-prop version is shorter and better typed.

**3. Ref callbacks may return a cleanup function.** A callback ref can now return a teardown, mirroring `useEffect`. This is the clean way to subscribe to a DOM node and unsubscribe when it detaches:

```tsx
<input
  ref={(node) => {
    if (!node) return;
    const ro = new ResizeObserver(() => {/* ... */});
    ro.observe(node);
    return () => ro.disconnect(); // ✅ runs when the node detaches / component unmounts
  }}
/>
```

Before React 19 a callback ref returning a value was a type error, and you handled teardown by watching for the `null` call (`ref={node => node ? subscribe(node) : unsubscribe()}`). The cleanup-returning form is both better typed and less error-prone.

**Mutable vs readonly overloads.** `useRef` has two shapes. `useRef<T>(null)` where you pass a ref to JSX gives a `RefObject<T>` whose `.current` React manages. When you use a ref as a plain mutable box (a latest-value store, an interval id), you want the mutable overload, which you get by including the value type in the initial value:

```tsx
const latest = useRef(0);              // MutableRefObject<number>, you write .current
const timer = useRef<number | null>(null); // mutable id box, you assign .current yourself
```

**Interview nuance:** the reason `.current` is `null` before mount is not a TypeScript quirk, it is the render lifecycle. React runs your component function (render) *before* it commits the DOM and assigns refs. So during the first render `ref.current` is genuinely `null`; refs are populated in the commit phase, which is why you read them in effects and event handlers, not in render. The `null` in the type is telling you the truth about *when* refs exist.

Recap: in React 19 write `useRef<T>(null)` (the arg is required and the null is honest), type `ref?: React.Ref<T>` as a plain prop instead of `forwardRef`, return a cleanup from callback refs for subscribe/unsubscribe, and pick the mutable overload (`useRef(initialValue)`) when the ref is a value box rather than a DOM handle.

#### See it live

**Demo (react-demo):** an input whose callback ref subscribes a `ResizeObserver` and returns a cleanup, shown next to a `useRef()` no-arg call flagged as an error, plus a readout of the readonly-vs-mutable overload.

A widget with a resizable input (drag a handle to change its width) wired with a cleanup-returning callback ref that attaches a `ResizeObserver`. A live **attach/cleanup log** records `attach` on mount, `resize WxH` as you drag, and `cleanup` when you click "Unmount". Beside it, a small "type panel" shows two `useRef` lines: `useRef<HTMLInputElement>()` marked red ("Expected 1 argument"), `useRef<HTMLInputElement>(null)` marked green, and a toggle that flips a third line between `RefObject<T>` (readonly `.current`, from `useRef<T>(null)`) and `MutableRefObject<T>` (writable `.current`, from `useRef(0)`). Built around:

```tsx
<input
  ref={(node) => {
    if (!node) return;
    log("attach");
    const ro = new ResizeObserver(([entry]) =>
      log(`resize ${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`));
    ro.observe(node);
    return () => { ro.disconnect(); log("cleanup"); }; // React 19 callback-ref cleanup
  }}
/>
```

**Watch:** on mount the log prints `attach`; dragging the resize handle streams `resize WxH` lines proving the observer is live; clicking "Unmount" prints `cleanup`, proving the returned teardown ran when the node detached. The callback-ref subscribe/cleanup is a *real* run in the sandbox. The type panel (the `useRef()` error and the `RefObject` vs `MutableRefObject` labels) is an honest illustration: those are scripted stand-ins for `tsc` output (the sandbox does not run the type checker), but they match exactly what React 19's `.d.ts` overloads produce.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Show the React 19 ref surface: `useRef<HTMLInputElement>(null)` (arg now required), a `ref` passed as a plain prop (no `forwardRef`), and a callback ref that returns a cleanup, and contrast the readonly (`RefObject`) vs mutable (`MutableRefObject`) overloads. Say why `.current` is `null` before mount.

**Think about:**
- Why is `.current` null before mount?
- What does a ref callback returning cleanup change?
- When do you want the mutable overload?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
// 1. required arg, honest null
const inputRef = useRef<HTMLInputElement>(null); // RefObject<HTMLInputElement>, .current: T | null

// 2. ref as a plain prop (React 19), no forwardRef
function TextField({ ref, ...props }: { ref?: React.Ref<HTMLInputElement> } & Props) {
  return <input ref={ref} {...props} />;
}

// 3. callback ref returning cleanup
<div ref={(node) => {
  if (!node) return;
  const ro = new ResizeObserver(onResize);
  ro.observe(node);
  return () => ro.disconnect();
}} />

// 4. mutable box overload
const renderCount = useRef(0);        // MutableRefObject<number>, you write .current
```

**Why at the mechanism level:** `.current` is `null` before mount because React executes the render phase (calling your component) *before* the commit phase (mutating the DOM and assigning refs). During the first render the node does not exist yet, so `.current` is genuinely `null`; React 19 makes the required-arg + `T | null` type reflect that instead of letting you pretend otherwise. The callback-ref cleanup changes teardown from "watch for the `null` call" to a proper returned function that React invokes when the node detaches or the component unmounts, so subscriptions (observers, event listeners) are guaranteed to be released. The mutable overload (`useRef(initialValue)`) is for refs used as *value boxes*, latest-props stores, interval ids, render counters, where you assign `.current` yourself and React never manages it.

**How to spot it in review:** leftover `forwardRef` wrappers in a React 19 codebase, `useRef()` with no initial value, and `ref.current!` non-null assertions in render (a lie, since it is null there). Also callback refs doing manual `node ? subscribe : unsubscribe` instead of returning a cleanup.

**Production symptom (fixed):** correct teardown (no leaked `ResizeObserver`/listeners after unmount) and no "cannot read property of null" crashes from reading `.current` during render before the node is attached.

**Common misconception corrected:** "`.current` is always non-null so I can assert it with `!`." It is `null` for the entire first render and after unmount. Read refs in effects and handlers (commit-phase-and-later), where the node exists, not in render.

**Self-check rubric:**
- [ ] Passed the required argument: `useRef<HTMLInputElement>(null)`.
- [ ] Typed `ref` as a normal prop (`React.Ref<T>`) rather than using `forwardRef`.
- [ ] Returned a cleanup from the callback ref and explained when it runs.
- [ ] Distinguished `RefObject` (managed, readonly-ish) from `MutableRefObject` (value box).
- [ ] Explained the render-before-commit reason `.current` is null pre-mount.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Migrating a component library from React 18 to 19. A `<VideoPlayer>` uses `forwardRef` to expose an imperative handle via `useImperativeHandle`, reads `videoRef.current!` in render to compute an initial aspect ratio, and attaches an `IntersectionObserver` in a callback ref by watching for the `null` call. Rewrite it for React 19 and list what each change fixes.

**Model answer (revealed on demand):**

Three separate React 18 habits need to change, and one has a real latent bug.

```tsx
type VideoHandle = { play: () => void; pause: () => void };

function VideoPlayer({ src, ref }: { src: string; ref?: React.Ref<VideoHandle> }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
  }), []);

  return (
    <video
      src={src}
      ref={(node) => {
        videoRef.current = node;
        if (!node) return;
        const io = new IntersectionObserver(onVisible);
        io.observe(node);
        return () => io.disconnect(); // guaranteed teardown
      }}
    />
  );
}
```

**What each change fixes.** Dropping `forwardRef` and taking `ref` as a prop removes the wrapper ceremony; `useImperativeHandle` still works, now reading `ref` straight from props. The `videoRef.current!` in render is the real bug: on the first render the `<video>` is not mounted, so `.current` is `null`, and computing an aspect ratio from it either crashes or reads stale zeros. Move that computation into an effect or the callback ref (where the node exists) and drop the `!`. Converting the `IntersectionObserver` attach to a cleanup-returning callback ref guarantees `io.disconnect()` runs on detach/unmount; the old `node ? observe : ...` pattern leaked the observer whenever the node changed identity without a `null` call in between.

**Symptoms fixed:** no null-deref on first render, no leaked `IntersectionObserver` (which otherwise keeps firing and holds the node in memory), and a cleaner type surface. The misconception to correct for the team: `forwardRef` is not "required for imperative handles" in React 19; `useImperativeHandle` reads `ref` from props like any other value, and the wrapper is now legacy.
