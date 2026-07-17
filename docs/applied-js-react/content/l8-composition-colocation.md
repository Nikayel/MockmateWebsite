> Module **8.3** (Composition Over Memo) of the [Applied JS & React curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [8.2](./l8-memo-economics.md) · Next: [8.4](./l8-context-selectors.md)

# L8 · Composition Over Memo

Before you reach for `React.memo`, most re-render problems dissolve if you change the shape of the tree instead of adding a comparison to it. After this module you can catch the two structural moves that make an expensive subtree stop re-rendering for free: passing that subtree as `children` so it stays referentially stable, and colocating volatile state at the lowest component that actually reads it. Both fixes remove work rather than measuring it, and both look like ordinary refactors in review, which is exactly why the memo-first habit hides them.

### ajr-l8-children-passthrough: Composition / children as the memo-free fix

- **id:** `ajr-l8-children-passthrough`  ·  **difficulty:** medium  ·  **est:** 12 min  ·  **demo:** react-demo  ·  **skills:** react, composition, performance

#### Learn

React re-renders a component when its own state changes, and by default it then re-renders that component's entire returned subtree. The usual reflex when a heavy child is caught in that blast radius is to wrap the child in `React.memo`. But `memo` only helps if the child's props are referentially stable, and it still costs a shallow prop compare on every parent render. Composition sidesteps the whole problem: if the heavy subtree is created by a component that does NOT re-render, its element reference never changes, and React skips reconciling it without any comparison at all.

Here is the shape that hurts. A component owns fast-changing state and renders an expensive sibling inline:

```tsx
function Page() {
  const [color, setColor] = useState("#663399");
  return (
    <div style={{ color }}>
      <input value={color} onChange={(e) => setColor(e.target.value)} />
      <ExpensiveTree /> {/* re-created on every keystroke */}
    </div>
  );
}
```

Every keystroke sets `color`, re-renders `Page`, and re-runs `Page`'s body. That body calls `<ExpensiveTree />` again, producing a brand new element, so React reconciles the expensive subtree on every character. `ExpensiveTree` does not read `color` at all, yet it pays the full render cost.

There are two structural moves that fix this, and they are mirror images of each other.

Move one, push state down: extract the state and the only node that reads it into a small child, so the state no longer lives in the component that renders `ExpensiveTree`.

```tsx
function ColorInput() {
  const [color, setColor] = useState("#663399");
  return (
    <input value={color} style={{ color }} onChange={(e) => setColor(e.target.value)} />
  );
}

function Page() {
  return (
    <div>
      <ColorInput />
      <ExpensiveTree />
    </div>
  );
}
```

Now `Page` has no state, so it never re-renders on keystroke; only `ColorInput` does. But sometimes the state has to stay high because a wrapper needs it (the `style={{ color }}` on the outer `div`, say). Then use move two, pass the expensive tree as children:

```tsx
function ColorWrapper({ children }) {
  const [color, setColor] = useState("#663399");
  return (
    <div style={{ color }}>
      <input value={color} onChange={(e) => setColor(e.target.value)} />
      {children}
    </div>
  );
}

function Page() {
  return (
    <ColorWrapper>
      <ExpensiveTree /> {/* created by Page, which never re-renders */}
    </ColorWrapper>
  );
}
```

The mechanism: `children` is a prop, and it is created by `Page`, not by `ColorWrapper`. When `ColorWrapper` re-renders on keystroke, it reuses the SAME `children` element it was handed, because `Page` never re-ran. React compares the old and new element, sees the identical reference, and bails out of that subtree. No `memo`, no comparison you wrote, no stale-closure risk.

Interview nuance: this is not a niche trick, it is how `React.memo`-free performance is usually achieved in real codebases. `memo` compares props to decide whether to skip; composition arranges the tree so the reference simply never changes, which is strictly cheaper because there is nothing to compare. When an interviewer asks you to "fix this re-render," reaching for composition before `memo` signals that you understand what actually causes the render.

Recap: an expensive subtree re-renders because the component that owns volatile state re-creates it; move the state down into a small child, or lift the expensive tree up and pass it as `children` so a non-re-rendering parent keeps its reference stable and React skips it for free.

#### See it live

**Demo (react-demo):** a color-picker input driving fast state next to an `ExpensiveTree`, shown in two variants: version A keeps the state in the parent that renders the tree, version B passes the tree in as `children`.

Widget: two side-by-side panels, A and B, each with a color input at the top and an `ExpensiveTree` card below it. Every `ExpensiveTree` carries a render-count badge that increments and flashes for 400ms whenever the tree actually renders. The learner types into either color input. In panel A, the state lives in the component that also renders the tree, so every keystroke flashes the badge and bumps the count. In panel B, the identical tree is passed as `children` from a parent that holds no state, so the same typing leaves the badge dark and the count frozen. A small "renders" counter under each panel makes the contrast a single number.

```tsx
function ExpensiveTree() {
  renderCountRef.current += 1; // badge reads this and flashes
  // pretend this subtree is large and slow
  return <div className="tree">expensive… (renders: {renderCountRef.current})</div>;
}

// A) state in the parent that renders the tree
function PanelA() {
  const [color, setColor] = useState("#663399");
  return (
    <div style={{ color }}>
      <input value={color} onChange={(e) => setColor(e.target.value)} />
      <ExpensiveTree /> {/* re-created every keystroke */}
    </div>
  );
}

// B) tree passed as children from a stateless parent
function ColorWrapper({ children }) {
  const [color, setColor] = useState("#663399");
  return (
    <div style={{ color }}>
      <input value={color} onChange={(e) => setColor(e.target.value)} />
      {children}
    </div>
  );
}
function PanelB() {
  return (
    <ColorWrapper>
      <ExpensiveTree /> {/* created by PanelB, which never re-renders */}
    </ColorWrapper>
  );
}
```

**Watch:** typing into panel A flashes the `ExpensiveTree` badge and climbs its render count on every keystroke, because `PanelA` re-runs and re-creates the tree element each time. Typing into panel B leaves the badge dark and the count at 1, because `PanelB` never re-renders, so `ColorWrapper` receives and reuses the exact same `children` reference and React bails out of that subtree. This is a genuine runtime behavior, not an approximation: same component, same state, different tree shape, no `React.memo` anywhere.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Fix the re-render WITHOUT using `React.memo`: this component owns fast-changing input state and renders an `<ExpensiveTree />` inline, so the tree re-renders on every keystroke. Rewrite it using composition (either push the state into a small child, or pass the expensive tree as `children`) and explain why the tree stops re-rendering.

```tsx
function Page() {
  const [query, setQuery] = useState("");
  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ExpensiveTree />
    </div>
  );
}
```

**Think about:**
- Why is a child passed as `children` referentially stable?
- What are the two structural moves?
- Why prefer this over `memo`?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

The tree re-renders because `Page` owns `query`, so each keystroke re-runs `Page`'s body, which re-creates the `<ExpensiveTree />` element. `ExpensiveTree` never reads `query`, yet it sits inside the render output of the component that changes on every keystroke.

The cleanest fix here is to push the state down, since nothing above the input needs `query`:

```tsx
function SearchInput() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}

function Page() {
  return (
    <div>
      <SearchInput />
      <ExpensiveTree />
    </div>
  );
}
```

If a wrapper genuinely needed `query`, the second move applies instead: lift the expensive tree up and pass it as `children`.

```tsx
function SearchLayout({ children }) {
  const [query, setQuery] = useState("");
  return (
    <div data-query={query}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {children}
    </div>
  );
}

function Page() {
  return (
    <SearchLayout>
      <ExpensiveTree />
    </SearchLayout>
  );
}
```

Mechanism: `children` is an element created by the parent (`Page`) and handed down as a prop. When `SearchLayout` re-renders on keystroke, `Page` has not re-run, so the `children` prop is the exact same object reference as last render. React reconciles the subtree, sees `Object.is(prevChild, nextChild)` is true, and bails out without rendering it. In the push-down version there is not even a re-render to bail out of, because `Page` holds no state.

How to spot it in review: a component that owns volatile state (an input value, a hover flag, a mouse position) and renders a visibly heavy sibling inline in the same JSX. The state and the heavy thing are in the same body but do not depend on each other.

Production symptom: a large tree (a chart, a table, a canvas) re-rendering on every keystroke of an unrelated input in the same component, showing up in the Profiler as the heavy subtree committing on each character and as visible input lag.

Common misconception: that `React.memo` is the first tool to reach for. `memo` still runs a prop compare on every parent render and only pays off when props are stable. Composition removes the re-render entirely by changing where state lives or who creates the element, so there is nothing to compare and nothing to skip.

**Self-check rubric:**
- [ ] Identified that `Page` owning the state is what re-creates the tree.
- [ ] Applied one of the two moves (push state down OR pass tree as `children`).
- [ ] Explained that `children` keeps the same reference because the parent did not re-run.
- [ ] Stated React bails out on the identical element reference (or that push-down avoids the render entirely).
- [ ] Said why composition is preferable to `React.memo` here (no compare, no wrapping).

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Live dashboard with a ticking clock." A `<Dashboard>` shows a header clock that updates once per second via `setInterval` setting `now` state, and below it a heavy `<AnalyticsGrid />` and `<MapView />` that both re-render every second even though neither reads `now`. The team is about to wrap both in `React.memo`. Restructure with composition so the per-second update touches only the clock, and say why `memo` would have been the more fragile choice.

**Model answer (revealed on demand):**

The `now` state lives in `Dashboard`, so the once-per-second `setNow` re-renders `Dashboard` and re-creates every child element it returns, including `AnalyticsGrid` and `MapView`. The fix is to isolate the ticking state in a leaf and pass the heavy panels as `children` of a stateless container.

```tsx
function Clock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <time>{new Date(now).toLocaleTimeString()}</time>;
}

function Dashboard({ children }) {
  return (
    <div>
      <header><Clock /></header>
      {children}
    </div>
  );
}

function App() {
  return (
    <Dashboard>
      <AnalyticsGrid />
      <MapView />
    </Dashboard>
  );
}
```

Mechanism: the interval now lives inside `Clock`, so `setNow` re-renders only `Clock`. `Dashboard` is stateless and never re-runs, so the `children` reference it holds (the `AnalyticsGrid` and `MapView` elements created by `App`) stays identical every second, and React skips both subtrees. The per-second work drops from "the whole dashboard commits" to "one `<time>` node commits."

Why `memo` is more fragile: wrapping `AnalyticsGrid` and `MapView` in `React.memo` only works while every prop they receive stays referentially stable. The day someone passes `filters={{...}}` or `onSelect={() => ...}` inline, the memo silently starts failing and the per-second re-render returns, with no error to catch it. Composition has no such failure mode: the panels are stable because nothing re-creates them, regardless of what props they take. How to spot it in review: any `setInterval`/`setState` or high-frequency source (mouse, scroll, WebSocket tick) held in a component that also renders heavy, unrelated children. Production symptom: steady CPU burn and dropped frames that profile as the entire dashboard committing on a fixed timer, worst on low-end devices where the heavy panels dominate each tick.

### ajr-l8-state-colocation: State colocation vs lifting state too high

- **id:** `ajr-l8-state-colocation`  ·  **difficulty:** medium  ·  **est:** 10 min  ·  **demo:** react-demo  ·  **skills:** react, colocation, performance

#### Learn

The advice "lift state up" is real, but it is a floor, not a target. State should live at the lowest common ancestor of the components that actually read it, and no higher. The reason is mechanical: when state changes, React re-renders the component that owns it and, by default, its entire subtree. So the component you choose to hold a piece of state defines the render blast radius. Put search state at the top of an app that has one consumer three levels down, and every keystroke re-renders the whole app to update one panel.

Here is the over-lifted version:

```tsx
function App() {
  const [search, setSearch] = useState("");
  return (
    <Dashboard>
      <Sidebar />
      <Metrics />
      <Chart />
      <Activity />
      <Notes />
      <SearchBar value={search} onChange={setSearch} />
      <Results query={search} /> {/* the ONLY consumer of search */}
    </Dashboard>
  );
}
```

`search` is read by exactly one panel, `Results`, plus the `SearchBar` that sets it. But it is owned by `App`, so every keystroke re-renders `App` and its whole subtree: `Sidebar`, `Metrics`, `Chart`, `Activity`, `Notes`, all of them, on every character typed into the search box. Six panels re-render to update one.

The fix is colocation: move the state down to the lowest component that still contains every consumer. `SearchBar` and `Results` are the only consumers, so their lowest common ancestor is a small `SearchPanel` that wraps just those two:

```tsx
function SearchPanel() {
  const [search, setSearch] = useState("");
  return (
    <>
      <SearchBar value={search} onChange={setSearch} />
      <Results query={search} />
    </>
  );
}

function App() {
  return (
    <Dashboard>
      <Sidebar />
      <Metrics />
      <Chart />
      <Activity />
      <Notes />
      <SearchPanel />
    </Dashboard>
  );
}
```

Now typing re-renders only `SearchPanel` and its two children. `App` has no `search` state, so `Sidebar`, `Metrics`, `Chart`, `Activity`, and `Notes` are untouched by keystrokes. The blast radius shrank from the whole dashboard to two panels, and you wrote zero `memo`, zero `useCallback`. You just moved a `useState` call down the tree.

Interview nuance: colocation is the same mechanism as the composition fix in the previous lesson, viewed from the state side instead of the tree side. Both answer the question "which components re-render when this changes?" with "the subtree under whoever owns the state." That is the single most useful mental model for React performance: find the owner, and you have found the blast radius.

There is a real over-colocation risk, so this is not "always push state as low as possible." If two sibling panels both need the value, the state must live at their common ancestor; pushing it into one sibling forces awkward prop-drilling or duplicate state that drifts out of sync. And genuinely global state (the logged-in user, the theme) legitimately lives high because its consumers are everywhere. The rule is precise: the lowest common ancestor of the actual consumers, not the lowest component in the tree.

Recap: the render blast radius equals the subtree under the component that owns the state, so colocate each piece of state at the lowest common ancestor of its real consumers, low enough to shrink the radius but not so low that shared consumers are split.

#### See it live

**Demo (react-demo):** a dashboard of six badged panels with the search state first held at `App` level, then moved into a `Results` panel, toggled by a switch.

Widget: a search input at the top of a grid of six panels (`Sidebar`, `Metrics`, `Chart`, `Activity`, `Notes`, `Results`), each panel carrying a render-count badge that flashes for 400ms when that panel renders. A toggle labeled "colocate search state" flips between two wirings: OFF holds `search` in `App` (the parent of all six panels); ON moves `search` into a `SearchPanel` that wraps only the search input and `Results`. The learner types into the search box. With colocation OFF, every keystroke flashes all six badges. With colocation ON, the same typing flashes only the `Results` badge; the other five stay dark.

```tsx
// OFF: search lives at App, so all six panels are in the blast radius
function App() {
  const [search, setSearch] = useState("");
  return (
    <Grid>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <Sidebar /><Metrics /><Chart /><Activity /><Notes />
      <Results query={search} /> {/* only real consumer */}
    </Grid>
  );
}

// ON: search colocated with its only consumers
function SearchPanel() {
  const [search, setSearch] = useState("");
  return (
    <>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <Results query={search} />
    </>
  );
}
function App() {
  return (
    <Grid>
      <Sidebar /><Metrics /><Chart /><Activity /><Notes />
      <SearchPanel />
    </Grid>
  );
}
```

**Watch:** with "colocate search state" off, one keystroke flashes all six panel badges at once, proving that state owned by `App` puts the whole dashboard in the render blast radius even though five panels ignore `search`. Flip the toggle on and the same keystroke flashes only the `Results` badge, proving the radius now equals the subtree under `SearchPanel`. This is real runtime behavior: the only thing that changed is which component calls `useState`.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Move the App-level `search` state, which is consumed by only one panel, down so that only the search results re-render on keystroke. Rewrite the tree, then explain what determines the render blast radius and how you chose the new home for the state.

```tsx
function App() {
  const [search, setSearch] = useState("");
  return (
    <Layout>
      <NavBar />
      <StatsRow />
      <SearchBox value={search} onChange={setSearch} />
      <SearchResults query={search} />
      <Footer />
    </Layout>
  );
}
```

**Think about:**
- What determines the render blast radius?
- How low should state live?
- What is the over-colocation risk?

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**

`search` is read only by `SearchBox` (which sets it) and `SearchResults` (which reads it), but it is owned by `App`, so every keystroke re-renders `App` and its whole subtree: `NavBar`, `StatsRow`, and `Footer` re-render for nothing. Colocate the state at the lowest common ancestor of its two real consumers by extracting a small `Search` component that wraps just those two.

```tsx
function Search() {
  const [search, setSearch] = useState("");
  return (
    <>
      <SearchBox value={search} onChange={setSearch} />
      <SearchResults query={search} />
    </>
  );
}

function App() {
  return (
    <Layout>
      <NavBar />
      <StatsRow />
      <Search />
      <Footer />
    </Layout>
  );
}
```

Mechanism: React re-renders the component that owns changed state plus its subtree, so the owner defines the blast radius. With `search` in `App`, the radius is the entire app. With `search` in `Search`, the radius is just `SearchBox` and `SearchResults`. Nothing else in the tree can see the change, so React never even visits `NavBar`, `StatsRow`, or `Footer` on keystroke.

How low should it live: at the lowest common ancestor of the components that actually read it. Here both consumers are siblings, so the lowest common ancestor is a thin wrapper around exactly those two.

How to spot it in review: a top-level `useState` whose value is threaded through props to a single deep leaf (or two adjacent leaves), while many unrelated siblings sit under the same owner. The tell is a wide component owning state that only a narrow slice of its children consume.

Production symptom: an entire page or dashboard re-rendering on one input keystroke, visible as input lag and as the Profiler showing every panel committing per character. After colocation the commit count per keystroke drops from "all panels" to "the search subtree."

Common misconception: that "lift state up" is always right. Lifting is only required up to the lowest common ancestor of the consumers; lifting past that point needlessly widens the blast radius. The mirror mistake is over-colocation: if a second sibling also needed `search`, pushing it into one sibling would force prop-drilling or duplicate, drift-prone state, so the state would have to stay at the shared ancestor.

**Self-check rubric:**
- [ ] Identified `search` has exactly one (or two adjacent) consumers.
- [ ] Extracted a component at the lowest common ancestor of those consumers.
- [ ] Stated the blast radius equals the subtree under the state's owner.
- [ ] Named the symptom: the whole page re-renders on one keystroke.
- [ ] Noted the over-colocation risk (shared consumers must keep state at the common ancestor).

#### Practice: real-world variant (save, then reveal)

**Prompt:** "Filter bar over a 500-row virtualized table." A `<ReportsPage>` owns `filters` state (text, date range, status) plus `sortColumn`, and it renders a `FilterBar`, a `Toolbar`, an `ExportButton`, a `Legend`, and the heavy `VirtualTable`. Every keystroke in the filter text re-renders all of them, including `ExportButton` and `Legend` that read none of it, and users report typing lag. Redesign the state ownership so filter typing re-renders only what depends on filters, and explain why colocation beats memoizing the five siblings.

**Model answer (revealed on demand):**

Everything re-renders because `ReportsPage` owns both `filters` and `sortColumn`, so any keystroke re-renders the whole page subtree. The real consumers of `filters` are the `FilterBar` (sets them) and the `VirtualTable` (reads them to filter rows); `sortColumn` is consumed by the table and its header. `Toolbar`, `ExportButton`, and `Legend` read none of it. Colocate the query state at the lowest ancestor that contains the filter bar and the table.

```tsx
function ReportView() {
  const [filters, setFilters] = useState(initialFilters);
  const [sortColumn, setSortColumn] = useState("date");
  return (
    <>
      <FilterBar filters={filters} onChange={setFilters} />
      <VirtualTable filters={filters} sortColumn={sortColumn} onSort={setSortColumn} />
    </>
  );
}

function ReportsPage() {
  return (
    <Layout>
      <Toolbar />
      <Legend />
      <ReportView />
      <ExportButton />
    </Layout>
  );
}
```

Mechanism: with the query state moved into `ReportView`, a filter keystroke re-renders only `ReportView` and its two children, so `Toolbar`, `Legend`, and `ExportButton` never enter the blast radius. The virtualized table already limits DOM work to visible rows, but before colocation it was still re-invoking on every keystroke together with the unrelated panels; now the only components React visits per keystroke are the filter bar and the table that actually consumes the filters.

Why colocation beats memoizing the five siblings: wrapping `Toolbar`, `ExportButton`, and `Legend` in `React.memo` is five wrappers, five prop-compare costs per render, and five silent failure modes the first time someone passes an inline object or callback into any of them. Colocation removes the re-render at its source with one structural move, so there is nothing to compare and nothing to keep stable. How to spot it in review: a page-level component owning several unrelated state slices (`filters`, `sortColumn`, plus maybe `selectedRow`) while most of its children read none of them. Production symptom: filter typing lag and dropped frames on a page whose Profiler shows every panel committing per keystroke, worst when a heavy table shares the owner. If `ExportButton` genuinely needed `filters` too, it would move under `ReportView` as well, because the correct home is always the lowest common ancestor of the real consumers, not the lowest component available.
