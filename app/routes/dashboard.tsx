import { useState, useCallback } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { listProjects, createProject, deleteProject } from "@/lib/api";
import { ProjectCard } from "@/components/dashboard/project-card";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { Route } from "./+types/dashboard";

export function meta() {
  return [
    { title: "Spec-Driven Architecture" },
    { name: "description", content: "Architecture documentation assistant" },
  ];
}

export async function clientLoader() {
  const projects = await listProjects();
  return { projects };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { projects } = loaderData;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const isNavigating = navigation.state === "loading";

  const handleCreate = useCallback(
    async (data: { name: string; description?: string }) => {
      setIsSubmitting(true);
      try {
        const project = await createProject(data);
        setDialogOpen(false);
        navigate(`/projects/${project.id}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteProject(id);
      revalidator.revalidate();
    },
    [revalidator]
  );

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Architecture Projects
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            AI-guided software architecture documentation
          </p>
        </div>
        {projects.length > 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white",
              "transition-colors hover:bg-blue-700"
            )}
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        )}
      </div>

      {/* Content */}
      {projects.length === 0 ? (
        <EmptyState onCreateProject={() => setDialogOpen(true)} />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      {/* Navigation loading overlay */}
      {isNavigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-950/80">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Setting up your project...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
