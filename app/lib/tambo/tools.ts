/**
 * Tambo tool definitions for persisting architecture data.
 * Uses a generic factory to eliminate duplicated parse→validate→save logic.
 */

import type { TamboTool } from "@tambo-ai/react";
import { defineTool } from "@tambo-ai/react";
import { z } from "zod/v4";

import * as api from "../api";

// ── Generic JSON Array Tool Factory ────────────────────

interface JsonArrayToolConfig {
  name: string;
  description: string;
  inputDescription: string;
  requiredFieldLabel: string;
  filter: (item: Record<string, unknown>) => boolean;
  mapItem: (item: Record<string, unknown>) => unknown;
  save: (projectId: string, items: unknown[]) => Promise<unknown>;
  entityLabel: string;
}

function createJsonArrayTool(projectId: string, config: JsonArrayToolConfig) {
  return defineTool({
    name: config.name,
    description: config.description,
    inputSchema: z.object({
      data: z.string().describe(config.inputDescription),
    }),
    tool: async ({ data }) => {
      try {
        const parsed = JSON.parse(data) as Array<Record<string, unknown>>;
        if (!Array.isArray(parsed)) {
          return { success: false, message: "ERROR: data must be a JSON array string." };
        }
        const valid = parsed.filter(config.filter);
        if (valid.length === 0) {
          return {
            success: false,
            message: `ERROR: No items had a "${config.requiredFieldLabel}" field. Each object MUST have "${config.requiredFieldLabel}".`,
          };
        }
        const mapped = valid.map(config.mapItem);
        await config.save(projectId, mapped as Parameters<typeof config.save>[1]);
        return {
          success: true,
          message: `Saved ${valid.length} ${config.entityLabel} successfully`,
        };
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : String(err)}. Make sure "data" is a valid JSON array string.`,
        };
      }
    },
  });
}

// ── Tool Definitions ───────────────────────────────────

export function createTools(projectId: string): TamboTool[] {
  const saveCharacteristicsTool = createJsonArrayTool(projectId, {
    name: "saveCharacteristics",
    description:
      "Save architectural characteristics to the database. Pass the data as a JSON string." +
      ' Example: { "data": "[{\\"name\\":\\"Scalability\\",\\"rating\\":4,\\"description\\":\\"Must handle 10k users\\",\\"isTopThree\\":true}]" }',
    inputDescription:
      'JSON string of an array of characteristic objects. Each object must have: "name" (string), "rating" (number 1-5). Optional: "description" (string), "isTopThree" (boolean).',
    requiredFieldLabel: "name",
    entityLabel: "characteristics",
    filter: (c) => typeof c.name === "string" && (c.name as string).length > 0,
    mapItem: (c) => ({
      name: c.name,
      rating: typeof c.rating === "number" ? c.rating : 3,
      description: typeof c.description === "string" ? c.description : undefined,
      isTopThree: typeof c.isTopThree === "boolean" ? c.isTopThree : false,
    }),
    save: (pid, items) =>
      api.saveCharacteristics(pid, items as Parameters<typeof api.saveCharacteristics>[1]),
  });

  const saveLogicalComponentsTool = createJsonArrayTool(projectId, {
    name: "saveLogicalComponents",
    description:
      "Save logical components to the database. Pass the data as a JSON string." +
      ' Example: { "data": "[{\\"name\\":\\"OrderService\\",\\"responsibility\\":\\"Manages orders\\",\\"namespace\\":\\"Core\\"}]" }',
    inputDescription:
      'JSON string of an array of component objects. Each object must have: "name" (string). Optional: "responsibility" (string), "namespace" (string), "dependencies" (string array).',
    requiredFieldLabel: "name",
    entityLabel: "components",
    filter: (c) => typeof c.name === "string" && (c.name as string).length > 0,
    mapItem: (c) => ({
      name: c.name,
      responsibility: typeof c.responsibility === "string" ? c.responsibility : undefined,
      namespace: typeof c.namespace === "string" ? c.namespace : undefined,
      dependencies: Array.isArray(c.dependencies) ? c.dependencies : undefined,
    }),
    save: (pid, items) =>
      api.saveComponents(pid, items as Parameters<typeof api.saveComponents>[1]),
  });

  const saveArchitectureStyleTool = createJsonArrayTool(projectId, {
    name: "saveArchitectureStyle",
    description:
      "Save architecture style comparison to the database. Pass the data as a JSON string." +
      ' Example: { "data": "[{\\"styleName\\":\\"Microservices\\",\\"starRatings\\":{\\"Scalability\\":5},\\"isSelected\\":true}]" }',
    inputDescription:
      'JSON string of an array of style objects. Each object must have: "styleName" (string). Optional: "rationale" (string), "starRatings" (object), "isSelected" (boolean).',
    requiredFieldLabel: "styleName",
    entityLabel: "styles",
    filter: (s) => typeof s.styleName === "string" && (s.styleName as string).length > 0,
    mapItem: (s) => ({
      styleName: s.styleName,
      rationale: typeof s.rationale === "string" ? s.rationale : undefined,
      starRatings:
        s.starRatings && typeof s.starRatings === "object"
          ? (s.starRatings as Record<string, number>)
          : {},
      isSelected: typeof s.isSelected === "boolean" ? s.isSelected : false,
    }),
    save: (pid, items) => api.saveStyles(pid, items as Parameters<typeof api.saveStyles>[1]),
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

  const saveDiagramTool = createJsonArrayTool(projectId, {
    name: "saveDiagram",
    description:
      "Save architecture diagrams to the database. Pass the data as a JSON string. " +
      "IMPORTANT: Use 'flowchart TB' or 'flowchart LR' syntax only — never 'graph TD' or native C4 syntax.",
    inputDescription:
      'JSON string of an array of diagram objects. Each object must have: "title" (string), "mermaidCode" (string), "diagramType" (one of "context","container","component","sequence","flowchart").',
    requiredFieldLabel: "title",
    entityLabel: "diagrams",
    filter: (d) => {
      const validTypes = new Set(["context", "container", "component", "sequence", "flowchart"]);
      return (
        typeof d.title === "string" &&
        d.title.length > 0 &&
        typeof d.mermaidCode === "string" &&
        (d.mermaidCode as string).length > 0 &&
        typeof d.diagramType === "string" &&
        validTypes.has(d.diagramType as string)
      );
    },
    mapItem: (d) => d,
    save: (pid, items) => api.saveDiagrams(pid, items as Parameters<typeof api.saveDiagrams>[1]),
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
