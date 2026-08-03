/**
 * Data Engineering Level 11 — Data Engineering for AI.
 *
 * The closing level, and the honest one: AI has not changed what a data engineer does so much as it
 * has raised the price of doing it badly. Module 11.1 is the pipeline behind a training corpus,
 * exact-hash deduplication with a deterministic survivor rule, PII scrubbing, and a curation funnel
 * measured stage by stage. Module 11.2 is the semantic layer, the single largest accuracy lever
 * behind text-to-SQL, and the skill that outlasts the generator: reading a plausible query an AI
 * wrote and proving where it is wrong against a metric contract.
 *
 * **RAG is deliberately not here.** The original map had two more modules (RAG as a data pipeline,
 * and vector stores plus retrieval ops); they are marked PLACEHOLDER in CURRICULUM-MAP.md and are
 * not authored. The interview research is the reason it costs nothing to defer: across a
 * 2,817-report corpus of standard DE loops there were no RAG or vector-store questions, so this
 * level stands on the parts that are already being interviewed. The two shipped modules are
 * numbered 11.1 and 11.2 so a learner sees no gap.
 *
 * Every expected set was generated through the shipped sql.js WASM, and the workspace reference was
 * executed against its own hidden assertions including the idempotency double-run.
 */
import type { SqlLevel } from "@/lib/tutorials/types"
import { level11Module3 } from "./module3"
import { level11Module4 } from "./module4"

export const sqlLevel11: SqlLevel = {
  id: 11,
  slug: "data-for-ai",
  title: "Level 11: Data Engineering for AI",
  tagline:
    "The data work AI systems actually run on: deduplicating and scrubbing a training corpus, measuring a curation funnel, and owning the semantic layer that decides whether generated SQL can be trusted.",
  defaultExecutionMode: "single-file",
  estimatedHours: 2.5,
  modules: [level11Module3, level11Module4],
}
