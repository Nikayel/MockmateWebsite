import type { AddFunctionalityScenario } from "../types"

/**
 * Build milestone for the Palantir "911 Dispatch Optimization" Case Lab.
 *
 * Reshaped from the workbook's single-file `starter.py` into a MULTI-FILE
 * codebase drop (spec §1, §7.4): the candidate extends a partial dispatch
 * system — a read-only geo helper, an editable recommender with a TODO, and an
 * editable service wrapper — rather than writing one function from scratch.
 */

const starter = `from src.geo import distance

STALE_THRESHOLD = 300

def recommend_responders(incident, responders, top_k=3):
    # TODO: return the top_k closest responders that are
    #   - available
    #   - have the incident's required capability (incident["type"])
    #   - whose GPS is not stale (last_update <= STALE_THRESHOLD)
    # ranked by distance (use the read-only \`distance\` helper).
    return []
`

const serviceStarter = `from src.dispatch import recommend_responders

def recommend_response(incident, responders, top_k=3):
    recommendations = recommend_responders(incident, responders, top_k)
    # TODO: return a response with the count and the recommendations.
    return {"recommendations": recommendations}
`

export const dispatch911Scenario: AddFunctionalityScenario = {
  id: "palantir-911-dispatch-build",
  title: "911 Dispatch: Responder Recommender",
  type: "add-functionality",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Palantir"],
  description:
    "Extend a 911 dispatch system to recommend the top responders for an incident under capability, availability, stale-GPS, and ranking constraints.",
  tags: ["python", "backend", "ranking", "real-codebase", "case-lab"],
  estimatedTime: 45,
  problemStatement: `Dispatchers currently pick responders by hand. Finish the recommender so it returns the top_k closest *available* responders that have the incident's required capability and whose GPS is fresh.

The geo helper is read-only; implement \`recommend_responders\` and wire the service wrapper to report a count alongside the recommendations.`,
  featureRequirements: [
    "Only include responders whose status is 'available'",
    "Only include responders that have the incident's required capability",
    "Exclude responders with stale GPS (last_update > STALE_THRESHOLD)",
    "Rank by distance and return at most top_k",
    "Service wrapper returns both a count and the recommendations",
  ],
  existingCode: { python: starter },
  codebaseFiles: {
    python: [
      {
        fileName: "src/geo.py",
        content: "Read-only euclidean distance helper.",
        description: "Read-only geo helper",
      },
      {
        fileName: "src/dispatch.py",
        content: "Editable responder recommender.",
        description: "Recommender to implement",
      },
      {
        fileName: "src/dispatch_service.py",
        content: "Editable service wrapper.",
        description: "Service response wrapper",
      },
    ],
  },
  hints: [
    "Filter first (status, capability, stale GPS), then rank by distance.",
    "Use the read-only distance(a, b) helper; don't recompute geometry.",
    "Failing open is dangerous. Return an empty list when nothing qualifies.",
  ],
  testCases: [
    {
      input: { incident: "medical", responders: 3 },
      expected: "top responders",
      description: "Workspace tests cover filtering, stale GPS, ranking, and the service wrapper",
    },
  ],
  acceptanceCriteria: [
    "Unavailable and wrong-capability responders are excluded",
    "Stale-GPS responders are excluded",
    "Results are ranked by distance and capped at top_k",
    "The service wrapper returns count + recommendations",
  ],
  workspace: {
    language: "python",
    primaryFilePath: "src/dispatch.py",
    editableFilePaths: ["src/dispatch.py", "src/dispatch_service.py"],
    visibleTestPaths: ["tests/test_dispatch.py"],
    hiddenTestPaths: ["tests/test_dispatch_hidden.py"],
    testRunnerPath: "tests/run_workspace_tests.py",
    files: [
      { path: "src/__init__.py", role: "readonly", language: "python", content: "" },
      { path: "tests/__init__.py", role: "test", language: "python", content: "", hidden: true },
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content:
          "Recommends responders for an incident. Inputs are messy: GPS can be stale, units may be busy, and some incidents have no valid responder. Outputs must be deterministic (ranked by distance) and fail safe (empty list, never a wrong unit).",
      },
      {
        path: "src/geo.py",
        role: "readonly",
        language: "python",
        content: `def distance(a, b):
    (lat1, lon1), (lat2, lon2) = a, b
    return ((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2) ** 0.5
`,
        description: "Read-only euclidean distance helper",
      },
      {
        path: "src/dispatch.py",
        role: "editable",
        language: "python",
        content: starter,
        description: "Responder recommender to implement",
      },
      {
        path: "src/dispatch_service.py",
        role: "editable",
        language: "python",
        content: serviceStarter,
        description: "Service wrapper to finish",
      },
      {
        path: "tests/test_dispatch.py",
        role: "test",
        language: "python",
        content: `from src.dispatch import recommend_responders
from src.dispatch_service import recommend_response

INCIDENT = {"id": "inc_1", "type": "medical", "location": (40.7128, -74.0060), "severity": "high"}
RESPONDERS = [
    {"id": "r_1", "capabilities": ["medical"], "status": "available", "location": (40.7130, -74.0060), "last_update": 0},
    {"id": "r_2", "capabilities": ["fire"], "status": "available", "location": (40.7128, -74.0060), "last_update": 0},
    {"id": "r_3", "capabilities": ["medical"], "status": "busy", "location": (40.7128, -74.0060), "last_update": 0},
]

def run_tests(record):
    def filters_by_capability_and_status():
        ids = [r["id"] for r in recommend_responders(INCIDENT, RESPONDERS)]
        assert ids == ["r_1"], ids

    def service_returns_count_and_recommendations():
        response = recommend_response(INCIDENT, RESPONDERS)
        assert response["count"] == 1, response
        assert response["recommendations"][0]["id"] == "r_1", response

    record("filters by capability and status", filters_by_capability_and_status)
    record("service returns count and recommendations", service_returns_count_and_recommendations)
`,
        description: "Visible dispatch tests",
      },
      {
        path: "tests/test_dispatch_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: `from src.dispatch import recommend_responders

INCIDENT = {"id": "inc", "type": "medical", "location": (0.0, 0.0)}

def run_tests(record):
    def excludes_stale_gps():
        responders = [
            {"id": "ok", "capabilities": ["medical"], "status": "available", "location": (0.0, 0.001), "last_update": 0},
            {"id": "stale", "capabilities": ["medical"], "status": "available", "location": (0.0, 0.0), "last_update": 999},
        ]
        ids = [r["id"] for r in recommend_responders(INCIDENT, responders)]
        assert ids == ["ok"], ids

    def ranks_by_distance_and_limits_top_k():
        responders = [
            {"id": "far", "capabilities": ["medical"], "status": "available", "location": (0.0, 5.0), "last_update": 0},
            {"id": "near", "capabilities": ["medical"], "status": "available", "location": (0.0, 1.0), "last_update": 0},
            {"id": "mid", "capabilities": ["medical"], "status": "available", "location": (0.0, 2.0), "last_update": 0},
        ]
        ids = [r["id"] for r in recommend_responders(INCIDENT, responders, top_k=2)]
        assert ids == ["near", "mid"], ids

    def returns_empty_when_none_qualify():
        responders = [{"id": "x", "capabilities": ["fire"], "status": "available", "location": (0.0, 0.0), "last_update": 0}]
        assert recommend_responders(INCIDENT, responders) == []

    record("excludes stale gps", excludes_stale_gps)
    record("ranks by distance and limits top_k", ranks_by_distance_and_limits_top_k)
    record("returns empty when none qualify", returns_empty_when_none_qualify)
`,
        description: "Hidden constraint tests",
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
from tests import test_dispatch, test_dispatch_hidden

results = []
def record_factory(suite):
    def record(name, fn):
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc()})
    return record

test_dispatch.run_tests(record_factory("visible dispatch"))
test_dispatch_hidden.run_tests(record_factory("hidden dispatch"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`,
        description: "Hidden workspace runner",
      },
    ],
  },
}
