/**
 * @file tambo.ts
 * @description Central configuration for Tambo components and tools.
 *
 * Registers architecture documentation components and persistence tools
 * for the multi-step architecture assistant workflow.
 */

import type { TamboComponent, TamboTool } from "@tambo-ai/react";
import { defineTool } from "@tambo-ai/react";
import { z } from "zod/v4";

import { CharacteristicsWorksheet } from "../components/architecture/characteristics-worksheet";
import { LogicalComponentsMap } from "../components/architecture/logical-components-map";
import { StyleComparisonChart } from "../components/architecture/style-comparison-chart";
import { DecisionRecord } from "../components/architecture/decision-record";
import { ArchitectureDiagram } from "../components/architecture/architecture-diagram";
import { StepProgress } from "../components/architecture/step-progress";

import * as api from "./api";

// ── Zod Schemas ────────────────────────────────────────

const CharacteristicItemSchema = z.object({
  name: z.string().describe("Name of the quality attribute, e.g. 'Scalability', 'Availability'"),
  rating: z.number().min(1).max(5).describe("Importance rating from 1 (low) to 5 (critical)"),
  description: z
    .string()
    .describe("Brief explanation of why this characteristic matters for this system"),
  isTopThree: z.boolean().describe("Whether this is one of the top 3 driving characteristics"),
});

const LogicalComponentItemSchema = z.object({
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

const StyleRatingSchema = z.object({
  characteristic: z.string().describe("Name of the characteristic being rated, e.g. 'Scalability'"),
  rating: z.number().min(1).max(5).describe("Star rating from 1 (poor fit) to 5 (excellent fit)"),
});

const StyleItemSchema = z.object({
  name: z
    .string()
    .describe("Architecture style name, e.g. 'Microservices', 'Layered', 'Event-Driven'"),
  ratings: z
    .array(StyleRatingSchema)
    .describe(
      "Array of ratings per characteristic, e.g. [{ characteristic: 'Scalability', rating: 4 }]"
    ),
});

const StepItemSchema = z.object({
  name: z.string().describe("Step name"),
  status: z.enum(["completed", "active", "locked"]).describe("Current status of this step"),
});

// ── Components ─────────────────────────────────────────

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
      title: z.string().describe("Title of the architecture decision"),
      status: z
        .enum(["proposed", "accepted", "deprecated", "superseded"])
        .describe("Current status of this decision"),
      context: z.string().describe("The context and problem statement driving this decision"),
      decision: z.string().describe("The decision that was made"),
      consequences: z
        .string()
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
      title: z.string().describe("Title of the diagram"),
      mermaidCode: z
        .string()
        .describe("Valid Mermaid.js diagram code (flowchart, sequence, C4, etc.)"),
      diagramType: z
        .enum(["context", "container", "component", "sequence", "flowchart"])
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
      steps: z.array(StepItemSchema).describe("List of step items with name and status"),
      currentStep: z.number().min(1).max(5).describe("Current active step number (1-5)"),
    }),
  },
];

// ── Tools ──────────────────────────────────────────────

export function createTools(projectId: string): TamboTool[] {
  const saveCharacteristicsTool = defineTool({
    name: "saveCharacteristics",
    description:
      "Save the identified architectural characteristics to the database. Call this when the user is satisfied with the characteristics worksheet.",
    inputSchema: z.object({
      characteristics: z
        .array(CharacteristicItemSchema)
        .describe("The complete list of architectural characteristics to save"),
    }),
    tool: async ({ characteristics }) => {
      const valid = (characteristics ?? []).filter((c) => c.name);
      if (valid.length > 0) {
        await api.saveCharacteristics(projectId, valid);
      }
      return { success: true, message: "Characteristics saved successfully" };
    },
  });

  const saveLogicalComponentsTool = defineTool({
    name: "saveLogicalComponents",
    description:
      "Save the identified logical components to the database. Call this when the user is satisfied with the component map.",
    inputSchema: z.object({
      components: z
        .array(LogicalComponentItemSchema)
        .describe("The complete list of logical components to save"),
    }),
    tool: async ({ components }) => {
      const valid = (components ?? []).filter((c) => c.name);
      if (valid.length > 0) {
        await api.saveComponents(
          projectId,
          valid.map((c) => ({
            ...c,
            dependencies: c.dependencies ?? undefined,
            namespace: c.namespace ?? undefined,
            responsibility: c.responsibility ?? undefined,
          }))
        );
      }
      return { success: true, message: "Components saved successfully" };
    },
  });

  const saveArchitectureStyleTool = defineTool({
    name: "saveArchitectureStyle",
    description:
      "Save the architecture style comparison and selection to the database. Call this after the user has chosen an architecture style.",
    inputSchema: z.object({
      styles: z
        .array(
          z.object({
            styleName: z.string().describe("Name of the architecture style"),
            rationale: z.string().optional().describe("Rationale for this style's ratings"),
            starRatings: z
              .array(
                z.object({
                  characteristic: z.string().describe("Characteristic name"),
                  rating: z.number().min(1).max(5).describe("Star rating 1-5"),
                })
              )
              .describe(
                "Array of ratings per characteristic, e.g. [{ characteristic: 'Scalability', rating: 4 }]"
              ),
            isSelected: z.boolean().describe("Whether this is the chosen style"),
          })
        )
        .describe("All compared styles with their ratings and selection status"),
    }),
    tool: async ({ styles }) => {
      // Filter out incomplete entries and convert array-based ratings to Record for the DB/API layer
      const mapped = styles
        .filter((s) => s.styleName)
        .map((s) => ({
          ...s,
          starRatings: Object.fromEntries(
            (s.starRatings ?? []).map((r) => [r.characteristic, r.rating])
          ),
        }));
      if (mapped.length > 0) {
        await api.saveStyles(projectId, mapped);
      }
      return { success: true, message: "Architecture style saved successfully" };
    },
  });

  const saveDecisionTool = defineTool({
    name: "saveDecision",
    description:
      "Save an Architecture Decision Record (ADR) to the database. Call this for each significant architecture decision.",
    inputSchema: z.object({
      title: z.string().describe("Title of the decision"),
      status: z
        .enum(["proposed", "accepted", "deprecated", "superseded"])
        .optional()
        .describe("Status of the decision, defaults to 'proposed'"),
      context: z.string().describe("Context and problem statement"),
      decision: z.string().describe("The decision made"),
      consequences: z.string().describe("Consequences of the decision"),
    }),
    tool: async ({ title, status, context, decision, consequences }) => {
      const result = await api.createDecision(projectId, {
        title,
        status,
        context,
        decision,
        consequences,
      });
      return { success: true, decisionId: result.id, message: "Decision saved successfully" };
    },
  });

  const saveDiagramTool = defineTool({
    name: "saveDiagram",
    description: "Save architecture diagrams to the database. Call this after generating diagrams.",
    inputSchema: z.object({
      diagrams: z
        .array(
          z.object({
            title: z.string().describe("Diagram title"),
            mermaidCode: z.string().describe("Mermaid.js diagram code"),
            diagramType: z
              .enum(["context", "container", "component", "sequence", "flowchart"])
              .describe("Type of diagram"),
          })
        )
        .describe("List of diagrams to save"),
    }),
    tool: async ({ diagrams }) => {
      await api.saveDiagrams(projectId, diagrams);
      return { success: true, message: "Diagrams saved successfully" };
    },
  });

  const advanceStepTool = defineTool({
    name: "advanceStep",
    description:
      "Advance the project to the next architecture step. Call this after the current step is complete and data has been saved. " +
      "Steps: 1=Characteristics, 2=Components, 3=Architecture Style, 4=Decisions, 5=Diagrams.",
    inputSchema: z.object({
      nextStep: z
        .number()
        .min(1)
        .max(5)
        .describe("The step number to advance to (must be current + 1)"),
    }),
    tool: async ({ nextStep }) => {
      await api.updateProject(projectId, { currentStep: nextStep });
      return { success: true, message: `Advanced to step ${nextStep}` };
    },
  });

  const getProjectDataTool = defineTool({
    name: "getProjectData",
    description:
      "Load the full project data including all characteristics, components, styles, decisions, and diagrams. " +
      "Use this to get context about what has been completed so far.",
    inputSchema: z.object({}),
    tool: async () => {
      const data = await api.getProject(projectId);
      return data;
    },
  });

  return [
    saveCharacteristicsTool,
    saveLogicalComponentsTool,
    saveArchitectureStyleTool,
    saveDecisionTool,
    saveDiagramTool,
    advanceStepTool,
    getProjectDataTool,
  ];
}

// ── System Prompts ─────────────────────────────────────

const BASE_PROMPT = `You are an expert software architecture consultant guiding someone through defining their system's architecture. Be concise, ask clarifying questions, and use the provided components to visualize your recommendations. Always save data using the available tools before advancing to the next step.`;

const STEP_PROMPTS: Record<number, string> = {
  1: `${BASE_PROMPT}

CURRENT STEP: Identify Architectural Characteristics (Step 1 of 5)

Your goal is to help the user identify the key quality attributes (architectural characteristics) that will drive their architecture decisions. These include: scalability, availability, fault tolerance, performance, security, reliability, elasticity, deployability, testability, agility, interoperability, and simplicity.

Process:
1. Ask the user about their business requirements and constraints
2. Based on their answers, identify relevant characteristics
3. Present a CharacteristicsWorksheet component with ratings (1-5) for each characteristic
4. Help them select the TOP 3 most important characteristics
5. When satisfied, call saveCharacteristics to persist the data
6. Then call advanceStep with nextStep: 2

Reference: These characteristics come from Mark Richards' Architecture Characteristics Worksheet (developertoarchitect.com).`,

  2: `${BASE_PROMPT}

CURRENT STEP: Identify Logical Components (Step 2 of 5)

Your goal is to help the user identify the logical components of their system based on the business requirements and the architectural characteristics identified in Step 1.

Process:
1. Review the top-3 characteristics from Step 1 using getProjectData
2. Discuss the major functional areas of the system
3. Identify components with clear responsibilities and dependencies
4. Group them into logical namespaces
5. Present a LogicalComponentsMap component
6. When satisfied, call saveLogicalComponents to persist the data
7. Then call advanceStep with nextStep: 3

Focus on the "what" not the "how" — these are logical, not physical components.`,

  3: `${BASE_PROMPT}

CURRENT STEP: Choose Architecture Style (Step 3 of 5)

Your goal is to help the user choose the right architecture style based on their characteristics and components.

Common styles to consider: Layered, Microkernel, Microservices, Service-Based, Event-Driven, Space-Based, Pipeline, Orchestration-Driven Service-Oriented.

Process:
1. Load project data using getProjectData to review characteristics and components
2. Rate each candidate style against the top-3 characteristics (1-5 stars)
3. Present a StyleComparisonChart showing all styles rated against characteristics
4. Discuss trade-offs and recommend the best fit
5. When the user selects a style, call saveArchitectureStyle to persist
6. Then call advanceStep with nextStep: 4

Reference: Star ratings based on Mark Richards' Architecture Styles Worksheet (developertoarchitect.com).`,

  4: `${BASE_PROMPT}

CURRENT STEP: Document Architecture Decisions (Step 4 of 5)

Your goal is to help document key Architecture Decision Records (ADRs) following Michael Nygard's template.

Each ADR should have: Title, Status, Context, Decision, Consequences.

Process:
1. Load project data using getProjectData for context
2. Identify key decisions made (style choice, technology choices, patterns, trade-offs)
3. For each decision, render a DecisionRecord component
4. Call saveDecision for each ADR
5. When all significant decisions are captured, call advanceStep with nextStep: 5

Generate at least 3 ADRs covering: the chosen architecture style, the top characteristic trade-offs, and key component interaction patterns.`,

  5: `${BASE_PROMPT}

CURRENT STEP: Diagram Architecture (Step 5 of 5)

Your goal is to create architecture diagrams using Mermaid.js syntax.

Process:
1. Load project data using getProjectData for full context
2. Generate at least 2 diagrams:
   - A C4 Context diagram showing the system boundary and external actors
   - A Component diagram showing the logical components and their interactions
3. Render each as an ArchitectureDiagram component
4. Call saveDiagram with all diagrams when satisfied

Use valid Mermaid.js syntax. For C4 diagrams use flowchart with styling. Keep diagrams clear and readable.
After saving, congratulate the user and let them know they can export their architecture documentation from the export page.`,
};

export function getSystemPrompt(step: number): string {
  return STEP_PROMPTS[step] ?? BASE_PROMPT;
}
