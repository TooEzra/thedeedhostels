"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Printer, Search, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button, Select } from "@/components/ui";
import { cn, currentMonth, lastMonths, monthLabel, shiftMonth } from "@/lib/format";

function useParamUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
}

export function MonthPicker({ month }: { month: string }) {
  const update = useParamUpdater();
  const now = currentMonth();
  const options = lastMonths(24, now).reverse();
  if (!options.includes(month)) options.push(month);
  return (
    <div className="flex items-center gap-1.5 print:hidden">
      <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => update({ month: shiftMonth(month, -1) })}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Select
        aria-label="Month"
        value={month}
        onChange={(e) => update({ month: e.target.value })}
        className="w-40 font-medium"
      >
        {options.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </Select>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next month"
        disabled={month >= now}
        onClick={() => update({ month: shiftMonth(month, 1) })}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FilterChips({
  param,
  options,
  value,
}: {
  param: string;
  value: string;
  options: { value: string; label: string; count?: number }[];
}) {
  const update = useParamUpdater();
  return (
    <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => update({ [param]: o.value === "all" ? null : o.value })}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
              active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20" : "bg-muted text-muted-foreground")}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({ placeholder = "Search…" }: { placeholder?: string }) {
  const update = useParamUpdater();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          toast.error("Couldn't copy. Please copy it manually.");
        }
      }}
    >
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {done ? "Copied" : label}
    </Button>
  );
}
