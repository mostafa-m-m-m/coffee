import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names and lets the last Tailwind utility win (`cn("px-3", cond && "px-5")` gives `px-5`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
