import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TZ = "Africa/Nairobi"; // EAT, UTC+3, no DST

export function formatKES(n: number) {
  return `KES ${Math.round(n).toLocaleString("en-US")}`;
}

/** Today's date in Nairobi as YYYY-MM-DD. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function isMonth(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function parseMonthParam(s: string | undefined | null): string {
  return isMonth(s) ? s : currentMonth();
}

export function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(m: string, short = false): string {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: short ? "short" : "long",
    year: short ? "2-digit" : "numeric",
    timeZone: "UTC",
  });
}

export function monthStart(m: string): Date {
  return new Date(`${m}-01T00:00:00+03:00`);
}

export function monthEnd(m: string): Date {
  return new Date(monthStart(shiftMonth(m, 1)).getTime() - 1);
}

/** Last n months, oldest first, ending at `from`. */
export function lastMonths(n: number, from: string = currentMonth()): string[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(from, i - (n - 1)));
}

export function monthOf(d: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d)).slice(0, 7);
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });
}

export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** Normalise Kenyan numbers to international digits, e.g. 0712 345 678 -> 254712345678. */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("254")) return d;
  if (d.startsWith("0")) return `254${d.slice(1)}`;
  if (d.length === 9) return `254${d}`;
  return d;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
