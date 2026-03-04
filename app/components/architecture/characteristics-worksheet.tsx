import { cn } from "@/lib/utils";

import { CardHeader } from "../ui/card-header";
import { EmptyCard } from "../ui/empty-card";
import { StarRating } from "../ui/star-rating";

export interface CharacteristicItem {
  name?: string;
  rating?: number;
  description?: string;
  isTopThree?: boolean;
}

interface CharacteristicsWorksheetProps {
  characteristics?: CharacteristicItem[];
}

export function CharacteristicsWorksheet({ characteristics }: CharacteristicsWorksheetProps) {
  const items = characteristics ?? [];

  if (items.length === 0) {
    return <EmptyCard message="No characteristics identified yet." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <CardHeader
        gradient="blue-indigo"
        title="Architecture Characteristics Worksheet"
        subtitle="Top 3 highlighted — the driving quality attributes for your system"
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <th className="px-5 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">
              Characteristic
            </th>
            <th className="px-5 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">
              Rating
            </th>
            <th className="px-5 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">
              Description
            </th>
            <th className="w-20 px-5 py-2.5 text-center font-medium text-gray-600 dark:text-gray-400">
              Top 3
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={item.name ?? i}
              className={cn(
                "border-b border-gray-100 dark:border-gray-800",
                item.isTopThree && "bg-amber-50/50 dark:bg-amber-950/20"
              )}
            >
              <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">
                {item.name ?? "—"}
              </td>
              <td className="px-5 py-3">
                <StarRating value={item.rating ?? 0} />
              </td>
              <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                {item.description ?? "—"}
              </td>
              <td className="px-5 py-3 text-center">
                {item.isTopThree && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    ★
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
