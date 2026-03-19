/**
 * @file tambo/index.ts
 * @description Single entry point for Tambo AI configuration.
 *
 * Call `buildTamboConfig(projectId, currentStep)` to get the fully assembled
 * `{ systemPrompt, tools, components }` object required by TamboProvider.
 */

import { defineTool } from "@tambo-ai/react";

import { BASE_PROMPT, createSharedToolDecls, sharedComponents } from "./shared";
import { step1 } from "./steps/step1-characteristics";
import { step2 } from "./steps/step2-components";
import { step3 } from "./steps/step3-style";
import { step4 } from "./steps/step4-decisions";
import { step5 } from "./steps/step5-diagrams";
import type { PromptHelpers, StepConfig, TamboConfig } from "./types";

// ── Step registry ───────────────────────────────────────

const ALL_STEPS: Record<number, StepConfig> = {
  [step1.step]: step1,
  [step2.step]: step2,
  [step3.step]: step3,
  [step4.step]: step4,
  [step5.step]: step5,
};

// ── Prompt helpers ──────────────────────────────────────

/**
 * Creates a `PromptHelpers` object scoped to a set of tool names.
 *
 * `toolExample` validates that the referenced tool is registered and returns a
 * correctly-formatted example call string for inclusion in the system prompt.
 * This prevents silent prompt/tool drift — if a tool is renamed or removed the
 * prompt builder will throw immediately.
 */
export function createPromptHelpers(toolNames: Set<string>, basePrompt: string): PromptHelpers {
  return {
    basePrompt,
    toolExample(name: string, input: Record<string, unknown>): string {
      if (!toolNames.has(name)) {
        throw new Error(`Prompt references unknown tool "${name}"`);
      }
      return `${name}(${JSON.stringify(input)})`;
    },
  };
}

// ── Public API ──────────────────────────────────────────

/**
 * Assembles a complete Tambo configuration for the given project and step.
 *
 * @param projectId - The current project's ID (scoped into all tool executions).
 * @param currentStep - Active workflow step (1–5). Falls back to step 1 if
 *   unrecognised (e.g. step 6 = completed).
 * @param onStepAdvanced - Optional callback invoked after `advanceStep` runs
 *   (used to trigger route revalidation in the UI).
 * @returns `{ systemPrompt, tools, components }` ready for `TamboProvider`.
 */
export function buildTamboConfig(
  projectId: string,
  currentStep: number,
  onStepAdvanced?: () => void
): TamboConfig {
  const stepConfig = ALL_STEPS[currentStep] ?? ALL_STEPS[1];
  const sharedToolDecls = createSharedToolDecls(onStepAdvanced);
  const allToolDecls = [...stepConfig.tools, ...sharedToolDecls];

  const toolNames = new Set(allToolDecls.map((t) => t.name));
  const helpers = createPromptHelpers(toolNames, BASE_PROMPT);

  return {
    systemPrompt: stepConfig.prompt(helpers),
    tools: allToolDecls.map((decl) =>
      defineTool({
        name: decl.name,
        description: decl.description,
        inputSchema: decl.inputSchema,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tool: (input: any) => decl.execute(input as Record<string, unknown>, projectId),
      })
    ),
    components: [...stepConfig.components, ...sharedComponents],
  };
}
