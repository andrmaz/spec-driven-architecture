/**
 * Tambo component registrations.
 */

import type { TamboComponent } from "@tambo-ai/react";
import { z } from "zod/v4";

import { CharacteristicsWorksheet } from "../../components/architecture/characteristics-worksheet";
import { LogicalComponentsMap } from "../../components/architecture/logical-components-map";
import { StyleComparisonChart } from "../../components/architecture/style-comparison-chart";
import { DecisionRecord } from "../../components/architecture/decision-record";
import { ArchitectureDiagram } from "../../components/architecture/architecture-diagram";
import { StepProgress } from "../../components/architecture/step-progress";

import {
  CharacteristicItemSchema,
  LogicalComponentItemSchema,
  StyleItemSchema,
  StepItemSchema,
} from "./schemas";

export const components: TamboComponent[] = [
  {
    name: "CharacteristicsWorksheet",
    component: CharacteristicsWorksheet,
    description:
      "Displays a table of architectural characteristics (quality attributes) with star ratings and top-3 highlights. " +
      "Use when the user is identifying or reviewing the driving quality attributes for their system in Step 1.",
    propsSchema: z.object({
      characteristics: z
        .array(CharacteristicItemSchema)
        .optional()
        .describe("List of architectural characteristics with ratings"),
    }),
  },
  {
    name: "LogicalComponentsMap",
    component: LogicalComponentsMap,
    description:
      "Displays a card grid of logical components grouped by namespace, showing responsibilities and dependencies. " +
      "Use when the user is identifying system components in Step 2.",
    propsSchema: z.object({
      components: z
        .array(LogicalComponentItemSchema)
        .optional()
        .describe("List of logical components to display"),
      namespaces: z
        .array(z.string())
        .optional()
        .describe("Ordered list of namespace names for grouping"),
    }),
  },
  {
    name: "StyleComparisonChart",
    component: StyleComparisonChart,
    description:
      "Displays a comparison table of architecture styles rated against the system's characteristics. " +
      "Use when the user is choosing an architecture style in Step 3.",
    propsSchema: z.object({
      styles: z
        .array(StyleItemSchema)
        .optional()
        .describe("List of architecture styles with per-characteristic star ratings"),
      selectedStyle: z
        .string()
        .optional()
        .describe("Name of the selected/recommended architecture style"),
    }),
  },
  {
    name: "DecisionRecord",
    component: DecisionRecord,
    description:
      "Displays a single Architecture Decision Record (ADR) with context, decision, and consequences. " +
      "Use when documenting an architecture decision in Step 4. Render one per decision.",
    propsSchema: z.object({
      title: z.string().optional().describe("Title of the architecture decision"),
      status: z
        .enum(["proposed", "accepted", "deprecated", "superseded"])
        .optional()
        .describe("Current status of this decision"),
      context: z
        .string()
        .optional()
        .describe("The context and problem statement driving this decision"),
      decision: z.string().optional().describe("The decision that was made"),
      consequences: z
        .string()
        .optional()
        .describe("The consequences (positive and negative) of this decision"),
    }),
  },
  {
    name: "ArchitectureDiagram",
    component: ArchitectureDiagram,
    description:
      "Renders a Mermaid.js architecture diagram with code toggle. " +
      "Use when generating diagrams in Step 5. Generate valid Mermaid syntax.",
    propsSchema: z.object({
      title: z.string().optional().describe("Title of the diagram"),
      mermaidCode: z
        .string()
        .optional()
        .describe("Valid Mermaid.js diagram code (flowchart, sequence, C4, etc.)"),
      diagramType: z
        .enum(["context", "container", "component", "sequence", "flowchart"])
        .optional()
        .describe("Type of architecture diagram"),
    }),
  },
  {
    name: "StepProgress",
    component: StepProgress,
    description:
      "Displays a horizontal progress indicator showing all 5 architecture steps. " +
      "Use when transitioning between steps or when the user asks about progress.",
    propsSchema: z.object({
      steps: z.array(StepItemSchema).optional().describe("List of step items with name and status"),
      currentStep: z.number().min(1).max(5).optional().describe("Current active step number (1-5)"),
    }),
  },
];
