import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

import { CardHeader } from "../ui/card-header";
import { EmptyCard } from "../ui/empty-card";
import { StarRating } from "../ui/star-rating";

export interface StyleRating {
  characteristic?: string;
  rating?: number;
}

export interface StyleItem {
  name?: string;
  ratings?: StyleRating[];
}

interface StyleComparisonChartProps {
  styles?: StyleItem[];
  selectedStyle?: string;
}

export function StyleComparisonChart({ styles, selectedStyle }: StyleComparisonChartProps) {
  const items = styles ?? [];

  if (items.length === 0) {
    return <EmptyCard message="No architecture styles to compare yet." />;
  }

  // Collect all unique characteristic names from ratings
  const characteristicNames = new Set<string>();
  for (const item of items) {
    if (item.ratings) {
      for (const r of item.ratings) {
        if (r.characteristic) characteristicNames.add(r.characteristic);
      }
    }
  }
  const characteristics = Array.from(characteristicNames);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <CardHeader
        gradient="emerald-teal"
        title="Architecture Style Comparison"
        subtitle={
          <>
            Star ratings per characteristic —{" "}
            {selectedStyle ? (
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                Selected: {selectedStyle}
              </span>
            ) : (
              "no style selected yet"
            )}
          </>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <th className="px-5 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">
                Style
              </th>
              {characteristics.map((c) => (
                <th
                  key={c}
                  className="px-4 py-2.5 text-center font-medium text-gray-600 dark:text-gray-400"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const isSelected = item.name === selectedStyle;
              return (
                <tr
                  key={item.name ?? i}
                  className={cn(
                    "border-b border-gray-100 dark:border-gray-800",
                    isSelected && "bg-emerald-50/60 dark:bg-emerald-950/20"
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span
                        className={cn(
                          "font-medium",
                          isSelected
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-gray-900 dark:text-gray-100"
                        )}
                      >
                        {item.name ?? "—"}
                      </span>
                    </div>
                  </td>
                  {characteristics.map((c) => {
                    const rating = item.ratings?.find((r) => r.characteristic === c)?.rating ?? 0;
                    return (
                      <td key={c} className="px-4 py-3">
                        <div className="flex justify-center">
                          <StarRating value={rating} size="sm" />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
