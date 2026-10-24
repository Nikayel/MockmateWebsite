# Interviewer handoff to Sparra

In sessions with Sparra (debugging, system design, and feature work), Sable can call
`open_sparra` when a candidate asks for a code walkthrough, a sample-input trace,
or implementation guidance. Requirements, constraints, short clarifications, and
progress updates stay with Sable. Candidates can ask to continue with Sable.

A successful call produces this acknowledgment:

> I’m glad to help. Try Sparra, your AI partner, for a step-by-step walkthrough.
> I’ve opened its tab; bring your findings back here when you’re ready.

After that reply is fully revealed, the existing Sparra tab opens on desktop and
mobile, including when the problem rail is collapsed or focus mode was enabled.
The candidate’s question becomes an unsent draft if Sparra has no existing draft.
The input receives keyboard focus. Nothing is automatically sent, and existing
partner history and drafts are preserved. Escape returns to the Problem tab.

## Implementation

- `lib/interview/partner-handoff/` defines a LangChain Core tool, the capability
  guard, the client action contract, and optional LangSmith tracing.
- This is native model function calling, not a text marker or keyword classifier.
  Tool selection shares the existing interviewer generation, provider fallback,
  usage accounting, quota checks, and abort signal. A valid call runs the LangChain
  tool and returns one allowlisted UI action; it needs no second model call.
- The current Node provider layer supports OpenAI-compatible, Gemini, and Anthropic
  tool formats. Text-only callers retain their existing behavior. Tool-bearing
  requests bypass the response cache so a cached action cannot be replayed.
- The action is exposed only when the client advertises partner availability and
  the task type supports it. It is unavailable for partner turns, proactive
  check-ins, submissions, wrap-ups, and post-interview reviews. Invalid arguments,
  unknown tools, and action-looking text never trigger UI actions.
- Both JSON and validated-stream transports carry the action. The send hook waits
  for the completed response and checks the session generation before applying it.
  Paused, closed, or replaced attempts cannot receive a late handoff.
- The existing metrics path records the acknowledgment as interviewer dialogue.
  Partner assistance is recorded only when the candidate actually sends to Sparra.
  Preparing a draft does not fabricate a partner interaction or alter scoring.

## LangSmith setup

Set server environment variables in `.env.local` for local work and in Vercel for
production, then restart/redeploy:

```dotenv
LANGSMITH_API_KEY=your_key
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=codesparring-interviews
```

`LANGSMITH_ENDPOINT` supports regional or self-hosted endpoints, and
`LANGSMITH_WORKSPACE_ID` supports workspace-scoped configuration. The key alone
is insufficient: tracing must be enabled explicitly. No browser credentials or
new model-provider keys are needed.

Traces show the handoff-capable turn, nested `open_sparra` tool execution when
selected, interview phase, opaque session ID (as `thread_id`), latency, provider,
handoff decision, and measured token counts when
reported. Inputs are hidden; root outputs use an operational allowlist. Code,
transcripts, questions, names, and emails are not included. Serverless trace batches
flush using Next.js `after()`. Tracing failures must not generate another model
call or prevent the candidate’s response. Without tracing enabled, the handoff
still works normally.

Set `INTERVIEW_PARTNER_HANDOFF_ENABLED=false` to disable tool selection without
removing either chat UI. No database migration or Firestore index is required.

## Verification

```sh
pnpm exec vitest run app/api/chat/route.test.ts lib/interview/partner-handoff lib/ai/__tests__/model-tools.test.ts lib/__tests__/ai-providers-usage.test.ts
pnpm exec playwright test --config playwright.interview-review.config.ts partner-handoff.spec.ts
pnpm typecheck
pnpm lint
pnpm build
node scripts/check-feedback-edge-bundle.mjs
```

The browser suite uses the real chat-send hook and workspace UI with fixture API
responses. It covers streaming/JSON handoff, desktop/mobile, sending only after
review, draft preservation, collapsed rails, Escape/focus, and late paused replies.
It does not prove live model routing quality or that credentials can reach
LangSmith; verify those separately after configuration.

Sources: [LangChain tools](https://docs.langchain.com/oss/javascript/langchain/tools),
[LangSmith tracing configuration](https://docs.langchain.com/langsmith/trace-without-env-vars),
[serverless trace flushing](https://docs.langchain.com/langsmith/serverless-environments).

A live smoke check on 2026-10-24 used synthetic monitor code and the existing
DeepSeek chat provider. All four decisions matched: walkthrough -> handoff;
requirement question, short list-type clarification, and explicit request to stay
with Sable -> no handoff. This is a small behavioral smoke check, not a routing
quality benchmark. LangSmith delivery still requires configured credentials.
