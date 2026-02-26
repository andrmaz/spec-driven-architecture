import { Layers } from "lucide-react";

interface EmptyStateProps {
  onCreateProject: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
        <Layers className="h-10 w-10 text-blue-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">No projects yet</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Create your first architecture project and let the AI guide you through identifying
        characteristics, components, and architectural decisions.
      </p>
      <button
        onClick={onCreateProject}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Create Your First Project
      </button>
    </div>
  );
}
