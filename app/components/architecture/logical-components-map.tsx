import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

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
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
        No components identified yet.
      </div>
    );
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
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-3 dark:border-gray-700 dark:from-purple-950/30 dark:to-indigo-950/30">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Logical Components Map
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {items.length} components across {groupNames.length} namespace(s)
        </p>
      </div>

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
