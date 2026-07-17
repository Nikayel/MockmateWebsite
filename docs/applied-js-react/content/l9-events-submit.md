> Module **9.4** (Events & Submit) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [9.3](./l9-controlled-inputs.md) · Next: [9.5](./l9-forms-focus-a11y.md)

# L9 · Events & Submit

After this module you can catch two failures that outdated mental models still cause: reaching for `e.persist()` (removed years ago) or assuming `stopPropagation` inside a portal contains a click the way the DOM would, and shipping an async submit that double-charges a customer because a disabled button alone never closed the same-tick gap.

### ajr-l9-synthetic-events-delegation: Synthetic events: pooling myth, root delegation, portals

- **id:** `ajr-l9-synthetic-events-delegation`  ·  **difficulty:** hard  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, events, portals

#### Learn

Two things people "know" about React events have been false since React 17, and both cost real debugging time.

**Myth 1: synthetic events are pooled, so you must call `e.persist()` before reading them async.** Pooling was a React 16 optimization: the same `SyntheticEvent` object was reused across handlers, so its fields were nulled out after the handler returned. Reading `e.target` inside a `setTimeout` gave you `null` unless you called `e.persist()`. **React 17 removed pooling entirely.** The event object is no longer recycled, so this now works with nothing extra:

```tsx
function Search() {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeout(() => {
      console.log(e.target.value); // React 16: null (pooled). React 17+: the value.
    }, 1000);
  };
  return <input onChange={onChange} />;
}
```

If you still see `e.persist()` in a codebase, it is dead code. If you see a `const value = e.target.value` copy made *only* to survive pooling, that copy is now cargo cult.

**Interview nuance:** the honest answer to "why did they remove pooling?" is that it never bought measurable performance on modern engines, and it caused a steady stream of `null` bugs. Removing it was a net simplification.

**Myth 2: React attaches its listeners at `document`.** Also changed in React 17. React attaches one delegated listener per event type at the **root container** you pass to `createRoot`, not at `document`. This is what makes multiple independent React roots on one page (widgets, micro-frontends, gradual migrations) safe: `e.stopPropagation()` in one root no longer silently swallows events for another root, because they delegate to different containers.

**The portal surprise.** A React portal renders DOM somewhere else (often a sibling of `#root`, appended to `body`), but the React element tree is unchanged. **Synthetic events bubble along the React component tree, not the DOM tree.** So a click inside a portaled modal bubbles up to the modal's *logical* React parent even though, in the real DOM, the modal is nowhere near that parent:

```tsx
function Page() {
  // This onClick FIRES when you click inside the portal, even though
  // the portal DOM is mounted under document.body, far from this div.
  return (
    <div onClick={() => console.log("Page heard the click")}>
      <Modal>content</Modal>
    </div>
  );
}
function Modal({ children }: { children: React.ReactNode }) {
  return createPortal(<div className="modal">{children}</div>, document.body);
}
```

Consequences you must reason about: a synthetic `stopPropagation` stops it along the *React* tree, so it will contain the click from `Page`. But a **native** listener you added with `element.addEventListener` sits on the real DOM and will not see a synthetic `stopPropagation` at all, and vice versa, because they travel two different trees. Mixing native and synthetic listeners around portals is where propagation "leaks."

Recap: pooling and `e.persist()` are gone (React 17+), React delegates at the root container (not `document`), and portal events bubble by the React tree, so synthetic and native `stopPropagation` do not protect each other.

#### See it live

**Demo (react-demo):** an async change handler logs `e.target.value` one second later with no `e.persist()`, plus a portal modal whose inner click lights up its logical React parent's "heard it" badge even though the modal DOM lives under `body`.

The widget has two panels sharing one event log. Panel A is a text input; typing and waiting shows the async read landing. Panel B is a button that opens a portaled modal; a click inside the modal increments a "React parent heard: N" badge, and a toggle switches the modal's inner handler between "no guard," synthetic `stopPropagation`, and a native `addEventListener` guard so the learner watches which one actually contains the click.

```tsx
function EventsDemo() {
  const [log, setLog] = useState<string[]>([]);
  const [heard, setHeard] = useState(0);
  const [guard, setGuard] = useState<"none" | "synthetic" | "native">("none");
  const push = (m: string) => setLog((l) => [...l, m]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeout(() => push(`async read: "${e.target.value}" (no e.persist)`), 1000);
  };

  return (
    <div onClick={() => setHeard((n) => n + 1)}>
      {/* Panel A */}
      <input onChange={onChange} placeholder="type, then wait 1s" />
      {/* Panel B: Modal is a portal; its click bubbles to THIS div */}
      <Modal guard={guard} />
      <span>React parent heard: {heard}</span>
    </div>
  );
}
```

**Watch:** the async log line prints the typed value with no `e.persist()`, proving pooling is gone. Clicking inside the portal increments "React parent heard" even though the modal renders under `document.body`, proving synthetic events bubble by the React tree. Flip the guard to synthetic `stopPropagation` and the badge stops incrementing; flip it to the native `addEventListener` guard and the badge keeps incrementing, proving native and synthetic listeners travel different trees and do not contain each other.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Show that `setTimeout(() => log(e.target))` no longer needs `e.persist()`, then explain why a `stopPropagation` call inside a portal still reaches a logical React parent (or fails to), depending on whether the parent's listener is synthetic or native.

**Think about:**
- Is event pooling still a thing?
- Where does React attach its listeners since v17?
- How do portal events bubble?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Pooling is gone as of React 17, so this needs nothing special:

```tsx
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setTimeout(() => console.log(e.target.value), 1000); // logs the value, not null
};
```

In React 16 the `SyntheticEvent` was recycled and its fields nulled after the handler returned, so the async read saw `null` unless you called `e.persist()` to opt that event out of the pool. React 17 removed the pool, so `e` and `e.target` stay valid indefinitely. Any surviving `e.persist()` is dead code, and any `const v = e.target.value` copy that exists *only* to beat pooling can be deleted.

The portal part turns on two independent trees. React attaches its delegated listeners at the **root container** (since v17), and synthetic events bubble along the **React component tree**, not the DOM tree. A portal moves the DOM (usually under `document.body`) but keeps the element as a logical child of wherever you wrote `createPortal`. So a click inside the modal bubbles up to that logical parent's `onClick` even though the DOM nodes are far apart.

Now `stopPropagation`: a **synthetic** `e.stopPropagation()` inside the modal stops bubbling along the React tree, so it *will* contain the click from a synthetic parent listener. But if the parent used a **native** `element.addEventListener('click', ...)`, that listener lives on the real DOM tree, never sees your synthetic `stopPropagation`, and fires anyway. The reverse also holds: a native `stopPropagation` cannot stop a synthetic React handler on the root.

**How to spot it in review:** any `e.persist()`; a value copy commented "for the setTimeout"; and any code that mixes `addEventListener` with React `onClick` around a portal and assumes one `stopPropagation` protects both. **Production symptom:** clicking inside a modal closes it because an outside-click handler added natively still fired, or a `stopPropagation` "randomly" fails across two React roots. **Common misconception:** "React attaches events at `document` and pools synthetic events." Both were true in React 16 and are false from React 17 on; it delegates at the root container and never pools.

**Self-check rubric:**
- [ ] States that pooling and `e.persist()` were removed in React 17.
- [ ] Says React delegates at the root container, not `document`.
- [ ] Explains synthetic events bubble by the React tree, so portal clicks reach the logical parent.
- [ ] Distinguishes synthetic vs native `stopPropagation` and why they do not protect each other.
- [ ] Names a real symptom (modal closes / cross-root leak).

#### Practice: real-world variant (save, then reveal)

**Prompt:** "The dropdown that closes itself." A design-system team ships a `<Dropdown>` whose menu is portaled to `document.body`. They close it with a document-level native listener: `document.addEventListener('mousedown', closeIfOutside)`. QA reports the menu closes the instant you click an item inside it. Diagnose why the portal does not save them here, and give the fix.

**Model answer (revealed on demand):**

The close handler is registered natively on `document`, so it runs on the **DOM** bubbling path. The menu is portaled under `document.body`, which means in the real DOM it is *not* inside the trigger's subtree. `closeIfOutside` checks something like `if (!triggerRef.current.contains(e.target)) close()`. Because the portaled menu is not inside `triggerRef`, every click on a menu item looks "outside" and closes the dropdown before the item's React `onClick` can act.

The React tree is irrelevant to a native `document` listener, so you cannot rely on synthetic bubbling or a synthetic `stopPropagation` to save you here. Two robust fixes:

```tsx
// Fix A: teach "outside" about the portal by checking BOTH refs.
const closeIfOutside = (e: MouseEvent) => {
  const t = e.target as Node;
  if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
  close();
};
```

```tsx
// Fix B: register the outside-click on the same phase you expect, and
// stop the native event at the portal root so document never sees it.
<div ref={menuRef} onMouseDownCapture={(e) => e.nativeEvent.stopImmediatePropagation()}>
```

Fix A is the durable one: outside-click detection around a portal must check the portaled element's own ref, not just the trigger, because the DOM containment check is what decides "outside," and the portal deliberately breaks DOM containment. **Symptom in the wild:** menus, tooltips, and date pickers that "flicker closed" the moment you interact with them, usually only after someone portaled them to fix a `z-index`/overflow clipping bug. **Misconception to kill:** "the portal keeps it logically inside, so outside-click still works." Logically inside is the *React* tree; a native `document` listener only sees the DOM tree, where the portal moved the node out.

### ajr-l9-double-submit-idempotency: Double-submit, re-entrancy, and idempotency

- **id:** `ajr-l9-double-submit-idempotency`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, forms, idempotency

#### Learn

A Buy button calls an async endpoint. A customer double-clicks, or presses Enter and clicks, and they get charged twice. The naive handler looks harmless:

```tsx
const [submitting, setSubmitting] = useState(false);
async function onBuy() {
  if (submitting) return;      // looks like a guard, is not
  setSubmitting(true);
  await placeOrder(cart);      // 1200ms round trip
  setSubmitting(false);
}
```

Why does the `submitting` flag not stop the second click? **`setState` is asynchronous and does not mutate the current render's variables.** Two clicks that land in the same tick (a fast double-click, or Enter firing the form submit while a click is also dispatched) both read `submitting === false`, because neither has re-rendered yet. `setSubmitting(true)` only schedules a new render; it does not change the `submitting` closure the second handler already captured. Both calls sail past the `if` and both fire `placeOrder`.

The `disabled` attribute has the same weakness. Setting `disabled` is a state update, so the button is still visually and functionally enabled for the rest of the current tick. A queued second click event that was already dispatched will still run. A `disabled` button is good UX (it greys out and blocks *later* clicks) but it is not a correctness guarantee for the same-tick race.

The fix has two layers.

**Client layer: a synchronous ref lock.** A `ref` mutates immediately, in the same tick, with no render in between. That closes the gap the state flag left open:

```tsx
const inFlight = useRef(false);
const [pending, setPending] = useState(false);
async function onBuy() {
  if (inFlight.current) return;   // synchronous, closes the same-tick gap
  inFlight.current = true;
  setPending(true);               // for the disabled UI
  try {
    await placeOrder(cart);
  } finally {
    inFlight.current = false;
    setPending(false);
  }
}
```

The ref is the actual re-entrancy lock; `pending` is just for the greyed-out button. You need both entry points covered: the `onSubmit` of the `<form>` (Enter key) and the `onClick` of the button, and any keyboard shortcut, must all pass through the same lock.

**Interview nuance:** even a perfect client lock does not survive two browser tabs, a retry after a flaky network, or a page reload mid-request. The client guard prevents the *accidental UX* double-fire; it cannot make the operation safe on its own.

**Server layer: idempotency keys.** The durable fix is to make the mutation idempotent. The client generates one key per logical action (a UUID, minted when the form is first rendered, not per click), sends it as `Idempotency-Key`, and the server records "I already processed this key, here is the same result" instead of creating a second order. Now duplicates from any source (double-click, retry, reload, two tabs) collapse to one order.

Recap: `setState` and `disabled` are async so they cannot close the same-tick gap; a synchronous `ref` lock is the client re-entrancy guard, it must cover every submit entry point, and a server idempotency key is the only fix that survives retries, reloads, and multiple tabs.

#### See it live

**Demo (react-demo):** a Buy button hits a mocked 1200ms endpoint and is rapid double-clicked under three strategies (naive, pending-disable + ref lock, idempotency key), with an order log showing how many rows each strategy creates.

The widget shows a "Buy" button, a strategy selector (Naive / Ref lock / Idempotency key), a "double-click for me" button that dispatches two clicks in the same tick, and an "Order log" list plus a "Server received: N, Server created: M" counter. Under the hood the mock server dedupes by `Idempotency-Key`.

```tsx
function BuyDemo() {
  const [strategy, setStrategy] = useState<"naive" | "ref" | "idem">("naive");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const keyRef = useRef(crypto.randomUUID()); // one key per logical purchase
  const [orders, setOrders] = useState<string[]>([]);

  async function onBuy() {
    if (strategy !== "naive" && inFlight.current) return; // ref lock
    inFlight.current = true;
    setPending(true);
    const key = strategy === "idem" ? keyRef.current : crypto.randomUUID();
    const row = await mockServer.placeOrder({ idempotencyKey: key }); // dedups on key
    setOrders((o) => [...o, row]);
    inFlight.current = false;
    setPending(false);
  }
  return <button disabled={pending} onClick={onBuy}>Buy</button>;
}
```

**Watch:** the order log shows **2 rows** under Naive (both same-tick clicks pass the async flag), **1 row** under Ref lock (the synchronous ref rejects the second click), and under Idempotency key the "Server received: 2" but "Server created: 1" because the server collapsed the duplicate on the shared key. This is illustrated with a mocked in-widget server, not a real backend, but the dedup logic is the real thing.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix an async submit that has no guard: disable the button on pending, add a synchronous in-flight ref so the same-tick second click is rejected, and send an idempotency key so the server stays safe under retries. Then say why the `disabled` attribute alone was not enough.

**Think about:**
- Why does a state flag not close the same-tick gap?
- What entry points must the guard cover?
- Why is server idempotency the durable fix?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

```tsx
function BuyButton({ cart }: { cart: Cart }) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const keyRef = useRef(crypto.randomUUID()); // minted once per purchase, not per click

  async function submit() {
    if (inFlight.current) return;     // synchronous lock: rejects the same-tick second call
    inFlight.current = true;
    setPending(true);
    try {
      await placeOrder(cart, { headers: { "Idempotency-Key": keyRef.current } });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  // BOTH entry points go through submit(): Enter key (form) and click (button).
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <button type="submit" disabled={pending}>Buy</button>
    </form>
  );
}
```

**Why the state flag and `disabled` fail:** `setState` is asynchronous. It schedules a render; it does not mutate the variables the currently running handler already closed over. Two clicks in the same tick both read `pending === false` and both proceed, because no render happened between them. `disabled` is set the same way, so the button is still active for the rest of that tick and an already-dispatched second click still runs. **A `ref` mutates synchronously**, in the same tick with no render boundary, so `inFlight.current = true` is visible to the very next handler call. That is what actually closes the race.

**Entry points the guard must cover:** the form's `onSubmit` (Enter), the button's `onClick`/`type="submit"`, and any keyboard shortcut, all routed through the one `submit()` that checks the one ref. Guarding only `onClick` leaves the Enter path open.

**Why the server key is the durable fix:** the client lock dies with the tab. A retry after a timeout, a reload mid-request, or a second tab all send fresh requests the ref never saw. An `Idempotency-Key` minted once per logical purchase lets the server recognize "same action, already done" and return the original result instead of creating a second order. **How to spot it in review:** an `async` mutating `onSubmit`/`onClick` with no synchronous guard and no idempotency header. **Production symptom:** double charges, duplicate orders, two confirmation emails. **Misconception:** "a disabled button prevents double submit." It improves UX but cannot close the same-tick gap and does nothing about retries or multiple tabs.

**Self-check rubric:**
- [ ] Explains `setState`/`disabled` are async so they miss the same-tick second click.
- [ ] Uses a synchronous `ref` as the real re-entrancy lock.
- [ ] Routes every entry point (Enter + click) through one guarded handler.
- [ ] Sends an idempotency key minted once per purchase, not per click.
- [ ] Names double-charge / duplicate-order as the production symptom.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Checkout at scale." Payments reports a spike of duplicate charges during a flash sale. The client already has a `ref` lock and disables the button on pending, yet duplicates still land. Explain the sources the client lock cannot cover and design the server-side idempotency contract that fixes it, including what the key covers and how the server behaves on a concurrent duplicate.

**Model answer (revealed on demand):**

The client `ref` lock only protects a single live component instance. During a flash sale the duplicates come from everything it cannot see: users hammering reload when the spinner hangs on a slow request, the client's own network-retry layer resending after a timeout even though the server actually succeeded, users opening checkout in two tabs, and browser "restore session" replays. None of these share the ref, so the lock is bypassed every time.

The fix is a server idempotency contract:

```
POST /orders
Idempotency-Key: 6f1c... (one UUID per logical purchase, stored with the draft cart)

Server:
1. Atomically INSERT the key into an idempotency table (unique constraint on key).
2. If insert succeeds  -> this is the first request: process the charge, then
   store the response body + status against the key.
3. If insert conflicts -> a request with this key already exists:
     - if the first is still processing, return 409 (client retries/polls),
       OR block until it finishes, then return the stored result.
     - if it finished, return the SAME stored response and status. No new charge.
```

Key rules: the key is minted **once per logical purchase** (when the cart is finalized), not per click and not per request, so retries reuse it. The unique constraint plus atomic insert is what serializes concurrent duplicates: two requests racing on the same key cannot both win the insert, so exactly one charges. The stored response is replayed byte-for-byte so a retry sees the original order id, not an error. A TTL on the table (often 24h) bounds storage.

**Symptom this removes:** the "I clicked once and got charged three times" support tickets that only appear under load, when latency is high and users retry. **Misconception to kill:** "we added a ref lock, so double-submit is solved." The ref solves the accidental UX double-click on one live component; only a server that dedups on a stable key survives retries, reloads, and multiple tabs, which are exactly the conditions a flash sale maximizes.
