import type { WorkspaceContextFile } from "../_types"

/**
 * File-tree model for the VSCode-style sidebar.
 *
 * The workspace stores files as a flat list with slash-delimited paths
 * (e.g. "app/services/stats_service.py"). The sidebar needs a nested
 * folder/file structure, so `buildFileTree` expands those paths into a tree.
 */

export type FileTreeFileNode = {
  kind: "file"
  /** Basename, e.g. "stats_service.py" */
  name: string
  /** Full flat path — the key passed back to onFileSelect */
  path: string
  file: WorkspaceContextFile
}

export type FileTreeFolderNode = {
  kind: "folder"
  /** Path segment, e.g. "services" */
  name: string
  /** Accumulated prefix, e.g. "app/services" — stable id for expand state */
  path: string
  children: FileTreeNode[]
}

export type FileTreeNode = FileTreeFileNode | FileTreeFolderNode

type MutableFolder = {
  kind: "folder"
  name: string
  path: string
  folders: Map<string, MutableFolder>
  files: FileTreeFileNode[]
}

const createFolder = (name: string, path: string): MutableFolder => ({
  kind: "folder",
  name,
  path,
  folders: new Map(),
  files: [],
})

const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] =>
  // Folders first (VSCode convention), then files; alphabetical within each group.
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

const finalizeFolder = (folder: MutableFolder): FileTreeFolderNode => {
  const childFolders = Array.from(folder.folders.values()).map(finalizeFolder)
  const children = sortNodes([...childFolders, ...folder.files])
  return { kind: "folder", name: folder.name, path: folder.path, children }
}

/**
 * Convert a flat list of workspace files into a nested folder/file tree.
 * Hidden files are dropped. Files at the repo root become top-level file nodes.
 */
export const buildFileTree = (files: WorkspaceContextFile[]): FileTreeNode[] => {
  const root = createFolder("", "")

  for (const file of files) {
    if (file.hidden) continue

    const segments = file.path.split("/").filter(Boolean)
    if (segments.length === 0) continue

    const fileName = segments[segments.length - 1]
    const folderSegments = segments.slice(0, -1)

    let cursor = root
    let prefix = ""
    for (const segment of folderSegments) {
      prefix = prefix ? `${prefix}/${segment}` : segment
      let next = cursor.folders.get(segment)
      if (!next) {
        next = createFolder(segment, prefix)
        cursor.folders.set(segment, next)
      }
      cursor = next
    }

    cursor.files.push({
      kind: "file",
      name: fileName,
      path: file.path,
      file,
    })
  }

  const topFolders = Array.from(root.folders.values()).map(finalizeFolder)
  return sortNodes([...topFolders, ...root.files])
}

/** Collect every folder path in the tree (used to expand all folders by default). */
export const collectFolderPaths = (nodes: FileTreeNode[]): string[] => {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.kind === "folder") {
      paths.push(node.path)
      paths.push(...collectFolderPaths(node.children))
    }
  }
  return paths
}
