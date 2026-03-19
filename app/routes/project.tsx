import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useRevalidator } from "react-router";
import { TamboProvider, useTambo, useTamboThreadInput } from "@tambo-ai/react";
import { ArrowLeft, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProject } from "@/lib/api";
import type { ProjectWithRelations } from "@/lib/api";
import { buildTamboConfig } from "@/lib/tambo";
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

function AutoWelcome() {
  const { messages, isIdle } = useTambo();
  const { setValue, submit } = useTamboThreadInput();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || !isIdle || messages.length > 0) return;
    sent.current = true;
    setValue("Hello! I just created a new project. Let's get started.");
    // Defer submit to next tick so the value is committed
    const id = setTimeout(() => void submit(), 0);
    return () => clearTimeout(id);
  }, [isIdle, messages.length, setValue, submit]);

  return null;
}

function ProjectWorkspaceInner({ project }: { project: ProjectWithRelations }) {
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const revalidateRef = useRef(revalidate);
  revalidateRef.current = revalidate;

  // Build Tambo config scoped to the current project and step.
  // revalidateRef keeps the closure up-to-date without recreating the config.
  const { systemPrompt, tools, components } = useMemo(
    () => buildTamboConfig(project.id, project.currentStep, () => revalidateRef.current()),
    [project.id, project.currentStep]
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
              {project.currentStep > 5 ? "All steps complete" : `Step ${project.currentStep} of 5`}
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
          <StepSidebar currentStep={project.currentStep} />
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
                characteristicsCount: project.characteristics?.filter((c) => c.name).length ?? 0,
                componentsCount: project.components?.filter((c) => c.name).length ?? 0,
                stylesCount: project.styles?.filter((s) => s.styleName).length ?? 0,
                decisionsCount: project.decisions?.filter((d) => d.title).length ?? 0,
                diagramsCount: project.diagrams?.filter((d) => d.title).length ?? 0,
              }),
              systemInstructions: () => ({
                prompt: systemPrompt,
              }),
            }}
          >
            <AutoWelcome />
            <MessageThreadPanel fullWidth />
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
