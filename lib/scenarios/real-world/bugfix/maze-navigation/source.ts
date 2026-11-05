export const model = `function createMaze(rows) {
  if (!Array.isArray(rows) || !rows.length || !rows[0].length) throw new Error("Empty maze")
  const width = rows[0].length
  const starts = [], ends = []
  rows.forEach((row, r) => {
    if (typeof row !== "string" || row.length !== width || !/^[SE#.<>^vabcABC]+$/.test(row)) {
      throw new Error("Invalid maze row")
    }
    for (let c = 0; c < width; c++) {
      if (row[c] === "S") starts.push([r, c])
      if (row[c] === "E") ends.push([r, c])
    }
  })
  if (starts.length !== 1 || ends.length !== 1) throw new Error("Expected one start and one exit")
  return { rows: rows.slice(), height: rows.length, width, start: starts[0], end: ends[0] }
}
module.exports = { createMaze }
`

export const solver = `const MOVES = [[0, 1], [1, 0], [0, -1], [-1, 0]]
const ARROWS = { ">": [0, 1], "v": [1, 0], "<": [0, -1], "^": [-1, 0] }

function solveMaze(maze) {
  const queue = [{ at: maze.start, keys: 0, path: [maze.start] }]
  const seen = new Set([maze.start.join(":")])
  for (let head = 0; head < queue.length; head++) {
    const { at: [r, c], keys, path } = queue[head]
    if (r === maze.end[0] && c === maze.end[1]) return path
    for (const [dr, dc] of MOVES) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nc < 0 || nr >= maze.height || nc >= maze.width) continue
      const tile = maze.rows[nr][nc]
      if (tile === "#") continue
      const arrow = ARROWS[tile]
      if (arrow && (arrow[0] !== dr || arrow[1] !== dc)) continue
      if (/[ABC]/.test(tile) && !(keys & (1 << (tile.charCodeAt(0) - 65)))) continue
      const nextKeys = /[abc]/.test(tile) ? keys | (1 << (tile.charCodeAt(0) - 97)) : keys
      const state = nr + ":" + nc
      if (seen.has(state)) continue
      seen.add(state)
      queue.push({ at: [nr, nc], keys: nextKeys, path: [...path, [nr, nc]] })
    }
  }
  return null
}
module.exports = { solveMaze }
`

export const renderer = `function renderPath(maze, path) {
  const cells = maze.rows.map(row => row.split(""))
  for (const [r, c] of path || []) cells[r][c] = "*"
  return cells.map(row => row.join(""))
}
module.exports = { renderPath }
`

export const readme = `# Maze library contract

This is an original practice project. Coordinates are [row, column], zero based.
createMaze(rows) validates a rectangular grid containing one S and one E.
# is a wall; . is open ground. Moves are orthogonal and each costs one step.
An arrow (< > ^ v) restricts the move LEAVING its cell, not the move entering it.
Keys a, b, c are collected on entry and remain held. Doors A, B, C require the
matching key before entry. Keys are not consumed. There are no portals.

solveMaze returns any shortest legal path, including S and E, or null if no
path exists. Every call is independent. Do not change the model's public API.
renderPath returns new row strings, marking only . cells on a path with *.
It preserves S, E, arrows, keys, doors and walls, and must not mutate the maze.
The grid can contain cycles. The three-key limit is fixed in this version.

Work through rendering, ordinary traversal, directional cells, and keys/doors.
Explain how your search state and memory requirements change in the last stage.
`
