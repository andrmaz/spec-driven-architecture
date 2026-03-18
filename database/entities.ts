/**
 * Single source of truth for all domain entity types and validation schemas.
 * Derives server validation schemas and client types from the Drizzle schema,
 * eliminating drift between DB, server, client, and Tambo AI representations.
 */

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import * as schema from "./schema";

// ── Select types (what the DB returns) ─────────────────

export type Project = typeof schema.projects.$inferSelect;
export type Characteristic = typeof schema.architecturalCharacteristics.$inferSelect;
export type LogicalComponent = typeof schema.logicalComponents.$inferSelect;
export type ArchitecturalStyle = typeof schema.architecturalStyles.$inferSelect;
export type ArchitectureDecision = typeof schema.architectureDecisions.$inferSelect;
export type ArchitectureDiagram = typeof schema.architectureDiagrams.$inferSelect;

export interface ProjectWithRelations extends Project {
  characteristics: Characteristic[];
  components: LogicalComponent[];
  styles: ArchitecturalStyle[];
  decisions: ArchitectureDecision[];
  diagrams: ArchitectureDiagram[];
}

// ── Insert schemas (server validation) ─────────────────

export const ProjectCreate = createInsertSchema(schema.projects, {
  name: z.string().min(1).max(255),
})
  .omit({ id: true, createdAt: true, updatedAt: true })
  .pick({ name: true, description: true });

export const ProjectUpdate = createInsertSchema(schema.projects, {
  name: z.string().min(1).max(255),
  currentStep: z.number().int().min(1).max(6),
  tamboThreadId: z.string().max(255),
})
  .pick({ name: true, description: true, currentStep: true, tamboThreadId: true })
  .partial();

export const CharacteristicInsert = createInsertSchema(schema.architecturalCharacteristics, {
  name: z.string().min(1).max(255),
  rating: z.number().int().min(0).max(5),
}).omit({ id: true, projectId: true });

export const ComponentInsert = createInsertSchema(schema.logicalComponents, {
  name: z.string().min(1).max(255),
}).omit({ id: true, projectId: true });

export const StyleInsert = createInsertSchema(schema.architecturalStyles, {
  styleName: z.string().min(1).max(255),
  starRatings: z.record(z.string(), z.number()).optional().nullable(),
}).omit({ id: true, projectId: true });

export const DecisionInsert = createInsertSchema(schema.architectureDecisions, {
  title: z.string().min(1).max(500),
  status: z.enum(["proposed", "accepted", "deprecated", "superseded"]).optional(),
}).omit({ id: true, projectId: true, createdAt: true });

export const DiagramInsert = createInsertSchema(schema.architectureDiagrams, {
  title: z.string().min(1).max(500),
  mermaidCode: z.string().min(1),
  diagramType: z.enum(["context", "container", "component", "sequence", "flowchart"]),
}).omit({ id: true, projectId: true });

// ── Tambo AI-described schemas ─────────────────────────

function withDescriptions<T extends { shape: Readonly<Record<string, z.ZodType>> }>(
  baseSchema: T,
  descriptions: Partial<Record<string, string>>
): z.ZodObject<Record<string, z.ZodType>> {
  const newShape: Record<string, z.ZodType> = {};
  for (const [key, fieldSchema] of Object.entries(baseSchema.shape)) {
    const desc = descriptions[key];
    newShape[key] = desc ? fieldSchema.describe(desc) : fieldSchema;
  }
  return z.object(newShape);
}

export const TamboCharacteristic = withDescriptions(CharacteristicInsert, {
  name: "Name of the quality attribute, e.g. 'Scalability', 'Availability'",
  rating: "Importance rating from 1 (low) to 5 (critical)",
  description: "Brief explanation of why this characteristic matters",
  isTopThree: "Whether this is one of the top 3 driving characteristics",
});

export const TamboComponent = withDescriptions(ComponentInsert, {
  name: "Component name, e.g. 'OrderService', 'AuthModule'",
  responsibility: "What this component is responsible for",
  dependencies: "Names of other components this depends on",
  namespace: "Logical grouping/namespace, e.g. 'Core', 'Infrastructure'",
});

export const TamboDecision = withDescriptions(DecisionInsert, {
  title: "Title of the decision",
  context: "Context and problem statement",
  decision: "The decision made",
  consequences: "Consequences of the decision",
});

export const TamboDiagram = withDescriptions(DiagramInsert, {
  title: "Descriptive diagram title",
  mermaidCode: "Valid Mermaid.js diagram code",
  diagramType: "C4/architecture diagram type",
});

// Style: shape genuinely diverges (AI uses name+ratings[] vs DB styleName+starRatings Record)
export const TamboStyleRating = z.object({
  characteristic: z.string().describe("Name of the characteristic being rated"),
  rating: z.number().min(1).max(5).describe("Star rating from 1 (poor) to 5 (excellent)"),
});

export const TamboStyle = z.object({
  name: z.string().describe("Architecture style name, e.g. 'Microservices', 'Layered'"),
  ratings: z.array(TamboStyleRating).optional().describe("Per-characteristic star ratings"),
});

// ── Style shape mapping ────────────────────────────────

export function tamboStyleToDb(item: z.infer<typeof TamboStyle>): z.infer<typeof StyleInsert> {
  const starRatings: Record<string, number> = {};
  for (const r of item.ratings ?? []) {
    starRatings[r.characteristic] = r.rating;
  }
  return { styleName: item.name, starRatings, isSelected: false };
}
