import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Banknote, Building, MessageSquare, TrendingUp, Wallet } from "lucide-react";
import { CollectionChart } from "@/components/collection-chart";
import { MonthPicker } from "@/components/controls";
import { DefaultersList, pickDefaulters, toPayOptions } from "@/components/defaulters";
import { RecordPaymentButton } from "@/components/forms/record-payment";
import { PriorityBadge } from "@/components/status";
import { buttonClasses, Card, CardHeader, EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { formatDateTime, formatKES, monthLabel, parseMonthParam } from "@/lib/format";
import { serverGet } from "@/lib/server-api";
import { TICKET_CATEGORY_LABEL, type RentOverview, type TicketDTO } from "@/lib/types";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverview({ searchParams }: { searchParams: { month?: string } }) {
  const month = parseMonthParam(searchParams.month);
  const [overview, openTickets] = await Promise.all([
    serverGet<RentOverview>(`/rent/overview?month=${month}`),
    serverGet<TicketDTO[]>("/tickets?status=open"),
  ]);
  const { rows, history, occupancy: occ, totals: t } = overview;
  const defaulters = pickDefaulters(rows);
  const rate = t.expected ? Math.round((t.collected / t.expected) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Rent position for ${monthLabel(month)}`}
        actions={
          <>
            <MonthPicker month={month} />
            <RecordPaymentButton month={month} tenants={toPayOptions(rows)} />
          </>
        }
      />

      <section aria-label="Key figures" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Expected rent" value={formatKES(t.expected)} icon={<Wallet className="h-5 w-5" />} hint={`${t.tenants} tenants in residence`} />
        <StatCard
          label="Collected"
          value={formatKES(t.collected)}
          tone="success"
          icon={<Banknote className="h-5 w-5" />}
          hint={
            <div className="space-y-2">
              <ProgressBar value={t.collected} max={t.expected} />
              <p>{rate}% of expected</p>
            </div>
          }
        />
        <StatCard
          label="Outstanding"
          value={formatKES(t.outstanding)}
          tone={t.outstanding > 0 ? "danger" : "success"}
          icon={<AlertTriangle className="h-5 w-5" />}
          hint={`${t.unpaid} unpaid · ${t.partial} partial`}
        />
        <StatCard label="Occupancy" value={`${occ.rate}%`} tone="info" icon={<Building className="h-5 w-5" />} hint={`${occ.occupied} of ${occ.total} units occupied`} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Collected vs expected" description="Last 6 months" />
          <div className="px-3 pb-4 sm:px-5">
            {rows.length === 0 && history.every((h) => h.expected === 0) ? (
              <EmptyState icon={<TrendingUp className="h-6 w-6" />} title="No rent data yet" text="Add tenants and record payments to see the trend." />
            ) : (
              <CollectionChart data={history} />
            )}
          </div>
        </Card>

        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            title="Who owes rent"
            description={`${defaulters.length} tenant${defaulters.length === 1 ? "" : "s"} · ${formatKES(t.outstanding)}`}
            action={
              <Link href={`/admin/defaulters?month=${month}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                View all
              </Link>
            }
          />
          <DefaultersList rows={defaulters} month={month} payOptions={toPayOptions(rows)} limit={5} />
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader
          title="Open requests"
          description="Newest complaints and maintenance requests"
          action={
            <Link href="/admin/complaints" className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Open inbox
            </Link>
          }
        />
        {openTickets.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No open requests" text="New tenant requests will appear here." />
        ) : (
          <ul className="divide-y">
            {openTickets.slice(0, 4).map((tk) => (
              <li key={tk._id}>
                <Link href={`/admin/complaints/${tk._id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/60">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {TICKET_CATEGORY_LABEL[tk.category]} · Unit {tk.unitNumber}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{tk.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <PriorityBadge priority={tk.priority} />
                    <span className="text-xs text-muted-foreground">{formatDateTime(tk.createdAt)}</span>
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
