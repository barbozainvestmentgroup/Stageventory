import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function generateSku(category: string, sequence: number): string {
  const prefixes: Record<string, string> = {
    Furniture: "FRN",
    "Art & Wall Decor": "ART",
    "Rugs/Pillows/Linens": "RPL",
    "Lighting/Plants/Accessories": "LPA",
  };
  const prefix = prefixes[category] || "ITM";
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}
