/**
 * Step 1: Identify Architectural Characteristics
 *
 * Co-locates the system prompt, save tool, and UI component for Step 1.
 */

import { z } from "zod/v4";
import type { TamboComponent } from "@tambo-ai/react";

import { CharacteristicsWorksheet } from "../../../components/architecture/characteristics-worksheet";
import { TamboCharacteristic } from "~/database/entities";
import * as api from "../../api";
import type { StepConfig, ToolDecl } from "../types";

const saveCharacteristicsTool: ToolDecl = {
  name: "saveCharacteristics",
  description:
    "Save architectural characteristics to the database. Pass the data as a JSON string.",
  inputSchema: z.object({
    data: z
      .string()
      .describe(
        'JSON string of an array of characteristic objects. Each object must have: "name" (string), "rating" (number 1-5). Optional: "description" (string), "isTopThree" (boolean).'
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
          rating: typeof c.rating === "number" ? c.rating : 3,
          description: typeof c.description === "string" ? c.description : undefined,
          isTopThree: typeof c.isTopThree === "boolean" ? c.isTopThree : false,
        }));
      if (valid.length === 0) {
        return {
          success: false,
          message: 'ERROR: No items had a "name" field. Each object MUST have "name".',
        };
      }
      await api.saveCharacteristics(projectId, valid);
      return { success: true, message: `Saved ${valid.length} characteristics successfully` };
    } catch (err) {
      return {
        success: false,
        message: `Failed: ${err instanceof Error ? err.message : String(err)}. Make sure "data" is a valid JSON array string.`,
      };
    }
  },
};

const characteristicsWorksheetComponent: TamboComponent = {
  name: "CharacteristicsWorksheet",
  component: CharacteristicsWorksheet,
  description:
    "Displays a table of architectural characteristics (quality attributes) with star ratings and top-3 highlights. " +
    "Use when the user is identifying or reviewing the driving quality attributes for their system in Step 1.",
  propsSchema: z.object({
    characteristics: z
      .array(TamboCharacteristic)
      .optional()
      .describe("List of architectural characteristics with ratings"),
  }),
};

export const step1: StepConfig = {
  step: 1,

  prompt: ({ basePrompt, toolExample }) => `${basePrompt}

CURRENT STEP: Identify Architectural Characteristics (Step 1 of 5)

Your goal is to help the user identify the key quality attributes (architectural characteristics) that will drive their architecture decisions. These include: scalability, availability, fault tolerance, performance, security, reliability, elasticity, deployability, testability, agility, interoperability, and simplicity.

INTRODUCTION: When the conversation starts (no previous user messages in the thread), introduce yourself and the 5-step architecture workflow:
1. Identify Architectural Characteristics
2. Identify Logical Components
3. Choose Architecture Style
4. Document Architecture Decisions
5. Diagram Architecture
Then begin Step 1 by asking about the user's project domain using a MultipleChoiceQuestion component (e.g., domain categories like E-commerce, SaaS Platform, Real-time Analytics, Healthcare, FinTech, or Other).

Process:
1. Ask the user about their business requirements and constraints — use MultipleChoiceQuestion when offering predefined choices
2. Based on their answers, identify relevant characteristics
3. Present a CharacteristicsWorksheet component with ratings (1-5) for each characteristic
4. Help them select the TOP 3 most important characteristics — use a MultipleChoiceQuestion to confirm top-3 selection
5. When satisfied, call saveCharacteristics to persist the data
6. Provide feedback confirming the save, then call advanceStep with nextStep: 2

CRITICAL: The save tools accept a SINGLE "data" parameter which is a JSON string (not an object array). You must stringify the array yourself.
Example: ${toolExample("saveCharacteristics", {
    data: '[{"name":"Scalability","rating":4,"description":"Must handle growth","isTopThree":true},{"name":"Security","rating":5,"description":"Sensitive data","isTopThree":true}]',
  })}
Do NOT pass an empty string or empty array. Each object in the JSON array MUST have a "name" field.

Reference: These characteristics come from Mark Richards' Architecture Characteristics Worksheet (developertoarchitect.com).`,

  tools: [saveCharacteristicsTool],
  components: [characteristicsWorksheetComponent],
};
