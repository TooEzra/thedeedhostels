import { CheckCircle2, MessageCircle, MessageSquare as SmsIcon } from "lucide-react";
import { PaymentBadge } from "@/components/status";
import { buttonClasses, EmptyState } from "@/components/ui";
import { RecordPaymentButton, type PayTenantOption } from "@/components/forms/record-payment";
import { formatDate, formatKES, monthLabel } from "@/lib/format";
import { reminderLinks } from "@/lib/reminders";
import type { RentRow } from "@/lib/types";

export function toPayOptions(rows: RentRow[]): PayTenantOption[] {
  return rows.map((r) => ({ id: r.tenantId, name: r.name, unitNumber: r.unitNumber, balance: r.balance }));
}

/** Tenants who still owe rent for `month` (unpaid or part-paid), biggest balance first. */
export function pickDefaulters(rows: RentRow[]): RentRow[] {
  return rows.filter((r) => r.status !== "paid").sort((a, b) => b.balance - a.balance);
}

function overdueText(r: RentRow) {
  if (r.daysOverdue > 0) return `${r.daysOverdue} day${r.daysOverdue === 1 ? "" : "s"} overdue`;
  return `Due ${formatDate(r.dueDate)}`;
}

export function DefaultersList({
  rows,
  month,
  payOptions,
  limit,
}: {
  rows: RentRow[];
  month: string;
  payOptions: PayTenantOption[];
  limit?: number;
}) {
  const list = limit ? rows.slice(0, limit) : rows;
  if (list.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-6 w-6 text-success" />}
        title="Everyone is paid up"
        text={`No outstanding rent for ${monthLabel(month)}.`}
      />
    );
  }
  return (
    <ul className="divide-y">
      {list.map((r) => {
        const links = reminderLinks(r, month);
        return (
          <li key={r.tenantId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold">{r.name}</p>
                <PaymentBadge status={r.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Unit {r.unitNumber} · <span className={r.daysOverdue > 0 ? "font-medium text-danger" : ""}>{overdueText(r)}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <p className="mr-1 text-lg font-bold tabular-nums">{formatKES(r.balance)}</p>
              <a
                href={links.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
                aria-label={`Send WhatsApp reminder to ${r.name}`}
              >
                <MessageCircle className="h-4 w-4" />
                Remind
              </a>
              <a href={links.sms} className={buttonClasses({ variant: "ghost", size: "sm" })} aria-label={`Send SMS reminder to ${r.name}`}>
                <SmsIcon className="h-4 w-4" />
                SMS
              </a>
              <RecordPaymentButton month={month} tenants={payOptions} presetTenantId={r.tenantId} label="Pay" variant="outline" size="sm" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
