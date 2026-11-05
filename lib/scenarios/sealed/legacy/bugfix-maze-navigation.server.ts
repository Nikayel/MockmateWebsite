import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined")
  throw new Error("Sealed scenario content must never load in the browser.")

const solver = `const MOVES = [[0, 1], [1, 0], [0, -1], [-1, 0]]
const ARROWS = { ">": [0, 1], "v": [1, 0], "<": [0, -1], "^": [-1, 0] }

function solveMaze(maze) {
  const queue = [{ at: maze.start, keys: 0, parent: -1 }]
  const seen = new Set([maze.start.join(":") + ":0"])
  for (let head = 0; head < queue.length; head++) {
    const { at: [r, c], keys } = queue[head]
    if (r === maze.end[0] && c === maze.end[1]) {
      const path = []
      for (let index = head; index !== -1; index = queue[index].parent) path.push(queue[index].at)
      return path.reverse()
    }
    const arrow = ARROWS[maze.rows[r][c]]
    for (const [dr, dc] of arrow ? [arrow] : MOVES) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nc < 0 || nr >= maze.height || nc >= maze.width) continue
      const tile = maze.rows[nr][nc]
      if (tile === "#") continue
      if (/[ABC]/.test(tile) && !(keys & (1 << (tile.charCodeAt(0) - 65)))) continue
      const nextKeys = /[abc]/.test(tile) ? keys | (1 << (tile.charCodeAt(0) - 97)) : keys
      const state = nr + ":" + nc + ":" + nextKeys
      if (seen.has(state)) continue
      seen.add(state)
      queue.push({ at: [nr, nc], keys: nextKeys, parent: head })
    }
  }
  return null
}
module.exports = { solveMaze }
`

const renderer = `function renderPath(maze, path) {
  const cells = maze.rows.map(row => row.split(""))
  for (const [r, c] of path || []) if (cells[r][c] === ".") cells[r][c] = "*"
  return cells.map(row => row.join(""))
}
module.exports = { renderPath }
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-maze-navigation",
  bugDescription:
    "The renderer replaces special cells, movement checks the destination arrow, and visited identity drops the collected-key state.",
  rootCauseRubric: [
    "Separates rendering, direction semantics, and state identity as independent defects.",
    "Tracks keys in traversal state, retains shortest-path ordering, and terminates cyclic searches.",
    "Verifies illegal turns and routes requiring a revisit after key collection.",
    "Distinguishes O(R*C*2^K) parent-pointer storage from copying a whole path into every queued state.",
  ],
  fixTradeoffs:
    "With K <= 3, BFS has O(R*C*2^K) states and constant outgoing degree. Parent pointers reconstruct one path without copying every prefix. A correct minimal patch may retain copied paths; explain its additional time and memory rather than requiring a rewrite.",
  referenceFiles: [
    { path: "src/solver.js", role: "editable", language: "javascript", content: solver },
    { path: "src/render.js", role: "editable", language: "javascript", content: renderer },
  ],
}
