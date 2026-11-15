import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { DeleteButton } from "@/components/forms/misc-forms";
import { MarkRead, ReplyForm, TicketControls } from "@/components/forms/ticket-forms";
import { PriorityBadge, TicketStatusBadge } from "@/components/status";
import { Badge, Card, CardHeader } from "@/components/ui";
import { cn, formatDateTime } from "@/lib/format";
import { getMe, serverGet } from "@/lib/server-api";
import { TICKET_CATEGORY_LABEL, type TicketDTO } from "@/lib/types";

export const metadata: Metadata = { title: "Request" };

export default async function TicketDetail({ params }: { params: { id: string } }) {
  const [user, t] = await Promise.all([getMe(), serverGet<TicketDTO>(`/tickets/${params.id}`)]);

  return (
    <>
      <MarkRead ticketId={t._id} unread={t.staffUnread} />
      <Link href="/admin/complaints" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        All requests
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title={`${TICKET_CATEGORY_LABEL[t.category]} · Unit ${t.unitNumber}`}
              description={`${t.tenantName} · ${formatDateTime(t.createdAt)}`}
              action={
                <div className="flex flex-col items-end gap-1.5">
                  <TicketStatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                </div>
              }
            />
            <div className="space-y-4 px-5 pb-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.description}</p>
              {t.photoUrl && (
                <a href={`/api/uploads/${t.photoUrl}`} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/uploads/${t.photoUrl}`}
                    alt="Photo attached by the tenant"
                    className="max-h-80 w-full rounded-xl border object-cover sm:w-auto"
                  />
                </a>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Conversation" description={t.replies?.length ? undefined : "No replies yet."} />
            <ul className="space-y-3 px-5 pb-4">
              {t.replies?.map((r) => {
                const staff = r.authorRole !== "tenant";
                return (
                  <li key={r._id} className={cn("flex", staff && "justify-end")}>
                    <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", staff ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      <p className="whitespace-pre-wrap">{r.message}</p>
                      <p className={cn("mt-1 text-[11px]", staff ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {r.authorName} · {formatDateTime(r.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t p-5">
              <ReplyForm ticketId={t._id} scope="staff" placeholder="Reply to the tenant…" />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <MessageSquare className="h-4 w-4" /> Manage
            </h2>
            <TicketControls ticketId={t._id} status={t.status} priority={t.priority} />
            <p className="mt-3 text-xs text-muted-foreground">Your first reply moves an open request to "In progress". Set it to Resolved when it's fixed. If the tenant replies again, it re-opens.</p>
          </Card>
          {user?.role === "landlord" && (
            <Card className="p-5">
              <Badge tone="neutral">Landlord only</Badge>
              <div className="mt-3">
                <DeleteButton endpoint="/tickets" id={t._id} label="Delete request" confirm="Delete this request and its replies permanently?" />
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
