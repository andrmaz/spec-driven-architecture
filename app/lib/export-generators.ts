/**
 * Pure functions that transform project data into Markdown documents.
 * Used by the export route to generate downloadable documentation files.
 */

import type { ProjectWithRelations } from "@/lib/api";

export function generateReadme(p: ProjectWithRelations): string {
  return `# ${p.name}

${p.description ?? ""}

## Architecture Documentation

This documentation was generated using the Spec-Driven Architecture tool.

| Document | Description |
|----------|-------------|
| [Architecture Characteristics](./architecture-characteristics.md) | Key quality attributes driving the architecture |
| [Logical Components](./logical-components.md) | System component inventory |
| [Architecture Style](./architecture-style.md) | Chosen architecture style and rationale |
| [Decisions](./decisions/) | Architecture Decision Records (ADRs) |
| [Diagrams](./diagrams/) | Architecture diagrams |

Generated on ${new Date().toISOString().split("T")[0]}.
`;
}

export function generateCharacteristics(p: ProjectWithRelations): string {
  if (p.characteristics.length === 0)
    return "# Architecture Characteristics\n\nNo characteristics identified.\n";
  const topThree = p.characteristics.filter((c) => c.isTopThree);
  let md = `# Architecture Characteristics\n\n`;
  if (topThree.length > 0) {
    md += `## Top 3 Driving Characteristics\n\n`;
    for (const c of topThree) {
      md += `- **${c.name}** (${"★".repeat(c.rating)}${"☆".repeat(5 - c.rating)}) — ${c.description ?? ""}\n`;
    }
    md += "\n";
  }
  md += `## Full Characteristics Worksheet\n\n`;
  md += `| Characteristic | Rating | Top 3 | Description |\n`;
  md += `|---|---|---|---|\n`;
  for (const c of p.characteristics) {
    md += `| ${c.name} | ${"★".repeat(c.rating)}${"☆".repeat(5 - c.rating)} | ${c.isTopThree ? "✓" : ""} | ${c.description ?? ""} |\n`;
  }
  return md;
}

export function generateComponents(p: ProjectWithRelations): string {
  if (p.components.length === 0) return "# Logical Components\n\nNo components identified.\n";
  let md = `# Logical Components\n\n`;
  const groups: Record<string, typeof p.components> = {};
  for (const c of p.components) {
    const ns = c.namespace ?? "Core";
    if (!groups[ns]) groups[ns] = [];
    groups[ns].push(c);
  }
  for (const [ns, comps] of Object.entries(groups)) {
    md += `## ${ns}\n\n`;
    for (const c of comps) {
      md += `### ${c.name}\n\n`;
      if (c.responsibility) md += `**Responsibility:** ${c.responsibility}\n\n`;
      if (c.dependencies && c.dependencies.length > 0) {
        md += `**Dependencies:** ${c.dependencies.join(", ")}\n\n`;
      }
    }
  }
  return md;
}

export function generateStyle(p: ProjectWithRelations): string {
  if (p.styles.length === 0) return "# Architecture Style\n\nNo architecture style selected.\n";
  const selected = p.styles.find((s) => s.isSelected);
  let md = `# Architecture Style\n\n`;
  if (selected) {
    md += `## Selected: ${selected.styleName}\n\n`;
    if (selected.rationale) md += `${selected.rationale}\n\n`;
  }
  md += `## Style Comparison\n\n`;
  const allRatings = p.styles.flatMap((s) => {
    const ratings = s.starRatings;
    if (!ratings || typeof ratings !== "object") return [];
    return Object.keys(ratings);
  });
  const characteristics = [...new Set(allRatings)];
  if (characteristics.length === 0) {
    md += `No characteristic ratings recorded.\n`;
    return md;
  }
  md += `| Style | ${characteristics.join(" | ")} |\n`;
  md += `|---|${"---|".repeat(characteristics.length)}\n`;
  for (const s of p.styles) {
    const ratings = characteristics.map((c) => {
      const r = Math.min(5, Math.max(0, s.starRatings?.[c] ?? 0));
      return "★".repeat(r) + "☆".repeat(5 - r);
    });
    md += `| ${s.styleName}${s.isSelected ? " ✓" : ""} | ${ratings.join(" | ")} |\n`;
  }
  return md;
}

export function generateDecision(
  d: ProjectWithRelations["decisions"][number],
  index: number
): string {
  const num = String(index + 1).padStart(3, "0");
  return `# ADR-${num}: ${d.title}

**Status:** ${d.status}

**Date:** ${new Date(d.createdAt).toISOString().split("T")[0]}

## Context

${d.context ?? "No context provided."}

## Decision

${d.decision ?? "No decision documented."}

## Consequences

${d.consequences ?? "No consequences documented."}
`;
}

export function generateDiagram(d: ProjectWithRelations["diagrams"][number]): string {
  return `# ${d.title}

**Type:** ${d.diagramType}

\`\`\`mermaid
${d.mermaidCode}
\`\`\`
`;
}
