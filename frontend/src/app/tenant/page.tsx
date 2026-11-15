import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Bell, CheckCircle2, ChevronRight, MessageSquarePlus, ReceiptText, Smartphone } from "lucide-react";
import { PaymentBadge } from "@/components/status";
import { Button, buttonClasses, Card, CardHeader, ProgressBar } from "@/components/ui";
import { requireTenant, serverGet } from "@/lib/server-api";
import { formatDate, formatKES, monthLabel } from "@/lib/format";
import type { AnnouncementDTO, LedgerMonth, TicketDTO } from "@/lib/types";

export const metadata: Metadata = { title: "Home" };

export default async function TenantHome() {
  const user = await requireTenant();
  const [ledger, notices, tickets] = await Promise.all([
    serverGet<LedgerMonth[]>("/me/ledger"),
    serverGet<AnnouncementDTO[]>("/announcements?limit=2"),
    serverGet<TicketDTO[]>("/me/tickets"),
  ]);

  const current = ledger[0];
  const arrears = ledger.slice(1).filter((m) => m.balance > 0);
  const arrearsTotal = arrears.reduce((a, m) => a + m.balance, 0);
  const open = tickets.filter((t) => t.status !== "resolved").length;
  const until = current.daysUntilDue;

  const dueLine =
    current.status === "paid"
      ? "Paid in full. Thank you!"
      : current.daysOverdue > 0
        ? `${current.daysOverdue} day${current.daysOverdue === 1 ? "" : "s"} overdue · was due ${formatDate(current.dueDate)}`
        : until === 0
          ? "Due today"
          : `Due ${formatDate(current.dueDate)} · in ${until} day${until === 1 ? "" : "s"}`;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Hello,</p>
        <h1 className="text-2xl font-bold tracking-tight">{user.name.split(" ")[0]}</h1>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-primary p-6 text-primary-foreground">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-primary-foreground/80">{monthLabel(current.month)} rent</p>
            <span className="rounded-full bg-card px-1">
              <PaymentBadge status={current.status} />
            </span>
          </div>
          <p className="mt-3 text-4xl font-extrabold tracking-tight tabular-nums">
            {current.status === "paid" ? formatKES(0) : formatKES(current.balance)}
          </p>
          <p className="mt-1 text-sm text-primary-foreground/80">{current.status === "paid" ? "Balance" : "Balance due"}</p>
        </div>
        <div className="space-y-4 p-6">
          <p className={current.daysOverdue > 0 && current.status !== "paid" ? "flex items-center gap-2 text-sm font-semibold text-danger" : "flex items-center gap-2 text-sm font-medium"}>
            {current.status === "paid" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4" />}
            {dueLine}
          </p>
          <ProgressBar value={current.paid} max={current.rent} tone={current.status === "paid" ? "success" : current.status === "partial" ? "warning" : "danger"} />
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Monthly rent</dt>
              <dd className="font-semibold tabular-nums">{formatKES(current.rent)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid so far</dt>
              <dd className="font-semibold tabular-nums">{formatKES(current.paid)}</dd>
            </div>
          </dl>
          {/* Phase 2: wire this to initiateStkPush() in src/lib/mpesa.ts */}
          <Button className="w-full" size="lg" disabled aria-describedby="mpesa-note">
            <Smartphone className="h-4 w-4" />
            Pay with M-Pesa
          </Button>
          <p id="mpesa-note" className="text-center text-xs text-muted-foreground">
            In-app M-Pesa payment is coming soon. For now, pay as usual and your caretaker will record it.
          </p>
        </div>
      </Card>

      {arrearsTotal > 0 && (
        <Card className="border-danger/40 bg-danger/5 p-5">
          <p className="flex items-center gap-2 font-semibold text-danger">
            <AlertCircle className="h-4 w-4" />
            Earlier balance: {formatKES(arrearsTotal)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Unpaid from {arrears.map((m) => monthLabel(m.month, true)).reverse().join(", ")}. Please clear this with your caretaker.
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/tenant/requests" className={buttonClasses({ variant: "secondary", size: "lg", className: "justify-start" })}>
          <MessageSquarePlus className="h-5 w-5" />
          Report an issue
        </Link>
        <Link href="/tenant/payments" className={buttonClasses({ variant: "secondary", size: "lg", className: "justify-start" })}>
          <ReceiptText className="h-5 w-5" />
          Payment history
        </Link>
        <Link href="/tenant/requests" className={buttonClasses({ variant: "secondary", size: "lg", className: "justify-start" })}>
          <Bell className="h-5 w-5" />
          {open} open request{open === 1 ? "" : "s"}
        </Link>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Latest notices"
          action={
            <Link href="/tenant/notices" className={buttonClasses({ variant: "ghost", size: "sm" })}>
              See all
            </Link>
          }
        />
        {notices.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No notices right now.</p>
        ) : (
          <ul className="divide-y">
            {notices.map((n) => (
              <li key={n._id}>
                <Link href="/tenant/notices" className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/60">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
