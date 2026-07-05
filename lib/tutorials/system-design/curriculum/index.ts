/**
 * System Design curriculum tree — twelve levels L0–L11 (see
 * docs/system-design-curriculum/CURRICULUM-MAP.md). AGENT-2 authors levels from the map in
 * curriculum order; levels appear here as they gain their first authored lesson. The registry
 * (`lib/tutorials/system-design/registry.ts`) reads from `SYSTEM_DESIGN_LEVELS`.
 */
import type { DesignLevel } from "@/lib/tutorials/types"
import { systemDesignLevel0 } from "./level0"
import { systemDesignLevel1 } from "./level1"

export const SYSTEM_DESIGN_LEVELS: DesignLevel[] = [systemDesignLevel0, systemDesignLevel1]
