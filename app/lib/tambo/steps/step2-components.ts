/**
 * Step 2: Identify Logical Components
 *
 * Co-locates the system prompt, save tool, and UI component for Step 2.
 */

import { z } from "zod/v4";
import type { TamboComponent } from "@tambo-ai/react";

import { LogicalComponentsMap } from "../../../components/architecture/logical-components-map";
import { TamboComponent as TamboComponentSchema } from "~/database/entities";
import * as api from "../../api";
import type { StepConfig, ToolDecl } from "../types";

const saveLogicalComponentsTool: ToolDecl = {
  name: "saveLogicalComponents",
  description: "Save logical components to the database. Pass the data as a JSON string.",
  inputSchema: z.object({
    data: z
      .string()
      .describe(
        'JSON string of an array of component objects. Each object must have: "name" (string). Optional: "responsibility" (string), "namespace" (string), "dependencies" (string array).'
      ),
  }),
  execute: async (input, projectId) => {
    const { data } = input as { data: string };
    try {
      const parsed: unknown = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return { success: false, message: "ERROR: data must be a JSON array string." };
      }
      const records = parsed.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item)
      );
      const valid = records
        .filter((c) => typeof c.name === "string" && c.name.length > 0)
        .map((c) => ({
          name: c.name as string,
          responsibility: typeof c.responsibility === "string" ? c.responsibility : undefined,
          namespace: typeof c.namespace === "string" ? c.namespace : undefined,
          dependencies: Array.isArray(c.dependencies) ? (c.dependencies as string[]) : undefined,
        }));
      if (valid.length === 0) {
        return {
          success: false,
          message: 'ERROR: No items had a "name" field. Each object MUST have "name".',
        };
      }
      await api.saveComponents(projectId, valid);
      return { success: true, message: `Saved ${valid.length} components successfully` };
    } catch (err) {
      return {
        success: false,
        message: `Failed: ${err instanceof Error ? err.message : String(err)}. Make sure "data" is a valid JSON array string.`,
      };
    }
  },
};

const logicalComponentsMapComponent: TamboComponent = {
  name: "LogicalComponentsMap",
  component: LogicalComponentsMap,
  description:
    "Displays a card grid of logical components grouped by namespace, showing responsibilities and dependencies. " +
    "Use when the user is identifying system components in Step 2.",
  propsSchema: z.object({
    components: z
      .array(TamboComponentSchema)
      .optional()
      .describe("List of logical components to display"),
    namespaces: z
      .array(z.string())
      .optional()
      .describe("Ordered list of namespace names for grouping"),
  }),
};

export const step2: StepConfig = {
  step: 2,

  prompt: ({ basePrompt, toolExample }) => `${basePrompt}

CURRENT STEP: Identify Logical Components (Step 2 of 5)

Your goal is to help the user identify the logical components of their system based on the business requirements and the architectural characteristics identified in Step 1.

Process:
1. Acknowledge the transition from Step 1 and briefly summarize what was accomplished
2. Load project data using getProjectData to review the top-3 characteristics from Step 1
3. If characteristics data is empty or missing, ask the user to briefly describe their top architectural priorities so you can proceed
4. Discuss the major functional areas of the system — use MultipleChoiceQuestion when offering namespace or grouping choices
5. Identify components with clear responsibilities and dependencies
6. Group them into logical namespaces (e.g. 'Core', 'Infrastructure', 'Integration')
7. Present a LogicalComponentsMap component
8. When satisfied, call saveLogicalComponents to persist the data
9. Provide feedback confirming the save, then call advanceStep with nextStep: 3

CRITICAL: The save tools accept a SINGLE "data" parameter which is a JSON string (not an object array). You must stringify the array yourself.
Example: ${toolExample("saveLogicalComponents", {
    data: '[{"name":"OrderService","responsibility":"Manages orders","namespace":"Core","dependencies":["PaymentService"]},{"name":"AuthModule","responsibility":"Auth","namespace":"Infrastructure"}]',
  })}
Do NOT pass an empty string or empty array. Each object in the JSON array MUST have a "name" field.

IMPORTANT: If previous step data appears empty, do NOT get stuck — ask the user what they need and continue.

Focus on the "what" not the "how" — these are logical, not physical components.`,

  tools: [saveLogicalComponentsTool],
  components: [logicalComponentsMapComponent],
};
