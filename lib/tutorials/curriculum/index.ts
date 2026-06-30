/**
 * Assembles the four Python levels into the ordered curriculum the registry serves.
 * Mirrors how `lib/labs/case-labs/index.ts` assembles its content modules.
 */
import type { PythonLevel } from "../types"
import { level1 } from "./level1"
import { level2 } from "./level2"
import { level3 } from "./level3"
import { level4 } from "./level4"

export const PYTHON_LEVELS: PythonLevel[] = [level1, level2, level3, level4]
