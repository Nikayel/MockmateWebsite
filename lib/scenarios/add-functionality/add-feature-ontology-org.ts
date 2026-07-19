import type { AddFunctionalityScenario } from "../types"

/**
 * Build milestone for the Palantir "Ontology Org Explorer" Learning-round Case Lab.
 *
 * The Learning round hands you an UNFAMILIAR API with minimal docs and scores how
 * fast you build a working mental model, then climb a difficulty ramp with it.
 * Here the unfamiliar API is a tiny slice of Palantir's own core abstraction: an
 * Ontology of objects, properties, and typed links (`src/ontology.py`, read-only).
 * The candidate learns those ~4 methods cold, then implements three queries of
 * increasing difficulty against it: count team members (filter), list direct
 * reports (one hop + sort), and total headcount under a manager (transitive
 * traversal). A small report wrapper composes them. Never a blank editor.
 */

const ontology = `"""A tiny slice of a company Ontology: objects, properties, and typed links.

You have never seen this API before. Read this file, build a mental model, and
use only what it gives you.

An OBJECT has a type, a primary key (pk), and properties.
A LINK is a typed, directed relationship you navigate from an object OUTWARD.

Object types in this Ontology:  "Employee", "Team"
Link types (navigated FROM an Employee):
    "reports_to" -> the Employee's manager        (0 or 1 target)
    "on_team"    -> the Team(s) the Employee is on (0 or more targets)

You are handed an already-loaded Ontology (see load_company). You never build one.
"""


class OntologyObject:
    def __init__(self, ontology, otype, pk, props):
        self._ontology = ontology
        self.otype = otype
        self.pk = pk
        self._props = props

    def get(self, prop):
        """Value of a property on this object, or None if it has no such property."""
        return self._props.get(prop)

    def links(self, link_type):
        """The objects reached by navigating link_type from this object.
        Returns an empty list if this object has no links of that type."""
        return list(self._ontology._links.get((self.pk, link_type), []))

    def __repr__(self):
        return "<%s %s>" % (self.otype, self.pk)


class Ontology:
    def __init__(self, objects, links):
        self._objects = objects
        self._links = links

    def objects(self, otype):
        """Every object of the given type."""
        return [o for o in self._objects if o.otype == otype]


def load_company():
    employees = {
        "e_alice": {"name": "Alice", "title": "CEO", "level": 6},
        "e_bob": {"name": "Bob", "title": "Engineering Manager", "level": 5},
        "e_carol": {"name": "Carol", "title": "Product Lead", "level": 5},
        "e_dave": {"name": "Dave", "title": "Engineer", "level": 3},
        "e_erin": {"name": "Erin", "title": "Engineer", "level": 4},
        "e_frank": {"name": "Frank", "title": "Designer", "level": 3},
        "e_grace": {"name": "Grace", "title": "Engineer", "level": 2},
    }
    teams = {
        "t_platform": {"name": "Platform"},
        "t_growth": {"name": "Growth"},
    }
    ont = Ontology([], {})
    objs = {}
    all_objects = []
    for pk, props in employees.items():
        o = OntologyObject(ont, "Employee", pk, props)
        objs[pk] = o
        all_objects.append(o)
    for pk, props in teams.items():
        o = OntologyObject(ont, "Team", pk, props)
        objs[pk] = o
        all_objects.append(o)

    reports_to = [
        ("e_bob", "e_alice"), ("e_carol", "e_alice"),
        ("e_dave", "e_bob"), ("e_erin", "e_bob"),
        ("e_frank", "e_carol"), ("e_grace", "e_dave"),
    ]
    on_team = [
        ("e_bob", "t_platform"), ("e_dave", "t_platform"),
        ("e_erin", "t_platform"), ("e_grace", "t_platform"),
        ("e_carol", "t_growth"), ("e_frank", "t_growth"),
    ]
    links = {}
    for src_pk, dst_pk in reports_to:
        links.setdefault((src_pk, "reports_to"), []).append(objs[dst_pk])
    for src_pk, dst_pk in on_team:
        links.setdefault((src_pk, "on_team"), []).append(objs[dst_pk])

    ont._objects = all_objects
    ont._links = links
    return ont
`

const starter = `from src.ontology import Ontology


def team_size(ontology, team_name):
    # TODO: count the Employees whose "on_team" link points to the team
    #   named team_name. Return 0 if no team by that name exists.
    return 0


def direct_reports(ontology, manager_name):
    # TODO: return the SORTED names of Employees whose "reports_to" link
    #   points to the Employee named manager_name. Return [] if unknown.
    return []


def total_headcount(ontology, manager_name):
    # TODO: count EVERY Employee under this manager, transitively
    #   (their reports, their reports' reports, and so on). Not the manager.
    return 0
`

const reportStarter = `from src.analysis import direct_reports, total_headcount


def org_summary(ontology, manager_name):
    # TODO: return a dict with keys "manager", "direct_reports", and
    #   "total_headcount", reusing the analysis functions above.
    return {}
`

export const ontologyOrgScenario: AddFunctionalityScenario = {
  id: "palantir-ontology-org-build",
  title: "Ontology Org Explorer: Learn the API, Then Query It",
  type: "add-functionality",
  executionMode: "workspace",
  difficulty: "easy",
  companies: ["Palantir"],
  roles: ["intern", "fdse"],
  description:
    "Learn a small unfamiliar Ontology API (objects, properties, typed links) cold, then implement three org-chart queries of increasing difficulty against it.",
  tags: ["python", "learning-round", "ontology", "graph-traversal", "real-codebase", "case-lab"],
  estimatedTime: 40,
  problemStatement: `You are handed a tiny slice of a company Ontology in \`src/ontology.py\` (read-only): objects have a type, a primary key, and properties, and you navigate typed links from one object to another. You have never seen this API. Learn it from the file, then implement three queries in \`src/analysis.py\` and wire the \`src/report.py\` summary.

The three queries climb in difficulty: count a team's members (filter), list a manager's direct reports (one hop, sorted), and total headcount under a manager (follow the reporting chain all the way down).`,
  featureRequirements: [
    "team_size: count Employees whose on_team link points to the given team",
    "direct_reports: sorted names of Employees whose reports_to link points to the manager",
    "total_headcount: every Employee under a manager, transitively (not the manager)",
    "Unknown team or manager names return 0 or an empty list, never an error",
    "org_summary returns manager, direct_reports, and total_headcount together",
  ],
  existingCode: { python: starter },
  codebaseFiles: {
    python: [
      {
        fileName: "src/ontology.py",
        content: "Read-only Ontology API: objects, properties, typed links.",
        description: "The unfamiliar API to learn",
      },
      {
        fileName: "src/analysis.py",
        content: "Editable org-chart queries to implement.",
        description: "Three queries to implement",
      },
      {
        fileName: "src/report.py",
        content: "Editable summary wrapper.",
        description: "Report wrapper to finish",
      },
    ],
  },
  hints: [
    "Start by reading src/ontology.py: objects(type), obj.get(prop), and obj.links(link_type) are all you get.",
    "There is no reverse link. To find a manager's reports, scan every Employee and check who reports_to them.",
    "For total_headcount, build the child lists once from the reports_to links, then walk the tree; guard against a name that isn't in the Ontology.",
  ],
  testCases: [
    {
      input: { manager: "Bob" },
      expected: "2 direct reports, 3 total headcount",
      description:
        "Workspace tests cover team_size, direct_reports, transitive headcount, and the summary wrapper",
    },
  ],
  acceptanceCriteria: [
    "team_size counts members by the on_team link, and unknown teams are zero",
    "direct_reports returns sorted names and empty for an unknown manager",
    "total_headcount is transitive over the full reporting tree",
    "org_summary bundles the reports and headcount into one dict",
  ],
  workspace: {
    language: "python",
    primaryFilePath: "src/analysis.py",
    editableFilePaths: ["src/analysis.py", "src/report.py"],
    visibleTestPaths: ["tests/test_analysis.py"],
    hiddenTestPaths: ["tests/test_analysis_hidden.py"],
    testRunnerPath: "tests/run_workspace_tests.py",
    files: [
      { path: "src/__init__.py", role: "readonly", language: "python", content: "" },
      { path: "tests/__init__.py", role: "test", language: "python", content: "", hidden: true },
      {
        path: "README.md",
        role: "docs",
        language: "markdown",
        content:
          "A Learning round. You are handed an unfamiliar Ontology API (src/ontology.py, read-only) with only its docstrings for documentation. Build a mental model of objects, properties, and typed links, then implement three org-chart queries of increasing difficulty in src/analysis.py and finish the src/report.py summary. There is no reverse link, so navigating from a manager to their reports is part of the puzzle.",
      },
      {
        path: "src/ontology.py",
        role: "readonly",
        language: "python",
        content: ontology,
        description: "Read-only Ontology API to learn cold",
      },
      {
        path: "src/analysis.py",
        role: "editable",
        language: "python",
        content: starter,
        description: "Org-chart queries to implement",
      },
      {
        path: "src/report.py",
        role: "editable",
        language: "python",
        content: reportStarter,
        description: "Summary wrapper to finish",
      },
      {
        path: "tests/test_analysis.py",
        role: "test",
        language: "python",
        content: `from src.ontology import load_company
from src.analysis import team_size, direct_reports
from src.report import org_summary


def run_tests(record):
    o = load_company()

    def team_size_counts_members():
        assert team_size(o, "Platform") == 4, team_size(o, "Platform")
        assert team_size(o, "Growth") == 2, team_size(o, "Growth")

    def direct_reports_are_sorted_names():
        assert direct_reports(o, "Alice") == ["Bob", "Carol"], direct_reports(o, "Alice")
        assert direct_reports(o, "Bob") == ["Dave", "Erin"], direct_reports(o, "Bob")

    def summary_bundles_reports_and_headcount():
        s = org_summary(o, "Bob")
        assert s["direct_reports"] == ["Dave", "Erin"], s
        assert s["total_headcount"] == 3, s

    record("team_size counts team members", team_size_counts_members)
    record("direct_reports returns sorted names", direct_reports_are_sorted_names)
    record("org_summary bundles reports and headcount", summary_bundles_reports_and_headcount)
`,
        description: "Visible analysis tests",
      },
      {
        path: "tests/test_analysis_hidden.py",
        role: "test",
        language: "python",
        hidden: true,
        content: `from src.ontology import load_company
from src.analysis import team_size, direct_reports, total_headcount


def run_tests(record):
    o = load_company()

    def headcount_is_transitive():
        assert total_headcount(o, "Alice") == 6, total_headcount(o, "Alice")
        assert total_headcount(o, "Bob") == 3, total_headcount(o, "Bob")
        assert total_headcount(o, "Dave") == 1, total_headcount(o, "Dave")

    def leaf_and_unknown_are_empty():
        assert total_headcount(o, "Grace") == 0, total_headcount(o, "Grace")
        assert total_headcount(o, "Nope") == 0, total_headcount(o, "Nope")
        assert direct_reports(o, "Nope") == [], direct_reports(o, "Nope")

    def unknown_team_is_zero():
        assert team_size(o, "Nope") == 0, team_size(o, "Nope")

    record("total_headcount is transitive over the reporting tree", headcount_is_transitive)
    record("leaf and unknown managers return empty", leaf_and_unknown_are_empty)
    record("unknown team has size zero", unknown_team_is_zero)
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
from tests import test_analysis, test_analysis_hidden

results = []
def record_factory(suite):
    def record(name, fn):
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc()})
    return record

test_analysis.run_tests(record_factory("visible analysis"))
test_analysis_hidden.run_tests(record_factory("hidden analysis"))
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`,
        description: "Hidden workspace runner",
      },
    ],
  },
}
