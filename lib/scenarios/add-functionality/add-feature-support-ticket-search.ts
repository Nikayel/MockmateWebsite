import type { AddFunctionalityScenario } from "../types"

const starter = `def search_tickets(tickets, query=None, status=None, priority=None):
    # TODO: filter tickets by query/status/priority and return ranked matches.
    return tickets
`

export const supportTicketSearchScenario: AddFunctionalityScenario = {
  id: "add-feature-support-ticket-search",
  title: "Add Ranked Support Ticket Search",
  type: "add-functionality",
  executionMode: "workspace",
  difficulty: "medium",
  companies: ["Slack", "Salesforce", "Microsoft", "Startup"],
  description: "Add filtered, ranked support ticket search across service and API layers",
  tags: ["python", "backend", "search", "api", "real-codebase"],
  estimatedTime: 55,
  problemStatement: `Support agents need a search endpoint that can filter tickets by text, status, and priority. The repository already returns ticket records; your task is to wire the feature through the search service and API response shape.

Implement the feature in the editable files while preserving the current list endpoint behavior.`,
  featureRequirements: [
    "Filter by optional query text across title, body, and tags",
    "Filter by optional status and priority",
    "Rank title matches above tag matches above body matches, with priority as a tie-breaker",
    "Return deterministic results sorted by score descending then ticket id",
    "Expose the feature through the API handler",
  ],
  existingCode: { python: starter },
  codebaseFiles: {
    python: [
      {
        fileName: "src/repository.py",
        content: "In-memory ticket repository fixture.",
        description: "Read-only data source",
      },
      {
        fileName: "src/api.py",
        content: "Editable API handler that should call the search service.",
        description: "API layer",
      },
    ],
  },
  hints: [
    "Keep repository access separate from ranking logic.",
    "Normalize query text once.",
    "Add scores in the service, then let the API serialize only the fields clients need.",
  ],
  testCases: [
    {
      input: { query: "refund" },
      expected: "ranked ticket response",
      description: "Workspace tests cover filters, ranking, and API wiring",
    },
  ],
  acceptanceCriteria: [
    "Search works with any combination of query/status/priority filters",
    "Ranking is deterministic",
    "The API returns ticket ids, title, status, priority, and score",
    "Existing unfiltered requests still return all tickets",
  ],
  workspace: {
    language: "python",
    primaryFilePath: "src/search_service.py",
    editableFilePaths: ["src/search_service.py", "src/api.py"],
    visibleTestPaths: ["tests/test_support_search.py"],
    hiddenTestPaths: ["tests/test_support_search_hidden.py"],
    testRunnerPath: "tests/run_workspace_tests.py",
    files: [
      { path: "src/__init__.py", role: "readonly", language: "python", content: "" },
      { path: "tests/__init__.py", role: "test", language: "python", content: "", hidden: true },
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content:
          "Support search is used repeatedly by agents, so deterministic ordering matters for trust and keyboard workflows.",
      },
      {
        path: "src/repository.py",
        role: "readonly",
        language: "python",
        content: `TICKETS = [
    {"id": "T-1", "title": "Refund not received", "body": "Customer asks about a delayed payout", "tags": ["billing", "refund"], "status": "open", "priority": "urgent"},
    {"id": "T-2", "title": "Login issue", "body": "Cannot reset password", "tags": ["auth"], "status": "open", "priority": "normal"},
    {"id": "T-3", "title": "Billing export", "body": "Need CSV refund report", "tags": ["billing"], "status": "closed", "priority": "high"},
]

def list_tickets():
    return list(TICKETS)
`,
        description: "Read-only ticket repository",
      },
      {
        path: "src/search_service.py",
        role: "editable",
        language: "python",
        content: starter,
        description: "Search filtering and ranking service",
      },
      {
        path: "src/api.py",
        role: "editable",
        language: "python",
        content: `from src.repository import list_tickets
from src.search_service import search_tickets

def handle_ticket_search(params):
    tickets = list_tickets()
    # TODO: pass supported filters into search_tickets and serialize response rows.
    return {"tickets": tickets}
`,
        description: "API handler for support-ticket search",
      },
      {
        path: "tests/test_support_search.py",
        role: "test",
        language: "python",
        content: `from src.api import handle_ticket_search
from src.repository import list_tickets
from src.search_service import search_tickets

def run_tests(record):
    def service_filters_and_ranks_refund():
        results = search_tickets(list_tickets(), query="refund")
        assert [ticket["id"] for ticket in results] == ["T-1", "T-3"]
        assert results[0]["score"] > results[1]["score"]

    def api_wires_filters_and_serializes_scores():
        response = handle_ticket_search({"query": "billing", "status": "closed"})
        assert response == {"tickets": [{"id": "T-3", "title": "Billing export", "status": "closed", "priority": "high", "score": 10}]}

    record("service filters and ranks refund", service_filters_and_ranks_refund)
    record("api wires filters and serializes scores", api_wires_filters_and_serializes_scores)
`,
        description: "Visible search feature tests",
      },
      {
        path: "tests/test_support_search_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: `from src.api import handle_ticket_search

def run_tests(record):
    def unfiltered_request_keeps_all_tickets():
        response = handle_ticket_search({})
        assert [ticket["id"] for ticket in response["tickets"]] == ["T-1", "T-3", "T-2"]

    record("unfiltered request keeps all tickets ranked deterministically", unfiltered_request_keeps_all_tickets)
`,
        description: "Hidden unfiltered behavior test",
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
from tests import test_support_search, test_support_search_hidden

results = []
def record_factory(suite):
    def record(name, fn):
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc()})
    return record

test_support_search.run_tests(record_factory("visible support search"))
test_support_search_hidden.run_tests(record_factory("hidden support search"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`,
        description: "Hidden workspace runner",
      },
    ],
  },
}
