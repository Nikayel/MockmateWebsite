import type { BugFixScenario } from "../../types"

const starter = `import math
from src.model_contract import FEATURE_DEFAULTS

def build_feature_vector(row, feature_names):
    vector = []
    for name in feature_names:
        raw_value = row.get(name, FEATURE_DEFAULTS.get(name, 0.0))
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            value = 0.0
        if not math.isfinite(value):
            value = 0.0
        vector.append(value)
    return vector
`

const modelContract = `import math

# Model contract, shared by the scoring service. Read-only.
# Each feature has a calibrated default used when a value is missing or unusable.
FEATURE_DEFAULTS = {
    "age": 40.0,
    "income": 50000.0,
    "sessions_30d": 0.0,
}

def assert_finite_vector(vector):
    assert all(isinstance(value, float) for value in vector)
    assert all(math.isfinite(value) for value in vector)
`

const visibleTests = `from src.feature_pipeline import build_feature_vector
from src.model_contract import assert_finite_vector

def run_tests(record):
    def valid_migration_values_keep_order():
        # whitespace, scientific notation, ints and an unknown extra column
        vector = build_feature_vector(
            {"age": " 34 ", "income": "1e3", "sessions_30d": 4, "plan_tier": "gold"},
            ["age", "income", "sessions_30d"],
        )
        assert vector == [34.0, 1000.0, 4.0]
        assert_finite_vector(vector)

    def nulled_income_falls_back_to_its_configured_default():
        # the migration made income nullable; a null income must score as the income default (50000.0)
        vector = build_feature_vector(
            {"age": 29, "income": None, "sessions_30d": 2},
            ["age", "income", "sessions_30d"],
        )
        assert vector == [29.0, 50000.0, 2.0]
        assert_finite_vector(vector)

    record("valid migration values keep order", valid_migration_values_keep_order)
    record("a nulled income falls back to its configured default", nulled_income_falls_back_to_its_configured_default)
`

const hiddenTests = `from src.feature_pipeline import build_feature_vector
from src.model_contract import assert_finite_vector

def run_tests(record):
    def non_finite_age_uses_its_default_not_zero():
        vector = build_feature_vector({"age": "nan", "income": 42000, "sessions_30d": 1}, ["age", "income", "sessions_30d"])
        assert vector == [40.0, 42000.0, 1.0]
        assert_finite_vector(vector)

    def infinite_income_uses_its_default_not_zero():
        vector = build_feature_vector({"age": 51, "income": "inf", "sessions_30d": 0}, ["age", "income", "sessions_30d"])
        assert vector == [51.0, 50000.0, 0.0]
        assert_finite_vector(vector)

    def missing_key_uses_its_configured_default():
        # a key entirely absent (not just null) also uses the configured default
        vector = build_feature_vector({"sessions_30d": 3}, ["age", "income", "sessions_30d"])
        assert vector == [40.0, 50000.0, 3.0]
        assert_finite_vector(vector)

    def null_on_a_zero_default_feature_scores_zero():
        # sessions_30d default is 0.0, so a null there is indistinguishable from a real zero
        vector = build_feature_vector({"age": 33, "income": 60000, "sessions_30d": None}, ["age", "income", "sessions_30d"])
        assert vector == [33.0, 60000.0, 0.0]
        assert_finite_vector(vector)

    def unknown_columns_and_whitespace_are_tolerated():
        vector = build_feature_vector(
            {"age": " 40 ", "income": "  75000 ", "sessions_30d": "5", "region": "EMEA", "notes": "vip"},
            ["age", "income", "sessions_30d"],
        )
        assert vector == [40.0, 75000.0, 5.0]
        assert_finite_vector(vector)

    record("a non-finite age uses its default, not zero", non_finite_age_uses_its_default_not_zero)
    record("an infinite income uses its default, not zero", infinite_income_uses_its_default_not_zero)
    record("a missing key uses its configured default", missing_key_uses_its_configured_default)
    record("a null on a zero-default feature scores zero", null_on_a_zero_default_feature_scores_zero)
    record("unknown columns and whitespace are tolerated", unknown_columns_and_whitespace_are_tolerated)
`

const runner = `import json
import os
import sys
import traceback
sys.path.insert(0, os.getcwd())
from tests import test_feature_pipeline, test_feature_pipeline_hidden

results = []
def record_factory(suite):
    def record(name, fn):
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None, "isHidden": "hidden" in suite.lower()})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc(), "isHidden": "hidden" in suite.lower()})
    return record

test_feature_pipeline.run_tests(record_factory("visible feature pipeline"))
test_feature_pipeline_hidden.run_tests(record_factory("hidden feature pipeline"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`

export const bugfixFeaturePipelineNanWorkspaceScenario: BugFixScenario = {
  id: "bugfix-feature-pipeline-nan-workspace",
  title: "Feature Pipeline: A Migrated Cohort Scores Wrong",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Generic"],
  description:
    "A model scoring job stopped erroring after the feature builder was hardened, but accounts migrated from the legacy CRM now score like empty users even though their history exists.",
  task: "Substitute the feature's configured default from the model contract for any value that is missing, null, non-numeric, or non-finite, keeping feature order intact.",
  // Grounded in the scenario's own second visible test, "a nulled income falls
  // back to its configured default": {"age": 29, "income": None,
  // "sessions_30d": 2} asserts [29.0, 50000.0, 2.0], but the starter returns
  // [29.0, 0.0, 2.0], so income lands at 0.0 instead of its 50000.0 default.
  symptom: {
    subject: "income",
    tag: "nulled value",
    expected: "50000.0",
    actual: "0.0",
    delta: "-50000.0",
    caveat:
      "Rows whose values are all clean score correctly, and every vector still passes the finite-vector check.",
  },
  userReport:
    "Risk analyst here. Ever since we hardened the feature builder, the scoring job stopped throwing errors, but the numbers look wrong for one slice of accounts. Everyone migrated off the legacy CRM last week is scoring like a brand-new user with no history, even though we clearly have their age and income on file. The vectors all pass validation and there is nothing in the logs. The scores are just wrong for that cohort.",
  tags: ["python", "ml", "data-pipeline", "feature-engineering", "real-codebase"],
  estimatedTime: 45,
  problemStatement: `A model scoring job turns account rows into finite feature vectors for inference. The model contract sets a calibrated default per feature, used whenever a value is missing or unusable.

**Incident Report**
After last week's CRM migration, some rows arrive with nulls, NaN-like strings, and reformatted numbers. The builder was hardened so batches stopped erroring, but accounts from the migrated cohort now score like empty users despite having history on file. No errors are logged and every vector passes the finite-vector check; the scores are simply wrong for that cohort.

Read the codebase files, run the tests, and make the smallest fix so the migrated cohort scores correctly. Keep feature ordering and the contract's defaults.`,
  buggyCode: { python: starter },
  codebaseFiles: {
    python: [
      {
        fileName: "src/model_contract.py",
        content: modelContract,
        description: "Read-only model contract: per-feature defaults and the finite-vector check",
      },
      {
        fileName: "tests/test_feature_pipeline.py",
        content: visibleTests,
        description: "Visible schema-migration tests",
      },
    ],
  },
  expectedBehavior:
    "Every feature vector is finite and keeps feature order. When a value is missing, null, non-numeric, or non-finite, the builder substitutes that feature's configured default from the contract so downstream scores stay calibrated.",
  bugDescription: "",
  hints: [
    "The vectors all pass validation, so the failure is in the numbers, not the shape. Score a migrated row by hand from the contract's defaults and compare it to what the builder returns.",
    "Rows with clean values are fine. Look at what the builder does with a value it cannot use, and compare that between a feature whose default is zero and one whose default is not.",
  ],
  testCases: [
    {
      input: { row: "migrated account with a nulled income", income: null },
      expected: "income scored at its configured default",
      description:
        "Workspace tests cover invalid and non-finite values on non-zero-default features",
    },
  ],
  expectedTouchedFiles: ["src/feature_pipeline.py"],
  observedSymptoms: [
    "Accounts migrated from the legacy CRM score like empty users; a nulled income lands as 0 instead of the income default, and a NaN age lands as 0 instead of the age default.",
    "Valid rows, missing keys, and features whose default is zero all score correctly, and every vector passes the finite-vector check.",
  ],
  reproductionSteps: [
    "Read README.md and src/model_contract.py for the finite-vector rule and the per-feature defaults.",
    "Inspect tests/test_feature_pipeline.py to see which migrated case scores wrong.",
    "Run the workspace tests before editing.",
  ],
  successCriteria: [
    "An invalid, null, or non-finite value scores at its feature's configured default, not a blanket zero.",
    "Valid values, missing keys, and zero-default features are unchanged, and every vector stays finite.",
    "Only src/feature_pipeline.py changes.",
  ],
  debuggingSkills: [
    "reproduction",
    "reading the data contract",
    "hypothesis",
    "minimal patch",
    "verification",
  ],
  workspace: {
    language: "python",
    primaryFilePath: "src/feature_pipeline.py",
    editableFilePaths: ["src/feature_pipeline.py"],
    visibleTestPaths: ["tests/test_feature_pipeline.py"],
    hiddenTestPaths: ["tests/test_feature_pipeline_hidden.py"],
    testRunnerPath: "tests/run_workspace_tests.py",
    files: [
      { path: "src/__init__.py", role: "readonly", language: "python", content: "" },
      { path: "tests/__init__.py", role: "test", language: "python", content: "", hidden: true },
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content: `# Feature Scoring Pipeline

The scoring service turns an account row into a finite feature vector for inference. It accepts only finite floats, and each feature has a calibrated default (defined in src/model_contract.py) used when a value is missing or unusable.

## Feature defaults (model contract)

- age: 40.0
- income: 50000.0
- sessions_30d: 0.0

## Input contract

- Values may arrive as ints, floats, or strings. Surrounding whitespace (" 34 ") and scientific notation ("1e3") are valid numbers.
- A value that is missing, null, non-numeric, or non-finite (NaN/inf) is replaced with that feature's configured default.
- Rows may carry extra columns that are not features; only the requested feature_names are read.
- Feature order in the output matches the order of feature_names.`,
        description: "Product and model-contract notes",
      },
      {
        path: "src/model_contract.py",
        role: "readonly",
        language: "python",
        content: modelContract,
        description: "Read-only model contract (defaults + finite-vector check)",
      },
      {
        path: "src/feature_pipeline.py",
        role: "editable",
        language: "python",
        content: starter,
        description: "Feature vector conversion logic",
      },
      {
        path: "tests/test_feature_pipeline.py",
        role: "test",
        language: "python",
        content: visibleTests,
        description: "Visible feature pipeline tests",
      },
      {
        path: "tests/test_feature_pipeline_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: hiddenTests,
        description: "Hidden default-handling and terrain tests",
      },
      {
        path: "tests/run_workspace_tests.py",
        role: "test",
        language: "python",
        hidden: true,
        content: runner,
        description: "Hidden workspace runner",
      },
    ],
  },
}
