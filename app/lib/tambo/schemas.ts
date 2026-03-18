/**
 * Zod schemas used by Tambo component registrations.
 */

import { z } from "zod/v4";

export {
  TamboCharacteristic as CharacteristicItemSchema,
  TamboComponent as LogicalComponentItemSchema,
  TamboStyleRating as StyleRatingSchema,
  TamboStyle as StyleItemSchema,
} from "~/database/entities";

export const StepItemSchema = z.object({
  name: z.string().describe("Step name"),
  status: z.enum(["completed", "active", "locked"]).describe("Current status of this step"),
});

export const MultipleChoiceOptionSchema = z.object({
  label: z.string().describe("Short label for this choice"),
  description: z
    .string()
    .optional()
    .describe("Optional longer explanation of what this choice means"),
});

export const MultipleChoiceQuestionSchema = z.object({
  question: z.string().describe("The question to ask the user"),
  options: z
    .array(MultipleChoiceOptionSchema)
    .describe("2-5 clickable options the user can pick from"),
});
