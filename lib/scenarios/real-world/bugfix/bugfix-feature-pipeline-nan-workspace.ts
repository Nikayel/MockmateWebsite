import type { BugFixScenario } from "../../types"

const starter = `FEATURE_DEFAULTS = {
    "age": 0.0,
    "income": 0.0,
    "sessions_30d": 0.0,
}

def build_feature_vector(row, feature_names):
    vector = []
    for name in feature_names:
        vector.append(float(row.get(name, FEATURE_DEFAULTS.get(name, 0.0))))
    return vector
`

const reference = `import math

FEATURE_DEFAULTS = {
    "age": 0.0,
    "income": 0.0,
    "sessions_30d": 0.0,
}

def build_feature_vector(row, feature_names):
    vector = []
    for name in feature_names:
        raw_value = row.get(name, FEATURE_DEFAULTS.get(name, 0.0))
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            value = FEATURE_DEFAULTS.get(name, 0.0)
        if not math.isfinite(value):
            value = FEATURE_DEFAULTS.get(name, 0.0)
        vector.append(value)
    return vector
`

export const bugfixFeaturePipelineNanWorkspaceScenario: BugFixScenario = {
  id: "bugfix-feature-pipeline-nan-workspace",
  title: "Feature Pipeline NaN Regression",
  type: "bugfix",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Veeva", "Databricks", "Uber", "Google"],
  description: "Fix feature vector generation after a schema change introduces missing values",
  tags: ["python", "ml", "data-pipeline", "validation", "real-codebase"],
  estimatedTime: 45,
  problemStatement: `A model scoring job started rejecting batches after a data schema migration. Some rows now contain missing strings, nulls, and NaN-like values. The feature builder should produce finite numeric vectors for downstream inference.

Fix the feature conversion while preserving known defaults and feature ordering.`,
  buggyCode: { python: starter },
  codebaseFiles: {
    python: [
      {
        fileName: "src/model_contract.py",
        content: "Validates finite numeric vectors before inference.",
        description: "Read-only model contract",
      },
      {
        fileName: "tests/test_feature_pipeline.py",
        content: "Visible schema-regression tests.",
        description: "Visible tests",
      },
    ],
  },
  expectedBehavior:
    "Feature vectors should preserve order and replace missing, invalid, or non-finite values with configured defaults.",
  bugDescription:
    "The builder calls float() directly, allowing NaN/inf through and crashing on invalid strings or None.",
  hints: [
    "The model contract rejects non-finite values.",
    "Handle TypeError and ValueError at the trust boundary.",
    "math.isfinite is the important guard after conversion.",
  ],
  testCases: [
    {
      input: { row: "schema migration values" },
      expected: "finite vector",
      description: "Workspace tests cover missing and non-finite values",
    },
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
        content:
          "The scoring service accepts only finite floats. Feature defaults are part of the model contract.",
      },
      {
        path: "src/model_contract.py",
        role: "readonly",
        language: "python",
        content: `import math

def assert_finite_vector(vector):
    assert all(isinstance(value, float) for value in vector)
    assert all(math.isfinite(value) for value in vector)
`,
        description: "Read-only inference input contract",
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
        content: `from src.feature_pipeline import build_feature_vector
from src.model_contract import assert_finite_vector

def run_tests(record):
    def valid_values_keep_order():
        vector = build_feature_vector({"age": "34", "income": 1200, "sessions_30d": 4}, ["age", "income", "sessions_30d"])
        assert vector == [34.0, 1200.0, 4.0]
        assert_finite_vector(vector)

    def invalid_values_use_defaults():
        vector = build_feature_vector({"age": None, "income": "nan", "sessions_30d": ""}, ["age", "income", "sessions_30d"])
        assert vector == [0.0, 0.0, 0.0]
        assert_finite_vector(vector)

    record("valid values keep order", valid_values_keep_order)
    record("invalid values use defaults", invalid_values_use_defaults)
`,
        description: "Visible feature pipeline tests",
      },
      {
        path: "tests/test_feature_pipeline_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: `from src.feature_pipeline import build_feature_vector
from src.model_contract import assert_finite_vector

def run_tests(record):
    def infinite_values_use_defaults():
        vector = build_feature_vector({"income": "inf"}, ["income"])
        assert vector == [0.0]
        assert_finite_vector(vector)

    record("infinite values use defaults", infinite_values_use_defaults)
`,
        description: "Hidden non-finite regression test",
      },
      {
        path: "tests/run_workspace_tests.py",
        role: "test",
        language: "python",
        hidden: true,
        content: `import json
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
`,
        description: "Hidden workspace runner",
      },
    ],
    referenceFiles: [
      {
        path: "src/feature_pipeline.py",
        role: "editable",
        language: "python",
        content: reference,
      },
    ],
  },
}
