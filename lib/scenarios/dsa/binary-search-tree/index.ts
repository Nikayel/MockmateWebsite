/**
 * Binary Search Tree DSA Scenarios
 *
 * Split by scenario so each problem is easy to review and update.
 */

import type { DSAScenario } from "../../types"
import { dsaValidBinarySearchTreeScenario } from "./dsa-valid-binary-search-tree"
import { dsaLowestCommonAncestorBstScenario } from "./dsa-lowest-common-ancestor-bst"
import { dsaKthSmallestBstScenario } from "./dsa-kth-smallest-bst"
import { dsaDeleteNodeBstScenario } from "./dsa-delete-node-bst"
import { dsaConvertSortedArrayBstScenario } from "./dsa-convert-sorted-array-bst"
import { dsaTwoSumBstScenario } from "./dsa-two-sum-bst"
import { dsaBstIteratorScenario } from "./dsa-bst-iterator"
import { dsaRangeSumBstScenario } from "./dsa-range-sum-bst"
import { dsaSerializeDeserializeBstScenario } from "./dsa-serialize-deserialize-bst"
import { dsaClosestBstValueScenario } from "./dsa-closest-bst-value"
import { dsaInorderSuccessorBstScenario } from "./dsa-inorder-successor-bst"

export const binarySearchTreeScenarios: DSAScenario[] = [
  dsaValidBinarySearchTreeScenario,
  dsaLowestCommonAncestorBstScenario,
  dsaKthSmallestBstScenario,
  dsaDeleteNodeBstScenario,
  dsaConvertSortedArrayBstScenario,
  dsaTwoSumBstScenario,
  dsaBstIteratorScenario,
  dsaRangeSumBstScenario,
  dsaSerializeDeserializeBstScenario,
  dsaClosestBstValueScenario,
  dsaInorderSuccessorBstScenario,
]

export default binarySearchTreeScenarios
