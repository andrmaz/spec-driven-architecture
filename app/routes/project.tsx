import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { TamboProvider } from "@tambo-ai/react";
import { ArrowLeft, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProject } from "@/lib/api";
import type { ProjectWithRelations } from "@/lib/api";
import { components, createTools, getSystemPrompt } from "@/lib/tambo";
import { MessageThreadPanel } from "@/components/tambo/message-thread-panel";
import { StepSidebar } from "@/components/project/step-sidebar";
import type { Route } from "./+types/project";

export function meta() {
  return [{ title: `Project — Spec-Driven Architecture` }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const project = await getProject(params.id);
  return { project };
}

function ProjectWorkspaceInner({ project: initial }: { project: ProjectWithRelations }) {
  const [project, setProject] = useState(initial);
  const navigate = useNavigate();

  // Create project-scoped tools
  const tools = useMemo(() => createTools(project.id), [project.id]);

  // Get system prompt for current step
  const systemPrompt = useMemo(() => getSystemPrompt(project.currentStep), [project.currentStep]);

  // Poll for step changes (when AI calls advanceStep)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await getProject(project.id);
        if (fresh.currentStep !== project.currentStep) {
          setProject(fresh);
        }
      } catch {
        // ignore
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [project.id, project.currentStep]);

  const handleStepClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_step: number) => {
      // Only allow clicking completed steps (for review)
      // Future: could scroll to or filter by that step's content
    },
    []
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header
        className={cn(
          "flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3",
          "dark:border-gray-800 dark:bg-gray-950"
        )}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {project.name}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Step {project.currentStep} of 5
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/projects/${project.id}/export`)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700",
            "transition-colors hover:bg-gray-50",
            "dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          )}
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Step sidebar */}
        <aside
          className={cn(
            "w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50",
            "dark:border-gray-800 dark:bg-gray-900/50"
          )}
        >
          <StepSidebar currentStep={project.currentStep} onStepClick={handleStepClick} />
        </aside>

        {/* Chat workspace */}
        <main className="flex-1 overflow-hidden">
          <TamboProvider
            apiKey={import.meta.env.VITE_TAMBO_API_KEY}
            userKey={`project-${project.id}`}
            components={components}
            tools={tools}
            contextHelpers={{
              currentProject: () => ({
                projectId: project.id,
                projectName: project.name,
                projectDescription: project.description,
                currentStep: project.currentStep,
                characteristicsCount: project.characteristics?.length ?? 0,
                componentsCount: project.components?.length ?? 0,
                stylesCount: project.styles?.length ?? 0,
                decisionsCount: project.decisions?.length ?? 0,
                diagramsCount: project.diagrams?.length ?? 0,
              }),
              systemInstructions: () => ({
                prompt: systemPrompt,
              }),
            }}
          >
            <MessageThreadPanel />
          </TamboProvider>
        </main>
      </div>
    </div>
  );
}

export default function ProjectPage({ loaderData }: Route.ComponentProps) {
  const { project } = loaderData;
  return <ProjectWorkspaceInner project={project} />;
}
