/**
 * Step 4: Document Architecture Decisions
 *
 * Co-locates the system prompt, save tool, and UI component for Step 4.
 */

import { z } from "zod/v4";
import type { TamboComponent } from "@tambo-ai/react";

import { DecisionRecord } from "../../../components/architecture/decision-record";
import * as api from "../../api";
import type { StepConfig, ToolDecl } from "../types";

const saveDecisionTool: ToolDecl = {
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
  execute: async (input, projectId) => {
    const result = await api.createDecision(projectId, {
      title: input.title as string,
      status: input.status as "proposed" | "accepted" | "deprecated" | "superseded" | undefined,
      context: input.context as string,
      decision: input.decision as string,
      consequences: input.consequences as string,
    });
    return { success: true, decisionId: result.id, message: "Decision saved successfully" };
  },
};

const decisionRecordComponent: TamboComponent = {
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
};

export const step4: StepConfig = {
  step: 4,

  prompt: ({ basePrompt, toolExample }) => `${basePrompt}

CURRENT STEP: Document Architecture Decisions (Step 4 of 5)

Your goal is to help document key Architecture Decision Records (ADRs) following Michael Nygard's template.

Each ADR should have: Title, Status, Context, Decision, Consequences.

Process:
1. Acknowledge the transition from Step 3 and briefly summarize what was accomplished
2. Load project data using getProjectData for context
3. Identify key decisions made (style choice, technology choices, patterns, trade-offs)
4. Use a MultipleChoiceQuestion to let the user confirm or prioritize which decisions to document first
5. For each decision, render a DecisionRecord component
6. Call saveDecision for each ADR
7. When all significant decisions are captured (at least 3), provide feedback confirming the saves, then call advanceStep with nextStep: 5

Generate at least 3 ADRs covering: the chosen architecture style, the top characteristic trade-offs, and key component interaction patterns.

Example: ${toolExample("saveDecision", {
    title: "Use Microservices Architecture",
    status: "accepted",
    context: "The system needs to scale independently across different functional areas.",
    decision: "We will adopt a microservices architecture with independently deployable services.",
    consequences:
      "Increased operational complexity but better scalability and independent deployability.",
  })}`,

  tools: [saveDecisionTool],
  components: [decisionRecordComponent],
};
