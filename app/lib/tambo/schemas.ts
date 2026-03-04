/**
 * Zod schemas used by Tambo component registrations.
 */

import { z } from "zod/v4";

export const CharacteristicItemSchema = z.object({
  name: z.string().describe("Name of the quality attribute, e.g. 'Scalability', 'Availability'"),
  rating: z.number().min(1).max(5).describe("Importance rating from 1 (low) to 5 (critical)"),
  description: z
    .string()
    .optional()
    .describe("Brief explanation of why this characteristic matters for this system"),
  isTopThree: z
    .boolean()
    .optional()
    .describe("Whether this is one of the top 3 driving characteristics"),
});

export const LogicalComponentItemSchema = z.object({
  name: z.string().describe("Component name, e.g. 'OrderService', 'AuthModule'"),
  responsibility: z.string().optional().describe("What this component is responsible for"),
  dependencies: z
    .array(z.string())
    .optional()
    .describe("Names of other components this depends on"),
  namespace: z
    .string()
    .optional()
    .describe("Logical grouping/namespace, e.g. 'Core', 'Infrastructure'"),
});

export const StyleRatingSchema = z.object({
  characteristic: z.string().describe("Name of the characteristic being rated, e.g. 'Scalability'"),
  rating: z.number().min(1).max(5).describe("Star rating from 1 (poor fit) to 5 (excellent fit)"),
});

export const StyleItemSchema = z.object({
  name: z
    .string()
    .describe("Architecture style name, e.g. 'Microservices', 'Layered', 'Event-Driven'"),
  ratings: z
    .array(StyleRatingSchema)
    .optional()
    .describe(
      "Array of ratings per characteristic, e.g. [{ characteristic: 'Scalability', rating: 4 }]"
    ),
});

export const StepItemSchema = z.object({
  name: z.string().describe("Step name"),
  status: z.enum(["completed", "active", "locked"]).describe("Current status of this step"),
});
