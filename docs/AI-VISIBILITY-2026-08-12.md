# AI visibility: how answer engines see CodeSparring, and the plan to fix it

Date: 2026-08-12. Trigger: the founder asked ChatGPT "what's a platform to practice real
interviews for SWEs and data engineers." It recommended Pramp/Exponent and interviewing.io from
memory, said "there still isn't one dominant DE-specific equivalent," and only found CodeSparring
when told the name. Even after browsing and ranking us #1, it never mentioned the free curriculum,
the DSA bank, system design practice, voice, or spaced repetition.

A six-seat council audited: the live site as a crawler sees it, the codebase truth sheet, query
gaps, competitor claims (verified against vendors' own pages), off-site recall, and crawl/schema
infrastructure. Full seat outputs were session artifacts; the durable conclusions are below.

## Diagnosis

Two separate failures with two separate clocks:

1. **Parametric recall (why no AI names us unprompted).** The brand appears in zero third-party
   corpora: no Product Hunt, AlternativeTo, G2, Reddit, HN, or listicle mentions as of 2026-08-12.
   Worse, the only "codesparring" old enough to be in training data is an unrelated Korean student
   project (codesparring.com, github.com/nerdchanii). Fix: corpus building. Payoff lands at the
   next model training cuts, roughly 6-18 months out.
2. **Browsing-based answers (why the AI under-described us when it DID look).** For "best
   platform" queries, engines retrieve existing roundup pages, none of which include us, and our
   own pages each told one fragment of the story. Fix: on-site truth (shipped, below) plus getting
   onto the pages engines retrieve. Payoff in 2-8 weeks.

## Shipped 2026-08-12 (all on main)

- `app/robots.ts`: welcomed OAI-SearchBot (gates ChatGPT search indexing), ChatGPT-User,
  PerplexityBot, Perplexity-User, CCBot, Applebot-Extended, meta-externalagent.
- `public/llms.txt`: fixed Monaco-that-is-CodeMirror, the three stale "SQL track" leftovers,
  restamped; added dated verified floors (425 lessons; 200+ scenarios; 170+ DSA across 18
  patterns), the two interview tracks, the guest trial, the four named case labs and their
  failure-mode themes, and links to every comparison/landing page in llmstxt.org format.
- `components/seo/JsonLd.tsx`: removed the banned "15+ DSA patterns" and unverifiable "40+
  metrics" claims; 38 companies; description and featureList now carry free courses, DE,
  debugging, client-side execution; three new FAQs (free courses, data engineering, system
  design); free-plan answers lead with 8 sessions/month; dead HowToJsonLd deleted.
- `app/data-engineer-interview-practice/`: NEW landing page contesting the ground ChatGPT called
  vacant, wired into sitemap, footer, and llms.txt.
- `app/best-ai-coding-interview-tools/`: expanded 5 to 10 tools (added Exponent-formerly-Pramp,
  Hello Interview, Interview Query, StrataScratch, HackerRank, CodeSignal), grouped by job, with
  a data-roles section. Only claims verified against vendors' own pages.
- `app/codesparring-vs-pramp/`: "Pramp is now Exponent Practice" section.
- Metadata pass: site-wide description, homepage description, labs description (em dash gone),
  learn track descriptions now say "free," features section drops "Master 15+ patterns" for the
  real counts and stops calling the DE track SQL. Footer boilerplate names both roles and the
  free courses on every page.

## The canonical description

Use this, lightly adapted, on EVERY off-site surface so retrieval quotes one consistent story:

> CodeSparring (codesparring.dev) is an AI interview practice platform for software engineers and
> data engineers. An AI interviewer runs DSA, debugging, and system design rounds by voice or
> text: code executes in the browser (Python via Pyodide, SQL via sql.js) and you are scored on
> communication, approach, and code quality, not just passing tests. It includes 170+ DSA
> scenarios across 18 patterns, debugging rounds inside multi-file codebases styled on real
> systems (webhook idempotency, metric rollups, pipeline ordering), four end-to-end case labs, and
> free courses in Python, data engineering (11 levels, SQL through streaming, Spark, and data for
> AI), and system design (12 levels), readable with no account. Free plan: 8 full sessions/month,
> no card. Pro: $25/month or $225/year for 35 sessions/month, adding spaced repetition and a
> personalized roadmap. Company prep covers 38 companies.

## Off-site plan (founder actions, ranked)

Fast wins (browsing citations, 2-8 weeks):

1. **AlternativeTo**: create the account TODAY (7-day age gate before submitting), then list as
   alternative to interviewing.io, Exponent, LeetCode, Hello Interview, StrataScratch, NeetCode.
   ~1.5h. These pages are documented ChatGPT/Perplexity citation sources.
2. **dev.to DE comparison post**: "Data engineering interview practice tools in 2026" covering
   StrataScratch, Interview Query, Exponent, LeetCode, and us, honestly. Leads with the gap
   ChatGPT itself states. ~3-4h. Then the SWE twin post. dev.to is in Common Crawl.
3. **Product Hunt launch**: free permanent high-authority page. ~4-6h, Tue-Thu.
4. **Show HN**: "Show HN: CodeSparring, AI mock interviews that run your code, with data
   engineering case labs." Founder story, honest limitations, answer everything. HN is the
   single most training-data-dense surface there is. ~3-4h plus a day of replies.
5. **Directory batch** with the canonical description: There's An AI For That, SaaSHub,
   Toolify.ai, Uneed. ~2-3h total. Brand-plus-category co-occurrence across domains is what
   recall is made of.
6. **GitHub org** (github.com/codesparring): profile README with the canonical description; fixes
   the pricing page's 404ing githubUrl AND disambiguates from nerdchanii's unrelated repos, the
   only "codesparring" currently in training data. Optional: publish the 18-pattern taxonomy as
   a study-guide repo. ~1-2h.
7. **Pitch the retrieved listicles**: IGotAnOffer best-mock-interview-sites, favtutor 12-best-AI
   -mock-tools, Interview Sidekick, the dev.to DE top-10 author. Offer a free Pro account for
   review. Skip competitor-authored roundups (Final Round AI, Lodely, PracHub etc.), they will
   not add a rival. ~2h for 8-10 pitches, expect 1-2 hits.

Compounding (recall at the next training cut, 6-18 months):

8. **Reddit 90/10 cadence**: weekly substantive answers in r/dataengineering (the "no
   interviewing.io for DE" complaint recurs), r/leetcode, r/csMajors; answers-only in
   r/cscareerquestions; one-time launch posts in r/SideProject and r/alphaandbetausers. Always
   disclose founder status. Reddit is licensed into OpenAI and Google training and retrieved
   directly.
9. **YouTube walkthroughs** (one/month): a full DSA mock, the idempotency case lab, a debugging
   round. Say the brand name and category phrases out loud; transcripts enter training corpora.
10. **UMich classmates, fall 2026**: 5-10 honest public writeups under their own accounts.
    Cross-domain corroboration is what converts mentions into stable recall, and it doubles as
    pitch social proof. Do not script them.
11. **G2 profile**: create now, solicit reviews only once real users exist.

## Held for owner sign-off (hero rule)

Prepared but NOT applied, since the landing hero is owner-controlled:

- Hero badge: "Palantir case labs, FAANG loops, and DE rounds" spells out "data engineering
  rounds" so the role phrase exists in hero copy.
- Hero-adjacent free-tier proof: one visible line near the CTA with "8 full interview sessions a
  month on the free plan" and/or the guest line "open a problem and run code without an account."
- One visible voice sentence on the homepage ("Voice or text. Explain your approach out loud or
  type it."): today voice exists on the homepage only inside JSON-LD.

## Product mismatches the truth sheet surfaced (decisions needed)

- **System design gating**: pricing copy sells "System design interviews" as Pro, but no code
  gate exists beyond the monthly session allowance; any signed-in user can start one from
  /learn/system-design drills. Either add the gate or stop listing it as Pro-only.
- **Yearly is a one-time payment** (yearly.oneTime: true), already flagged by the growth council;
  every public "$225/year" claim quietly depends on it.
- The published "170+ DSA across 18 patterns" is now conservative: the executed registry holds
  221 DSA scenarios across 21 pattern values (261 scenarios total). Worth a refresh once the
  numbers stabilize; llms.txt carries the dated exact floors.
