import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Download, FileText, Eye } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { cn, slugify, sanitizeFilename } from "@/lib/utils";
import { getProjectExport } from "@/lib/api";
import {
  generateReadme,
  generateCharacteristics,
  generateComponents,
  generateStyle,
  generateDecision,
  generateDiagram,
} from "@/lib/export-generators";
import type { Route } from "./+types/export";

export function meta() {
  return [{ title: "Export — Spec-Driven Architecture" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const project = await getProjectExport(params.id);
  return { project };
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
      const num = String(i + 1).padStart(3, "0");
      const slug = slugify(d.title) || `decision-${num}`;
      f.push({
        path: `decisions/${num}-${slug}.md`,
        content: generateDecision(d, i),
      });
    });
    project.diagrams.forEach((d, i) => {
      const slug = slugify(d.title) || `diagram-${i + 1}`;
      f.push({
        path: `diagrams/${slug}.md`,
        content: generateDiagram(d),
      });
    });
    return f;
  }, [project]);

  const handleDownload = useCallback(async () => {
    const zip = new JSZip();
    const folderName = sanitizeFilename(project.name) || `project-${project.id.slice(0, 8)}`;
    const folder = zip.folder(folderName) ?? zip;
    for (const file of files) {
      folder.file(file.path, file.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${folderName}-architecture.zip`);
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
