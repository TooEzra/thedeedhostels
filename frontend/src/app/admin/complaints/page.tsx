import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { FilterChips } from "@/components/controls";
import { PriorityBadge, TicketStatusBadge } from "@/components/status";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { cn, formatDateTime } from "@/lib/format";
import { serverGet } from "@/lib/server-api";
import { TICKET_CATEGORY_LABEL, TICKET_PRIORITIES, TICKET_STATUSES, type TicketDTO, type TicketPriority, type TicketStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Complaints" };

export default async function ComplaintsPage({ searchParams }: { searchParams: { status?: string; priority?: string } }) {
  const status = TICKET_STATUSES.find((s) => s === searchParams.status) as TicketStatus | undefined;
  const priority = TICKET_PRIORITIES.find((p) => p === searchParams.priority) as TicketPriority | undefined;
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (priority) qs.set("priority", priority);
  const [tickets, everything] = await Promise.all([serverGet<TicketDTO[]>(`/tickets?${qs}`), serverGet<TicketDTO[]>("/tickets")]);
  const count = (s: TicketStatus) => everything.filter((t) => t.status === s).length;
  const unread = everything.filter((t) => t.staffUnread).length;

  return (
    <>
      <PageHeader
        title="Complaints & requests"
        description={unread > 0 ? `${unread} new since you last looked` : "Everything your tenants have reported"}
      />
      <div className="mb-5 space-y-3">
        <FilterChips
          param="status"
          value={status ?? "all"}
          options={[
            { value: "all", label: "All", count: everything.length },
            { value: "open", label: "Open", count: count("open") },
            { value: "in_progress", label: "In progress", count: count("in_progress") },
            { value: "resolved", label: "Resolved", count: count("resolved") },
          ]}
        />
        <FilterChips
          param="priority"
          value={priority ?? "all"}
          options={[
            { value: "all", label: "Any priority" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {tickets.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="Nothing here" text="No requests match these filters. New tenant requests will show up in this inbox." />
        ) : (
          <ul className="divide-y">
            {tickets.map((t) => (
              <li key={t._id}>
                <Link href={`/admin/complaints/${t._id}`} className={cn("block px-4 py-4 hover:bg-muted/60 sm:px-5", t.staffUnread && "bg-accent/5")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        {t.staffUnread && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">New</span>
                        )}
                        {TICKET_CATEGORY_LABEL[t.category]} · Unit {t.unitNumber}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t.tenantName} · {formatDateTime(t.createdAt)}
                        {t.replyCount > 0 ? ` · ${t.replyCount} repl${t.replyCount === 1 ? "y" : "ies"}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <TicketStatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
