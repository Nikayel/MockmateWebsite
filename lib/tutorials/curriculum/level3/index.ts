/**
 * Level 3: Patterns (workspace). The syntax real codebases run on, drilled across real files.
 *
 * Agent 1 seeds ONE sample workspace lesson here (`py-l3-parse-config`) as proof of the multi-file
 * path; Agent 2 authors the rest. The lesson pairs a single-file warm-up (`apply`: implement the
 * `coerce` helper) with a workspace challenge (`practice`: build `parse_config` across files, using
 * the now-readonly `coerce`).
 *
 * Workspace authoring contract (verified against the production bugfix labs + the client Pyodide
 * runner): every Python package dir needs an `__init__.py`; the runner (`role:"test"`,
 * `hidden:true`) does `sys.path.insert(0, os.getcwd())`, imports the test modules, runs each
 * module's `run_tests(record)`, and prints `__WORKSPACE_TEST_RESULTS__:` + JSON. `isHidden` is
 * derived from `"hidden" in suite.lower()`. Hidden files never reach the editor, so hidden-test
 * source can't leak, but they still execute.
 */
import type { PythonLevel } from "../../types"
import { parseConfigLesson } from "./parse-config"
import { packagesLesson } from "./packages"
import { typeHintsLesson } from "./type-hints"
import { typingModuleLesson } from "./typing-module"
import { pytestBasicsLesson } from "./pytest-basics"
import { pytestFixturesLesson } from "./pytest-fixtures"
import { pathlibLesson } from "./pathlib"
import { loggingErrorsLesson } from "./logging-errors"
import { cliLesson } from "./cli"
import { restPydanticLesson } from "./rest-pydantic"
import { sqliteParameterizedLesson } from "./sqlite-parameterized"
import { uvPyprojectCapstoneLesson } from "./uv-pyproject-capstone"
import { numpyArraysLesson } from "./numpy-arrays"
import { pandasDataframesLesson } from "./pandas-dataframes"

export const level3: PythonLevel = {
  id: 3,
  slug: "applied",
  title: "Level 3: Patterns",
  tagline: "The production-shaped syntax: modules, imports, and working across real files.",
  defaultExecutionMode: "workspace",
  estimatedHours: 4,
  modules: [
    {
      id: "py-l3-project-structure",
      title: "Project Structure & Packaging",
      description: "Lay out a multi-file package with a clear entry point.",
      lessons: [packagesLesson],
    },
    {
      id: "py-l3-working-across-files",
      title: "Working across files",
      description: "Follow imports and change code across a small multi-file Python package.",
      lessons: [parseConfigLesson],
    },
    {
      id: "py-l3-typing",
      title: "Type Hints & Static Typing",
      description: "Annotate functions and classes for clarity and static checking.",
      lessons: [typeHintsLesson, typingModuleLesson],
    },
    {
      id: "py-l3-testing-pytest",
      title: "Testing with pytest",
      description: "Drive a module with pytest assertions, fixtures, and parametrize.",
      lessons: [pytestBasicsLesson, pytestFixturesLesson],
    },
    {
      id: "py-l3-files-data-robustness",
      title: "Files, Data & Robustness",
      description: "Read files with pathlib and design resilient error handling.",
      lessons: [pathlibLesson, loggingErrorsLesson],
    },
    {
      id: "py-l3-real-programs",
      title: "Real Programs & Tooling",
      description:
        "Build a CLI, validate API data, query a database safely, and package a small project with pyproject/uv.",
      lessons: [
        cliLesson,
        restPydanticLesson,
        sqliteParameterizedLesson,
        uvPyprojectCapstoneLesson,
      ],
    },
    {
      id: "py-l3-data-track",
      title: "Optional: the data track (numpy & pandas)",
      description:
        "An optional detour for data engineering and analytics roles. Skip it if you are heading for backend or platform work.",
      lessons: [numpyArraysLesson, pandasDataframesLesson],
    },
  ],
}
