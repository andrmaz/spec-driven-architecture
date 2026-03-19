/**
 * Step 3: Choose Architecture Style
 *
 * Co-locates the system prompt, save tool, and UI component for Step 3.
 *
 * NOTE: The AI should use `name` (not `styleName`) and `ratings[]` (not
 * `starRatings{}`) when calling saveArchitectureStyle. The tool maps these
 * to the DB format internally via `tamboStyleToDb`.
 */

import { z } from "zod/v4";
import type { TamboComponent } from "@tambo-ai/react";

import { StyleComparisonChart } from "../../../components/architecture/style-comparison-chart";
import { TamboStyle, tamboStyleToDb } from "~/database/entities";
import * as api from "../../api";
import type { StepConfig, ToolDecl } from "../types";

const saveArchitectureStyleTool: ToolDecl = {
  name: "saveArchitectureStyle",
  description:
    "Save architecture style comparison to the database. Pass the data as a JSON string.",
  inputSchema: z.object({
    data: z
      .string()
      .describe(
        'JSON string of an array of style objects. Each object must have: "name" (string). Optional: "ratings" (array of { characteristic: string, rating: number 1-5 }), "isSelected" (boolean).'
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
      const valid = records.filter((s) => typeof s.name === "string" && s.name.length > 0);
      if (valid.length === 0) {
        return {
          success: false,
          message: 'ERROR: No items had a "name" field. Each object MUST have "name".',
        };
      }
      const mapped = valid.map((s) => ({
        ...tamboStyleToDb(TamboStyle.parse(s)),
        isSelected: s.isSelected === true,
      }));
      await api.saveStyles(projectId, mapped as Parameters<typeof api.saveStyles>[1]);
      return { success: true, message: `Saved ${valid.length} styles successfully` };
    } catch (err) {
      return {
        success: false,
        message: `Failed: ${err instanceof Error ? err.message : String(err)}. Make sure "data" is a valid JSON array string.`,
      };
    }
  },
};

const styleComparisonChartComponent: TamboComponent = {
  name: "StyleComparisonChart",
  component: StyleComparisonChart,
  description:
    "Displays a comparison table of architecture styles rated against the system's characteristics. " +
    "Use when the user is choosing an architecture style in Step 3.",
  propsSchema: z.object({
    styles: z
      .array(TamboStyle)
      .optional()
      .describe("List of architecture styles with per-characteristic star ratings"),
    selectedStyle: z
      .string()
      .optional()
      .describe("Name of the selected/recommended architecture style"),
  }),
};

export const step3: StepConfig = {
  step: 3,

  prompt: ({ basePrompt, toolExample }) => `${basePrompt}

CURRENT STEP: Choose Architecture Style (Step 3 of 5)

Your goal is to help the user choose the right architecture style based on their characteristics and components.

Common styles to consider: Layered, Microkernel, Microservices, Service-Based, Event-Driven, Space-Based, Pipeline, Orchestration-Driven Service-Oriented.

Process:
1. Acknowledge the transition from Step 2 and briefly summarize what was accomplished
2. Load project data using getProjectData to review characteristics and components
3. If characteristics or components data is empty, ask the user to describe them briefly so you can proceed
4. Rate each candidate style against the top-3 characteristics (1-5 stars)
5. Present a StyleComparisonChart showing all styles rated against characteristics
6. Discuss trade-offs and recommend the best fit
7. Use a MultipleChoiceQuestion to let the user select their preferred architecture style from the top candidates
8. When the user selects a style, call saveArchitectureStyle to persist
9. Provide feedback confirming the save, then call advanceStep with nextStep: 4

CRITICAL: The save tools accept a SINGLE "data" parameter which is a JSON string (not an object array). You must stringify the array yourself.
Example: ${toolExample("saveArchitectureStyle", {
    data: '[{"name":"Microservices","ratings":[{"characteristic":"Scalability","rating":5},{"characteristic":"Simplicity","rating":2}],"isSelected":true},{"name":"Layered","ratings":[{"characteristic":"Scalability","rating":2},{"characteristic":"Simplicity","rating":5}],"isSelected":false}]',
  })}
Do NOT pass an empty string or empty array. Each object in the JSON array MUST have a "name" field.
Note: Use "name" (not "styleName") and "ratings" as an array (not "starRatings" as an object).

IMPORTANT: If previous step data appears empty, do NOT get stuck — ask the user what they need and continue.

Reference: Star ratings based on Mark Richards' Architecture Styles Worksheet (developertoarchitect.com).`,

  tools: [saveArchitectureStyleTool],
  components: [styleComparisonChartComponent],
};
