import { cn } from "@/lib/utils";
import { STEPS } from "@/lib/steps";
import { Check, Lock } from "lucide-react";

interface StepSidebarProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepSidebar({ currentStep, onStepClick }: StepSidebarProps) {
  return (
    <nav className="flex flex-col gap-1 p-4">
      <h2 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Architecture Steps
      </h2>
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep || currentStep > 5;
        const isActive = stepNumber === currentStep && currentStep <= 5;
        const isLocked = stepNumber > currentStep && currentStep <= 5;
        const Icon = step.icon;

        return (
          <button
            key={step.label}
            onClick={() => !isLocked && onStepClick?.(stepNumber)}
            disabled={isLocked}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all",
              isActive && "bg-blue-50 dark:bg-blue-950/40",
              isCompleted && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50",
              isLocked && "cursor-not-allowed opacity-50",
              !isActive && !isLocked && !isCompleted && "opacity-70"
            )}
          >
            {/* Step indicator */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                isCompleted &&
                  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
                isActive && "bg-blue-600 text-white",
                isLocked && "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : isLocked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>

            {/* Label */}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  isActive && "text-blue-700 dark:text-blue-300",
                  isCompleted && "text-gray-700 dark:text-gray-300",
                  isLocked && "text-gray-400 dark:text-gray-600"
                )}
              >
                {step.label}
              </p>
              <p
                className={cn(
                  "truncate text-xs",
                  isActive && "text-blue-500/70 dark:text-blue-400/60",
                  !isActive && "text-gray-400 dark:text-gray-500"
                )}
              >
                {step.description}
              </p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
