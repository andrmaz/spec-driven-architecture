import type { LucideIcon } from "lucide-react";
import { Target, Puzzle, Building2, FileText, Network } from "lucide-react";

/**
 * Centralized step metadata for the 5-step architecture workflow.
 * Used by StepSidebar, ProjectCard, StepProgress, and system prompts.
 */

export interface StepMeta {
  label: string;
  icon: LucideIcon;
  description: string;
}

export const STEPS: StepMeta[] = [
  { label: "Characteristics", icon: Target, description: "Identify driving quality attributes" },
  { label: "Components", icon: Puzzle, description: "Map logical components" },
  { label: "Architecture Style", icon: Building2, description: "Choose an architecture style" },
  { label: "Decisions", icon: FileText, description: "Document architecture decisions" },
  { label: "Diagrams", icon: Network, description: "Diagram your architecture" },
];

export const TOTAL_STEPS = STEPS.length;

export function getStepLabel(step: number): string {
  if (step > TOTAL_STEPS) return "Completed";
  return STEPS[step - 1]?.label ?? "Unknown";
}
