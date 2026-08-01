# Vera Liao RA Pitch Brief (researched 2026-07-31)

Audience: Nikayel, incoming UMSI master's student, pitching to RA for Vera Liao using CodeSparring's open learner model as the instrument.

## 1. Affiliation — CONFIRMED at UMich, but NOT UMSI (correct the premise)

**Q. Vera Liao is an Associate Professor in Computer Science & Engineering (CSE/EECS) at the University of Michigan — not the School of Information.** She joined U-M in fall 2025 after ~8 years at Microsoft Research FATE (Principal Researcher). Her homepage, her group's postdoc ad, and directory pages all say CSE/EECS; no UMSI appointment or courtesy affiliation was found anywhere.

This does not kill the RA plan (UMSI master's students can and do RA for CSE faculty, and her postdoc ad explicitly welcomes information-science backgrounds), but the pitch must not assume she is UMSI faculty, and should acknowledge the cross-school arrangement (offer volunteer/independent-study entry if funding logistics are hard).

- Homepage: qveraliao.com ("lab website coming soon!"); group has 4 PhD students (Yubin Choi, Ishika Joshi, Lindy Le, Nina Lei) + postdoc Yoonjoo Lee (ex-KAIST, human-centered AI).
- Office: 3624 Beyster Building (CSE).
- Unverified: a "Grand Rounds with Vera Liao" event at UMich School of Social Work (2026-03-11) appears in search results (page 403'd; identity unconfirmed).

## 2. Research threads 2023–2026 (homepage + Google Scholar: 17.3K citations, h-index 59)

**A — AI transparency & human-centered XAI (her signature):**
- *Questioning the AI: Informing Design Practices for Explainable AI User Experiences* (CHI 2020, HM) — the question-driven XAI method / XAI Question Bank.
- *AI Transparency in the Age of LLMs: A Human-Centered Research Roadmap* (Harvard Data Science Review, w/ Jenn Wortman Vaughan) — agenda-setting: transparency = what stakeholders need to achieve goals, not model internals.

**B — Appropriate reliance / trust calibration on LLMs (most active current thread):**
- *Fostering Appropriate Reliance on Large Language Models* (CHI 2025, Best Paper HM, ~132 cites).
- *"I'm Not Sure, But...": Impact of LLMs' Uncertainty Expression* (FAccT 2024) — first-person uncertainty language reduces over-reliance.
- *As Confidence Aligns: Effect of AI Confidence on Human Self-Confidence* (CHI 2025, Best Paper HM).
- *Offloading Score: Measuring AI Reliance Through Counterfactual Workflows* (2026).
- Just won a **U-M MIDAS PODS seed grant on "appropriate reliance on GenAI"**.

**C — Uncertainty communication in CODE:**
- *Generation Probabilities Are Not Enough: Uncertainty Highlighting in AI Code Completions* (~119 cites) — uncertainty affordances specifically in a programming context.

**D — Human-centered evaluation of LLM systems:**
- *Results-Actionability Gap: How Practitioners Evaluate LLM Products in the Wild* (CHI 2026).
- *Rethinking Model Evaluation as Narrowing the Socio-Technical Gap* (position paper).

**E — Oversight, mental models, control:**
- *From Use to Oversight: How Mental Models Influence User Behavior and Output in AI Writing Assistants* (CHI 2026); Dagstuhl workshop on human oversight; CHI 2026 Papers Co-Chair; AE at ACM TOCHI.

**F — NEW and decisive: AI + learning.**
- **NSF grant: "Augmenting Self-Regulated Learning Through Human-AI Co-Regulation" — $750K across 3 universities ($237.5K at U-M), 3 years**, with education + NLP collaborators at University of South Alabama and UC Santa Barbara. The U-M CSE story describes her lab building systems that let students **"inspect, challenge, and correct what the AI thinks they know"** — generating targeted practice while giving students visibility and control — with a goal of a working system **tested in a real course environment plus open-source tools and design patterns**. (CSE page 403'd on direct fetch; wording corroborated across two independent search retrievals — read the story directly to confirm: cse.engin.umich.edu/stories/750k-nsf-funding-for-transparent-ai-learning-tools)
- Also 2026: *Learning by Chatting? Impact of Generative AI on Information Seeking and Learning*.

## 3. What she looks for (postdoc ad, qveraliao.com/postdoc.pdf — best available proxy)

Topics she funds: mitigating GenAI risks; AI transparency (explainability, uncertainty) for appropriate trust, mental models, control, oversight, learning, decision-making; human-centered/sociotechnical evaluation of LLMs; RAI tooling. Values publication track record (CHI/CSCW/TOCHI/UIST/FAccT/AIES), interdisciplinary collaboration; asks for a research statement + **two representative works demonstrating match**.

**Contact convention: veraliao@umich.edu with a bracketed subject tag** (e.g. "[RA inquiry]"). No master's-RA or office-hours page yet (lab site pending) — a direct, concise email with a live demo link is the right channel. She is CHI 2026 Papers Co-Chair: expect slow replies near CHI deadlines.

## 4. RA fit angles, ranked

1. **(Strongest — near-verbatim match) The NSF Human-AI Co-Regulation grant.** Her funded project is literally "systems that let students inspect, challenge, and correct what the AI thinks they know." CodeSparring's /knowledge open learner model is a shipped, deployed instantiation of that exact design pattern, with real users, backed by FSRS. The grant needs a working system tested in a real learning environment and open-source design patterns — Nikayel offers a running testbed plus firsthand builder knowledge of the design gotchas (how learners react to challenging the model, correction UX, what state to expose). Lead with this.
2. **Appropriate reliance on AI feedback/scoring.** Her MIDAS seed grant + CHI 2025/FAccT 2024 reliance work needs realistic decision contexts. CodeSparring's AI interview scores are exactly a setting where learners over-rely (accepting a wrong score) or under-rely (dismissing valid feedback); transparency affordances + score provenance make it a natural field platform — and it's the coding domain, matching her uncertainty-in-code-completions work.
3. **Human-centered evaluation of LLM products.** Nikayel is a practitioner who evaluates an LLM product in the wild (multi-path scoring, model migrations, A/B infra, WCSR north star) — a credible case-study angle for the Results-Actionability Gap thread, though it positions him more as informant than co-researcher.

**Stretch/weak angles (be honest):**
- FSRS vs SM-2 A/B efficacy is NOT her topic (that's AIED/learning science). Pitch it as *experimentation infrastructure proving the platform can run randomized studies*, not a shared research question.
- No fairness instrumentation on the platform — don't claim the FAccT/fairness angle.
- Population mismatch to flag proactively: her NSF grant targets a real course environment; CodeSparring users are self-directed interview-preppers. Frame the platform as a complementary field site / design-pattern donor, not a substitute for the course deployment.
- She's CSE, not UMSI — acknowledge the cross-school arrangement up front.

## 5. Suggested pitch framing (adapt)

> "I'm an incoming UMSI master's student, and I've independently built and deployed what your NSF Human-AI Co-Regulation project describes: an open learner model where learners inspect, challenge, and correct the AI's model of their knowledge, live at [URL] on my AI interview-practice platform CodeSparring, with FSRS-backed knowledge tracking and A/B experiment infrastructure already running. Building it surfaced concrete design questions your work frames — when learners contest the model, how corrections should propagate, and how AI-generated scores earn appropriate reliance — and I'd like to work on them rigorously as your RA. I can contribute both as an engineer (a deployable study platform and open-source design patterns for the grant) and as a study designer on reliance and transparency questions. Two representative artifacts: [the /knowledge feature demo] and [a short write-up of the correction-propagation design decisions]."

## 6. Action checklist

- [ ] Read the CSE NSF-grant story directly and confirm wording (page 403'd for automated fetch).
- [ ] Confirm CSE 594 (Human-AI Interaction and Systems) in the U-M course guide — reportedly taught fall 2025 (UNVERIFIED); cross-registering/attending is a strong entry point.
- [ ] Prepare the two representative artifacts: /knowledge demo path + a 1-2 page design write-up of inspect/challenge/correct decisions.
- [ ] Email veraliao@umich.edu, subject "[RA inquiry] ..." — concise, demo link, cross-school logistics addressed.
- [ ] Optional: look up the NSF award on nsf.gov by title for the award number and abstract.

## Sources

- http://qveraliao.com/ (affiliation, students, news, publications)
- http://qveraliao.com/postdoc.pdf (email convention, qualifications, topics)
- https://scholar.google.com/citations?user=bbe_MZEAAAAJ
- https://cse.engin.umich.edu/stories/750k-nsf-funding-for-transparent-ai-learning-tools (403'd direct; corroborated twice via search)
- https://cse.engin.umich.edu/stories/cse-welcomes-new-faculty-of-2025-26 (403'd direct)
- https://eecs.engin.umich.edu/people/liao-qingzi/ · https://midas.umich.edu/directory/vera-liao/ (403'd direct; titles via search)
- https://ssw.umich.edu/about/news-events-stories/events/2026-03-11/65997-grand-rounds-vera-liao (unverified)

Unverified items: CSE 594 teaching claim; SSW Grand Rounds identity; exact NSF award number.
