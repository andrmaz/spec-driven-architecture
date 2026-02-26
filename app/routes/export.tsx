import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Download, FileText, Eye } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";
import { getProjectExport } from "@/lib/api";
import type { ProjectWithRelations } from "@/lib/api";
import type { Route } from "./+types/export";

export function meta() {
  return [{ title: "Export — Spec-Driven Architecture" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const project = await getProjectExport(params.id);
  return { project };
}

// ── Markdown generators ────────────────────────────────

function generateReadme(p: ProjectWithRelations): string {
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

function generateCharacteristics(p: ProjectWithRelations): string {
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

function generateComponents(p: ProjectWithRelations): string {
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

function generateStyle(p: ProjectWithRelations): string {
  if (p.styles.length === 0) return "# Architecture Style\n\nNo architecture style selected.\n";
  const selected = p.styles.find((s) => s.isSelected);
  let md = `# Architecture Style\n\n`;
  if (selected) {
    md += `## Selected: ${selected.styleName}\n\n`;
    if (selected.rationale) md += `${selected.rationale}\n\n`;
  }
  md += `## Style Comparison\n\n`;
  const allRatings = p.styles.flatMap((s) => Object.keys(s.starRatings ?? {}));
  const characteristics = [...new Set(allRatings)];
  md += `| Style | ${characteristics.join(" | ")} |\n`;
  md += `|---|${"---|".repeat(characteristics.length)}\n`;
  for (const s of p.styles) {
    const ratings = characteristics.map((c) => {
      const r = s.starRatings?.[c] ?? 0;
      return "★".repeat(r) + "☆".repeat(5 - r);
    });
    md += `| ${s.styleName}${s.isSelected ? " ✓" : ""} | ${ratings.join(" | ")} |\n`;
  }
  return md;
}

function generateDecision(d: ProjectWithRelations["decisions"][number], index: number): string {
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

function generateDiagram(d: ProjectWithRelations["diagrams"][number]): string {
  return `# ${d.title}

**Type:** ${d.diagramType}

\`\`\`mermaid
${d.mermaidCode}
\`\`\`
`;
}

// ── Export Page ─────────────────────────────────────────

interface FileEntry {
  path: string;
  content: string;
}

export default function ExportPage({ loaderData }: Route.ComponentProps) {
  const { project } = loaderData;
  const navigate = useNavigate();
  const [activeFile, setActiveFile] = useState(0);

  const files: FileEntry[] = useMemo(() => {
    const f: FileEntry[] = [
      { path: "README.md", content: generateReadme(project) },
      { path: "architecture-characteristics.md", content: generateCharacteristics(project) },
      { path: "logical-components.md", content: generateComponents(project) },
      { path: "architecture-style.md", content: generateStyle(project) },
    ];
    project.decisions.forEach((d, i) => {
      const slug = d.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const num = String(i + 1).padStart(3, "0");
      f.push({
        path: `decisions/${num}-${slug}.md`,
        content: generateDecision(d, i),
      });
    });
    project.diagrams.forEach((d) => {
      const slug = d.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      f.push({
        path: `diagrams/${slug}.md`,
        content: generateDiagram(d),
      });
    });
    return f;
  }, [project]);

  const handleDownload = useCallback(async () => {
    const zip = new JSZip();
    const folder = zip.folder(project.name.replace(/[^a-zA-Z0-9-_ ]/g, "")) ?? zip;
    for (const file of files) {
      folder.file(file.path, file.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${project.name.replace(/[^a-zA-Z0-9-_ ]/g, "")}-architecture.zip`);
  }, [files, project.name]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header
        className={cn(
          "flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3",
          "dark:border-gray-800 dark:bg-gray-950"
        )}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/projects/${project.id}`)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Export — {project.name}
            </h1>
            <p className="text-xs text-gray-500">{files.length} files</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white",
            "transition-colors hover:bg-blue-700"
          )}
        >
          <Download className="h-4 w-4" />
          Download ZIP
        </button>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File list */}
        <aside
          className={cn(
            "w-72 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3",
            "dark:border-gray-800 dark:bg-gray-900/50"
          )}
        >
          <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Files
          </h2>
          {files.map((file, i) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(i)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                i === activeFile
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              )}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{file.path}</span>
            </button>
          ))}
        </aside>

        {/* Preview */}
        <main className="flex-1 overflow-auto bg-white p-6 dark:bg-gray-950">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
              <Eye className="h-4 w-4" />
              <span>Preview — {files[activeFile]?.path}</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              {files[activeFile]?.content}
            </pre>
          </div>
        </main>
      </div>
    </div>
  );
}
