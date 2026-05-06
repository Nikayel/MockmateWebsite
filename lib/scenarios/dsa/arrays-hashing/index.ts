/**
 * Arrays & Hashing DSA Scenarios
 *
 * Split by scenario so each problem is easy to review and update.
 */

import type { DSAScenario } from "../../types"
import { dsaTwoSumScenario } from "./dsa-two-sum"
import { dsaContainsDuplicateScenario } from "./dsa-contains-duplicate"
import { dsaProductArrayExceptSelfScenario } from "./dsa-product-array-except-self"
import { dsaGroupAnagramsScenario } from "./dsa-group-anagrams"
import { dsaLongestConsecutiveSequenceScenario } from "./dsa-longest-consecutive-sequence"
import { dsaFirstMissingPositiveScenario } from "./dsa-first-missing-positive"
import { dsaValidAnagramScenario } from "./dsa-valid-anagram"
import { dsaTopKFrequentElementsScenario } from "./dsa-top-k-frequent-elements"
import { dsaEncodeDecodeStringsScenario } from "./dsa-encode-decode-strings"
import { dsaSubarraySumEqualsKScenario } from "./dsa-subarray-sum-equals-k"
import { dsaFindAllDuplicatesScenario } from "./dsa-find-all-duplicates"
import { dsaNextPermutationScenario } from "./dsa-next-permutation"
import { dsaMajorityElementScenario } from "./dsa-majority-element"
import { dsaRotateArrayScenario } from "./dsa-rotate-array"

export const arraysHashingScenarios: DSAScenario[] = [
  dsaTwoSumScenario,
  dsaContainsDuplicateScenario,
  dsaProductArrayExceptSelfScenario,
  dsaGroupAnagramsScenario,
  dsaLongestConsecutiveSequenceScenario,
  dsaFirstMissingPositiveScenario,
  dsaValidAnagramScenario,
  dsaTopKFrequentElementsScenario,
  dsaEncodeDecodeStringsScenario,
  dsaSubarraySumEqualsKScenario,
  dsaFindAllDuplicatesScenario,
  dsaNextPermutationScenario,
  dsaMajorityElementScenario,
  dsaRotateArrayScenario,
]

export default arraysHashingScenarios
