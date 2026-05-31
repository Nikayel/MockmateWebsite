import { z } from "zod"

export const extractionResultSchema = z.object({
  approachExplained: z.boolean(),
  approachType: z.enum(["none", "brute_force", "optimized", "unclear"]),
  approachQuality: z.enum(["none", "vague", "specific", "detailed"]),
  timeComplexityMentioned: z.boolean(),
  timeComplexityValue: z.string().nullable(),
  dominantComplexity: z.string().nullable(),
  spaceComplexityMentioned: z.boolean(),
  spaceComplexityValue: z.string().nullable(),
  complexityExplanationGiven: z.boolean(),
  complexityIsAccurate: z.boolean().nullable(),
  edgeCasesMentioned: z.array(z.string()),
  clarifyingQuestionsAsked: z.boolean(),
  answeredInterviewerQuestions: z.number().int().min(0),
})

export type ValidatedExtractionResult = z.infer<typeof extractionResultSchema>

export const EXTRACTION_JSON_EXAMPLE = `{
  "approachExplained": true,
  "approachType": "optimized",
  "approachQuality": "specific",
  "timeComplexityMentioned": true,
  "timeComplexityValue": "O(n)",
  "dominantComplexity": "O(n)",
  "spaceComplexityMentioned": true,
  "spaceComplexityValue": "O(n)",
  "complexityExplanationGiven": true,
  "complexityIsAccurate": true,
  "edgeCasesMentioned": ["empty array", "duplicates"],
  "clarifyingQuestionsAsked": false,
  "answeredInterviewerQuestions": 2
}`
