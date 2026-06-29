import { describe, expect, it } from "vitest"
import type { WorkspaceContextFile } from "../_types"
import { buildFileTree, collectFolderPaths, type FileTreeFolderNode } from "./fileTree"

const file = (path: string, extra: Partial<WorkspaceContextFile> = {}): WorkspaceContextFile => ({
  path,
  content: "",
  ...extra,
})

describe("buildFileTree", () => {
  it("nests files under their folder segments", () => {
    const tree = buildFileTree([file("app/services/stats_service.py"), file("app/models.py")])

    expect(tree).toHaveLength(1)
    const app = tree[0] as FileTreeFolderNode
    expect(app.kind).toBe("folder")
    expect(app.path).toBe("app")
    // folder "services" sorts before file "models.py"
    expect(app.children.map((c) => c.name)).toEqual(["services", "models.py"])

    const services = app.children[0] as FileTreeFolderNode
    expect(services.path).toBe("app/services")
    expect(services.children[0]).toMatchObject({ kind: "file", name: "stats_service.py" })
  })

  it("keeps root-level files as top-level file nodes", () => {
    const tree = buildFileTree([file("README.md"), file("app/models.py")])
    const names = tree.map((n) => n.name)
    // folder "app" first, then root file "README.md"
    expect(names).toEqual(["app", "README.md"])
    expect(tree[1].kind).toBe("file")
  })

  it("dedupes shared folder prefixes", () => {
    const tree = buildFileTree([file("tests/test_streak.py"), file("tests/test_history_order.py")])
    expect(tree).toHaveLength(1)
    const tests = tree[0] as FileTreeFolderNode
    expect(tests.children).toHaveLength(2)
  })

  it("filters hidden files", () => {
    const tree = buildFileTree([
      file("tests/run_workspace_tests.py", { hidden: true }),
      file("tests/test_streak.py"),
    ])
    const tests = tree[0] as FileTreeFolderNode
    expect(tests.children.map((c) => c.name)).toEqual(["test_streak.py"])
  })

  it("sorts folders before files and alphabetically within each group", () => {
    const tree = buildFileTree([
      file("z_root.py"),
      file("a_root.py"),
      file("zebra/inner.py"),
      file("alpha/inner.py"),
    ])
    expect(tree.map((n) => `${n.kind}:${n.name}`)).toEqual([
      "folder:alpha",
      "folder:zebra",
      "file:a_root.py",
      "file:z_root.py",
    ])
  })

  it("handles a single file", () => {
    const tree = buildFileTree([file("solution.py")])
    expect(tree).toEqual([
      expect.objectContaining({ kind: "file", name: "solution.py", path: "solution.py" }),
    ])
  })
})

describe("collectFolderPaths", () => {
  it("returns every folder path including nested ones", () => {
    const tree = buildFileTree([
      file("app/services/stats_service.py"),
      file("tests/test_streak.py"),
      file("README.md"),
    ])
    expect(collectFolderPaths(tree).sort()).toEqual(["app", "app/services", "tests"])
  })
})
