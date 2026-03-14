import { cn } from "@/lib/utils";
import { useTamboThreadInput } from "@tambo-ai/react";
import { useState } from "react";

import { CardHeader } from "../ui/card-header";
import { EmptyCard } from "../ui/empty-card";

export interface MultipleChoiceOption {
  label?: string;
  description?: string;
}

interface MultipleChoiceQuestionProps {
  question?: string;
  options?: MultipleChoiceOption[];
}

export function MultipleChoiceQuestion({ question, options }: MultipleChoiceQuestionProps) {
  const { setValue, submit } = useTamboThreadInput();
  const [selected, setSelected] = useState<string | null>(null);

  const items = options ?? [];

  if (items.length === 0) {
    return <EmptyCard message="No options available." />;
  }

  const handleSelect = async (label: string) => {
    if (selected) return;
    setSelected(label);
    setValue(label);
    await submit();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      {question && <CardHeader gradient="blue-indigo" title={question} />}
      <div className="flex flex-col gap-2 p-4">
        {items.map((option, i) => {
          const label = option.label ?? `Option ${i + 1}`;
          const isSelected = selected === label;
          const isDisabled = selected !== null;

          return (
            <button
              key={label}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelect(label)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border px-4 py-3 text-left transition-all",
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600 dark:hover:bg-blue-950/20",
                isDisabled && !isSelected && "opacity-50 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  isSelected
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-900 dark:text-gray-100"
                )}
              >
                {label}
              </span>
              {option.description && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
