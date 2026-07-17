> Module **9.5** (Forms & Focus) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [9.4](./l9-events-submit.md) · Next: [10.1](./l10-discriminated-unions.md)

# L9 · Forms & Focus

Forms and focus are where "it works on my machine" quietly excludes real users. After this module you can catch a hand-rolled `isLoading`/`error` state that React 19 form Actions already give you for free, and you can spot a conditional render or modal that silently strands keyboard and screen-reader users on `document.body`.

### ajr-l9-form-actions-react19: React 19 form Actions (useActionState/useFormStatus/useOptimistic)

- **id:** `ajr-l9-form-actions-react19`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react19, forms, actions

#### Learn

Before React 19, every form submit meant the same four pieces of state by hand: `isPending`, `error`, the field values, and a reset after success. Teams wrote this hundreds of times, and got it subtly wrong hundreds of times: a spinner that never clears because an early `return` skipped `setPending(false)`, or a double-submit because the button was not disabled fast enough.

React 19 folds all of that into three hooks. The center is `useActionState`:

```tsx
const [state, formAction, isPending] = useActionState(
  async (prevState, formData: FormData) => {
    const title = formData.get("title") as string;
    try {
      const item = await createItem(title);
      return { ok: true, item, error: null };
    } catch (e) {
      return { ...prevState, ok: false, error: "Could not save" };
    }
  },
  { ok: false, item: null, error: null }, // initial state
);

return <form action={formAction}>...</form>;
```

`useActionState(fn, initial)` returns `[state, action, isPending]`. The `action` you pass to `<form action={...}>` receives `FormData`, not a synthetic event. React runs it inside a transition, so `isPending` flips to `true` on submit and back to `false` when the promise settles, no matter which branch you return from. That single fact kills the "stuck spinner" bug: there is no manual `finally` to forget.

The second hook, `useFormStatus`, reads the pending state of the nearest parent `<form>`. The catch that trips people up in interviews: it only works from a component **rendered inside** that form, not the component that renders the form.

```tsx
function SubmitButton() {
  const { pending } = useFormStatus(); // reads the enclosing <form>
  return <button disabled={pending}>{pending ? "Saving..." : "Save"}</button>;
}
```

If you call `useFormStatus` in the same component that renders `<form>`, it returns `pending: false` forever, because that component is not a descendant of the form in the React tree.

**Interview nuance:** passing a function to `<form action={fn}>` auto-resets the form fields on success (React calls `form.reset()` when the action resolves without throwing). People expect the typed values to stick and file a "form clears itself" bug. It is intentional. If you need the values to persist, use a controlled input or read them back from the returned `state`.

The third hook, `useOptimistic`, lets you show the result before the server confirms:

```tsx
const [optimisticItems, addOptimistic] = useOptimistic(
  items,
  (current, newItem) => [...current, { ...newItem, sending: true }],
);
```

Inside the action you call `addOptimistic(draft)` immediately, render the new row at once, and when the real `items` prop updates React discards the optimistic entry and reconciles to the truth. If the action throws, the optimistic state is rolled back automatically.

**Interview nuance:** these are not just less code, they compose with progressive enhancement. A `<form action>` submits even before hydration, and Server Actions run the same signature on the server.

Recap: `useActionState(fn, initial)` gives `[state, action, isPending]` with pending managed by a transition; `useFormStatus().pending` must be read from a child of the form; `<form action={fn}>` auto-resets on success; `useOptimistic` shows the new value instantly and rolls back on error.

#### See it live

**Demo (react-demo):** the same "add a todo" form rendered twice side by side, a manual `useState` version and a React 19 Actions version, both hitting the same mocked 800ms API.

The widget renders two panels. Each has a text input and a submit button. Above each panel is a live badge showing that panel's current `pending` value and a render counter. The mocked API is a `setTimeout(800)` that succeeds, except every third call rejects so the learner can watch error and rollback behavior. The learner types a title, clicks Save on each side, and watches the badges.

The Actions panel is built around this component:

```tsx
function ActionsTodoForm({ createItem }: { createItem: (t: string) => Promise<Item> }) {
  const [items, setItems] = useState<Item[]>([]);
  const [optimistic, addOptimistic] = useOptimistic(
    items,
    (cur, draft: Item) => [...cur, { ...draft, sending: true }],
  );
  const [state, action, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const title = formData.get("title") as string;
      addOptimistic({ id: "temp", title });
      try {
        const saved = await createItem(title);
        setItems((prev) => [...prev, saved]);
        return { error: null };
      } catch {
        return { error: "Save failed, rolled back" };
      }
    },
    { error: null },
  );

  return (
    <form action={action}>
      <StatusBadge pending={isPending} />
      <input name="title" />
      <SubmitButton />
      {state.error && <p role="alert">{state.error}</p>}
      <ul>{optimistic.map((i) => <li key={i.id} data-sending={i.sending}>{i.title}</li>)}</ul>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Saving..." : "Save"}</button>;
}
```

The manual panel wires `useState` for `pending`, `error`, and value, with an `onSubmit` handler that calls `setPending(true)` / `setPending(false)`.

**Watch:** on the Actions side, the button auto-disables the instant you submit (its badge flips to `pending: true`), the new item appears immediately with a dimmed "sending" style, then reconciles when the 800ms promise resolves, and the input clears itself on success. On the failing (every third) submit, the optimistic row vanishes and the `role="alert"` message shows. On the manual side you can double-click Save before `setPending(true)` commits and fire two requests, and the input keeps its text after success. This is a genuine live React render, not an approximation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Refactor this manual `onSubmit` with `useState` pending/error into `<form action={fn}>` + `useActionState`, plus a `SubmitButton` using `useFormStatus().pending`. Deliver the rewritten component and say why the manual version could double-submit.

```tsx
function AddComment({ postId }: { postId: string }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST", body: JSON.stringify({ text }),
    });
    if (!res.ok) setError("Failed");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button disabled={pending}>Post</button>
    </form>
  );
}
```

**Think about:**
- What does useActionState return?
- Where must useFormStatus be called?
- What does passing a function to form action do on success?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The manual version has two real defects: on an early failure `setError` runs but nothing resets the field, and more importantly the button is disabled by React state that only commits on the next render, so a fast second click (or an Enter key) can fire before `pending` is `true` and submit twice. It also never clears `error` on retry.

Corrected with Actions:

```tsx
function AddComment({ postId }: { postId: string }) {
  const [state, action] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => {
      const text = formData.get("text") as string;
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      return { error: res.ok ? null : "Failed to post" };
    },
    { error: null },
  );

  return (
    <form action={action}>
      <textarea name="text" />
      <SubmitButton />
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Posting..." : "Post"}</button>;
}
```

`useActionState(fn, initial)` returns `[state, action, isPending]`. Passing `action` to `<form action>` means React runs the async function inside a transition. The mechanism that fixes the double-submit: `useFormStatus().pending` reflects the form's live transition status synchronously with the submission, and React also blocks concurrent submissions of the same form action while one is in flight, so a second click is a no-op rather than a second POST. `SubmitButton` must be a separate child component because `useFormStatus` reads the nearest ancestor `<form>` from context; called in `AddComment` it would always be `false`.

How to spot it in review: any `const [isLoading, setIsLoading] = useState(false)` wrapped around a `fetch` in a submit handler, or a `useFormStatus` call sitting in the same component as its `<form>`.

Production symptom fixed: no more duplicate comments from double-clicks and no stuck "Posting..." spinner when a branch forgets to reset pending.

Common misconception corrected: people expect the textarea to keep its text after posting. `<form action={fn}>` auto-resets on success. That is the desired behavior here (fresh box for the next comment); if you needed the text kept you would control the input or echo it from `state`.

**Self-check rubric:**
- [ ] Destructured `useActionState` as `[state, action, isPending]` (not `[state, setState]`).
- [ ] `useFormStatus` is called inside a child rendered within the `<form>`, never the parent.
- [ ] The action reads from `FormData`, not a React event or controlled value.
- [ ] Explained the double-submit as state-disable lag plus React's in-flight action guard.
- [ ] Named that success auto-resets the form and said whether that is wanted.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Ship the like button." On a social feed, product wants tapping Like to feel instant even on a 2G connection, but the count must stay correct if the request fails. Rewrite a like button that currently does `await fetch` then `setCount` so it shows the new count immediately with `useOptimistic`, and explain what the user sees on both success and failure. Say why a plain `setCount(count + 1)` before the fetch is not equivalent.

**Model answer (revealed on demand):**

```tsx
function LikeButton({ post }: { post: Post }) {
  const [likes, setLikes] = useState(post.likes);
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (current) => current + 1,
  );
  const [, action] = useActionState(async () => {
    addOptimisticLike(null);
    const res = await likePost(post.id); // may reject on 2G timeout
    setLikes(res.likes);
    return null;
  }, null);

  return (
    <form action={action}>
      <button aria-pressed={optimisticLikes > post.likes}>
        ♥ {optimisticLikes}
      </button>
    </form>
  );
}
```

On success: the count jumps by one the instant the user taps, the transition keeps the button responsive, and when the server responds `setLikes` reconciles to the authoritative number (which may be higher than +1 if others liked concurrently). On failure: the action rejects, React discards the optimistic update, and the count snaps back to its real value with no manual rollback code.

Why `setCount(count + 1)` before the fetch is not equivalent: that permanently mutates real state, so if the request fails you have to write explicit rollback logic (`setCount(count)` in a catch), and you must guess the true value rather than adopting the server's. `useOptimistic` layers a temporary value over the real state that is automatically dropped when the underlying state next updates or the action throws. It also correctly handles rapid repeat taps: each optimistic update stacks over the confirmed base, so you never double-count or lose an increment to a stale closure.

Interview nuance: `useOptimistic` must be driven from inside an action or transition. Calling `addOptimisticLike` from a bare event handler outside a transition throws, because React needs the transition boundary to know when to discard the optimistic layer.

### ajr-l9-focus-management-a11y: Focus management and accessibility across lifecycle

- **id:** `ajr-l9-focus-management-a11y`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, a11y, focus

#### Learn

Focus is a single global pointer: `document.activeElement`. The browser has one hard rule that breaks most React apps. When the element that currently has focus is removed from the DOM, focus does not move to a sibling or parent. It falls to `document.body`. For a mouse user that is invisible. For a keyboard or screen-reader user it is a cliff: their next Tab starts from the top of the page, and a screen reader announces nothing, so they lose their place entirely.

This shows up constantly because conditional rendering unmounts focused nodes:

```tsx
{rows.map((r) => (
  <li key={r.id}>
    {r.label}
    <button onClick={() => remove(r.id)}>Delete</button>
  </li>
))}
```

Click Delete with the mouse and nobody notices. Press Enter on Delete with the keyboard and the button unmounts mid-action: focus drops to `body`, and the user must re-navigate the whole list. The fix is to decide where focus should go before you unmount, then move it after:

```tsx
function deleteRow(id: string, index: number) {
  remove(id);
  // after the row unmounts, focus the next row's delete button, or the list heading
  requestAnimationFrame(() => {
    const next = listRef.current?.querySelectorAll("button")[index];
    (next ?? headingRef.current)?.focus();
  });
}
```

**Interview nuance:** React does not restore focus for you, and it never has. There is no lifecycle hook that says "the focused node you owned just unmounted." You own that. `autoFocus` is not the answer either: it only fires once when a node mounts, so it cannot help with the node that just left.

Modals are the highest-stakes case because they demand four separate behaviors, and `autoFocus` covers at most one:

1. **Move focus in** on open: focus the first interactive element (or the dialog container).
2. **Trap Tab** inside: Tab from the last focusable element wraps to the first, Shift+Tab from the first wraps to the last, so focus cannot escape to the page behind.
3. **Restore focus** on close: return focus to the element that opened the modal, captured as `document.activeElement` at open time.
4. **Announce it as a dialog:** `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at the title so a screen reader says "dialog, "Delete account"" instead of reading nothing.

```tsx
function Modal({ title, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement; // capture opener
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => (triggerRef.current as HTMLElement | null)?.focus(); // restore
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Tab") trapFocus(e, dialogRef.current!);
      }}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
    </div>
  );
}
```

**Interview nuance:** route transitions have the same disease. In a single-page app, clicking a link swaps the page but leaves focus wherever it was, and a screen reader never announces the new page. The fix is to focus the new page's `<h1>` (with `tabIndex={-1}`) or an off-screen live region on navigation.

Recap: focus falls to `body` when the focused node unmounts and React never restores it; deleting a focused row must move focus to a sensible neighbor; a real modal needs move-in, Tab trap, restore-to-trigger, and `role=dialog`/`aria-modal`/`aria-labelledby` plus Escape; `autoFocus` alone covers none of the unmount cases.

#### See it live

**Demo (react-demo):** keyboard-only navigation of two widgets, a modal and a deletable list, each shown in a "broken" and "fixed" variant, with a persistent badge reading `Focus is on: <tag#id>` driven by a `focusin` listener on `document`.

The learner is told to put the mouse down and use Tab, Shift+Tab, Enter, and Escape only. The badge updates on every `focusin` event, and when focus is on `document.body` it turns red and reads `Focus is on: BODY (lost)`. The list widget renders rows each with a Delete button; the modal widget has an "Open" trigger.

```tsx
function FocusBadge() {
  const [where, setWhere] = useState("BODY");
  useEffect(() => {
    const onFocus = () => {
      const el = document.activeElement;
      setWhere(el && el !== document.body
        ? `${el.tagName}#${el.id || "(row)"}`
        : "BODY (lost)");
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);
  return <span data-lost={where.includes("BODY")}>Focus is on: {where}</span>;
}
```

**Watch:** in the broken list, Tab to a Delete button, press Enter, and the badge flips to red `BODY (lost)`; your next Tab restarts from the page top. In the fixed list the badge moves to the next row's Delete button and stays green. In the broken modal, Tab walks straight out of the dialog onto the page behind it and the trigger is never re-focused on close. In the fixed modal, opening focuses the first field, Tab wraps at the edges (never leaving the dialog), Escape closes it, and focus lands back exactly on the Open button. This is a genuine live React render; the only approximation is that a real screen reader's speech is represented here by the on-screen focus badge.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix this Modal so it focuses the first element on open, traps Tab, restores focus to the trigger on close, and adds `role`/`aria-modal`/`aria-labelledby` + Escape. Deliver the corrected component and explain what a keyboard user experiences with the original.

```tsx
function Modal({ open, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div className="overlay">
      <div className="dialog">
        <button onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}
```

**Think about:**
- Where does focus go when the focused node unmounts?
- What does a modal need for a11y?
- How do you handle focus on route/page transitions?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The original is a visual overlay only. A keyboard user opening it keeps focus wherever it was (behind the modal), can Tab straight through to the page underneath, gets no announcement that a dialog opened, cannot press Escape to close, and when it does close focus is left dangling because the button it was on may have unmounted.

Corrected:

```tsx
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function Modal({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener.current?.focus(); // restore on unmount
  }, [open]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return onClose();
    if (e.key !== "Tab") return;
    const nodes = ref.current!.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  return (
    <div className="overlay" onKeyDown={onKeyDown}>
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">{title}</h2>
        <button onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}
```

Mechanism: focus falls to `document.body` whenever the focused node unmounts, and React never restores it, so you capture the opener as `document.activeElement` at open time and re-focus it in the effect cleanup. `aria-modal="true"` plus `role="dialog"` tells assistive tech to treat everything outside as inert and announce the dialog, and `aria-labelledby` gives it a name from the title. The Tab handler is the trap: at the boundaries it prevents default and wraps, so focus physically cannot leave.

How to spot it in review: any conditionally rendered overlay with no `useRef`/`useEffect` focus logic, no `role="dialog"`, or a modal that has a trap but no restore (or vice versa). A giveaway is a modal that relies solely on `autoFocus`.

Production symptom: keyboard and screen-reader users get stranded on `body`, can interact with the page hidden behind the modal, and cannot escape without a mouse. This is a WCAG 2.4.3 (Focus Order) and 2.1.2 (No Keyboard Trap, in the good sense of a proper trap) failure that fails accessibility audits.

Misconception corrected: `autoFocus` does not manage focus. It fires once on mount for a single input and does nothing for trapping or restoring, so a modal built on it still leaks focus and abandons the user on close.

**Self-check rubric:**
- [ ] Captures `document.activeElement` on open and restores it in effect cleanup.
- [ ] Moves focus to the first focusable element (or dialog) on open.
- [ ] Traps Tab and Shift+Tab at both boundaries with `preventDefault`.
- [ ] Adds `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` to a real title id.
- [ ] Closes on Escape and gives the × button an accessible label.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "The SPA navigation audit." Your single-page app passes automated axe checks but a screen-reader user reports that after clicking a nav link "nothing happens, it just goes quiet." Diagnose why route changes strand focus, and deliver a reusable pattern that announces the new page and places focus correctly on every client-side navigation. Explain why simply focusing the new `<h1>` is not always enough.

**Model answer (revealed on demand):**

Automated tools check static markup, not the dynamic act of navigating. In an SPA, clicking a link swaps the route's components but leaves `document.activeElement` on the now-unmounted link, so focus falls to `body` and the screen reader, which only announces changes it is told about, says nothing. The user has no idea the page changed.

Reusable pattern: on each route change, move focus to the new page's top-level heading and announce the title through a live region.

```tsx
function RouteFocus({ title }: { title: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    headingRef.current?.focus();
    setAnnounce(`${title} page loaded`);
  }, [title]);

  return (
    <>
      <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
      <div aria-live="assertive" className="sr-only">{announce}</div>
    </>
  );
}
```

The heading needs `tabIndex={-1}` so it is programmatically focusable without becoming a Tab stop. Focusing it both moves the keyboard user to the top of the new content and gives most screen readers something to announce.

Why focusing the `<h1>` alone is not always enough: if the new page renders asynchronously (data still loading), the heading may not exist yet when the effect runs, so you must focus after the content is present, or focus a stable page-shell region and let a live region carry the "loaded" message. Some screen readers also debounce rapid focus changes, so pairing the focus move with an `aria-live` announcement is the belt-and-suspenders that survives across NVDA, JAWS, and VoiceOver.

Interview nuance: prefer `aria-live="assertive"` only for navigation, and never leave focus on the unmounted link's position. The bug is not missing ARIA, it is that the SPA broke the browser's built-in "new document, focus resets" behavior that a full page load would have given you for free.
