/**
 * Core type definitions for the declarative Tambo step configuration API.
 */

import type { TamboTool, TamboComponent } from "@tambo-ai/react";
import { z } from "zod/v4";

/** A single tool declaration — name, schema, and execute logic. */
export interface ToolDecl {
  name: string;
  description: string;
  inputSchema: z.ZodObject<Record<string, z.ZodType>>;
  /** Called by buildTamboConfig; projectId is injected at assembly time. */
  execute: (input: Record<string, unknown>, projectId: string) => Promise<unknown>;
}

/**
 * Helpers passed to each step's `prompt` factory.
 *
 * `toolExample` generates a correctly-formatted example call for the named tool
 * and throws at runtime if the tool name is not registered for that step,
 * preventing prompt/tool drift.
 */
export interface PromptHelpers {
  /** Shared base instructions included in every step prompt. */
  basePrompt: string;
  /**
   * Returns a formatted example tool call string for inclusion in the system
   * prompt. Throws if `toolName` is not a tool registered for this step.
   */
  toolExample(toolName: string, exampleInput: Record<string, unknown>): string;
}

/** Per-step declarative configuration: prompt, tools, and components. */
export interface StepConfig {
  step: number;
  /** Factory that builds the step's system prompt with compile-safe tool examples. */
  prompt: (helpers: PromptHelpers) => string;
  tools: ToolDecl[];
  components: TamboComponent[];
}

/** The fully assembled configuration consumed by TamboProvider. */
export interface TamboConfig {
  systemPrompt: string;
  tools: TamboTool[];
  components: TamboComponent[];
}
