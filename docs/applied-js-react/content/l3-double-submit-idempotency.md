> Module **3.2** (Double-Submit & Idempotency) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [3.1](./l3-out-of-order-responses.md) · Next: [3.3](./l3-toctou-dedup.md)

# L3 · Double-Submit & Idempotency

The button says Pay, the user clicks it twice in 200ms, and the account gets charged twice. After this module you can catch the review comment that matters, "this mutating POST is only gated by a `disabled` prop," explain at the setState-timing level why a state flag does not stop a same-tick second click, and defend the real fix: a synchronous client lock plus a server-side idempotency key so retries, refreshes, and multi-tab submits collapse to exactly one write.

### ajr-l3-double-submit-guard: Double-submit and the un-disabled button

- **id:** `ajr-l3-double-submit-guard`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** races, idempotency, forms

#### Learn

Here is a Pay button that "disables itself" while the charge is in flight. It still charges twice on a fast double-click.

```tsx
function PayButton({ charge }: { charge: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  async function onClick() {
    if (pending) return;      // guard reads the state flag
    setPending(true);         // schedules a re-render, does NOT mutate `pending` now
    await charge();           // 1200ms server call
    setPending(false);
  }
  return <button onClick={onClick} disabled={pending}>Pay</button>;
}
```

The bug is a timing bug, not a logic bug. `setPending(true)` does not change the local `pending` variable and does not synchronously re-render. React batches the update and re-renders on a later tick. If the user clicks twice inside the same event-loop turn (a real double-click is often under 250ms, and a stuck trackpad or an impatient user beats React's commit easily), both `onClick` invocations read the closed-over `pending` while it is still `false`. Both pass the `if (pending) return` guard. Both call `charge()`. The `disabled={pending}` attribute has the same problem: the DOM node is not actually disabled until React commits the next render, which happens after the current synchronous click handlers have already run.

So a state flag guards the *second render's* clicks, not the *second click in this render*. To stop a same-tick double submit you need a value that mutates synchronously, right now, before the second handler reads it. That is what a `useRef` gives you: `ref.current = true` takes effect on the very next line, no render required.

```tsx
const lock = useRef(false);
async function onClick() {
  if (lock.current) return;   // reads the just-mutated value
  lock.current = true;        // synchronous, no re-render needed
  setPending(true);           // still drive the UI spinner off state
  try { await charge(); } finally { lock.current = false; setPending(false); }
}
```

Keep the state flag too, but only for the *visual* pending indicator. The ref is the correctness guarantee; the state is the spinner.

**Interview nuance:** the crisp version of this answer is "setState is asynchronous with respect to the current event, so two clicks in one tick both observe the pre-update value; a ref mutates synchronously, so it closes the same-tick window." Saying "I'd add a ref lock" without that timing sentence sounds like cargo-culting.

But a client lock only covers *this tab, this page load*. It does nothing for a retry after a network blip, a double-tap on a slow 3G phone that reloads, or the same intent submitted from two tabs. The authoritative fix lives on the server: attach a stable idempotency key to the request so the server can recognize a repeat and treat it as a no-op. The client lock trims the obvious duplicates; the key makes the operation correct.

Recap: `disabled={pending}` and an `if (pending) return` state guard both fail the same-tick double-click because setState is async. A synchronous `useRef` lock closes that window on the client, and a server idempotency key is what actually guarantees one charge across retries and tabs.

#### See it live

**Demo (react-demo):** a Pay button wired to a mock 1200ms server, with a "rapid click 5x" button that fires five synchronous clicks in one tick, rendered in three columns: A) buggy state-flag guard, B) `isPending`/ref-lock guard, C) ref-lock plus idempotency key. A **Charges** counter sits under each column.

The widget renders three `PayButton` variants and a shared mock server. Clicking "Rapid x5" calls each variant's handler five times in the same synchronous loop. The component the engineer builds is the guarded variant:

```tsx
function GuardedPay({ server }: { server: MockServer }) {
  const [pending, setPending] = useState(false);
  const [ignored, setIgnored] = useState(0);
  const lock = useRef(false);

  async function onClick() {
    if (lock.current) { setIgnored((n) => n + 1); return; }  // flash "ignored"
    lock.current = true;
    setPending(true);
    try {
      await server.charge();               // 1200ms; server counter++
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <div>
      <button onClick={onClick} disabled={pending} aria-busy={pending}>
        {pending ? "Charging..." : "Pay"}
      </button>
      <p>Charges: {server.applied} · ignored clicks: {ignored}</p>
    </div>
  );
}
```

Column A uses `useState` alone for the guard; column B swaps in the `lock` ref shown above; column C adds an idempotency key the mock server dedups on. "Rapid x5" drives all three at once so the counters are directly comparable.

**Watch:** in column A the **Charges** counter climbs to 5 on a single "Rapid x5" press, because all five same-tick clicks read `pending === false`. In columns B and C it stays at 1 while the four extra clicks flash "ignored" (the ref rejected them before `charge` ran). This is a genuine live render, not an approximation: the counter increments come from real handler invocations, and the 1200ms delay is a real `setTimeout`-backed mock so you can double-click before the first call resolves.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Guarantee at most one charge per intent even on a rapid double-click of the Pay button above, using both a pending guard and (conceptually) a server idempotency key. Give the corrected `onClick` and explain why the state-only guard let a second charge through.

**Think about:**
- Why does a second synchronous click still see the button enabled?
- What does a ref lock close that a state flag cannot?
- Why is the client guard alone insufficient?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The corrected handler locks synchronously with a ref and keeps state only for the spinner:

```tsx
const lock = useRef(false);
const [pending, setPending] = useState(false);

async function onClick() {
  if (lock.current) return;          // synchronous read of a synchronously-set value
  lock.current = true;
  setPending(true);
  const key = intentKeyRef.current;  // generated ONCE when the intent formed
  try {
    await charge({ idempotencyKey: key });
  } finally {
    lock.current = false;
    setPending(false);
  }
}
```

**Why at the mechanism level:** React's `setState` does not mutate the local variable and does not re-render synchronously. Inside one event-loop tick, two `onClick` calls both capture `pending === false`, both pass `if (pending) return`, and both call `charge()`. The `disabled` attribute is equally late: the DOM node is only marked disabled after React commits the next render, which is after both synchronous handlers have already run. A `useRef` value updates on the next line with no render, so the second call sees `lock.current === true` and bails. That is the whole fix on the client.

**How to spot it in review:** a mutating POST/PUT whose only protection is `disabled={isPending}` or an `if (loading) return` state check, with no ref lock and no idempotency key on the request. If the request can charge money, create an order, or send an email, flag it.

**Production symptom:** duplicate orders, double charges, and two confirmation emails, clustered on slow connections and touch devices where double-taps and mis-taps are common. It is intermittent and hard to reproduce on a fast dev machine, which is exactly why it survives to production.

**Common misconception corrected:** "disabled-on-pending prevents double submit." It prevents the *third* click (after the re-render commits), not the second one in the same tick. And even a perfect client lock does not survive a retry, refresh, or second tab; only a server idempotency key does. The client lock is a UX optimization; the key is the correctness guarantee.

**Self-check rubric:**
- [ ] My guard uses a `useRef` (or equivalent synchronous value), not only `useState`.
- [ ] I explained that `setState` is async relative to the current event, so both same-tick clicks read the stale value.
- [ ] I noted that `disabled` also lags until the next commit.
- [ ] I said the client lock alone does not cover retries/refresh/multi-tab.
- [ ] I mentioned a server idempotency key as the authoritative fix.
- [ ] I reset the lock in a `finally` so a failed charge can be retried.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "The refunds console double-refunds." An internal tool's Refund button already uses a `useRef` lock, yet finance reports occasional double refunds. The button is inside a table row rendered from a list, and support agents often open the same order in two tabs to cross-check before refunding. Diagnose why the ref lock is not enough here and specify the fix end to end.

**Model answer (revealed on demand):**

A `useRef` lock is scoped to one component instance in one tab. Two browser tabs are two separate React trees with two separate refs, so each tab's lock happily lets its own click through. The ref also resets on a full page reload, so an agent who refreshes after a slow request and clicks again defeats it. The lock was never the correctness boundary; it only ever trimmed same-tick duplicates within a single mounted component.

The fix is server-side idempotency keyed to the *intent*, not the click. When a refund intent forms (the moment the agent opens the confirm dialog for order `X`), generate a stable key derived from the order and refund amount, for example `refund:${orderId}:${amountCents}`, or a UUID stored with the pending refund record. Send that key on the POST. The refund service does an atomic upsert or a unique constraint on the key: the first request creates the refund and records the key; any later request carrying the same key returns the *already-recorded* result without issuing a second refund. Two tabs, a reload, and a retry all send the same key, so the server collapses them to one.

```tsx
// key generated once when the confirm dialog opens, persisted with the pending refund
const key = `refund:${orderId}:${amountCents}`;
await api.refund({ orderId, amountCents, idempotencyKey: key });
// server: INSERT ... ON CONFLICT (idempotency_key) DO NOTHING, then return the stored refund
```

**How to spot it in review:** any "we added a ref lock, we're safe" claim on a money-moving action that can be triggered from more than one surface. Ask "what happens across two tabs or after a reload?" If the answer relies on client state, the server is unprotected.

**Production symptom:** low-rate but high-cost double refunds and double charges that correlate with multi-tab workflows and page reloads, invisible in single-tab QA. The dedup only becomes reliable once the key is authoritative on the server.

---

### ajr-l3-idempotency-key: Idempotency keys make retries safe

- **id:** `ajr-l3-idempotency-key`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** idempotency, races, server

#### Learn

A disabled button stops one kind of duplicate: the second click before the first resolves, in this tab, this page load. Real duplicates arrive by other doors. A flaky network makes your fetch layer retry a POST it never saw a response for, even though the server *did* process it. The user reloads a slow checkout page and resubmits. Two tabs are open. A form auto-submits before hydration finishes. None of these are extra clicks, so no click guard, ref lock or `disabled` prop touches them. The only place that sees all of them is the server, and the tool it needs is an idempotency key.

An idempotency key is a stable, client-generated identifier that says "this is the same *intent*, not a new one." You generate it once, when the intent forms, and you send the same key on every attempt to fulfill that intent. The server keys its write on it:

```ts
// server: first request with this key does the work; repeats return the stored result
async function charge(req: { idempotencyKey: string; amountCents: number }) {
  const existing = await db.charges.findByKey(req.idempotencyKey);
  if (existing) return existing;                 // dedup: repeat is a no-op
  return db.charges.insert({                      // unique index on idempotency_key
    key: req.idempotencyKey,
    amountCents: req.amountCents,
  });
}
```

The word that carries the guarantee is *stable*. The single most common way to get this wrong is generating the key at the wrong moment:

```tsx
// WRONG: a fresh key per attempt defeats the entire mechanism
async function submit() {
  const key = crypto.randomUUID();     // new key every call
  await charge({ idempotencyKey: key });
}
```

If the key is regenerated on each attempt, every retry carries a *different* key, the server sees each as a brand-new intent, and you are back to duplicate charges with extra ceremony. The key must be generated once per intent and reused across all retries of that intent:

```tsx
// RIGHT: one key for the life of the intent
const intentKey = useRef(crypto.randomUUID());   // generated once on mount/intent
async function submit() {
  await charge({ idempotencyKey: intentKey.current });  // same key on every retry
}
```

Where the key lives depends on how durable the intent must be. A `useRef` survives re-renders but not a reload. If the intent must survive a refresh, persist the key with the pending record (server-issued at intent creation, or stored in the checkout session), so the resubmitted form carries the same key. Dedup then happens where it must: in the server's write path, via a unique constraint or a conditional upsert, so concurrent requests race into the database and exactly one wins.

**Interview nuance:** the sharp framing is "client guards reduce *load*, server idempotency provides *correctness*." Interviewers listening for seniority want to hear that the button being disabled is a UX nicety and the unique key on the write is the actual invariant. Bonus points for naming the retry sources: network-layer retries, reload/resubmit, multi-tab, pre-hydration submit.

Recap: disabled buttons and ref locks cannot see retries, reloads, or other tabs. A stable idempotency key generated once per intent and deduped by a unique server constraint makes every repeat of that intent a no-op, no matter which door it came through.

#### See it live

**Demo (react-demo):** a variant that deliberately keeps the Pay button *enabled* and instead relies entirely on one idempotency key, with a **Client attempts** counter and a **Server-applied charges** counter side by side, plus a "flaky retry" toggle that makes each submit fire two requests carrying the same key.

The component keeps the button enabled to isolate the server's role, generates the key once, and reuses it:

```tsx
function KeyedPay({ server }: { server: MockServer }) {
  const intentKey = useRef(crypto.randomUUID());   // ONE key, generated once
  const [attempts, setAttempts] = useState(0);

  async function onClick() {
    setAttempts((n) => n + 1);
    // simulate a flaky client that retries the same intent
    await server.charge({ idempotencyKey: intentKey.current });
    await server.charge({ idempotencyKey: intentKey.current }); // retry, SAME key
  }

  return (
    <div>
      <button onClick={onClick}>Pay (always enabled)</button>
      <p>Client attempts: {attempts * 2} · Server-applied charges: {server.applied}</p>
    </div>
  );
}
```

The mock `server.charge` holds a `Set` of seen keys: the first request with a key increments `server.applied`; any later request with the same key returns the stored result and does not increment. A second button, "regenerate key per attempt," swaps `intentKey.current` for a fresh `crypto.randomUUID()` on every call so the learner can watch the guarantee collapse.

**Watch:** with the stable key, the **Client attempts** counter climbs with every click and flaky retry (2, 4, 6, ...) while **Server-applied charges** stays pinned at 1, because the server dedups on the key. Flip to "regenerate key per attempt" and the server-applied counter now tracks attempts one-to-one, visibly reproducing the bug. This is a real live demo of the *client and server contract*; the "server" is an in-memory mock (a `Set` of keys), so it illustrates the server-side unique-constraint behavior rather than a real database, which is the honest boundary of what runs in the browser.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why a client disabled button is not enough to prevent duplicate charges (retries, refresh, multi-tab) and add a stable idempotency key generated once per intent. Show where the key is created, where it is reused, and where dedup happens.

**Think about:**
- What bypasses a client-only guard?
- When must the key be generated?
- Where does dedup actually happen?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

A disabled button only prevents a second *click* in the same mounted component, in one tab, before a reload. Three whole classes of duplicate never touch a click handler: network-layer retries (the fetch/SDK resends a POST whose response was lost, though the server already applied it), reload-and-resubmit (the user refreshes a slow page and submits again with a fresh component and a re-enabled button), and multi-tab or pre-hydration submits (two trees, or a form that fires before React attaches its guards). No client-side gate can see requests that originate outside its own component instance, so the gate cannot be the correctness boundary.

The fix is a stable idempotency key generated once when the intent forms and deduped on the server:

```tsx
// client: generate once, reuse on every attempt of THIS intent
const intentKey = useRef(crypto.randomUUID());
await charge({ idempotencyKey: intentKey.current });
```

```ts
// server: the write path is the authoritative dedup point
// unique index on idempotency_key; repeat requests return the stored result
INSERT INTO charges (idempotency_key, amount_cents)
VALUES ($key, $amount)
ON CONFLICT (idempotency_key) DO NOTHING;
```

**Why at the mechanism level:** correctness has to live where every attempt converges, and that is the server's write. A unique constraint (or an atomic conditional upsert) turns "apply this charge" into "apply this charge unless this exact key already applied it." Concurrent duplicates race into the database and exactly one insert wins; the losers read back the same result. The client key is what lets the server recognize the losers as the *same* intent rather than new ones.

**How to spot it in review:** a mutating action (charge, order, invite, email) that sends no idempotency key and leans on the UI to prevent repeats. Ask "what stops a network retry or a reload from doing this twice?" If the answer is "the button is disabled," it is unprotected.

**Production symptom:** duplicate writes that spike during network instability and after slow-page reloads, and that are essentially impossible to reproduce on a fast machine because the retry/reload paths never fire there.

**Common misconception corrected:** "regenerating the key per retry is fine." It is the opposite of fine: a new key per attempt makes each retry look like a new intent, so the server dutifully applies every one. The key must be generated once per intent and reused across all retries.

**Self-check rubric:**
- [ ] I named at least two non-click duplicate sources (retry, reload, multi-tab, pre-hydration).
- [ ] The key is generated once when the intent forms, not per attempt.
- [ ] The same key is sent on every retry of that intent.
- [ ] Dedup is enforced on the server write (unique constraint or atomic upsert), not in the UI.
- [ ] I stated the client guard reduces load while the server key provides correctness.
- [ ] I noted the key may need to persist (server-issued or session-stored) to survive a reload.

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Stripe-style payment intents." You are designing the charge flow for a checkout that must never double-charge across network retries, page reloads, and a background retry job that replays failed webhooks. Specify where the idempotency key is created, how long it must live, what the server does on a repeat, and how you handle a retry that arrives *while the first request is still in flight*.

**Model answer (revealed on demand):**

Create the key when the *payment intent* is created, before any charge attempt, and issue it server-side so it survives everything the client cannot: reloads, new tabs, and the background retry job. The client stores that server-issued key (or the intent id) with the pending checkout and sends it on every confirm attempt. Because the key is bound to the intent, not to a click or a component, all three retry sources converge on the same key.

Lifetime: the key must live at least as long as retries can occur. For a payment that includes an async webhook-replay job, that is well beyond the page session, so the key belongs in durable storage (the payment-intent row), not a `useRef` or `localStorage`. Providers like Stripe expire idempotency keys after a fixed window (24 hours), which is a deliberate tradeoff: long enough to cover realistic retries, short enough to bound the dedup table.

On a repeat, the server returns the *stored outcome* of the first request (the same charge object, the same status) without re-executing the side effect. Same key plus same request means return the recorded result; same key plus a *different* request body is an error, because it signals a client bug (reusing a key for a different intent) rather than a retry.

The hard case is the in-flight retry: request B arrives with the same key while request A is still processing. A plain "check then insert" has a window where both read "not found" and both proceed. Close it at the storage layer, not in application code: put a unique constraint on the key and let the database arbitrate. The first insert wins; the second gets a conflict and must either return A's in-progress result or wait for it. Modeling the key row with a status (`pending`, `succeeded`, `failed`) lets the second request see `pending` and either poll for the terminal result or return a "processing" response instead of starting a parallel charge.

**How to spot it in review:** an idempotency scheme that dedups with an application-level `if (exists) return` around two separate queries. That is a check-then-act race; under concurrent retries it still double-writes. The guarantee has to come from an atomic operation (unique constraint or conditional insert), which is exactly the time-of-check-to-time-of-use lesson that follows in [3.3](./l3-toctou-dedup.md).

**Production symptom:** rare double charges that appear only under concurrent retries or webhook replays, the kind that pass every sequential test and only surface as a finance reconciliation discrepancy.
