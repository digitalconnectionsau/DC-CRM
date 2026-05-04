import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
}

export function daysUntilExpiry(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  return differenceInDays(new Date(date), new Date());
}

export function expiryLabel(date: Date | string | null | undefined): string {
  const days = daysUntilExpiry(date);
  if (days === null) return "Unknown";
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days <= 30) return `${days}d left`;
  return formatDate(date);
}
