import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface StepItem {
  name?: string;
  status?: "completed" | "active" | "locked";
}

interface StepProgressProps {
  steps?: StepItem[];
  currentStep?: number;
}

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  const items = steps ?? [];

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
      {items.map((step, i) => {
        const stepNumber = i + 1;
        const isCompleted = step.status === "completed" || stepNumber < (currentStep ?? 1);
        const isActive = step.status === "active" || stepNumber === (currentStep ?? 1);

        return (
          <div key={step.name ?? i} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-6",
                  isCompleted ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isCompleted &&
                    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
                  isActive && !isCompleted && "bg-blue-600 text-white",
                  !isActive &&
                    !isCompleted &&
                    "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : stepNumber}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-medium",
                  isActive && !isCompleted && "text-blue-700 dark:text-blue-300",
                  isCompleted && "text-green-700 dark:text-green-400",
                  !isActive && !isCompleted && "text-gray-400 dark:text-gray-500"
                )}
              >
                {step.name ?? `Step ${stepNumber}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
