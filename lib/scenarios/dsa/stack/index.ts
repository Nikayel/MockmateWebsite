/**
 * Stack DSA Scenarios
 *
 * Split by scenario so each problem is easy to review and update.
 */

import type { DSAScenario } from "../../types"
import { dsaValidParenthesesScenario } from "./dsa-valid-parentheses"
import { dsaMinStackScenario } from "./dsa-min-stack"
import { dsaDailyTemperaturesScenario } from "./dsa-daily-temperatures"
import { dsaLargestRectangleHistogramScenario } from "./dsa-largest-rectangle-histogram"
import { dsaEvaluateReversePolishScenario } from "./dsa-evaluate-reverse-polish"
import { dsaDecodeStringScenario } from "./dsa-decode-string"
import { dsaAsteroidCollisionScenario } from "./dsa-asteroid-collision"
import { dsaSimplifyPathScenario } from "./dsa-simplify-path"
import { dsaBasicCalculatorScenario } from "./dsa-basic-calculator"
import { dsaRemoveDuplicatesStringScenario } from "./dsa-remove-duplicates-string"
import { dsaLongestValidParenthesesScenario } from "./dsa-longest-valid-parentheses"
import { dsaCarFleetScenario } from "./dsa-car-fleet"
import { dsaTrappingRainWaterScenario } from "./dsa-trapping-rain-water"
import { dsaNextGreaterElementIScenario } from "./dsa-next-greater-element-i"
import { dsaNextGreaterElementIiScenario } from "./dsa-next-greater-element-ii"
import { dsaOnlineStockSpanScenario } from "./dsa-online-stock-span"
import { dsa132PatternScenario } from "./dsa-132-pattern"
import { dsaMaxFrequencyStackScenario } from "./dsa-max-frequency-stack"

export const stackScenarios: DSAScenario[] = [
  dsaValidParenthesesScenario,
  dsaMinStackScenario,
  dsaDailyTemperaturesScenario,
  dsaLargestRectangleHistogramScenario,
  dsaEvaluateReversePolishScenario,
  dsaDecodeStringScenario,
  dsaAsteroidCollisionScenario,
  dsaSimplifyPathScenario,
  dsaBasicCalculatorScenario,
  dsaRemoveDuplicatesStringScenario,
  dsaLongestValidParenthesesScenario,
  dsaCarFleetScenario,
  dsaTrappingRainWaterScenario,
  dsaNextGreaterElementIScenario,
  dsaNextGreaterElementIiScenario,
  dsaOnlineStockSpanScenario,
  dsa132PatternScenario,
  dsaMaxFrequencyStackScenario,
]

export default stackScenarios
