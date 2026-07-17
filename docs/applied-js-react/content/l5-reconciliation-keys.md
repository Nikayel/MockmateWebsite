> Module **5.4** (Reconciliation & Keys) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [5.3](./l5-state-batching.md) · Next: [5.5](./l5-strictmode-loops.md)

# L5 · Reconciliation & Keys

React decides whether to reuse a component instance or throw it away and build a new one, and it makes that call from just two inputs: the element type and its position (or key) among siblings. After this module you can catch the bugs that come from getting that identity wrong: forms that silently clear themselves, list state stuck on the wrong row, and the moment where changing a key is the clean fix instead of a props-to-state effect.

### ajr-l5-reconciliation-type-position: Reconciliation diffs by type then position

- **id:** `ajr-l5-reconciliation-type-position`  ·  **difficulty:** hard  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** react, reconciliation, remount

#### Learn

When React re-renders and produces a new element tree, it does not rebuild the DOM from scratch. It walks the old tree and the new tree together and, at each position, asks one question: is the element type here the same as it was last time? That single comparison decides everything.

If the type at a slot is the same (a `<div>` was a `<div>`, a `<ProfileForm>` was a `<ProfileForm>`), React keeps the existing instance: its state, its refs, its DOM node, the focus and scroll position of any input inside it. It just diffs the props and updates what changed. If the type at that slot is different (a `<div>` became a `<section>`, or `<Input>` moved from inside a wrapper to a bare position), React treats it as a completely different thing. It unmounts the old subtree (destroying its state, running cleanup effects, discarding DOM nodes) and mounts a fresh one from nothing.

Here is the setup that surprises people:

```tsx
function Panel({ bordered }: { bordered: boolean }) {
  return bordered
    ? <div className="border"><TextInput /></div>  // Input is a grandchild of Panel
    : <TextInput />;                                 // Input is a direct child of Panel
}

function TextInput() {
  return <input defaultValue="" placeholder="type here" />;
}
```

Type "hello" into the input, then flip `bordered`. The text vanishes. Nothing cleared it on purpose. What happened is that at the child slot of `Panel`, the top element type changed from `div` to `input` (or the reverse). React does not see "the same `TextInput`, now wrapped." It sees a different type at that position, so it unmounts the whole old subtree, including the `<input>` DOM node that held your uncontrolled text, and mounts a brand new `<input>` with its `defaultValue` of `""`.

The identity of an element is `(type, position-among-siblings)`, refined by `key` when present. It is **not** the JSX you wrote or the variable name. React has no idea that both branches "are the same input to you." It only compares types slot by slot.

The fix is to keep the element type stable at that position and change something else (a className, a prop) instead of swapping the parent structure:

```tsx
function Panel({ bordered }: { bordered: boolean }) {
  return (
    <div className={bordered ? "border" : ""}>
      <TextInput />
    </div>
  );
}
```

Now the wrapper is always a `<div>` and `<TextInput>` is always at the same slot under it. Toggling `bordered` only changes a prop on the stable `<div>`, so React reuses the input instance and the text survives.

**Interview nuance:** conditional rendering with `&&` and ternaries is the usual culprit because it silently changes what sits at a slot. `{loading ? <Spinner/> : <Chart data={d}/>}` unmounts `Chart` every time `loading` flips, so `Chart` loses any internal zoom/selection state. If you need to preserve state across such a toggle, keep both mounted and hide one with CSS, or hoist the stateful part above the branch.

Recap: React reconciles by comparing element type at each position; same type reuses the instance and its state, a different type unmounts and remounts; element identity is `(type, position/key)`, not the JSX text, so changing the wrapper structure at a slot wipes the subtree.

#### See it live

**Demo (react-demo):** an uncontrolled input inside a wrapper, plus a toggle that either swaps the wrapper element type or only swaps a className.

A widget with a text input (uncontrolled, `defaultValue=""`) and two toggles above it. Toggle A, "Change element type," flips between `<div><TextInput/></div>` and a bare `<TextInput/>` at the same slot. Toggle B, "Change className only," keeps a stable `<div>` wrapper and just swaps its class. A live **mount/unmount log** panel prints one line per event (`mount TextInput #1`, `unmount TextInput #1`, `mount TextInput #2`), and a **mount counter** badge shows how many times `TextInput` has mounted. The component under observation:

```tsx
function TextInput() {
  useEffect(() => {
    log("mount TextInput #" + (++mountCount.current));
    return () => log("unmount TextInput");
  }, []);
  return <input defaultValue="" placeholder="type here" />;
}
```

**Watch:** type "hello," then click Toggle A. The text disappears, the log prints `unmount TextInput` then `mount TextInput #2`, and the mount counter ticks to 2. That is a real remount: the type at the slot changed so React destroyed and rebuilt the subtree. Now type again and click Toggle B: the text stays, the log prints nothing, the counter holds. This is real React reconciliation, not an approximation: it proves that a stable type at a stable slot reuses the instance while a changed type wipes it.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why the remount happens in reconciliation terms, then restructure so the element type at that slot is stable and the text survives (given `{cond ? <div><Input/></div> : <Input/>}` where toggling `cond` wipes the input text).

**Think about:**
- What identity does React use for an element?
- What does a remount reset?
- Which patterns commonly change type at a slot?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Toggling `cond` changes the top element type at that child slot: in one branch the slot holds a `<div>` (with `<Input>` as its child), in the other it holds `<Input>` directly. React reconciles position by position and compares types. `div` versus the input's type is a mismatch, so React unmounts the old subtree and mounts a new one. Because `<Input>`'s state (or the uncontrolled `<input>` DOM node holding the text) lived inside that destroyed subtree, the text is gone.

Fix by keeping the element type stable at that position and moving the variation onto a prop of a stable parent:

```tsx
function Field({ cond }: { cond: boolean }) {
  return (
    <div className={cond ? "with-border" : "no-border"}>
      <Input />
    </div>
  );
}
```

Now the slot always holds a `<div>`, and `<Input>` is always its child at the same position. Toggling `cond` only changes the `<div>`'s className prop, which is a cheap prop diff, so React reuses the input instance and the text persists.

**WHY at the mechanism level:** React's element identity is `(type, position-among-siblings, key)`, not the source you typed. During reconciliation it walks old and new trees in lockstep and, at each slot, keeps the instance only if the type matches. A type mismatch is treated as "different component here," which triggers unmount (state destroyed, cleanup effects run, DOM removed) and a fresh mount. React never diffs the *contents* of two differently-typed elements.

**How to spot it in review:** ternaries or `&&` conditionals that render the same logical child under structurally different parents, or that swap a wrapper element (`<div>` vs `<section>`, `<Fragment>` vs a real element) around a stateful child. Any conditional where "the same thing" appears in both branches but at a different nesting depth is suspect.

**Production symptom:** forms that clear themselves when an unrelated toggle flips, inputs that lose focus mid-typing, a chart or map that resets its zoom/selection when a loading flag or layout mode changes, and scroll position jumping to the top.

**Common misconception corrected:** "React tracks the JSX I wrote, so it knows both branches are the same `<Input>`." It does not. React only compares element type and position. Two `<Input>`s at structurally different slots are, to the reconciler, two unrelated things.

**Self-check rubric:**
- [ ] I said element identity is `(type, position/key)`, not the JSX source.
- [ ] I explained a type mismatch at a slot triggers unmount then mount.
- [ ] I named what a remount destroys (state, uncontrolled DOM value, focus, effects).
- [ ] My fix keeps the type stable and moves variation onto a prop.
- [ ] I named a concrete production symptom (self-clearing form / lost focus).

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a Checkout page, the payment section renders `{isExpanded ? <Card><PaymentForm/></Card> : <PaymentForm/>}` so it can drop the card chrome on small screens. QA reports that expanding or collapsing the section mid-typing wipes the half-entered card number and kicks focus out. Diagnose it in reconciliation terms and give a fix that keeps the entered data across the toggle, and say why wrapping `PaymentForm` in `React.memo` would not help.

**Model answer (revealed on demand):**

Toggling `isExpanded` swaps the element type at the payment slot between `<Card>` (with `PaymentForm` nested inside it) and a bare `<PaymentForm>`. React reconciles that slot, sees `Card`'s type in one render and the form's type in the other, declares a mismatch, and unmounts the entire subtree including the uncontrolled inputs holding the card number. It then mounts a fresh `PaymentForm`, which is why the data and focus are gone.

Keep the type stable by always rendering the same wrapper and varying only its presentation:

```tsx
function PaymentSection({ isExpanded }: { isExpanded: boolean }) {
  return (
    <div className={isExpanded ? "card-chrome" : "bare"}>
      <PaymentForm />
    </div>
  );
}
```

The slot always holds a `<div>`, `PaymentForm` is always its child, and `isExpanded` only toggles a className, so React reuses the instance and the typed card number survives. If the two visual states genuinely need different DOM structure, hoist the entered values into state that lives *above* the toggle (a controlled form or a small store), so the data does not depend on the mounted subtree at all.

Why `React.memo` does not help: `memo` only decides whether to *skip re-rendering* an instance when its props are unchanged. It has no say in whether the instance is reused or remounted. The remount happens because the *type at the slot changed*, which is a reconciliation decision made before memo's prop check ever runs. React unmounts the old `PaymentForm` regardless of memo, so there is no prior instance for memo to preserve.

**Production symptom:** users lose half-entered payment or address details when the section expands, focus jumps out of the field they were typing in, and on flaky networks a loading-driven toggle silently clears the form. In review, the tell is a ternary rendering the same stateful child under two different parents.

---

### ajr-l5-index-as-key-bug: Keys and the index-as-key bug

- **id:** `ajr-l5-index-as-key-bug`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, keys, reconciliation

#### Learn

Inside a list, position is not enough for React to know which item is which, because items can be inserted, deleted, and reordered. So React uses the `key` you give each child as its stable identity across renders. The key answers one question: "is this new element the same conceptual item as one from the previous render?" Get the key wrong and React matches the wrong old instance to the wrong new data, and state (uncontrolled inputs, focus, `memo` caches, animation) sticks to the wrong row.

The bug is using the array index as the key:

```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo, i) => (
        <li key={i}>
          <input defaultValue={todo.text} />
        </li>
      ))}
    </ul>
  );
}
```

Say the list is `[A, B, C]` at indices `0, 1, 2`, and each `<input>` is uncontrolled so its typed value lives in the DOM node, not in `todos`. Delete `A`. The new list is `[B, C]` at indices `0, 1`. React reconciles by key: key `0` existed before and exists now, so React *reuses* the instance that was key `0`, which is the DOM node that used to belong to `A`. It just feeds it `B`'s `defaultValue` as a prop. But `defaultValue` only seeds an uncontrolled input on mount; on an update React keeps the existing DOM value. So the input that visually belongs to `B` still shows whatever you had typed into `A`'s row. Key `2` no longer exists, so React unmounts the last instance. Net effect: every row's typed text, focus, and checkbox state shifts up by one and the last one is destroyed.

The fix is a stable domain id:

```tsx
{todos.map((todo) => (
  <li key={todo.id}>
    <input defaultValue={todo.text} />
  </li>
))}
```

Now the key travels with the data. Delete `A` and the keys go from `a,b,c` to `b,c`. React sees `a` is gone (unmount that instance), `b` and `c` still present (reuse their exact instances). Every row keeps its own input state because each instance stayed bound to its own item.

Never use `Math.random()` or any value that changes each render as a key. A fresh key every render makes every item look brand new, so React unmounts and remounts the entire list on every render: state wiped, inputs cleared, animations restarted, and a real performance cost.

**Interview nuance:** index keys are actually fine when the list is static and never reordered, inserted into, or filtered (for example a fixed set of tabs, or a render-once table). The danger is only when position and identity can drift apart. And the bug is often invisible with fully controlled inputs, because there the value is driven from props every render, so the "stuck" state has nowhere to hide. Uncontrolled inputs, focus, scroll, and `memo` caches are where it bites.

Recap: keys are per-item identity across renders; index keys are positional, so after insert/delete/reorder React reuses the wrong instance for the wrong data; use a stable unique domain id, never the index on a mutable list and never `Math.random()`.

#### See it live

**Demo (react-demo):** a list of rows with uncontrolled inputs, keyed by index, with a delete-first-row button, and a toggle to switch the key to `item.id`.

A widget rendering three rows, each with a colored label ("Row A", "Row B", "Row C") and an uncontrolled `<input>` next to it. A radio toggle at the top selects the key strategy: **`key={index}`** or **`key={item.id}`**. A "Delete first row" button removes the top item. The rows are built around:

```tsx
{rows.map((row, i) => (
  <li key={keyMode === "index" ? i : row.id}>
    <span>{row.label}</span>
    <input defaultValue="" placeholder={"type in " + row.label} />
  </li>
))}
```

**Watch:** with `key={index}` selected, type "XXX" into Row A's input and "YYY" into Row B's, then click "Delete first row." Row A disappears, but the input that now sits next to "Row B" still shows "XXX", the text stayed at position 0 while the labels shifted up. Switch the toggle to `key={item.id}`, redo the same steps, and this time deleting Row A also removes "XXX" with it, leaving "YYY" correctly beside "Row B". This is real React reconciliation: it proves keys, not position, are what bind an instance's state to a specific item.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Switch to a stable domain id key and explain, in reconciliation terms, exactly why the state ended up on the wrong row (a todo list keyed by index leaves the wrong checkbox checked and the wrong text in the input after deleting the first item).

**Think about:**
- What do keys tell React across renders?
- Why do index keys point at different data after a delete?
- When is an index key acceptable?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Keys are how React matches this render's list items to the previous render's instances. With `key={index}`, the key is the position, not the item. Delete the first todo and everything below shifts up one index: the item that was at index 1 is now at index 0, and so on. React reconciles by key, so it matches new-index-0 to old-index-0's instance, new-index-1 to old-index-1's instance, and unmounts the now-missing highest index. The *instances* (with their uncontrolled input text, checkbox state, and focus) stay put by position while the *data* slides up, so every row's local state is now paired with the wrong todo. The last instance is destroyed, dropping whatever state it held.

Fix with a stable id that travels with the item:

```tsx
{todos.map((todo) => (
  <li key={todo.id}>
    <input type="checkbox" defaultChecked={todo.done} />
    <input defaultValue={todo.text} />
  </li>
))}
```

Now deleting the first todo removes exactly that todo's key. React unmounts only that one instance and reuses each surviving instance for its own item, so state stays glued to the right row.

**WHY at the mechanism level:** during list reconciliation React builds a map of previous children by key and, for each new child, reuses the instance whose key matches. Index keys make "position 0" the identity, but position is exactly the thing an insert or delete changes. So React faithfully reuses instance-at-0 and hands it new-data-at-0, which is the wrong pairing. Uncontrolled state lives on the instance/DOM node, not in your data, so it does not follow the data; it stays with the reused instance.

**How to spot it in review:** `key={index}` or `key={i}` on a list that can be reordered, filtered, sorted, or have items inserted/deleted, especially when rows contain uncontrolled inputs, focus, drag handles, or `memo`. Also flag `key={Math.random()}`, which remounts everything every render.

**Production symptom:** after deleting or reordering, the wrong checkbox is checked, input text and focus jump to the wrong row, an open row menu attaches to a different item, and list-item animations play on the wrong elements.

**Common misconception corrected:** "index keys are fine, the list renders and looks right at first." Rendering is not the test. The bug only appears after a mutation that decouples position from identity; the initial render looks perfect precisely because position and identity still agree.

**Self-check rubric:**
- [ ] I explained keys match new items to previous instances, not just "help performance."
- [ ] I said index = position, and delete/insert shifts data but not the positional instance.
- [ ] I noted uncontrolled state lives on the instance, so it does not follow the data.
- [ ] My fix uses a stable domain id (not index, not `Math.random()`).
- [ ] I named when an index key is acceptable (static, never-reordered list).

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a Playlist editor, songs render with `key={index}`, each row has an uncontrolled "notes" input and a drag handle, and users can reorder by drag and delete songs. Users report that after dragging a song up, the notes they typed stay on the old position and the wrong song plays when they hit the row's play button. Diagnose it and fix it, and explain the extra subtlety that reordering (not just deleting) introduces versus a plain append-only list.

**Model answer (revealed on demand):**

With `key={index}`, each row's identity is its slot number. Reordering changes which song sits at each slot but leaves the slot numbers `0..n` unchanged, so from React's view *no keys changed at all*: key 0 is still key 0. React therefore keeps every instance exactly where it was and only feeds each one new props (the reordered song data). The uncontrolled notes input and any per-row instance state stay bound to the slot, so they do not move with the song. The row's play handler, if it closed over the instance's slot or stale row data, fires for the wrong song.

Fix with a stable song id as the key:

```tsx
{songs.map((song) => (
  <li key={song.id}>
    <DragHandle />
    <span>{song.title}</span>
    <input defaultValue="" placeholder="notes" />
    <button onClick={() => play(song.id)}>Play</button>
  </li>
))}
```

Now reordering changes the *order* of keys but each key still identifies its song, so React moves each existing instance (and its notes input, focus, and DOM node) to the new position instead of leaving it behind.

The subtlety versus an append-only list: with append-only, index and identity happen to stay aligned for existing items (new items go on the end at fresh indices), so index keys often *look* safe there. Reordering breaks that alignment without changing the set of keys at all, which is why reorder bugs are sneakier than delete bugs: there is no unmount to hint that something moved, React just silently keeps state on the wrong rows.

**Production symptom:** typed notes and focus stick to a screen position while songs scroll past them, the play button plays the song that used to be in that slot, drag animations attach to the wrong row, and any `memo`'d row shows stale content because its props changed but its key (and thus its identity) did not.

---

### ajr-l5-key-as-remount-tool: Key as a remount tool (intentional state reset)

- **id:** `ajr-l5-key-as-remount-tool`  ·  **difficulty:** medium  ·  **est:** 10 min  ·  **demo:** react-demo  ·  **skills:** react, keys, reset

#### Learn

The same mechanism that causes the index-key bug is also a precise tool. Because a changed key at a slot makes React treat the element as a brand new item, you can *intentionally* change a key to force a component to unmount and remount, which resets all of its internal state cleanly and re-runs its mount effects. This is the idiomatic React way to reset a component when its identity changes, and it beats the common alternative of copying props into state inside an effect.

The problem it solves:

```tsx
function ProfileForm({ userId }: { userId: string }) {
  const [draft, setDraft] = useState("");
  // ...user switches from Alice to Bob, but `draft` still holds Alice's edits
}
```

When `userId` changes from Alice to Bob, `ProfileForm` is the same type at the same slot, so React *reuses* the instance and its `draft` state. Bob's form now shows Alice's half-typed edits. The stale-state bug.

The tempting fix is a derived-state effect:

```tsx
useEffect(() => {
  setDraft(""); // or setDraft(initialFromProps)
}, [userId]);
```

This works but is fragile. It causes an extra render (the component renders once with stale state, then the effect fires and re-renders with the reset value, so users can see a flash of the old data). It also has to enumerate and reset *every* piece of state manually, and it is easy to forget one, or to introduce a loop if the effect's deps are wrong.

The clean fix is to give the component a key tied to its identity:

```tsx
<ProfileForm key={userId} />
```

When `userId` changes, the key changes. React sees a different key at that slot, unmounts the old `ProfileForm` (destroying all of its state at once), and mounts a fresh one with its initial state and a fresh run of its mount effects. You do not enumerate state, there is no intermediate stale render, and adding new state fields later requires no extra reset code. React's own docs recommend exactly this pattern.

The cost is real and worth naming: a remount is not free. It destroys and recreates the DOM subtree, re-runs mount effects (including any data fetch in a mount effect), loses focus and scroll within the subtree, and discards any expensive state you actually wanted to keep. So use a key reset when you *want* a clean slate on identity change, not as a blanket tool. If only part of the form should reset, key just that part, or lift the parts that should persist above the keyed boundary.

**Interview nuance:** "when would you copy props into state?" Almost never for a full reset; a key is cleaner. The legitimate uses of derived-from-props state are narrow: seeding a field you then let the user diverge from *and* where a remount is too heavy or would lose other state you need. If your answer to "reset this form on user change" is a `useEffect` that setStates a pile of fields, the interviewer is usually looking for "change the key."

Recap: a changed key at a slot unmounts and remounts the component, resetting all state and re-running mount effects in one move; prefer `key={id}` over a props-to-state effect for identity-based resets; the cost is a full remount (DOM rebuild, effects re-run, focus/scroll lost), so reach for it when a clean slate is what you want.

#### See it live

**Demo (react-demo):** a ProfileForm with an unkeyed version and a `key={userId}` version, a user switcher, and a mount counter.

A widget with a user switcher (buttons "Alice", "Bob", "Carol") and two side-by-side `ProfileForm` cards labeled **"No key (reused)"** and **"key={userId} (remounted)"**. Each form has a text input for a draft bio and a **mount counter** badge that increments in its mount effect. Both cards receive the same `userId`. Built around:

```tsx
function ProfileForm({ userId }: { userId: string }) {
  const [draft, setDraft] = useState("");
  useEffect(() => { mountCount.current += 1; /* updates badge */ }, []);
  return (
    <>
      <span>editing: {userId}</span>
      <input value={draft} onChange={(e) => setDraft(e.target.value)} />
    </>
  );
}
// left card:  <ProfileForm userId={userId} />
// right card: <ProfileForm key={userId} userId={userId} />
```

**Watch:** type "hello" into both forms, then click a different user. The left ("No key") card keeps "hello" in the input and its mount counter stays at 1, the stale draft carried over because React reused the instance. The right (`key={userId}`) card clears the input and its mount counter ticks up by one on every user switch, proving a real unmount/remount. This is real React behavior: it proves that changing the key resets state and re-runs mount effects, while a stable key preserves state.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Reset it with `<ProfileForm key={userId} />` instead of syncing props to state in an effect, and explain why the key approach is better at the mechanism level (a ProfileForm keeps the previous user's edits after you navigate to a different user).

**Think about:**
- What does changing a key do to a component?
- Why is this better than a derived-state effect?
- What does it cost?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The form keeps the previous user's edits because `ProfileForm` is the same element type at the same slot across the navigation, so React reuses the existing instance and its `draft` state. Nothing told React the identity of the thing being edited changed.

Fix by making the identity part of the key:

```tsx
<ProfileForm key={userId} userId={userId} />
```

When `userId` changes, the key changes, so at that slot React sees a different item. It unmounts the old `ProfileForm` (discarding all of its state in one step) and mounts a fresh instance with initial state and a fresh run of its mount effects. The new user gets a clean form with no leftover draft.

The alternative, a `useEffect(() => setDraft(initialFromProps), [userId])`, works but is worse:

```tsx
// avoid: derived-state reset
useEffect(() => { setDraft(""); setAvatar(null); setBio(""); }, [userId]);
```

**WHY the key is better at the mechanism level:** a key change is handled during reconciliation, *before* the component renders with stale state, so there is no intermediate frame showing the old user's data. The effect approach renders once with stale state, then fires the effect, then re-renders, which is an extra render and a visible flash. The key also resets *all* state atomically because the whole instance is destroyed; the effect must manually enumerate every state field, and any field you forget stays stale, and a wrong dep array can loop.

**How to spot it in review:** a `useEffect(() => setState(somethingFromProps), [id])` whose job is "reset this component when `id` changes." That is almost always a key in disguise. Also flag forms that visibly flash the previous record's values for a frame after navigation.

**Production symptom (of the fixed version):** clean, immediate reset on identity change with no stale-data flash, correct re-fetch on mount, and no sync bugs from forgotten fields. The bug it removes is Alice's edits bleeding into Bob's form.

**Common misconception corrected:** "to reset a form when a prop changes, copy the prop into state in an effect." You usually should not. Changing the component's key resets it for free, without enumerating state and without the extra stale render.

**Self-check rubric:**
- [ ] I said a changed key unmounts and remounts the component.
- [ ] I noted the remount resets all state and re-runs mount effects atomically.
- [ ] I explained the key avoids the extra stale render that the effect causes.
- [ ] I named the cost (full remount: DOM rebuild, effects re-run, focus/scroll lost).
- [ ] I identified the props-to-state effect as the anti-pattern being replaced.

#### Practice: real-world variant (save, then reveal)

**Prompt:** On a Support console, agents move between tickets via a sidebar, and the `<ReplyEditor>` (a rich draft, attachments, and a "translate" toggle) keeps the previous ticket's draft and attachments when they switch tickets, occasionally sending the wrong reply to the wrong customer. The current code syncs props to state with three effects. Replace it with a key-based reset, and explain what to do about the one piece of state (the agent's global "signature" preference) that should *not* reset on ticket change.

**Model answer (revealed on demand):**

The three sync effects are trying to reset draft, attachments, and the translate toggle whenever the ticket changes, but they run after a stale render and are easy to get out of sync, which is how a previous draft survives long enough to be sent to the wrong customer. Replace all of them with a single keyed boundary:

```tsx
<ReplyEditor key={ticketId} ticketId={ticketId} signature={signature} />
```

Changing `ticketId` changes the key, so React unmounts the old `ReplyEditor` and mounts a fresh one: draft empty, attachments cleared, translate toggle back to default, and any mount-time fetch (canned responses for this ticket) re-runs. No enumeration, no stale frame, no chance of a leftover draft being submitted.

The subtlety is the agent signature, which is a global preference that should persist across every ticket. If it lived *inside* `ReplyEditor` as state, the remount would wipe it too. The fix is to not store it inside the keyed component: keep `signature` above the keyed boundary (in a parent, context, or store) and pass it in as a prop, exactly as shown. Because it is a prop feeding a freshly mounted child, the new editor picks it up on mount and the remount does not touch it. The rule generalizes: put everything that should reset-on-identity *inside* the keyed component, and hoist everything that should outlive the reset *above* the key.

**Production symptom (removed):** the wrong customer's draft, attachments, or translation state carrying into a new ticket and being sent by accident, plus the flash of the previous ticket's text on switch. In review, the tell was three `useEffect(..., [ticketId])` calls whose only job was to reset state; that is a key.
