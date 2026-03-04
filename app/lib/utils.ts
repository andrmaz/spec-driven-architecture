import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert a human-readable string into a URL-safe slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Remove characters that are unsafe for filenames/folder names. */
export function sanitizeFilename(text: string): string {
  return text.replace(/[^a-zA-Z0-9-_ ]/g, "");
}
