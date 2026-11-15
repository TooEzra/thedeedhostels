import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { NewTicketForm, ReplyForm } from "@/components/forms/ticket-forms";
import { PriorityBadge, TicketStatusBadge } from "@/components/status";
import { Card, EmptyState } from "@/components/ui";
import { requireTenant, serverGet } from "@/lib/server-api";
import { cn, formatDateTime } from "@/lib/format";
import { TICKET_CATEGORY_LABEL, type TicketDTO } from "@/lib/types";

export const metadata: Metadata = { title: "Requests" };

export default async function TenantRequests() {
  await requireTenant();
  const tickets = await serverGet<TicketDTO[]>("/me/tickets");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Requests & complaints</h1>
        <p className="mt-1 text-sm text-muted-foreground">Report a problem or ask for something. Your caretaker's replies appear below.</p>
      </div>

      <NewTicketForm />

      <h2 className="pt-2 text-base font-semibold">Your requests</h2>
      {tickets.length === 0 ? (
        <Card>
          <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No requests yet" text="When you send a request, you can follow its progress here." />
        </Card>
      ) : (
        tickets.map((t) => (
          <Card key={t._id} className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-5 pb-3">
              <div className="min-w-0">
                <p className="font-semibold">{TICKET_CATEGORY_LABEL[t.category]}</p>
                <p className="text-xs text-muted-foreground">Sent {formatDateTime(t.createdAt)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <TicketStatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
              </div>
            </div>
            <div className="space-y-3 px-5 pb-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.description}</p>
              {t.photoUrl && (
                <a href={`/api/uploads/${t.photoUrl}`} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/uploads/${t.photoUrl}`} alt="Photo you attached" className="max-h-48 rounded-xl border object-cover" />
                </a>
              )}
            </div>
            {t.replies && t.replies.length > 0 && (
              <ul className="space-y-2 border-t bg-muted/40 p-5">
                {t.replies.map((r) => {
                  const staff = r.authorRole !== "tenant";
                  return (
                    <li key={r._id} className={cn("flex", !staff && "justify-end")}>
                      <div className={cn("max-w-[88%] rounded-2xl px-4 py-2.5 text-sm", staff ? "bg-card shadow-card" : "bg-primary text-primary-foreground")}>
                        <p className="whitespace-pre-wrap">{r.message}</p>
                        <p className={cn("mt-1 text-[11px]", staff ? "text-muted-foreground" : "text-primary-foreground/70")}>
                          {staff ? `${r.authorName} (caretaker)` : "You"} · {formatDateTime(r.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t p-5">
              <ReplyForm ticketId={t._id} scope="tenant" placeholder={t.status === "resolved" ? "Not fixed? Reply to re-open this request…" : "Add a message…"} />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
