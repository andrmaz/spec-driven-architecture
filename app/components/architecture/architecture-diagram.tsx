import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Code, Eye } from "lucide-react";

interface ArchitectureDiagramProps {
  title?: string;
  mermaidCode?: string;
  diagramType?: "context" | "container" | "component" | "sequence" | "flowchart";
}

const TYPE_LABELS: Record<string, string> = {
  context: "C4 Context",
  container: "C4 Container",
  component: "Component",
  sequence: "Sequence",
  flowchart: "Flowchart",
};

/**
 * Sanitise AI-generated Mermaid code to fix common syntax issues
 * that cause the parser to fail.
 */
function sanitizeMermaidCode(code: string): string {
  let sanitized = code.trim();

  // Replace deprecated "graph TD/TB/LR/RL" with "flowchart" equivalent
  sanitized = sanitized.replace(/^graph\s+(TD|TB|LR|RL|BT)\b/m, (_, dir) => `flowchart ${dir}`);

  // Remove semicolons at end of lines (valid in old syntax, can confuse new parser)
  sanitized = sanitized.replace(/;\s*$/gm, "");

  // Fix unquoted labels that contain parentheses — wrap in double quotes
  // e.g. A(Some Label) → A["Some Label"]
  sanitized = sanitized.replace(
    /^(\s*\w+)\(([^)]*)\)\s*$/gm,
    (_, id, label) => `${id}["${label}"]`
  );

  return sanitized;
}

export function ArchitectureDiagram({ title, mermaidCode, diagramType }: ArchitectureDiagramProps) {
  const [showCode, setShowCode] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mermaidCode) return;

    let cancelled = false;
    setSvg(null);
    setError(null);

    async function renderDiagram() {
      try {
        const mermaid = await import("mermaid");
        mermaid.default.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
          suppressErrorRendering: true,
        });
        const sanitized = sanitizeMermaidCode(mermaidCode!);
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg: renderedSvg } = await mermaid.default.render(id, sanitized);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg(null);
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          // Auto-show code view so the user can see what went wrong
          setShowCode(true);
        }
      }
    }

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [mermaidCode]);

  if (!mermaidCode) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
        No diagram code provided.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50 px-5 py-3 dark:from-cyan-950/30 dark:to-blue-950/30">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {title ?? "Architecture Diagram"}
          </h3>
          {diagramType && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {TYPE_LABELS[diagramType] ?? diagramType}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCode((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          )}
        >
          {showCode ? (
            <>
              <Eye className="h-3.5 w-3.5" /> Preview
            </>
          ) : (
            <>
              <Code className="h-3.5 w-3.5" /> Code
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="bg-white p-4 dark:bg-gray-900">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Mermaid syntax error — showing source code below
              </p>
              <p className="mt-1 text-amber-700 dark:text-amber-400/80">{error}</p>
            </div>
          </div>
        )}
        {showCode || error ? (
          <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs dark:bg-gray-800">
            <code className="text-gray-800 dark:text-gray-200">{mermaidCode}</code>
          </pre>
        ) : svg ? (
          <div
            ref={containerRef}
            className="flex justify-center [&>svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            Rendering diagram...
          </div>
        )}
      </div>
    </div>
  );
}
