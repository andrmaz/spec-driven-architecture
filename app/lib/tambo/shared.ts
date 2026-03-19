/**
 * Shared Tambo configuration: base prompt, tools used across all steps,
 * and components available throughout the workflow.
 */

import { z } from "zod/v4";
import type { TamboComponent } from "@tambo-ai/react";

import { StepProgress } from "../../components/architecture/step-progress";
import { MultipleChoiceQuestion } from "../../components/architecture/multiple-choice-question";
import * as api from "../api";
import type { ToolDecl } from "./types";

// ── Base prompt ─────────────────────────────────────────

export const BASE_PROMPT = `You are an expert software architecture consultant guiding someone through defining their system's architecture. Be concise, use the provided components to visualize your recommendations, and always save data using the available tools before advancing to the next step.

INTERACTION RULES — follow these at all times:
- ALWAYS provide feedback after every user action. Acknowledge what they said or chose before moving on.
- When asking the user to choose between predefined options, ALWAYS render a MultipleChoiceQuestion component with 2-5 clickable options instead of listing options in text. This includes: picking domain types, confirming selections, choosing between alternatives, selecting top characteristics, etc.
- Never leave the user without a next action — always end your message with a question, a MultipleChoiceQuestion component, or a clear instruction.
- Your text explanation MUST accompany every component you render to provide context and guidance.`;

// ── Shared schemas ──────────────────────────────────────

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

// ── Shared tool declarations ────────────────────────────

/**
 * Returns tool declarations shared across all steps.
 * @param onStepAdvanced - Optional callback invoked after a step advance
 *   (used to trigger route revalidation in the UI).
 */
export function createSharedToolDecls(onStepAdvanced?: () => void): ToolDecl[] {
  return [
    {
      name: "advanceStep",
      description:
        "Advance the project to the next architecture step. Call this after the current step is complete and data has been saved. " +
        "Steps: 1=Characteristics, 2=Components, 3=Architecture Style, 4=Decisions, 5=Diagrams, 6=Project Complete (all steps finished).",
      inputSchema: z.object({
        nextStep: z
          .number()
          .min(1)
          .max(6)
          .describe(
            "The step number to advance to (1-5 for next step, 6 to mark the project as complete)"
          ),
      }),
      execute: async (input, projectId) => {
        const nextStep = input.nextStep as number;
        await api.updateProject(projectId, { currentStep: nextStep });
        onStepAdvanced?.();
        return {
          success: true,
          message:
            nextStep <= 5
              ? `Advanced to step ${nextStep}`
              : "Project completed! All steps finished.",
        };
      },
    },
    {
      name: "getProjectData",
      description:
        "Load the full project data including all characteristics, components, styles, decisions, and diagrams. " +
        "Use this to get context about what has been completed so far. Invalid/empty entries are automatically filtered out.",
      inputSchema: z.object({}),
      execute: async (_input, projectId) => {
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
    },
  ];
}

// ── Shared components ───────────────────────────────────

/** Components available in every step of the workflow. */
export const sharedComponents: TamboComponent[] = [
  {
    name: "StepProgress",
    component: StepProgress,
    description:
      "Displays a horizontal progress indicator showing all 5 architecture steps. " +
      "Use when transitioning between steps or when the user asks about progress.",
    propsSchema: z.object({
      steps: z.array(StepItemSchema).optional().describe("List of step items with name and status"),
      currentStep: z
        .number()
        .min(1)
        .max(6)
        .optional()
        .describe("Current active step number (1-5, or 6 = completed)"),
    }),
  },
  {
    name: "MultipleChoiceQuestion",
    component: MultipleChoiceQuestion,
    description:
      "Renders a question with 2-5 clickable option buttons. When the user clicks an option, their choice is automatically submitted as a message. " +
      "ALWAYS use this component instead of listing options in text when asking the user to choose between predefined options. " +
      "Examples: picking a domain type, selecting top characteristics, choosing an architecture style, confirming a decision.",
    propsSchema: z.object({
      question: z.string().optional().describe("The question to present to the user"),
      options: z
        .array(MultipleChoiceOptionSchema)
        .optional()
        .describe("2-5 options the user can click to answer"),
    }),
  },
];
