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
    .optional()
    .describe("Brief explanation of why this characteristic matters for this system"),
  isTopThree: z
    .boolean()
    .optional()
    .describe("Whether this is one of the top 3 driving characteristics"),
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
    .optional()
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

// ── Tools ──────────────────────────────────────────────

export function createTools(projectId: string): TamboTool[] {
  const saveCharacteristicsTool = defineTool({
    name: "saveCharacteristics",
    description:
      "Save architectural characteristics to the database. Pass the data as a JSON string." +
      ' Example: { "data": "[{\\"name\\":\\"Scalability\\",\\"rating\\":4,\\"description\\":\\"Must handle 10k users\\",\\"isTopThree\\":true},{\\"name\\":\\"Security\\",\\"rating\\":5,\\"description\\":\\"Sensitive data\\",\\"isTopThree\\":true}]" }',
    inputSchema: z.object({
      data: z
        .string()
        .describe(
          'JSON string of an array of characteristic objects. Each object must have: "name" (string), "rating" (number 1-5). Optional: "description" (string), "isTopThree" (boolean). Example: [{"name":"Scalability","rating":4,"description":"Must scale","isTopThree":true}]'
        ),
    }),
    tool: async ({ data }) => {
      try {
        const parsed = JSON.parse(data) as Array<Record<string, unknown>>;
        if (!Array.isArray(parsed)) {
          return { success: false, message: "ERROR: data must be a JSON array string." };
        }
        const valid = parsed.filter(
          (c): c is { name: string; rating?: number; description?: string; isTopThree?: boolean } =>
            typeof c.name === "string" && c.name.length > 0
        );
        if (valid.length === 0) {
          return {
            success: false,
            message: `ERROR: No items had a "name" field. Each object MUST have "name". Example: [{"name":"Scalability","rating":4}]`,
          };
        }
        await api.saveCharacteristics(
          projectId,
          valid.map((c) => ({
            name: c.name,
            rating: typeof c.rating === "number" ? c.rating : 3,
            description: typeof c.description === "string" ? c.description : undefined,
            isTopThree: typeof c.isTopThree === "boolean" ? c.isTopThree : false,
          }))
        );
        return { success: true, message: `Saved ${valid.length} characteristics successfully` };
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : String(err)}. Make sure "data" is a valid JSON array string.`,
        };
      }
    },
  });

  const saveLogicalComponentsTool = defineTool({
    name: "saveLogicalComponents",
    description:
      "Save logical components to the database. Pass the data as a JSON string." +
      ' Example: { "data": "[{\\"name\\":\\"OrderService\\",\\"responsibility\\":\\"Manages orders\\",\\"namespace\\":\\"Core\\",\\"dependencies\\":[\\"PaymentService\\"]},{\\"name\\":\\"AuthModule\\",\\"responsibility\\":\\"Auth\\",\\"namespace\\":\\"Infrastructure\\"}]" }',
    inputSchema: z.object({
      data: z
        .string()
        .describe(
          'JSON string of an array of component objects. Each object must have: "name" (string). Optional: "responsibility" (string), "namespace" (string), "dependencies" (string array). Example: [{"name":"OrderService","responsibility":"Manages orders","namespace":"Core"}]'
        ),
    }),
    tool: async ({ data }) => {
      try {
        const parsed = JSON.parse(data) as Array<Record<string, unknown>>;
        if (!Array.isArray(parsed)) {
          return { success: false, message: "ERROR: data must be a JSON array string." };
        }
        const valid = parsed.filter(
          (
            c
          ): c is {
            name: string;
            responsibility?: string;
            namespace?: string;
            dependencies?: string[];
          } => typeof c.name === "string" && c.name.length > 0
        );
        if (valid.length === 0) {
          return {
            success: false,
            message: `ERROR: No items had a "name" field. Each object MUST have "name". Example: [{"name":"OrderService","responsibility":"Manages orders"}]`,
          };
        }
        await api.saveComponents(
          projectId,
          valid.map((c) => ({
            name: c.name,
            responsibility: typeof c.responsibility === "string" ? c.responsibility : undefined,
            namespace: typeof c.namespace === "string" ? c.namespace : undefined,
            dependencies: Array.isArray(c.dependencies) ? c.dependencies : undefined,
          }))
        );
        return { success: true, message: `Saved ${valid.length} components successfully` };
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : String(err)}. Make sure "data" is a valid JSON array string.`,
        };
      }
    },
  });

  const saveArchitectureStyleTool = defineTool({
    name: "saveArchitectureStyle",
    description:
      "Save architecture style comparison to the database. Pass the data as a JSON string." +
      ' Example: { "data": "[{\\"styleName\\":\\"Microservices\\",\\"rationale\\":\\"Best fit\\",\\"starRatings\\":{\\"Scalability\\":5,\\"Simplicity\\":2},\\"isSelected\\":true},{\\"styleName\\":\\"Layered\\",\\"starRatings\\":{\\"Scalability\\":2,\\"Simplicity\\":5},\\"isSelected\\":false}]" }',
    inputSchema: z.object({
      data: z
        .string()
        .describe(
          'JSON string of an array of style objects. Each object must have: "styleName" (string). Optional: "rationale" (string), "starRatings" (object mapping characteristic names to ratings 1-5), "isSelected" (boolean). Example: [{"styleName":"Microservices","starRatings":{"Scalability":5},"isSelected":true}]'
        ),
    }),
    tool: async ({ data }) => {
      try {
        const parsed = JSON.parse(data) as Array<Record<string, unknown>>;
        if (!Array.isArray(parsed)) {
          return { success: false, message: "ERROR: data must be a JSON array string." };
        }
        const valid = parsed.filter(
          (
            s
          ): s is {
            styleName: string;
            rationale?: string;
            starRatings?: Record<string, number>;
            isSelected?: boolean;
          } => typeof s.styleName === "string" && s.styleName.length > 0
        );
        if (valid.length === 0) {
          return {
            success: false,
            message: `ERROR: No items had a "styleName" field. Each object MUST have "styleName". Example: [{"styleName":"Microservices","isSelected":true}]`,
          };
        }
        await api.saveStyles(
          projectId,
          valid.map((s) => ({
            styleName: s.styleName,
            rationale: typeof s.rationale === "string" ? s.rationale : undefined,
            starRatings:
              s.starRatings && typeof s.starRatings === "object"
                ? (s.starRatings as Record<string, number>)
                : {},
            isSelected: typeof s.isSelected === "boolean" ? s.isSelected : false,
          }))
        );
        return { success: true, message: `Saved ${valid.length} styles successfully` };
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : String(err)}. Make sure "data" is a valid JSON array string.`,
        };
      }
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
    description:
      "Save architecture diagrams to the database. Pass the data as a JSON string. " +
      "IMPORTANT: Use 'flowchart TB' or 'flowchart LR' syntax only — never 'graph TD' or native C4 syntax (C4Context/Person/System). " +
      'Example: { "data": "[{\\"title\\":\\"C4 Context\\",\\"mermaidCode\\":\\"flowchart TB\\\\n  user[\\\\\\"User\\\\\\"]\\\\n  sys[[\\\\\\"System\\\\\\"]]\\\\n  user -->|uses| sys\\",\\"diagramType\\":\\"context\\"}]" }',
    inputSchema: z.object({
      data: z
        .string()
        .describe(
          'JSON string of an array of diagram objects. Each object must have: "title" (string), "mermaidCode" (string — use flowchart TB/LR, NOT graph TD, NOT C4Context), "diagramType" (one of "context","container","component","sequence","flowchart"). Example: [{"title":"C4 Context","mermaidCode":"flowchart TB\\n  user[\\"User\\"]\\n  sys[[\\"System\\"]]\\n  user -->|uses| sys","diagramType":"context"}]'
        ),
    }),
    tool: async ({ data }) => {
      try {
        const parsed = JSON.parse(data) as Array<Record<string, unknown>>;
        if (!Array.isArray(parsed)) {
          return { success: false, message: "ERROR: data must be a JSON array string." };
        }
        const validTypes = new Set(["context", "container", "component", "sequence", "flowchart"]);
        const valid = parsed.filter(
          (
            d
          ): d is {
            title: string;
            mermaidCode: string;
            diagramType: "context" | "container" | "component" | "sequence" | "flowchart";
          } =>
            typeof d.title === "string" &&
            d.title.length > 0 &&
            typeof d.mermaidCode === "string" &&
            d.mermaidCode.length > 0 &&
            typeof d.diagramType === "string" &&
            validTypes.has(d.diagramType)
        );
        if (valid.length === 0) {
          return {
            success: false,
            message: `ERROR: No valid diagrams found. Each object MUST have "title", "mermaidCode", and "diagramType". Example: [{"title":"C4 Context","mermaidCode":"graph TD; A-->B","diagramType":"context"}]`,
          };
        }
        await api.saveDiagrams(projectId, valid);
        return { success: true, message: `Saved ${valid.length} diagrams successfully` };
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : String(err)}. Make sure "data" is a valid JSON array string.`,
        };
      }
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
      "Use this to get context about what has been completed so far. Invalid/empty entries are automatically filtered out.",
    inputSchema: z.object({}),
    tool: async () => {
      const data = await api.getProject(projectId);
      // Filter out corrupted/empty rows so the AI only sees valid data
      return {
        ...data,
        characteristics: data.characteristics.filter((c) => c.name),
        components: data.components.filter((c) => c.name),
        styles: data.styles.filter((s) => s.styleName),
        decisions: data.decisions.filter((d) => d.title),
        diagrams: data.diagrams.filter((d) => d.title && d.mermaidCode),
      };
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

CRITICAL: The save tools accept a SINGLE "data" parameter which is a JSON string (not an object array). You must stringify the array yourself.
Example: saveCharacteristics({ "data": '[{"name":"Scalability","rating":4,"description":"Must handle growth","isTopThree":true},{"name":"Security","rating":5,"description":"Sensitive data","isTopThree":true}]' })
Do NOT pass an empty string or empty array. Each object in the JSON array MUST have a "name" field.

Reference: These characteristics come from Mark Richards' Architecture Characteristics Worksheet (developertoarchitect.com).`,

  2: `${BASE_PROMPT}

CURRENT STEP: Identify Logical Components (Step 2 of 5)

Your goal is to help the user identify the logical components of their system based on the business requirements and the architectural characteristics identified in Step 1.

Process:
1. Load project data using getProjectData to review the top-3 characteristics from Step 1
2. If characteristics data is empty or missing, ask the user to briefly describe their top architectural priorities so you can proceed
3. Discuss the major functional areas of the system
4. Identify components with clear responsibilities and dependencies
5. Group them into logical namespaces (e.g. 'Core', 'Infrastructure', 'Integration')
6. Present a LogicalComponentsMap component
7. When satisfied, call saveLogicalComponents to persist the data
8. Then call advanceStep with nextStep: 3

CRITICAL: The save tools accept a SINGLE "data" parameter which is a JSON string (not an object array). You must stringify the array yourself.
Example: saveLogicalComponents({ "data": '[{"name":"OrderService","responsibility":"Manages orders","namespace":"Core","dependencies":["PaymentService"]},{"name":"AuthModule","responsibility":"Auth","namespace":"Infrastructure"}]' })
Do NOT pass an empty string or empty array. Each object in the JSON array MUST have a "name" field.

IMPORTANT: If previous step data appears empty, do NOT get stuck — ask the user what they need and continue.

Focus on the "what" not the "how" — these are logical, not physical components.`,

  3: `${BASE_PROMPT}

CURRENT STEP: Choose Architecture Style (Step 3 of 5)

Your goal is to help the user choose the right architecture style based on their characteristics and components.

Common styles to consider: Layered, Microkernel, Microservices, Service-Based, Event-Driven, Space-Based, Pipeline, Orchestration-Driven Service-Oriented.

Process:
1. Load project data using getProjectData to review characteristics and components
2. If characteristics or components data is empty, ask the user to describe them briefly so you can proceed
3. Rate each candidate style against the top-3 characteristics (1-5 stars)
4. Present a StyleComparisonChart showing all styles rated against characteristics
5. Discuss trade-offs and recommend the best fit
6. When the user selects a style, call saveArchitectureStyle to persist
7. Then call advanceStep with nextStep: 4

CRITICAL: The save tools accept a SINGLE "data" parameter which is a JSON string (not an object array). You must stringify the array yourself.
Example: saveArchitectureStyle({ "data": '[{"styleName":"Microservices","starRatings":{"Scalability":5,"Simplicity":2},"isSelected":true},{"styleName":"Layered","starRatings":{"Scalability":2,"Simplicity":5},"isSelected":false}]' })
Do NOT pass an empty string or empty array. Each object in the JSON array MUST have a "styleName" field.
Note: starRatings is a simple object mapping characteristic names to numbers, e.g. {"Scalability":5,"Simplicity":2}.

IMPORTANT: If previous step data appears empty, do NOT get stuck — ask the user what they need and continue.

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

CRITICAL: The save tools accept a SINGLE "data" parameter which is a JSON string (not an object array). You must stringify the array yourself.
Example: saveDiagram({ "data": '[{"title":"C4 Context Diagram","mermaidCode":"flowchart TB\\n  user[\\"User\\"]\\n  system[[\\"My System\\"]]\\n  user -->|uses| system","diagramType":"context"},{"title":"Component Diagram","mermaidCode":"flowchart LR\\n  A[\\"Service A\\"] --> B[\\"Service B\\"]","diagramType":"component"}]' })
Do NOT pass an empty string or empty array. Each object in the JSON array MUST have "title", "mermaidCode", and "diagramType" fields.
Valid diagramType values: "context", "container", "component", "sequence", "flowchart".

MERMAID SYNTAX RULES — follow these strictly:
- Always use "flowchart TB" or "flowchart LR" (NEVER "graph TD", NEVER native C4 syntax like C4Context/Person/System).
- Use double-quoted labels for node text: A["Label"] for rectangles, B[["Label"]] for subroutines/systems.
- Use classDef + class for styling (colors, strokes). Example:
    classDef person fill:#FFE6CC,stroke:#C77700,color:#111;
    classDef sys fill:#E6F2FF,stroke:#1B6CA8,color:#111;
    classDef ext fill:#F2F2F2,stroke:#666,color:#111;
    class userNode person;
    class systemNode sys;
- Use edge labels with |"text"| syntax: A -->|"calls"| B
- Newlines inside labels use \\n: A["Line1\\nLine2"]
- Do NOT use parentheses () in node IDs. Keep IDs short alphanumeric strings.
- Do NOT use special characters like < > & in labels without quoting them.
- For sequence diagrams use: sequenceDiagram\\n  participant A\\n  A->>B: message

EXAMPLE of a correct C4-style context diagram:
flowchart TB
  customer["Customer"]
  admin["Admin"]
  system[["My System\\n(Architecture Style)"]]
  extApi["External API"]
  customer -->|"uses"| system
  admin -->|"manages"| system
  system -->|"calls"| extApi
  classDef person fill:#FFE6CC,stroke:#C77700,color:#111;
  classDef sys fill:#E6F2FF,stroke:#1B6CA8,color:#111;
  classDef ext fill:#F2F2F2,stroke:#666,color:#111;
  class customer,admin person;
  class system sys;
  class extApi ext;

After saving, congratulate the user and let them know they can export their architecture documentation from the export page.`,
};

export function getSystemPrompt(step: number): string {
  return STEP_PROMPTS[step] ?? BASE_PROMPT;
}
