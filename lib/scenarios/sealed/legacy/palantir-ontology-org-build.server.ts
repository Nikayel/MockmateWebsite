// Sealed reference solution (SERVER-ONLY) for an add-functionality scenario.
// The complete fixed files are moved out of the client module so they never ship
// in the browser bundle. No runtime code reads them; the node-side test gates
// apply them over the starter workspace to prove the suite goes green.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const analysisReference = `from src.ontology import Ontology


def _employee_by_name(ontology, name):
    for emp in ontology.objects("Employee"):
        if emp.get("name") == name:
            return emp
    return None


def team_size(ontology, team_name):
    count = 0
    for emp in ontology.objects("Employee"):
        team_names = [t.get("name") for t in emp.links("on_team")]
        if team_name in team_names:
            count += 1
    return count


def direct_reports(ontology, manager_name):
    manager = _employee_by_name(ontology, manager_name)
    if manager is None:
        return []
    names = []
    for emp in ontology.objects("Employee"):
        if any(m.pk == manager.pk for m in emp.links("reports_to")):
            names.append(emp.get("name"))
    return sorted(names)


def total_headcount(ontology, manager_name):
    manager = _employee_by_name(ontology, manager_name)
    if manager is None:
        return 0
    children = {}
    for emp in ontology.objects("Employee"):
        for m in emp.links("reports_to"):
            children.setdefault(m.pk, []).append(emp)
    seen = set()
    stack = list(children.get(manager.pk, []))
    while stack:
        emp = stack.pop()
        if emp.pk in seen:
            continue
        seen.add(emp.pk)
        stack.extend(children.get(emp.pk, []))
    return len(seen)
`

const reportReference = `from src.analysis import direct_reports, total_headcount


def org_summary(ontology, manager_name):
    return {
        "manager": manager_name,
        "direct_reports": direct_reports(ontology, manager_name),
        "total_headcount": total_headcount(ontology, manager_name),
    }
`

export const sealed: SealedLegacyScenario = {
  id: "palantir-ontology-org-build",
  referenceFiles: [
    {
      path: "src/analysis.py",
      role: "editable",
      language: "python",
      content: analysisReference,
    },
    {
      path: "src/report.py",
      role: "editable",
      language: "python",
      content: reportReference,
    },
  ],
}
