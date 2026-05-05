/**
 * Linked List DSA Scenarios
 */

import type { DSAScenario } from "../../types"
import { reverseLinkedListScenario } from "./dsa-reverse-linked-list"
import { linkedListCycleScenario } from "./dsa-linked-list-cycle"
import { lruCacheScenario } from "./dsa-lru-cache"
import { mergeTwoSortedListsScenario } from "./dsa-merge-two-sorted-lists"
import { copyListRandomPointerScenario } from "./dsa-copy-list-random-pointer"
import { reorderListScenario } from "./dsa-reorder-list"
import { removeNthFromEndScenario } from "./dsa-remove-nth-from-end"
import { addTwoNumbersScenario } from "./dsa-add-two-numbers"
import { linkedListCycleIiScenario } from "./dsa-linked-list-cycle-ii"
import { intersectionTwoLinkedListsScenario } from "./dsa-intersection-two-linked-lists"
import { removeDuplicatesSortedListScenario } from "./dsa-remove-duplicates-sorted-list"
import { palindromeLinkedListScenario } from "./dsa-palindrome-linked-list"
import { middleLinkedListScenario } from "./dsa-middle-linked-list"
import { reverseNodesKGroupScenario } from "./dsa-reverse-nodes-k-group"
import { sortListScenario } from "./dsa-sort-list"
import { swapNodesPairsScenario } from "./dsa-swap-nodes-pairs"

export const linkedListScenarios: DSAScenario[] = [
  reverseLinkedListScenario,
  linkedListCycleScenario,
  lruCacheScenario,
  mergeTwoSortedListsScenario,
  copyListRandomPointerScenario,
  reorderListScenario,
  removeNthFromEndScenario,
  addTwoNumbersScenario,
  linkedListCycleIiScenario,
  intersectionTwoLinkedListsScenario,
  removeDuplicatesSortedListScenario,
  palindromeLinkedListScenario,
  middleLinkedListScenario,
  reverseNodesKGroupScenario,
  sortListScenario,
  swapNodesPairsScenario,
]

export default linkedListScenarios
