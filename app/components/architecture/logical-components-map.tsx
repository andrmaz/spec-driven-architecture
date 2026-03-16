import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

import { CardHeader } from "../ui/card-header";
import { EmptyCard } from "../ui/empty-card";

export interface LogicalComponentItem {
  name?: string;
  responsibility?: string;
  dependencies?: string[];
  namespace?: string;
}

interface LogicalComponentsMapProps {
  components?: LogicalComponentItem[];
  namespaces?: string[];
}

export function LogicalComponentsMap({ components, namespaces }: LogicalComponentsMapProps) {
  const items = components ?? [];

  if (items.length === 0) {
    return <EmptyCard message="No components identified yet." />;
  }

  // Group by namespace
  const groups: Record<string, LogicalComponentItem[]> = {};
  for (const item of items) {
    const ns = item.namespace ?? "Core";
    if (!groups[ns]) groups[ns] = [];
    groups[ns].push(item);
  }

  const groupNames = namespaces ?? Object.keys(groups);

  return (
    <div className="space-y-4">
      <CardHeader
        gradient="purple-indigo"
        title="Logical Components Map"
        subtitle={`${items.length} components across ${groupNames.length} namespace(s)`}
        className="rounded-xl border border-gray-200 dark:border-gray-700"
      />

      {groupNames.map((ns) => (
        <div key={ns}>
          <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {ns}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(groups[ns] ?? []).map((item, i) => (
              <div
                key={item.name ?? i}
                className={cn(
                  "rounded-lg border border-gray-200 bg-white p-4",
                  "dark:border-gray-700 dark:bg-gray-900"
                )}
              >
                <h5 className="font-medium text-gray-900 dark:text-gray-100">{item.name ?? "—"}</h5>
                {item.responsibility && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {item.responsibility}
                  </p>
                )}
                {item.dependencies && item.dependencies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.dependencies.map((dep) => (
                      <span
                        key={dep}
                        className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      >
                        <ArrowRight className="h-3 w-3" />
                        {dep}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
