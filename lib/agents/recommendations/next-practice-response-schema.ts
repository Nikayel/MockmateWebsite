import { z } from "zod"
import type { NextPracticeResponse } from "./next-practice-types"

/** Validate the network boundary before the card dereferences recommendation fields. */
export const nextPracticeResponseSchema: z.ZodType<NextPracticeResponse> = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("ready"),
      recommendation: z.object({
        scenarioId: z.string().min(1).max(200),
        title: z.string().min(1).max(500),
        type: z.enum(["dsa", "bugfix", "system-design", "add-functionality"]),
        difficulty: z.enum(["easy", "medium", "hard"]),
        estimatedMinutes: z.number().finite().positive(),
        href: z
          .string()
          .max(1500)
          .refine((href) => href.startsWith("/interview?")),
        reason: z.string().max(1000),
        focus: z.string().max(1000),
        focusSource: z.enum(["bugfix-evidence", "score-breakdown", "transfer"]),
        feedbackNote: z.string().max(500).optional(),
      }),
    }),
    z.object({ status: z.enum(["not_ready", "not_found", "no_match", "unavailable"]) }),
  ]
)
