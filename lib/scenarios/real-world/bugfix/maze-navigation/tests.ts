export const visibleTests = `const assert = require("node:assert/strict")
const { createMaze } = require("../src/maze")
const { solveMaze } = require("../src/solver")
const { renderPath } = require("../src/render")

async function runTests(record) {
  await record("rendering keeps the start and exit labels", () => {
    const maze = createMaze(["S.E"])
    assert.deepEqual(renderPath(maze, [[0, 0], [0, 1], [0, 2]]), ["S*E"])
    assert.deepEqual(maze.rows, ["S.E"])
  })
  await record("ordinary traversal finds a shortest path", () => {
    const path = solveMaze(createMaze(["S..", "##E"]))
    assert.equal(path.length, 4)
    assert.deepEqual(path[0], [0, 0])
    assert.deepEqual(path[path.length - 1], [1, 2])
  })
  await record("a directional corridor can be entered from above", () => {
    assert.deepEqual(solveMaze(createMaze(["#S##", "#>.E", "####"])),
      [[0, 1], [1, 1], [1, 2], [1, 3]])
  })
  await record("a door detour preserves access to the main corridor", () => {
    const path = solveMaze(createMaze(["S.AE", ".###", "a###"]))
    assert.equal(path.length, 8)
    assert.deepEqual(path[path.length - 1], [0, 3])
  })
}
module.exports = { runTests }
`

export const hiddenTests = `const assert = require("node:assert/strict")
const { createMaze } = require("../src/maze")
const { solveMaze } = require("../src/solver")
const { renderPath } = require("../src/render")

function checkPath(rows, expectedSteps) {
  const maze = createMaze(rows)
  const path = solveMaze(maze)
  if (expectedSteps === null) { assert.equal(path, null); return }
  assert.equal(path.length - 1, expectedSteps)
  assert.deepEqual(path[0], maze.start)
  assert.deepEqual(path[path.length - 1], maze.end)
  let keys = new Set()
  const arrows = { ">": [0, 1], "v": [1, 0], "<": [0, -1], "^": [-1, 0] }
  for (let i = 1; i < path.length; i++) {
    const [pr, pc] = path[i - 1], [r, c] = path[i]
    assert.ok(r >= 0 && c >= 0 && r < maze.height && c < maze.width)
    assert.equal(Math.abs(r - pr) + Math.abs(c - pc), 1)
    const tile = rows[r][c], arrow = arrows[rows[pr][pc]]
    assert.notEqual(tile, "#")
    if (arrow) assert.deepEqual([r - pr, c - pc], arrow)
    if (/[ABC]/.test(tile)) assert.ok(keys.has(tile.toLowerCase()))
    if (/[abc]/.test(tile)) keys.add(tile)
  }
}

async function runTests(record) {
  await record("an arrow cannot turn toward an adjacent exit", () => {
    checkPath(["S>#", "#E#"], null)
  })
  await record("an unreachable exit in a cyclic region terminates", () => {
    checkPath(["S..#E", ".#.#.", "...#."], null)
  })
  await record("a locked door does not become passable without its key", () => {
    checkPath(["SAE"], null)
  })
  await record("directional corridors preserve all four exit orientations", () => {
    checkPath(["S..", "#v#", "#.#", "#E#"], 4)
    checkPath(["##S#", "E.<#", "####"], 3)
    checkPath(["#E#", "#.#", "#^S"], 3)
  })
  await record("two keys remain available after backtracking", () => {
    checkPath(["S.A.BE", ".#####", "a.b###"], 13)
  })
  await record("key collection does not add unnecessary detours", () => {
    checkPath(["SaAE"], 3)
  })
  await record("a shorter route wins over the first available detour", () => {
    checkPath(["S....", ".###.", ".E..."], 3)
  })
  await record("all three key and door pairs obey the same contract", () => {
    checkPath(["SabcABCE"], 7)
    checkPath(["SCE"], null)
  })
  await record("rendering preserves every special cell and the original maze", () => {
    const maze = createMaze(["SaA>E"])
    assert.deepEqual(renderPath(maze, [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]), ["SaA>E"])
    assert.deepEqual(renderPath(maze, null), maze.rows)
  })
  await record("search state does not outlive a request", () => {
    checkPath(["SaAE"], 3)
    checkPath(["SA.E"], null)
    checkPath(["S.E"], 2)
  })
}
module.exports = { runTests }
`
