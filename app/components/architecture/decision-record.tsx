import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

import { CardHeader } from "../ui/card-header";

interface DecisionRecordProps {
  title?: string;
  status?: "proposed" | "accepted" | "deprecated" | "superseded";
  context?: string;
  decision?: string;
  consequences?: string;
}

const STATUS_STYLES: Record<string, string> = {
  proposed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  deprecated: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  superseded: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

export function DecisionRecord({
  title,
  status,
  context,
  decision,
  consequences,
}: DecisionRecordProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <CardHeader
        gradient="orange-amber"
        title={title ?? "Untitled Decision"}
        className="flex items-center gap-3"
      >
        <FileText className="h-4 w-4 text-orange-500" />
        <h3 className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
          {title ?? "Untitled Decision"}
        </h3>
        {status && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              STATUS_STYLES[status] ?? STATUS_STYLES.proposed
            )}
          >
            {status}
          </span>
        )}
      </CardHeader>

      {/* Body */}
      <div className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
        {context && (
          <div className="px-5 py-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Context
            </h4>
            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {context}
            </p>
          </div>
        )}
        {decision && (
          <div className="px-5 py-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Decision
            </h4>
            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {decision}
            </p>
          </div>
        )}
        {consequences && (
          <div className="px-5 py-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Consequences
            </h4>
            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {consequences}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
