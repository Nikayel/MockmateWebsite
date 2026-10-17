import { z } from "zod"

export const conversationEntrySchema = z.object({
  id: z.string().max(200),
  lane: z.enum(["interviewer", "partner"]),
  role: z.enum(["candidate", "interviewer", "ai_partner"]),
  content: z.string().max(10000),
  timestamp: z.number().finite().nonnegative().optional(),
  sequence: z.number().int().nonnegative().optional(),
})
export type ConversationEntry = z.infer<typeof conversationEntrySchema>

export const sessionContextSchema = z.object({
  task: z.object({
    id: z.string().max(200),
    title: z.string().max(500),
    type: z.string().max(50),
    description: z.string().max(50000),
  }),
  baselineVersion: z.string().max(100),
  currentRevision: z.string().max(100),
  files: z
    .array(
      z.object({
        path: z.string().max(1000),
        role: z.string().max(50).optional(),
        originalContent: z.string().max(100000).optional(),
        content: z.string().max(100000),
        status: z.enum(["unchanged", "modified", "baseline_unknown"]),
      })
    )
    .max(100),
  timeline: z.array(conversationEntrySchema).max(2000),
  testRunRevision: z.string().max(100).nullable(),
  testsMatchCurrentRevision: z.boolean(),
})
export type SessionContext = z.infer<typeof sessionContextSchema>
