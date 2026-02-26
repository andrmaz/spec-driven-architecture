import { cn } from "@/lib/utils";
import type { Project } from "@/lib/api";
import { Link } from "react-router";
import { MoreHorizontal, Trash2, ArrowRight } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const STEP_LABELS = [
  "Characteristics",
  "Components",
  "Architecture Style",
  "Decisions",
  "Diagrams",
];

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const stepLabel = STEP_LABELS[project.currentStep - 1] ?? "Unknown";
  const progress = (project.currentStep / 5) * 100;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-gray-200 bg-white p-5",
        "shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
              {project.description}
            </p>
          )}
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className={cn(
                "ml-2 rounded-lg p-1.5 text-gray-400 transition-colors",
                "hover:bg-gray-100 hover:text-gray-600",
                "dark:hover:bg-gray-800 dark:hover:text-gray-300"
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={cn(
                "z-50 min-w-[140px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg",
                "dark:border-gray-700 dark:bg-gray-800"
              )}
              sideOffset={5}
            >
              <DropdownMenu.Item
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm",
                  "text-red-600 outline-none hover:bg-red-50",
                  "dark:text-red-400 dark:hover:bg-red-950"
                )}
                onSelect={() => onDelete(project.id)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-gray-600 dark:text-gray-400">
            Step {project.currentStep}/5
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {stepLabel}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <time className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(project.updatedAt).toLocaleDateString()}
        </time>
        <Link
          to={`/projects/${project.id}`}
          className={cn(
            "inline-flex items-center gap-1 text-sm font-medium text-blue-600",
            "transition-colors hover:text-blue-800",
            "dark:text-blue-400 dark:hover:text-blue-300"
          )}
        >
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
