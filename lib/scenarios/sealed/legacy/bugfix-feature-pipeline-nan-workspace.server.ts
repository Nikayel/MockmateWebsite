// Sealed legacy-bugfix answer content (SERVER-ONLY). Moved out of the client
// scenario module so the root cause, ground truth, rubric, and reference solution
// never ship in the browser bundle. The window guard is the runtime seal.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const reference = `import math
from src.model_contract import FEATURE_DEFAULTS

def _default_for(name):
    return FEATURE_DEFAULTS.get(name, 0.0)

def build_feature_vector(row, feature_names):
    vector = []
    for name in feature_names:
        raw_value = row.get(name, _default_for(name))
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            value = _default_for(name)
        if not math.isfinite(value):
            value = _default_for(name)
        vector.append(value)
    return vector
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-feature-pipeline-nan-workspace",
  bugDescription:
    "The crash-guard fallbacks substitute a hard-coded 0.0 instead of the feature's configured default, so a present-but-invalid or non-finite value on a feature whose default is non-zero (age, income) is silently scored as zero. The vector still validates as finite, so the mis-score is invisible; only the missing-key path routes through the real defaults.",
  groundTruth:
    "Root cause: the try/except and non-finite guards were added to stop the builder crashing on migrated nulls, but they fall back to a literal 0.0 rather than the feature's configured default. The missing-key path (the row.get default) uses the real default and reads correct, so review approved it, while the newly added guards silently zero out invalid values on non-zero-default features. Fix: route every fallback through the same per-feature default. Survival story: two fallback styles coexist, the correct one on the missing-key path and the buggy literal on the crash-guard path, so a reviewer checking 'are defaults handled' and 'are crashes caught' sees both boxes ticked and misses the mismatch. Red herrings, all reachable and provably innocent: (1) float(' 34 ') and float('1e3') look risky but Python parses surrounding whitespace and scientific notation correctly, so those rows are not the bug; (2) unknown extra columns are ignored because only feature_names are read; (3) sessions_30d has a zero default, so a null there scores zero either way and is not evidence of the bug. assert_finite_vector passes on the buggy output, which is why the mis-score is silent.",
  rootCauseRubric: [
    "Identifies that the crash-guard fallbacks use a literal zero instead of the feature's configured default.",
    "Connects the mis-scored cohort to invalid values on non-zero-default features, not to a crash or a validation gap.",
    "Rules out whitespace/scientific-notation parsing, unknown columns, and the zero-default feature as innocent with evidence.",
    "Names a regression guard such as a per-feature default test for invalid values.",
  ],
  referenceFiles: [
    {
      path: "src/feature_pipeline.py",
      role: "editable",
      language: "python",
      content: reference,
    },
  ],
}
