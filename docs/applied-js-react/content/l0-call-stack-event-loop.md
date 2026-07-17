> Module **0.1** (The Runtime Model & Blocking) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Next: [0.2](./l0-task-queues.md)

# L0 · The Runtime Model & Blocking

By the end of this module you can catch the whole family of bugs that come from one fact: JavaScript runs on a single thread that finishes each task completely before it does anything else. You will be able to explain why a scheduled callback never interrupts running code, why a spinner never appears, why "set loading then work" shows the old UI, and why `Promise.all` around CPU work buys you nothing.

### ajr-l0-run-to-completion: Run-to-completion and the empty-stack rule

- **id:** `ajr-l0-run-to-completion`  ·  **difficulty:** easy  ·  **est:** 12 min  ·  **demo:** js-runnable  ·  **skills:** event-loop, call-stack, scheduling

#### Learn

JavaScript has one call stack and one main thread. When a function starts, it runs to completion. The event loop is not allowed to grab the next task until the call stack is completely empty. There is no preemption: nothing yanks control away from a running function to run a queued callback in the middle of it.

That single rule explains most "impossible ordering" bugs. Consider a click handler:

```js
function onClick() {
  console.log("1: sync start");
  setTimeout(() => console.log("4: timeout"), 0);
  Promise.resolve().then(() => console.log("3: microtask"));
  console.log("2: sync end");
}
```

People expect this to log 1, then maybe the timeout, then 2, because `setTimeout(fn, 0)` "runs right away." It does not. The output is `1`, `2`, `3`, `4`. The synchronous body (`1` and `2`) runs to the end first. Only when `onClick` returns and the stack is empty does the loop start draining queued work.

There are two queues, and they are not equal. The `Promise.then` callback goes on the microtask queue; the `setTimeout` callback goes on the macrotask (task) queue. After each task finishes and the stack empties, the loop drains the ENTIRE microtask queue before it will pick up the next macrotask. So microtasks (`3`) always beat the timer (`4`), even though the timer was scheduled first.

**Interview nuance:** "Does `await` yield?" Yes, but only at the `await`. Code before the first `await` in an async function runs synchronously, right now, as part of the current task. The continuation after `await` is a microtask. So `async function f(){ console.log("a"); await 0; console.log("b"); }` logs `a` synchronously and `b` later.

The dangerous version of this is reading state that a scheduled callback was supposed to write:

```js
let ready = false;
setTimeout(() => { ready = true; }, 0);
if (ready) doThing(); // always false here: the callback cannot run mid-task
```

The callback is queued, but the `if` runs inside the same task, so `ready` is still `false`. No amount of "0 delay" changes it. The write happens in a future task, after this one fully finishes.

**Interview nuance:** wrapping the heavy part in another function does not help ordering either. Calling `helper()` just pushes another frame onto the SAME stack. The stack still is not empty, so nothing queued can run. Yielding means returning to the loop, not calling deeper.

Recap: synchronous code finishes entirely before any queued task or microtask runs; the loop dequeues only on an empty stack; microtasks drain fully between tasks; `setTimeout(fn, 0)` means "after this task," not "now."

#### See it live

**Demo (js-runnable):** a handler logs, schedules a `setTimeout(0)` and a `Promise.then`, then keeps computing synchronously for a beat, so you watch the stack stay busy while callbacks wait.

```js
// Watch the sync block finish BEFORE anything queued runs.
const log = [];
const t0 = performance.now();

console.log("1: sync start (stack is busy)");
log.push(["1: sync start", performance.now() - t0]);

setTimeout(() => {
  console.log("5: macrotask (setTimeout 0)");
  log.push(["5: macrotask", performance.now() - t0]);
  console.log(JSON.stringify(log, null, 2));
}, 0);

Promise.resolve().then(() => {
  console.log("4: microtask (Promise.then)");
  log.push(["4: microtask", performance.now() - t0]);
});

// Keep the stack non-empty with real synchronous work for ~30ms.
let sink = 0;
const spinUntil = performance.now() + 30;
while (performance.now() < spinUntil) { sink += Math.sqrt(sink + 1); }

console.log("2: still synchronous after the busy loop");
log.push(["2: after busy loop", performance.now() - t0]);
console.log("3: sync end (NOW the stack will empty)");
log.push(["3: sync end", performance.now() - t0]);
```

**Watch:** the console prints `1`, `2`, `3` in order with rising timestamps (the busy loop shows ~30ms elapsed) while the queued `Promise` and `setTimeout` callbacks sit waiting. Only after `3` (the stack empties) does `4` (microtask) fire, then `5` (macrotask). This proves the empty-stack rule: nothing queued interleaves with the running synchronous block, and the microtask beats the timer.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict the exact log order of a snippet that mixes a sync loop, a `setTimeout(0)`, and a `Promise.then`, and explain in one sentence why no queued callback can run until the current function returns.

**Think about:**
- When exactly does the loop get to pick up the next task?
- What does "no preemption" mean for a long function?
- Which of the scheduled callbacks is even eligible to run mid-function?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Take this snippet:

```js
console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
for (let i = 0; i < 3; i++) console.log("D" + i);
console.log("E");
```

The exact order is: `A`, `D0`, `D1`, `D2`, `E`, `C`, `B`.

WHY at the mechanism level: everything from `A` through `E`, including the whole `for` loop, is synchronous code in one task. The `setTimeout` and `Promise.then` callbacks are only SCHEDULED here; they are placed on the macrotask and microtask queues respectively. The event loop dequeues the next callback only when the call stack is empty, and the stack does not empty until this top-level task returns. So no queued callback (`B` or `C`) can appear anywhere in the middle of `A`...`E`. Once the stack empties, the loop drains the microtask queue completely first, so `C` runs before `B`, even though `B` was scheduled first.

One-sentence answer: no queued callback runs until the current function returns because the event loop only dequeues the next task when the call stack is empty, and JavaScript never preempts a running function.

HOW to spot it in review: look for any code that schedules a callback (`setTimeout`, `.then`, `queueMicrotask`, an event dispatch) and then reads or asserts a value the callback was supposed to set, within the same synchronous block. That read always sees the OLD value.

PRODUCTION SYMPTOM: "impossible" ordering bugs, and state read before a scheduled write applied, for example a flag checked in the same tick it was scheduled to flip, or an analytics event that "should have fired first" landing last.

COMMON MISCONCEPTION corrected: `setTimeout(fn, 0)` does not run `fn` "right away." The `0` is a minimum delay measured from AFTER the current task finishes. It is the last of the three to run here.

**Self-check rubric:**
- [ ] I predicted `A, D0, D1, D2, E, C, B` (all sync first, then microtask, then macrotask).
- [ ] I can state the empty-stack rule in one sentence.
- [ ] I explained that microtasks drain before the next macrotask.
- [ ] I noted that `setTimeout(fn, 0)` runs after the current task, not immediately.
- [ ] I can point to the review smell (read a value in the same tick it was scheduled to be written).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Debug the "double-submit guard that never guards." A checkout form does `submitting = false;` at module scope, and the submit handler runs `if (submitting) return; queueMicrotask(() => { submitting = true; }); await chargeCard(); submitting = false;`. QA reports users can double-charge by clicking fast. Explain, using the empty-stack and microtask rules, why the guard fails to block the second click, and fix it.

**Model answer (revealed on demand):**

The guard fails because the flag is set in a microtask instead of synchronously. Trace a fast double click. Click 1 runs the handler: `submitting` is `false`, so it does not return, it queues a microtask to set `submitting = true`, then hits `await chargeCard()`. The `await` suspends the handler and returns control to the loop. Now the loop drains microtasks, so `submitting` becomes `true`, but only AFTER the first handler already committed to charging. If click 2's handler starts before that microtask ran (for instance because the click dispatch happens inside the same task), it reads `submitting === false` and charges again.

The root cause is the same empty-stack rule: setting the flag in a `queueMicrotask` callback defers it past the synchronous guard check, so the check and the write are not atomic against a second event.

Fix: set the flag synchronously, at the very top, before any `await`:

```js
let submitting = false;

async function onSubmit() {
  if (submitting) return;   // read
  submitting = true;        // write, same synchronous tick, no gap
  try {
    await chargeCard();
  } finally {
    submitting = false;     // reset only after the async work settles
  }
}
```

Now the read and the write sit in one uninterrupted synchronous block. Because nothing can run between them (no preemption), a second click that fires later sees `submitting === true` and returns early. Belt-and-suspenders in real UIs: also disable the button on click (`btn.disabled = true`) so the browser drops repeat activations, and reset in `finally` so a thrown charge does not wedge the form.

PRODUCTION SYMPTOM: duplicate charges, duplicate orders, or double API writes under fast clicks or flaky networks, exactly the class of bug that is invisible in slow manual testing and shows up in payment reconciliation.

MISCONCEPTION corrected: `queueMicrotask` (or a `.then`) is NOT "basically synchronous." It defers the write past the current synchronous block, which is precisely long enough for a second event's guard check to slip through.

### ajr-l0-blocking-main-thread: Blocking the main thread freezes the UI

- **id:** `ajr-l0-blocking-main-thread`  ·  **difficulty:** easy  ·  **est:** 14 min  ·  **demo:** react-demo  ·  **skills:** blocking, rendering, INP

#### Learn

The browser runs your JavaScript, computes layout, paints pixels, and dispatches input events on ONE thread: the main thread. These do not happen in parallel with your code. They happen in between your tasks. While a synchronous function is running, the browser cannot paint, cannot run animations, and cannot respond to clicks. It is stuck waiting for your code to return to the event loop.

So this handler looks correct and behaves terribly:

```js
btn.onclick = () => {
  showSpinner();   // sets spinner element to display:block
  heavyLoop();     // 1.5s of synchronous CPU work
  hideSpinner();   // sets it back to display:none
};
```

The user clicks and sees nothing happen for 1.5 seconds, then the button just "finishes." The spinner never appears. Why? `showSpinner()` did mutate the DOM: the element's style really is `display:block` now. But a DOM mutation is not a paint. The browser only gets a chance to paint AFTER your synchronous code returns to the event loop. Your code does not return until after `hideSpinner()` has already set it back to `display:none`. So the browser wakes up, sees the final state (hidden), and paints that. The visible-then-hidden intermediate frame never made it to the screen.

**Interview nuance:** "A DOM write happened, why did the user never see it?" Because rendering is a separate step the browser schedules for a future frame. Writing to the DOM enqueues style/layout changes; it does not synchronously repaint. Between your click handler starting and ending, zero frames are produced.

Refactoring into another function does NOT help:

```js
btn.onclick = () => {
  showSpinner();
  runWork();       // still synchronous, still same task
  hideSpinner();
};
```

Calling `runWork()` just pushes a frame onto the same stack. The stack still never empties mid-handler, so still no paint. Yielding means returning control to the loop, not calling a deeper function.

The fix is to yield to a macrotask between the DOM write and the heavy work, so a paint can happen in the gap:

```js
btn.onclick = async () => {
  showSpinner();
  await new Promise(r => setTimeout(r, 0)); // yield: let the loop paint one frame
  heavyLoop();
  hideSpinner();
};
```

Now the handler returns at the `await`, the browser paints the spinner, and only then does `heavyLoop` run in a later task. (The UI still freezes during the loop; you have made the spinner visible, not made the work non-blocking. Real fixes chunk the work or move it to a Worker, which is lesson 4.) `scheduler.yield()` is the modern, higher-priority version of this yield where supported.

**Interview nuance:** this is what tanks INP (Interaction to Next Paint). A long synchronous handler is exactly a long "input delay + processing" window with no paint, and Core Web Vitals measures it.

Recap: one thread runs JS, layout, paint, and input; the browser can only paint after your synchronous code returns to the loop; a DOM write is not a paint; calling another function is not yielding.

#### See it live

**Demo (react-demo):** a button sets a spinner visible, runs a 1.5s busy while-loop, then hides it. A toggle labeled "await 0 before work" inserts a yield between showing the spinner and running the loop. A small "main thread" light shows green (responsive) or red (frozen).

The widget renders: a Start button, a CSS spinner (a rotating border), a text label that reads `Idle` / `Loading...` / `Done`, the yield toggle, and a "main thread: responsive/frozen" light. With the toggle OFF, clicking Start makes the spinner and label appear to do nothing, the light goes red, and after ~1.5s the label jumps to `Done`. With the toggle ON, the spinner actually spins and the label shows `Loading...` before the freeze.

```tsx
function BlockingDemo() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [yieldFirst, setYieldFirst] = useState(false);

  function heavyLoop() {
    const end = performance.now() + 1500;
    let sink = 0;
    while (performance.now() < end) sink += Math.sqrt(sink + 1);
    return sink;
  }

  async function onStart() {
    setStatus("loading");                 // DOM write (not a paint yet)
    if (yieldFirst) {
      await new Promise((r) => setTimeout(r, 0)); // yield so a paint can happen
    }
    heavyLoop();                          // 1.5s synchronous freeze
    setStatus("done");
  }

  return (
    <div>
      <button onClick={onStart}>Start work</button>
      <label>
        <input
          type="checkbox"
          checked={yieldFirst}
          onChange={(e) => setYieldFirst(e.target.checked)}
        />
        await 0 before work
      </label>
      <div className={status === "loading" ? "spinner spinning" : "spinner"} />
      <p>{status === "loading" ? "Loading..." : status === "done" ? "Done" : "Idle"}</p>
    </div>
  );
}
```

**Watch:** with the toggle OFF, the spinner CSS animation freezes solid and the label never repaints to `Loading...`; it jumps straight from `Idle` to `Done` after the loop, and the "main thread" light is red the whole time. Flip the toggle ON and the spinner spins and `Loading...` shows before the freeze. This proves that the DOM write in `setStatus("loading")` only reaches the screen when you yield control back to the loop; the mutation alone does not paint.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why the spinner never appears in `btn.onclick = () => { showSpinner(); heavyLoop(); hideSpinner(); }` and rewrite it so the spinner actually shows before the work runs.

**Think about:**
- A DOM write happened; why did the user never see it?
- What has to happen before the browser can paint?
- Does moving the work into another function help? Why not?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The spinner never appears because the entire handler is one synchronous task, and the browser cannot paint until that task returns to the event loop. `showSpinner()` does mutate the DOM (the spinner's style becomes visible), but a DOM mutation is not a paint. Between the click handler starting and finishing, zero frames are produced. By the time control returns to the loop and the browser is free to paint, `hideSpinner()` has already run, so the browser paints the final state (hidden). The visible frame is overwritten before it ever reaches the screen.

Corrected code, yielding to a macrotask so a paint lands between the DOM write and the heavy work:

```js
btn.onclick = async () => {
  showSpinner();
  // Yield: return to the loop so the browser can paint one frame.
  await new Promise((r) => setTimeout(r, 0));
  heavyLoop();     // still blocks, but the spinner is on screen now
  hideSpinner();
};
```

WHY at the mechanism level: the `await` suspends the handler and returns control to the event loop. With an empty stack, the browser renders a frame (spinner visible), then a later task runs `heavyLoop`. The spinner is now painted before the freeze. Note the freeze itself is unchanged: you made the intermediate state visible, you did not make the CPU work non-blocking. To also keep the UI live during the work you must chunk it or move it to a Worker.

HOW to spot it in review: any event handler that writes DOM or React state and then does heavy synchronous computation in the same tick. The tell is a `showX()` / `setLoading(true)` immediately followed by a loop, parse, sort, or crypto call with no `await` between them.

PRODUCTION SYMPTOM: frozen spinners, buttons that look dead on click, janky or dropped keystrokes, and poor INP scores in field data.

MISCONCEPTION corrected: calling another function (`heavyLoop()` or wrapping it in `runWork()`) is NOT yielding. It pushes onto the same stack, which stays non-empty, so no paint happens. Only returning to the loop (via `await` of a macrotask, `setTimeout`, or `scheduler.yield`) counts.

**Self-check rubric:**
- [ ] I said a DOM write is not a paint, and the browser paints only after the task returns to the loop.
- [ ] My fix inserts a real yield (await a timeout / `scheduler.yield`) between the DOM write and the heavy work.
- [ ] I acknowledged the work still blocks during the loop; the fix only makes the spinner visible.
- [ ] I stated that moving work into another function does not yield.
- [ ] I named the production symptom (frozen UI / bad INP).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Fix the "export to CSV that freezes the tab." A dashboard has an Export button whose handler does `setExporting(true); const csv = buildCsv(rows); download(csv); setExporting(false);` where `buildCsv` serializes 200k rows and takes ~4 seconds. Users report the whole tab locks up, the "Exporting..." toast never shows, and Chrome sometimes shows "Page unresponsive." Explain the mechanism and give a fix that both shows the toast and keeps the tab from being killed.

**Model answer (revealed on demand):**

Mechanism: the handler is one 4-second synchronous task. `setExporting(true)` schedules a render but cannot paint, because the stack never empties before `buildCsv` runs. So the toast never appears, the tab cannot process input or paint for 4 seconds (that is what "Page unresponsive" detects: no return to the loop), and the label flips from idle straight to done. Same rule as the spinner: a state write is not a paint.

A first improvement is to yield so the toast paints, but a 4-second freeze is still bad and can still trip the unresponsive dialog. The real fix is to break the work into chunks that yield between them, or move serialization to a Worker. Chunked version:

```js
async function onExport() {
  setExporting(true);
  await new Promise((r) => setTimeout(r, 0)); // paint the toast first
  const parts = [];
  const CHUNK = 5000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    parts.push(serializeChunk(rows.slice(i, i + CHUNK)));
    await new Promise((r) => setTimeout(r, 0)); // yield each chunk: keep the tab alive
  }
  download(parts.join(""));
  setExporting(false);
}
```

Now each chunk is a short task; between chunks the loop can paint, respond to input, and reset the unresponsive timer. WHY it works: you converted one long task into many short ones, so the stack empties repeatedly and the browser interleaves rendering and input. Even better for pure CPU work: post `rows` to a Web Worker, serialize off-thread, and post the string back, leaving the main thread fully responsive (lesson 4).

PRODUCTION SYMPTOM: "Page unresponsive" dialogs, a toast that never shows, and a hard tab freeze during export, sort, or large JSON parse.

MISCONCEPTION corrected: `setExporting(true)` is not synchronous-and-painted; React commits and the browser paints only after the handler yields, so setting a flag right before blocking work guarantees the user never sees it.

### ajr-l0-dom-write-not-paint: A state write shows the OLD UI until you yield

- **id:** `ajr-l0-dom-write-not-paint`  ·  **difficulty:** easy  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** rendering, blocking, react

#### Learn

This lesson is the run-to-completion rule seen through React's rendering. When you call `setState`, React does not render and paint on the spot. It SCHEDULES a re-render. The render, the commit to the DOM, and the browser paint all happen later, after your event handler returns to the event loop. So if you set a "working" flag and then do blocking work in the same handler, React never gets a chance to commit the "working" frame. The user sees the frame from BEFORE the handler, then the final frame, and nothing in between.

```jsx
function Crunch() {
  const [status, setStatus] = useState("idle");
  function onRun() {
    setStatus("working");          // schedules a render, does not paint
    const total = crunch();        // 1s synchronous work
    setStatus("done");             // schedules another render
  }
  return <button onClick={onRun}>Status: {status}</button>;
}
```

The label goes `idle` then, one second later, `done`. It never shows `working`. Two `setState` calls happened, but only one paint happens after the handler returns, and by then the latest state is `done`. React even batches the two updates: it does not render between them. The intermediate state is real in memory for a moment and then gone, never committed.

**Interview nuance:** "How many paints happen in this handler?" Zero during the handler, and one after it returns. That one paints `done`. To show `working`, you need TWO commit-and-paint cycles, which means the handler must return to the loop between the two state writes.

The fix is to yield a macrotask so React can commit and paint the interim state before the heavy work:

```jsx
async function onRun() {
  setStatus("working");
  await new Promise((r) => setTimeout(r, 0)); // let React commit + browser paint
  const total = crunch();
  setStatus("done");
}
```

Now the handler returns at the `await`. React flushes the pending render, the browser paints `working`, and a later task runs `crunch` and then sets `done`.

**Interview nuance:** "Would `useTransition` help here?" No, and this is the classic trap. `useTransition` marks a state update as low priority so React can keep the UI responsive while rendering a big tree. It is about expensive RENDERING. Your problem is expensive NON-React work (a synchronous `crunch`) blocking the thread. `startTransition` will not interrupt a synchronous `for` loop; nothing can, because there is no preemption. The tool you need is yielding (or a Worker), not transitions. Knowing the difference between "slow because React is rendering a lot" and "slow because JS is blocking the thread" is a senior-level distinction.

Recap: `setState` schedules; the commit and paint cannot happen mid-handler because the stack never empties; to show an interim state you must yield between the flag write and the blocking work; `useTransition` fixes slow rendering, not a blocked thread.

#### See it live

**Demo (react-demo):** a component sets status to `Working`, runs a synchronous crunch (~1s), then sets status to `Done`, all in one handler. A "yield before crunch" toggle inserts an `await 0`. Two labels sit side by side: the current run and a reference "fixed" run that always yields.

The widget renders a Run button, a large status label (`Idle` / `Working...` / `Done`), a paint-counter badge that increments in a `useEffect(() => setPaints(p => p + 1))` on each commit, and the yield toggle. With the toggle OFF, clicking Run makes the label jump `Idle` to `Done` and the paint badge increments by 1. With the toggle ON, the badge increments twice and `Working...` is visible for ~1s.

```tsx
function StateWriteDemo() {
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [yieldFirst, setYieldFirst] = useState(false);
  const [paints, setPaints] = useState(0);

  useEffect(() => setPaints((p) => p + 1), [status]); // count committed paints

  function crunch() {
    const end = performance.now() + 1000;
    let s = 0;
    while (performance.now() < end) s += Math.sqrt(s + 1);
    return s;
  }

  async function onRun() {
    setStatus("working");
    if (yieldFirst) await new Promise((r) => setTimeout(r, 0));
    crunch();
    setStatus("done");
  }

  return (
    <div>
      <button onClick={onRun}>Run</button>
      <label>
        <input type="checkbox" checked={yieldFirst}
          onChange={(e) => setYieldFirst(e.target.checked)} />
        yield before crunch
      </label>
      <p>Status: {status}</p>
      <span>commits since load: {paints}</span>
    </div>
  );
}
```

**Watch:** with the toggle OFF, the status label jumps straight from `idle` to `done` and the commit badge goes up by exactly 1; the `working` frame is never painted. Flip the toggle ON and the badge goes up by 2 and `working` is visible for about a second before `done`. This proves `setState` only schedules: without a yield, React commits once (the final state) after the handler returns; with a yield, it commits and paints the interim state first.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Predict what the user sees for a handler that setStates "processing" then runs a blocking loop then setStates "done", and fix it so the processing state is actually visible.

**Think about:**
- How many paints happen in this handler?
- Where would you insert a yield?
- Would `useTransition` help here, or is this a different problem?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

Prediction: the user sees the label go straight from its previous value to `done`. The `processing` state is never visible. Zero paints happen during the handler and exactly one happens after it returns, showing `done`. React also batches the two `setState` calls, so it does not even render between them.

The starting code:

```jsx
function onProcess() {
  setStatus("processing");
  const result = blockingLoop(); // synchronous, ~1s
  setStatus("done");
}
```

The fix inserts a yield to a macrotask after the `processing` write, so React can commit and the browser can paint before the blocking work:

```jsx
async function onProcess() {
  setStatus("processing");
  await new Promise((r) => setTimeout(r, 0)); // commit + paint the interim state
  const result = blockingLoop();
  setStatus("done");
}
```

WHY at the mechanism level: `setState` schedules a render; the render, the DOM commit, and the browser paint can only run when the call stack is empty. Inside a synchronous handler the stack never empties, so `processing` is never committed. The `await` returns control to the loop, React flushes the pending update, the browser paints `processing`, and `blockingLoop` runs in a later task. To show an interim frame you need two commit-and-paint cycles, which requires yielding between the writes.

HOW to spot it in review: a loading or progress flag set in the same synchronous block as the blocking work it is meant to cover, with no `await` between them.

PRODUCTION SYMPTOM: users never see progress, loading, or "processing" states during heavy local work; the UI looks like it hung and then teleported to the result.

MISCONCEPTION corrected, and the key trap here: `useTransition` does NOT help. Transitions make expensive React RENDERING interruptible so typing stays smooth; they do not interrupt a synchronous `blockingLoop`, because nothing preempts running JS. This is a blocked-thread problem, not a slow-render problem. The right tools are yielding (to show the state) and chunking or a Worker (to unblock the thread).

**Self-check rubric:**
- [ ] I predicted the label jumps to `done` and never shows `processing`.
- [ ] I said zero paints during the handler, one after it returns.
- [ ] My fix yields (await a macrotask) between the `processing` write and the loop.
- [ ] I explained `setState` schedules; commit and paint need an empty stack.
- [ ] I correctly ruled out `useTransition` and said why (blocked thread, not slow render).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Diagnose the "optimistic progress bar that skips to 100%." A file-processing view runs `setProgress(0)` then a loop over 50 files that calls a synchronous `parseFile(file)` and `setProgress(i / total)` each iteration, then `setDone(true)`. Users report the progress bar never moves; it just snaps to 100% (or Done) when everything finishes. Explain why every intermediate `setProgress` is invisible and rewrite it so the bar animates smoothly.

**Model answer (revealed on demand):**

Every `setProgress` inside the loop is invisible for the same reason as a single interim state: the whole loop is one synchronous task, so React never gets an empty stack to commit and paint against. React batches all 50 updates and, after the handler returns, commits once with the final value (100% / Done). Calling `setProgress` 50 times does not produce 50 paints; it produces one, because there is no yield between them.

Fix: yield to the loop between iterations so React can commit and the browser can paint each step:

```jsx
async function onProcessAll(files) {
  setProgress(0);
  for (let i = 0; i < files.length; i++) {
    parseFile(files[i]);                 // synchronous CPU work per file
    setProgress((i + 1) / files.length);
    await new Promise((r) => setTimeout(r, 0)); // yield: commit + paint this step
  }
  setDone(true);
}
```

WHY it works: each iteration is now its own short task. After `setProgress`, the `await` empties the stack, React flushes that update, and the browser paints the new bar width before the next `parseFile` runs. Fifty short tasks means fifty commit-and-paint opportunities, so the bar animates. This also keeps the tab responsive to input between files. For heavier per-file work, move `parseFile` to a Web Worker and post progress messages back, so the main thread only paints and never blocks.

PRODUCTION SYMPTOM: progress bars that jump 0 to 100, step counters that never tick, and "is it frozen?" support tickets during batch imports, uploads, or parsing.

MISCONCEPTION corrected: calling `setState` many times in a loop does not force many renders. React batches them; without a yield between iterations, the user sees exactly one final frame. `flushSync` could force a synchronous commit per iteration, but it forces layout and paint work on the main thread each time and still does not unblock the CPU loop, so yielding (or a Worker) is the correct tool.

### ajr-l0-concurrency-not-parallelism: Concurrency is not parallelism (async adds no threads)

- **id:** `ajr-l0-concurrency-not-parallelism`  ·  **difficulty:** medium  ·  **est:** 14 min  ·  **demo:** js-runnable  ·  **skills:** concurrency, workers, async

#### Learn

`Promise.all` does not run JavaScript in parallel. There is still exactly one main thread running one task at a time. What `async`/`await` and `Promise.all` overlap is WAITING, not computing. When you `await fetch(...)`, your function suspends and the thread is free to do other work while the network (a separate system) does the waiting. That is concurrency: many outstanding waits, interleaved on one thread. It is not parallelism: two pieces of JavaScript never execute at the same instant on the main thread.

So wrapping CPU-bound work in `Promise.all` buys nothing:

```js
function factor(n) {                 // pure synchronous CPU work
  const out = [];
  for (let d = 2; d <= n; d++) while (n % d === 0) { out.push(d); n /= d; }
  return out;
}

async function slow(n) { return factor(n); } // async wrapper around sync work

// Looks parallel. Is not.
await Promise.all([slow(a), slow(b), slow(c), slow(d)]);
```

Each `slow(n)` runs `factor(n)` synchronously to completion before it returns a resolved promise. There is no `await` inside `slow` that suspends during the computation, so `Promise.all` just kicks off four synchronous functions one after another. Total time is the SUM of the four, identical to calling them in sequence, and the page freezes the entire time because the main thread is pinned. Marking a function `async` does not make its body non-blocking; it only wraps the return value in a promise.

**Interview nuance:** "What does `await` actually overlap?" It overlaps IDLE waiting on something external: network, timers, disk, another thread. If there is nothing to wait on (pure CPU), there is nothing to overlap, and `await` just adds microtask hops. `Promise.all` is a win for four `fetch` calls (the waits overlap) and a no-op for four `factor` calls (there is no wait, only compute).

Real parallelism on the web means more threads, which means Web Workers:

```js
// main.js
function runInWorker(n) {
  return new Promise((resolve) => {
    const w = new Worker("factor-worker.js");
    w.onmessage = (e) => { resolve(e.data); w.terminate(); };
    w.postMessage(n);
  });
}
// factor-worker.js: onmessage = (e) => postMessage(factor(e.data));

const results = await Promise.all([a, b, c, d].map(runInWorker));
```

Now four Workers run `factor` on four OS threads genuinely at the same time. Wall-clock time drops toward the time of the single longest task (given enough cores), and the main thread stays free to paint and respond. Data crosses via structured-clone message passing, or zero-copy `Transferable`s (like an `ArrayBuffer`) for large buffers.

**Interview nuance:** "When is async the right tool and when is a Worker?" Async/Promises for I/O-bound work (waiting on network, timers, or Workers themselves). Workers for CPU-bound work (parsing, crypto, image processing, big sorts). Reaching for `Promise.all` to speed up CPU work is the classic tell that someone conflates concurrency with parallelism.

Recap: `Promise`/`async` interleave I/O waits on one thread; the single main thread runs one task at a time, so `Promise.all` around synchronous CPU work is additive and still freezes the page; only Workers give true parallelism, via message passing or transferables.

#### See it live

**Demo (js-runnable):** four CPU-heavy factoring tasks run two ways and are timed: A) sequentially / via `Promise.all` on the main thread (simulated, additive) and B) as four Workers overlapping (simulated), with a note on main-thread responsiveness.

```js
// This runs on ONE thread, so we time real synchronous CPU work.
// A worker pool cannot be spun up inline here, so variant B SIMULATES
// four-way overlap by dividing the measured main-thread time by 4
// (the ideal speedup with 4 free cores). Read the note in Watch.

function busy(ms) {              // burn `ms` of real CPU synchronously
  const end = performance.now() + ms;
  let s = 0;
  while (performance.now() < end) s += Math.sqrt(s + 1);
  return s;
}

const tasks = [40, 40, 40, 40]; // four ~40ms CPU tasks

// A) Promise.all around synchronous work on the main thread.
async function slow(ms) { return busy(ms); } // async wrapper, body is sync
const a0 = performance.now();
await Promise.all(tasks.map(slow));
const aMs = performance.now() - a0;
console.log("A) Promise.all on main thread:", aMs.toFixed(1), "ms (additive, page frozen)");

// B) True parallelism across 4 Workers (ideal): ~longest single task.
const idealParallelMs = Math.max(...tasks);
console.log("B) 4 Web Workers (ideal):        ~", idealParallelMs.toFixed(1),
  "ms (overlapping, main thread stays responsive)");

console.log("Speedup that Promise.all gave over sequential:",
  "1.0x  (none: CPU work does not overlap on one thread)");
console.log("Speedup Workers would give:",
  (aMs / idealParallelMs).toFixed(1) + "x");
```

**Watch:** variant A prints roughly the SUM of the four tasks (about 160ms) and states the page was frozen for that whole span, proving `Promise.all` gave no speedup over sequential for CPU work. Variant B prints roughly the time of the single longest task (about 40ms) as the ideal for four Workers. Be honest: this runner is single-threaded, so variant B is SIMULATED (it divides by the core count it assumes), not a live Worker run. It illustrates the target; only real Workers achieve it, and only they keep the main thread responsive.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain why wrapping four calls to a synchronous CPU function in `Promise.all` is no faster than calling them in sequence, then say what actually parallelizes it.

**Think about:**
- What does `await` actually overlap: computation or waiting?
- Why does the page freeze even with `Promise.all`?
- When is async the right tool and when is a Worker?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`Promise.all` is no faster because there is only one thread and each task is pure CPU work with nothing to wait on. Wrapping `factor(n)` in an `async` function does not make its body suspend; the loop runs synchronously to completion before the returned promise resolves. So `Promise.all([slow(a), slow(b), slow(c), slow(d)])` just runs the four synchronous bodies back to back on the main thread. Total time is the sum of the four, exactly the same as a sequential loop, and the page is frozen the entire time because the thread is pinned.

WHY at the mechanism level: `await` overlaps IDLE waiting on something external (network, timer, another thread), not computation. `Promise.all` starts several operations and lets their WAITS interleave on one thread. With CPU work there is no wait to interleave, only compute, and one thread computes one thing at a time. Concurrency (interleaved waiting) is not parallelism (simultaneous execution).

What actually parallelizes it: Web Workers. Move `factor` off the main thread onto worker threads and true parallel execution becomes possible.

```js
function runInWorker(n) {
  return new Promise((resolve) => {
    const w = new Worker("factor-worker.js");
    w.onmessage = (e) => { resolve(e.data); w.terminate(); };
    w.postMessage(n);
  });
}
// factor-worker.js: onmessage = (e) => postMessage(factor(e.data));
const results = await Promise.all([a, b, c, d].map(runInWorker));
```

Now four Workers run on separate OS threads at the same time, wall-clock time falls toward the longest single task (given enough cores), and the main thread stays free to paint and handle input. Large payloads should use `Transferable`s (for example an `ArrayBuffer`) to avoid copy cost.

HOW to spot it in review: `Promise.all` (or `await` in a loop) wrapped around synchronous, CPU-bound functions with the expectation of a speedup, and no I/O anywhere in the awaited calls.

PRODUCTION SYMPTOM: a change advertised as "we parallelized it" ships, but the page still hangs during the operation and the timing is unchanged, because nothing was ever waiting.

MISCONCEPTION corrected: `async`/`await` does not make CPU work non-blocking or concurrent with itself. It only wraps a value in a promise and adds microtask scheduling; the CPU loop still monopolizes the single thread.

**Self-check rubric:**
- [ ] I said `await` overlaps waiting (I/O), not computation.
- [ ] I explained one thread runs one task at a time, so CPU work is additive under `Promise.all`.
- [ ] I said the page freezes because the main thread is pinned by the synchronous loop.
- [ ] My fix uses Web Workers (message passing) for real parallelism.
- [ ] I noted async is for I/O-bound work and Workers are for CPU-bound work.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Redesign the "batch image thumbnailer that hangs." A gallery uploads 20 images and the client does `await Promise.all(files.map(async (f) => resizeImage(f)))`, where `resizeImage` is a synchronous canvas/pixel-loop that takes ~150ms each. The team is confused: they "used `Promise.all` for parallelism" but the tab freezes for ~3 seconds and the timing matches the old sequential code. Explain why, and give an architecture that actually parallelizes and keeps the UI responsive.

**Model answer (revealed on demand):**

The `Promise.all` did nothing because `resizeImage` is synchronous CPU work with no `await` inside it. Each `async` callback runs `resizeImage` to completion on the main thread before its promise resolves, so `Promise.all` executes 20 synchronous resizes back to back. Total time is 20 times 150ms (about 3 seconds), identical to a sequential loop, and the tab is frozen throughout because the single thread is pinned. There was never any waiting to overlap, so there was no concurrency to exploit and definitely no parallelism.

Fix: move `resizeImage` into a pool of Web Workers so the resizes run on multiple OS threads at once and the main thread stays free to paint and accept input.

```js
// Pool of N workers (N ~ navigator.hardwareConcurrency).
const pool = Array.from({ length: 4 }, () => new Worker("resize-worker.js"));

function resizeOnPool(worker, bitmap) {
  return new Promise((resolve) => {
    worker.onmessage = (e) => resolve(e.data);
    worker.postMessage(bitmap, [bitmap]); // transfer, zero-copy
  });
}

async function thumbnailAll(files) {
  const bitmaps = await Promise.all(files.map((f) => createImageBitmap(f)));
  const results = [];
  for (let i = 0; i < bitmaps.length; i++) {
    const worker = pool[i % pool.length];
    results.push(resizeOnPool(worker, bitmaps[i]));
  }
  return Promise.all(results); // NOW the waits are real: workers run in parallel
}
```

WHY it works: with four Workers the resizes run four at a time on separate threads, so wall-clock time drops toward roughly 3s / 4 (about 750ms) and the main thread only orchestrates and paints, so the UI stays responsive. Use `createImageBitmap` plus `OffscreenCanvas` in the Worker and transfer the bitmap (the `[bitmap]` transfer list) to avoid copying pixel data across the boundary. Here `Promise.all` finally earns its keep, because each awaited promise is genuinely waiting on another thread.

PRODUCTION SYMPTOM: "we parallelized the resize/parse/encode" but the tab still hangs for seconds and timings are unchanged, plus dropped frames and unresponsive controls during the batch.

MISCONCEPTION corrected: `Promise.all` is not a parallelism primitive. It is a coordination primitive for already-concurrent (usually I/O or Worker-backed) promises. Around synchronous CPU work it is exactly as fast, and as blocking, as a plain sequential loop.
