import { cn } from "@/lib/utils";

type GradientPreset =
  | "blue-indigo"
  | "purple-indigo"
  | "emerald-teal"
  | "orange-amber"
  | "cyan-blue";

const GRADIENT_CLASSES: Record<GradientPreset, string> = {
  "blue-indigo":
    "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
  "purple-indigo":
    "bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30",
  "emerald-teal":
    "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
  "orange-amber":
    "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30",
  "cyan-blue": "bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30",
};

interface CardHeaderProps {
  gradient: GradientPreset;
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function CardHeader({ gradient, title, subtitle, children, className }: CardHeaderProps) {
  return (
    <div className={cn(GRADIENT_CLASSES[gradient], "px-5 py-3", className)}>
      {children ?? (
        <>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </>
      )}
    </div>
  );
}
