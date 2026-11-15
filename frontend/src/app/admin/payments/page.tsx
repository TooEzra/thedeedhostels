import type { Metadata } from "next";
import { Receipt, Wallet } from "lucide-react";
import { DeleteButton } from "@/components/forms/misc-forms";
import { FilterChips, MonthPicker, SearchBox } from "@/components/controls";
import { toPayOptions } from "@/components/defaulters";
import { RecordPaymentButton } from "@/components/forms/record-payment";
import { PaymentBadge } from "@/components/status";
import { Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { getMe, serverGet } from "@/lib/server-api";
import { formatDate, formatKES, monthLabel, parseMonthParam } from "@/lib/format";
import { PAY_METHOD_LABEL, type PaymentStatus, type RentRoll } from "@/lib/types";

export const metadata: Metadata = { title: "Payments" };

const STATUSES: PaymentStatus[] = ["paid", "partial", "unpaid"];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { month?: string; status?: string; q?: string };
}) {
  const month = parseMonthParam(searchParams.month);
  const status = STATUSES.find((s) => s === searchParams.status) ?? "all";
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const [user, roll] = await Promise.all([getMe(), serverGet<RentRoll>(`/rent/roll?month=${month}`)]);
  const { rows: all, payments: received, totals: t } = roll;
  const rows = all.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (!q || r.name.toLowerCase().includes(q) || r.unitNumber.toLowerCase().includes(q) || r.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))),
  );
  const payOptions = toPayOptions(all);
  const canDelete = user?.role === "landlord";

  return (
    <>
      <PageHeader
        title="Payments"
        description={`Rent roll for ${monthLabel(month)}`}
        actions={
          <>
            <MonthPicker month={month} />
            <RecordPaymentButton month={month} tenants={payOptions} />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Expected" value={formatKES(t.expected)} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Collected" value={formatKES(t.collected)} tone="success" icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Outstanding" value={formatKES(t.outstanding)} tone={t.outstanding ? "danger" : "success"} icon={<Wallet className="h-5 w-5" />} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          param="status"
          value={status}
          options={[
            { value: "all", label: "All", count: all.length },
            { value: "paid", label: "Paid", count: t.paid },
            { value: "partial", label: "Partial", count: t.partial },
            { value: "unpaid", label: "Unpaid", count: t.unpaid },
          ]}
        />
        <SearchBox placeholder="Search name, unit or phone" />
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title={all.length === 0 ? "No tenants in residence this month" : "No tenants match"}
            text={all.length === 0 ? "Add tenants under Tenants & Units to start tracking rent." : "Try a different filter or search."}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-5 py-3 font-semibold">Unit</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Tenant</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Rent</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Paid</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Balance</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.tenantId} className="hover:bg-muted/50">
                      <td className="px-5 py-3.5 font-semibold">{r.unitNumber}</td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.phone}</p>
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums">{formatKES(r.rent)}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums">{formatKES(r.paid)}</td>
                      <td className={`px-3 py-3.5 text-right font-semibold tabular-nums ${r.balance > 0 ? "text-danger" : ""}`}>{formatKES(r.balance)}</td>
                      <td className="px-3 py-3.5"><PaymentBadge status={r.status} /></td>
                      <td className="px-5 py-3.5 text-right">
                        {r.balance > 0 && (
                          <RecordPaymentButton month={month} tenants={payOptions} presetTenantId={r.tenantId} label="Record" variant="outline" size="sm" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y md:hidden">
              {rows.map((r) => (
                <li key={r.tenantId} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-sm text-muted-foreground">Unit {r.unitNumber} · {r.phone}</p>
                    </div>
                    <PaymentBadge status={r.status} />
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-sm">
                    <div><dt className="text-xs text-muted-foreground">Rent</dt><dd className="font-medium tabular-nums">{formatKES(r.rent)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Paid</dt><dd className="font-medium tabular-nums">{formatKES(r.paid)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Balance</dt><dd className={`font-semibold tabular-nums ${r.balance > 0 ? "text-danger" : ""}`}>{formatKES(r.balance)}</dd></div>
                  </dl>
                  {r.balance > 0 && (
                    <RecordPaymentButton month={month} tenants={payOptions} presetTenantId={r.tenantId} label="Record payment" variant="outline" size="sm" />
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Payments received" description={`Transactions recorded for ${monthLabel(month)}`} />
        {received.length === 0 ? (
          <EmptyState icon={<Receipt className="h-6 w-6" />} title="No payments recorded yet" />
        ) : (
          <ul className="divide-y">
            {received.map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {p.tenantName} <span className="font-normal text-muted-foreground">· Unit {p.unitNumber}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {PAY_METHOD_LABEL[p.method]}
                    {p.referenceCode ? ` · ${p.referenceCode}` : ""} · {formatDate(p.paidOn)}
                    {p.recordedByName ? ` · by ${p.recordedByName}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <p className="font-bold tabular-nums">{formatKES(p.amount)}</p>
                  {canDelete && (
                    <DeleteButton
                      endpoint="/payments"
                      id={p._id}
                      iconOnly
                      label="Delete payment"
                      confirm={`Delete this ${formatKES(p.amount)} payment from ${p.tenantName}? This changes their balance and can't be undone.`}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
