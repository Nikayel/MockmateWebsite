/**
 * System Design curriculum tree — twelve levels L0–L11 (see
 * docs/system-design-curriculum/CURRICULUM-MAP.md). Only L0 is populated for the vertical slice
 * (one proof lesson); AGENT-2 authors the remaining levels from the map. The registry
 * (`lib/tutorials/system-design/registry.ts`) reads from `SYSTEM_DESIGN_LEVELS`.
 */
import type { DesignLevel } from "@/lib/tutorials/types"
import { systemDesignLevel0 } from "./level0"

export const SYSTEM_DESIGN_LEVELS: DesignLevel[] = [systemDesignLevel0]
