/**
 * Graphs DSA Scenarios
 */

import type { DSAScenario } from "../../types"
import { numberOfIslandsScenario } from "./dsa-number-of-islands"
import { courseScheduleScenario } from "./dsa-course-schedule"
import { cloneGraphScenario } from "./dsa-clone-graph"
import { wordLadderScenario } from "./dsa-word-ladder"
import { pacificAtlanticWaterFlowScenario } from "./dsa-pacific-atlantic-water-flow"
import { rottingOrangesScenario } from "./dsa-rotting-oranges"
import { graphValidTreeScenario } from "./dsa-graph-valid-tree"
import { courseScheduleIiScenario } from "./dsa-course-schedule-ii"
import { alienDictionaryScenario } from "./dsa-alien-dictionary"
import { allPathsSourceTargetScenario } from "./dsa-all-paths-source-target"
import { surroundedRegionsScenario } from "./dsa-surrounded-regions"
import { numberConnectedComponentsScenario } from "./dsa-number-connected-components"
import { redundantConnectionScenario } from "./dsa-redundant-connection"
import { networkDelayTimeScenario } from "./dsa-network-delay-time"
import { cheapestFlightsKStopsScenario } from "./dsa-cheapest-flights-k-stops"
import { minCostConnectPointsScenario } from "./dsa-min-cost-connect-points"
import { accountsMergeScenario } from "./dsa-accounts-merge"
import { swimInRisingWaterScenario } from "./dsa-swim-in-rising-water"
import { wallsAndGatesScenario } from "./dsa-walls-and-gates"
import { shortestPathBinaryMatrixScenario } from "./dsa-shortest-path-binary-matrix"
import { openTheLockScenario } from "./dsa-open-the-lock"
import { evaluateDivisionScenario } from "./dsa-evaluate-division"
import { isGraphBipartiteScenario } from "./dsa-is-graph-bipartite"
import { findPathExistsScenario } from "./dsa-find-path-exists"
import { keysAndRoomsScenario } from "./dsa-keys-and-rooms"
import { snakesAndLaddersScenario } from "./dsa-snakes-and-ladders"
import { findTownJudgeScenario } from "./dsa-find-town-judge"

export const graphsScenarios: DSAScenario[] = [
  numberOfIslandsScenario,
  courseScheduleScenario,
  cloneGraphScenario,
  wordLadderScenario,
  pacificAtlanticWaterFlowScenario,
  rottingOrangesScenario,
  graphValidTreeScenario,
  courseScheduleIiScenario,
  alienDictionaryScenario,
  allPathsSourceTargetScenario,
  surroundedRegionsScenario,
  numberConnectedComponentsScenario,
  redundantConnectionScenario,
  networkDelayTimeScenario,
  cheapestFlightsKStopsScenario,
  minCostConnectPointsScenario,
  accountsMergeScenario,
  swimInRisingWaterScenario,
  wallsAndGatesScenario,
  shortestPathBinaryMatrixScenario,
  openTheLockScenario,
  evaluateDivisionScenario,
  isGraphBipartiteScenario,
  findPathExistsScenario,
  keysAndRoomsScenario,
  snakesAndLaddersScenario,
  findTownJudgeScenario,
]

export default graphsScenarios
