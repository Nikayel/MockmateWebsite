/**
 * Trees DSA Scenarios
 */

import type { DSAScenario } from "../../types"
import { invertBinaryTreeScenario } from "./dsa-invert-binary-tree"
import { sameTreeScenario } from "./dsa-same-tree"
import { maximumDepthBinaryTreeScenario } from "./dsa-maximum-depth-binary-tree"
import { symmetricTreeScenario } from "./dsa-symmetric-tree"
import { subtreeOfAnotherTreeScenario } from "./dsa-subtree-of-another-tree"
import { balancedBinaryTreeScenario } from "./dsa-balanced-binary-tree"
import { binaryTreeRightSideViewScenario } from "./dsa-binary-tree-right-side-view"
import { countGoodNodesScenario } from "./dsa-count-good-nodes"
import { constructBinaryTreePreorderInorderScenario } from "./dsa-construct-binary-tree-preorder-inorder"
import { binaryTreeInorderScenario } from "./dsa-binary-tree-inorder"
import { serializeDeserializeTreeScenario } from "./dsa-serialize-deserialize-tree"
import { binaryTreeMaxPathSumScenario } from "./dsa-binary-tree-max-path-sum"
import { lowestCommonAncestorBinaryTreeScenario } from "./dsa-lowest-common-ancestor-binary-tree"
import { binaryTreeLevelOrderScenario } from "./dsa-binary-tree-level-order"
import { diameterOfBinaryTreeScenario } from "./dsa-diameter-of-binary-tree"
import { pathSumScenario } from "./dsa-path-sum"
import { pathSumIiScenario } from "./dsa-path-sum-ii"
import { flattenBinaryTreeScenario } from "./dsa-flatten-binary-tree"
import { sumRootToLeafScenario } from "./dsa-sum-root-to-leaf"
import { populatingNextRightScenario } from "./dsa-populating-next-right"
import { validateBstScenario } from "./dsa-validate-bst"
import { binaryTreeZigzagScenario } from "./dsa-binary-tree-zigzag"
import { allNodesDistanceKScenario } from "./dsa-all-nodes-distance-k"
import { verticalOrderTraversalScenario } from "./dsa-vertical-order-traversal"
import { recoverBstScenario } from "./dsa-recover-bst"

export const treesScenarios: DSAScenario[] = [
  invertBinaryTreeScenario,
  sameTreeScenario,
  maximumDepthBinaryTreeScenario,
  symmetricTreeScenario,
  subtreeOfAnotherTreeScenario,
  balancedBinaryTreeScenario,
  binaryTreeRightSideViewScenario,
  countGoodNodesScenario,
  constructBinaryTreePreorderInorderScenario,
  binaryTreeInorderScenario,
  serializeDeserializeTreeScenario,
  binaryTreeMaxPathSumScenario,
  lowestCommonAncestorBinaryTreeScenario,
  binaryTreeLevelOrderScenario,
  diameterOfBinaryTreeScenario,
  pathSumScenario,
  pathSumIiScenario,
  flattenBinaryTreeScenario,
  sumRootToLeafScenario,
  populatingNextRightScenario,
  validateBstScenario,
  binaryTreeZigzagScenario,
  allNodesDistanceKScenario,
  verticalOrderTraversalScenario,
  recoverBstScenario,
]

export default treesScenarios
