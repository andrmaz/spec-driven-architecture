import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
} as const;

export function StarRating({ value, max = 5, size = "md", className }: StarRatingProps) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            SIZE_CLASSES[size],
            i < value ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"
          )}
        />
      ))}
    </div>
  );
}
