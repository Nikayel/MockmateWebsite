/**
 * Binary Search DSA Scenarios
 *
 * Split by scenario so each problem is easy to review and update.
 */

import type { DSAScenario } from "../../types"
import { dsaBinarySearchScenario } from "./dsa-binary-search"
import { dsaSearchRotatedSortedArrayScenario } from "./dsa-search-rotated-sorted-array"
import { dsaFindFirstLastPositionScenario } from "./dsa-find-first-last-position"
import { dsaFindMinimumRotatedSortedArrayScenario } from "./dsa-find-minimum-rotated-sorted-array"
import { dsaSearch2dMatrixScenario } from "./dsa-search-2d-matrix"
import { dsaKokoEatingBananasScenario } from "./dsa-koko-eating-bananas"
import { dsaMedianTwoSortedArraysScenario } from "./dsa-median-two-sorted-arrays"
import { dsaFirstBadVersionScenario } from "./dsa-first-bad-version"
import { dsaSearchInsertPositionScenario } from "./dsa-search-insert-position"
import { dsaTimeBasedKeyValueStoreScenario } from "./dsa-time-based-key-value-store"
import { dsaCapacityShipPackagesScenario } from "./dsa-capacity-ship-packages"

export const binarySearchScenarios: DSAScenario[] = [
  dsaBinarySearchScenario,
  dsaSearchRotatedSortedArrayScenario,
  dsaFindFirstLastPositionScenario,
  dsaFindMinimumRotatedSortedArrayScenario,
  dsaSearch2dMatrixScenario,
  dsaKokoEatingBananasScenario,
  dsaMedianTwoSortedArraysScenario,
  dsaFirstBadVersionScenario,
  dsaSearchInsertPositionScenario,
  dsaTimeBasedKeyValueStoreScenario,
  dsaCapacityShipPackagesScenario,
]

export default binarySearchScenarios
