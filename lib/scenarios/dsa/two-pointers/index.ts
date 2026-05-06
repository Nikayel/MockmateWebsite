/**
 * Two Pointers DSA Scenarios
 *
 * Split by scenario so each problem is easy to review and update.
 */

import type { DSAScenario } from "../../types"
import { dsa3sumScenario } from "./dsa-3sum"
import { dsaTrappingRainWaterTwoPointersScenario } from "./dsa-trapping-rain-water-two-pointers"
import { dsaContainerWithMostWaterScenario } from "./dsa-container-with-most-water"
import { dsaLongestPalindromicSubstringScenario } from "./dsa-longest-palindromic-substring"
import { dsaRemoveDuplicatesSortedArrayScenario } from "./dsa-remove-duplicates-sorted-array"
import { dsaMoveZeroesScenario } from "./dsa-move-zeroes"
import { dsaValidPalindromeScenario } from "./dsa-valid-palindrome"
import { dsaSortColorsScenario } from "./dsa-sort-colors"
import { dsaReverseStringScenario } from "./dsa-reverse-string"
import { dsaPartitionLabelsScenario } from "./dsa-partition-labels"
import { dsaTwoSumIiSortedScenario } from "./dsa-two-sum-ii-sorted"
import { dsa4sumScenario } from "./dsa-4sum"
import { dsaSquaresSortedArrayScenario } from "./dsa-squares-sorted-array"
import { dsaBoatsSavePeopleScenario } from "./dsa-boats-save-people"
import { dsaMergeSortedArrayScenario } from "./dsa-merge-sorted-array"
import { dsaEvenOddIndexSumDifferenceScenario } from "./dsa-even-odd-index-sum-difference"
import { dsaStudentHighestAverageScenario } from "./dsa-student-highest-average"

export const twoPointersScenarios: DSAScenario[] = [
  dsa3sumScenario,
  dsaTrappingRainWaterTwoPointersScenario,
  dsaContainerWithMostWaterScenario,
  dsaLongestPalindromicSubstringScenario,
  dsaRemoveDuplicatesSortedArrayScenario,
  dsaMoveZeroesScenario,
  dsaValidPalindromeScenario,
  dsaSortColorsScenario,
  dsaReverseStringScenario,
  dsaPartitionLabelsScenario,
  dsaTwoSumIiSortedScenario,
  dsa4sumScenario,
  dsaSquaresSortedArrayScenario,
  dsaBoatsSavePeopleScenario,
  dsaMergeSortedArrayScenario,
  dsaEvenOddIndexSumDifferenceScenario,
  dsaStudentHighestAverageScenario,
]

export default twoPointersScenarios
