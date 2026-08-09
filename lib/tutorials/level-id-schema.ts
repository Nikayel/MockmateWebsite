/**
 * The runtime half of `TutorialLevelId`.
 *
 * `lib/tutorials/types.ts` declares the accepted level range as a TypeScript
 * union, and every request body carrying a `levelId` has to re-state it as a
 * Zod union because types are erased before the server ever sees the body.
 * That restatement existed twice, once in `./progress` and once in
 * `./item-responses`, which write to two different collections from two
 * different endpoints. Adding a level to one and not the other would have
 * saved a learner's lesson progress while 400-ing the telemetry for the same
 * action, losing the attempt trajectory silently rather than loudly.
 *
 * Lives in its own module rather than in `./types` because that file is
 * imported by client components, and Zod does not belong in their bundles.
 *
 * A union of literals rather than `z.number().min(0).max(11)` so `z.infer`
 * narrows to `TutorialLevelId` instead of a bare `number`.
 */
import { z } from "zod"

export const tutorialLevelIdSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
  z.literal(11),
])
