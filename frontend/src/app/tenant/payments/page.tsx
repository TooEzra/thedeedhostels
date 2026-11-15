import type { Metadata } from "next";
import Link from "next/link";
import { Download, ReceiptText } from "lucide-react";
import { PaymentBadge } from "@/components/status";
import { buttonClasses, Card, EmptyState } from "@/components/ui";
import { requireTenant, serverGet } from "@/lib/server-api";
import { formatDate, formatKES, monthLabel } from "@/lib/format";
import { PAY_METHOD_LABEL, type LedgerMonth } from "@/lib/types";

export const metadata: Metadata = { title: "Payments" };

export default async function TenantPayments() {
  await requireTenant();
  const ledger = await serverGet<LedgerMonth[]>("/me/ledger");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment history</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your rent, month by month. Download a receipt for any payment.</p>
      </div>

      {ledger.every((m) => m.payments.length === 0) && (
        <Card>
          <EmptyState icon={<ReceiptText className="h-6 w-6" />} title="No payments recorded yet" text="Once your caretaker records a payment, it will show up here with a receipt." />
        </Card>
      )}

      {ledger.map((m) => (
        <Card key={m.month} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5">
            <div>
              <h2 className="font-semibold">{monthLabel(m.month)}</h2>
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatKES(m.paid)} of {formatKES(m.rent)}
                {m.balance > 0 ? ` · ${formatKES(m.balance)} owing` : ""}
              </p>
            </div>
            <PaymentBadge status={m.status} />
          </div>
          {m.payments.length > 0 && (
            <ul className="divide-y border-t">
              {m.payments.map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="font-semibold tabular-nums">{formatKES(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {PAY_METHOD_LABEL[p.method]}
                      {p.referenceCode ? ` · ${p.referenceCode}` : ""} · {formatDate(p.paidOn)}
                    </p>
                  </div>
                  <Link href={`/tenant/payments/${p._id}/receipt`} className={buttonClasses({ variant: "outline", size: "sm" })} aria-label={`Receipt for ${formatKES(p.amount)} on ${formatDate(p.paidOn)}`}>
                    <Download className="h-3.5 w-3.5" />
                    Receipt
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
