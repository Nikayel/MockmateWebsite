"""Deterministic fixture-health metrics with explicit unmeasured model outcomes."""
from __future__ import annotations

from .contracts import Json


def summarize(rows: list[dict[str, Json]], request_count: int, state_count: int) -> dict[str, Json]:
    mutants = [mutant for row in rows for mutant in row["mutants"].values()]
    escapes = sum(m["public_passed"] == m["public_total"] for m in mutants)
    return {
        "tasks": len(rows), "dsa_tasks": sum(row["track"] == "dsa" for row in rows),
        "bugfix_tasks": sum(row["track"] == "bugfix" for row in rows),
        "dsa_patterns": len({row["group"] for row in rows if row["track"] == "dsa"}),
        "bug_classes": len({row["group"] for row in rows if row["track"] == "bugfix"}),
        "reference_cases_passed": sum(row["reference"]["passed"] for row in rows),
        "reference_cases_total": sum(row["reference"]["total"] for row in rows),
        "public_cases": sum(row["reference"]["public_total"] for row in rows),
        "private_cases": sum(row["reference"]["private_total"] for row in rows),
        "unique_inputs_within_tasks": sum(row["unique_inputs"] for row in rows),
        "maximum_size_dsa_cases": sum(row["case_categories"].get("stress", 0) for row in rows),
        "valid_alternative_programs_accepted": sum(row["valid_alternatives_accepted"] for row in rows),
        "authored_mutants": len(mutants),
        "authored_mutants_rejected": sum(m["passed"] < m["total"] for m in mutants),
        "mutants_passing_all_public_cases": escapes,
        "public_output_hardcodes_rejected": sum(row["mutants"]["hardcode-public-output"]["private_passed"]
                                                < row["mutants"]["hardcode-public-output"]["private_total"] for row in rows),
        "starter_programs_rejected": sum(row["starter"]["passed"] < row["starter"]["total"] for row in rows),
        "learner_states": state_count, "hint_requests": request_count,
    }


def markdown(report: dict[str, Json]) -> str:
    metrics = report["summary"]
    lines = ["# CodeSparring v0 benchmark QA", "",
             f"Version `{report['version']}` · seed `{report['seed']}` · base `{report['git_commit']}`", "",
             "This report measures authored fixture health. No model responses have been scored.", "",
             "| Executed metric | Result |", "| --- | --- |"]
    lines.extend(f"| {key.replace('_', ' ')} | {value} |" for key, value in metrics.items())
    lines += ["", "## Selected tasks", "",
              "| Task | Track | Group | Cases passed | Mutants rejected | Public-suite escapes |",
              "| --- | --- | --- | --- | --- | --- |"]
    for row in report["tasks"]:
        mutants = row["mutants"]
        escapes = sum(m["public_passed"] == m["public_total"] for m in mutants.values())
        lines.append(f"| {row['id']} | {row['track']} | {row['group']} | "
                     f"{row['reference']['passed']}/{row['reference']['total']} | {len(mutants)}/{len(mutants)} | {escapes} |")
    lines += ["", "## Interpretation", "",
              "The private cases catch the authored wrong programs that escape the public suites. "
              "This is evidence about these specific counterexamples, not exhaustive mutation coverage.", "",
              "Cases include repeated inputs; the unique-input metric exposes that overlap. "
              "The 210 requests are correlated views of 20 tasks, not 210 independent problems.", "",
              "All 20 problem families are evaluation-only. Do not put their derivatives into training. "
              "Canonical DSA problems and published packs can already be present in model pretraining.", "",
              "Boundary cases use independent small-domain oracles. Nine maximum-size DSA expected answers "
              "are constructive analytical answers; the subsets maximum-size case uses the independent oracle. "
              "Correctness checks do not prove asymptotic complexity.", "",
              "Bugfix v0 tests phase 1 only. These are bounded single-file Python incidents, "
              "not a multi-repository autonomous-engineering benchmark.", "",
              "The subprocess limits prevent common accidental hangs and output floods during authored QA. "
              "They do not isolate hostile code or block network/filesystem access; use a hardened sandbox "
              "before executing untrusted model-generated repairs.", "",
              "Model win rate, disclosure rate, diagnosis accuracy, latency, cost, and learning gains "
              "remain unmeasured. See the rubric and annotation template for the next evaluation.", "",
              f"Recipe SHA-256: `{report['recipe_sha256']}`", ""]
    return "\n".join(lines)
