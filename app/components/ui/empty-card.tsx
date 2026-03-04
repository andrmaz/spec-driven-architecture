import { cn } from "@/lib/utils";

interface EmptyCardProps {
  message: string;
  className?: string;
}

export function EmptyCard({ message, className }: EmptyCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
        className
      )}
    >
      {message}
    </div>
  );
}
