# Outreach Email: Prof. Q. Vera Liao (UMich CSE)

To: veraliao@umich.edu
From: Nikayel Jamal
Purpose: RA inquiry, anchored on her NSF "Augmenting Self-Regulated Learning Through Human-AI Co-Regulation" project.

## 1. Subject line (pick one)

1. `[RA inquiry] Shipped open learner model: inspect, challenge, correct`
2. `[RA inquiry] UMSI master's student with a deployed co-regulation testbed`

Option 1 leads with the artifact and mirrors her grant's own language. Option 2 leads with the logistics and is the safer choice if the cross-school question is likely to be her first thought.

## 2. The email

> Dear Professor Liao,
>
> I am Nikayel Jamal, an incoming master's student at the School of Information, and I build and run CodeSparring, an AI coding-interview practice platform.
>
> Your NSF co-regulation project describes systems that let students inspect, challenge, and correct what the AI thinks they know. I shipped that pattern in July and it is live at [DEMO URL]. Learners see the system's belief about each problem, the evidence behind it, and the model's own past prediction errors, and they can dispute a belief with a structured reason.
>
> The correction is not a self-report. A dispute replays the learner's last review through FSRS from the stored pre-review card state with the rating corrected, then pulls a verification review to the next day, so the disagreement is settled by evidence rather than by either party. A masked black-box control condition and an event-logging harness are in place, though no study has been run.
>
> I would like to talk about RA work in your group, either on the co-regulation project or on appropriate reliance on AI-generated feedback, which this platform is a natural field site for. I am in UMSI rather than CSE, so I am flexible on the arrangement: a funded RA position, independent study credit, or volunteering to start.
>
> Two representative works: the live system at [DEMO URL], and a two-page design write-up of the inspect, challenge, and correct decisions at [WRITE-UP LINK].
>
> Thank you for your time.
>
> Nikayel Jamal
> [phone] · [personal email or umich.edu address]

Word count of the email body, greeting through signature block, excluding the bracketed placeholders: 234 words.

## 3. What to attach or link

- **Live demo, [DEMO URL], deep-linked to the `/knowledge` page.** The single highest-value click. It proves the system exists and is running, not planned. Send her to a page where the beliefs, evidence, and the "This seems wrong" affordance are all visible without a signup wall, or provide a demo account.
- **The design write-up (`OPEN-LEARNER-MODEL-DESIGN-WRITEUP.md`, hosted as a PDF or a public doc at [WRITE-UP LINK]).** This is the piece that reads as researcher rather than builder: it states the design rationale, the rejected alternatives, six open questions, and the limitations honestly. It is the closest thing to a research statement she will get in a first email.
- **Optional third link only if she replies: [GitHub link] or a short screen recording.** Do not put three links in the first email. Code is only persuasive after she cares.

## 4. Follow-up plan

- **Send timing.** Avoid the two weeks before any CHI 2026 deadline she is administering as Papers Co-Chair. If a deadline falls inside that window, either send well before it or wait until roughly ten days after, when chair traffic drops.
- **First follow-up: 12 to 14 days of silence.** Reply in the same thread so she has the original context. One paragraph, no new attachments:

> Following up briefly on the note below. I know this is a heavy stretch of the CHI cycle. The open learner model is still live at [DEMO URL] if it is useful to look at, and I am happy to wait until after the deadline. If RA slots are not open, I would also welcome a pointer to whether sitting in on your course or a reading group would be the better path.

- **Second and final follow-up: 4 to 5 weeks after the first**, only if something genuinely new exists, for example a study protocol, a first cohort of challenge data, or a new artifact. Do not send a third. Silence after two follow-ups is an answer.
- **Parallel path.** Her group has a postdoc and four PhD students. If she does not reply, a short note to a PhD student whose work touches learning or reliance is a legitimate and lower-cost route to a conversation.

## 5. Two things to verify before sending

1. **Read the U-M CSE story on the NSF grant directly** at `cse.engin.umich.edu/stories/750k-nsf-funding-for-transparent-ai-learning-tools`. The "inspect, challenge, and correct what the AI thinks they know" phrasing was corroborated across two search retrievals but the page returned a 403 to automated fetch, so it has not been read first-hand. The email leans on that phrasing. Confirm the exact wording, and if it differs, paraphrase rather than echo it. While there, note the award number and collaborators so a reply can be specific.
2. **Confirm the CSE 594 (Human-AI Interaction and Systems) teaching claim** in the U-M course guide before mentioning any course, in the email or in a follow-up. The report that she taught it in fall 2025 is unverified. Do not write "I would like to take your course" until the course, the term, and the instructor of record are confirmed. The same caution applies to the School of Social Work "Grand Rounds with Vera Liao" event, whose identity is unconfirmed: do not reference it at all.

Also worth a check, though lower risk: confirm her current title and department line from the EECS directory so the greeting and any mention of her department is right.

## 6. What NOT to claim

- **No controlled study has been run.** The masked black-box control condition and the event-logging harness exist, and that is all. Say "built for a study" and never "results show." Any hint of an evaluated learning effect is unsupported and would be caught immediately.
- **The users are self-directed interview preparers, not enrolled students.** Her grant targets a real course environment. Present CodeSparring as a complementary field site and a donor of design patterns, not as a substitute for the course deployment. Flagging this mismatch proactively is more credible than letting her find it.
- **The FSRS versus SM-2 A/B is infrastructure, not a shared research question.** Spaced-repetition efficacy sits in AIED and learning science, not in her thread. Mention it only as evidence that the platform can run randomized assignment cleanly, and only if she asks.
- **There is no fairness instrumentation on the platform.** Do not invoke FAccT, bias, or equity framing to seem aligned with her Microsoft FATE background. The platform collects nothing that would support that claim.
- **Do not overstate the scope of the model's beliefs.** They are memory-based FSRS estimates over one domain family, and they conflate retention with understanding. The write-up already concedes this, so the email must not imply anything broader.
