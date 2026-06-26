# Reconciliation — AI / LLM Layer

Status: **Not started.**

## Problem

The core call path is already well-centralized — `generateAIResponse` (`lib/ai-providers.ts`) is the
single chat/feedback entry point with fallback, retry, cache, rate-limit, and usage tracking, and
most callers route through it. **Leave that alone.** The duplication is in the edges: response
post-processing, config/model tables, the Edge fork, and embedding plumbing.

## Principle

Reuse the helpers that already exist (`extractJsonObjectText`, `lib/prompts/templates.ts`,
`lib/retry.ts`). Extract runtime-agnostic pieces so the Edge fork stops re-implementing them.

## Checklist

- [ ] **One LLM JSON extractor** — **High** — canonical: `lib/ai/structured-output.ts:52`
  - [ ] `extractJsonObjectText()`/`parseStructuredJson()` already exist but the code-fence-strip +
        `/\{[\s\S]*\}/` + `JSON.parse` logic is copy-pasted ~**11×**, several character-identical:
        `ai-providers-edge.ts:192,294`, `feedback/conversation-validation.ts:182`,
        `feedback/constitutional-ai.ts:354,622`, `feedback/structured-extraction.ts:534`,
        `feedback/transcript-analysis-edge.ts:511`, `interview/response-validation.ts:68`,
        `agents/hints/llm-generator.ts:100,136`, `agents/hints/diagnosis.ts:30`, `bugfix/semantic-scorer.ts:44`.
  - [ ] Extract a dependency-free `lib/ai/json-extraction.ts` (so Edge can import it too); replace all
        inline copies. Prefer migrating Node callers to `generateStructuredAIResponse` (free schema validation).
- [ ] **Model-name registry** — **High** — extend `lib/rag/config.ts` → app-wide `lib/ai/config.ts`
  - [ ] Model id strings hardcoded: `"gemini-2.5-flash"` (`ai-providers.ts:64`, `ai-providers-edge.ts:44`,
        `gemini-cache.ts:59`), `"deepseek-chat"`, `"claude-haiku-4-5-20251001"`; embedding models repeated
        ~10× (`"text-embedding-004"`, `"text-embedding-3-small"` across `rag/config.ts`, `services/embeddings.ts`,
        `hybrid/gemini/openai-provider.ts`). Parallel lists also in `token-counter.ts:31,229`.
  - [ ] One `MODELS` set (`CHAT_MODELS`/`EMBEDDING_MODELS`); swapping a model touches one file.
- [ ] **AI cost table** — **High** — see `01-duplicated-constants-and-config.md` (defined 3×, drifting).
- [ ] **Consolidate caching subsystems** — **Med**
  - [ ] 3–4 caches: `ai-cache.ts` (response), `gemini-cache.ts` (model-instance), `request-cache.ts`
        (request dedup), `rag/embeddings/cache.ts`. **`gemini-cache.ts` appears dead** — it instantiates its
        own `GoogleGenerativeAI` client (`:19`) and `getCachedModel` has no callers (ai-providers builds its
        model fresh at `:168`). Confirm + delete, or integrate. Consolidate the 3 hash helpers
        (`gemini-cache:37`, `request-cache:128`, `ai-cache:87`).
- [ ] **Embedding-provider retry → `lib/retry.ts`** — **Med**
  - [ ] Identical retry/backoff scaffolding 3× (`rag/embeddings/gemini-provider.ts:185,266`,
        `openai-provider.ts:180`) while `retry.ts` already exports `retryAI`. ai-providers.ts:122 also has a
        4th independent retry policy. (Coordinate with the retry item in `01`.)
- [ ] **De-fork the Edge twin** — **Med** — `lib/ai-providers-edge.ts`
  - [ ] Edge file re-implements its own Gemini client (`:23,43`), model literal, JSON extraction, and a
        transcript `formatMessage`+truncation block (`:126-160`). The Edge/Node split is justified only for
        the Firebase/crypto deps — extract everything else (json-extraction, transcript formatter, prompts,
        `ConversationValidation` type) into shared modules both import.
- [ ] **One transcript formatter** — **Med** — `formatTranscriptForAI(messages, options)`
  - [ ] "map to `ROLE: content` + truncate + join" reinvented ~5× with different char budgets
        (`ai-providers-edge.ts:129`, `structured-extraction.ts:419`, `transcript-analysis.ts:525`,
        `transcript-analysis-edge.ts:459`, `conversation-validation.ts:49`).
- [ ] **Finish the prompt-template migration** — **Med** — `lib/prompts/`
  - [ ] `constitutional-ai.ts` builds ~170 + ~195 LOC of critique prompts inline despite
        `prompts/templates.ts:192,229` already exporting `scoreCritiquePrompt()`/`feedbackTextCritiquePrompt()`
        (`prompts/index.ts` itself notes the migration is unfinished). Same for `llm-complexity-analysis.ts:42`
        and `conversation-validation.ts:60`.
- [ ] **RAG thresholds → config** — **Low**
  - [ ] `minSimilarity` hardcoded in `rag/services/problems.ts` (0.3), `solutions.ts` (0.4), `hints.ts` (0.35);
        move into `rag/config.ts`.

## Verification

`pnpm test` (RAG + feedback suites) green. Confirm `gemini-cache.ts` truly has no consumers before
deleting. Snapshot a few AI responses to ensure prompt-template migration is byte-equivalent.
