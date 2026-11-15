import { Building2 } from "lucide-react";
import { cn } from "@/lib/format";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Building2 className="h-5 w-5" aria-hidden />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">The Deed</span>
          <span className="mt-1 text-base font-extrabold uppercase tracking-wide">Hostels</span>
        </span>
      )}
      <span className="sr-only">THE DEED HOSTELS</span>
    </span>
  );
}
