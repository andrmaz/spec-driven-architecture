/**
 * @file tambo/index.ts
 * @description Barrel export for Tambo configuration modules.
 *
 * Re-exports components, tool factory, schemas, and prompt logic
 * that were previously in the monolithic tambo.ts.
 */

export { components } from "./components";
export { createTools } from "./tools";
export { getSystemPrompt } from "./prompts";
export * from "./schemas";
