import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PrintButton } from "@/components/controls";
import { buttonClasses, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireLandlord, serverGet } from "@/lib/server-api";
import type { MonthTotals } from "@/lib/types";
import { formatDate, formatKES, monthLabel, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireLandlord(); // landlord-only (the API enforces it too)
  const history = (await serverGet<MonthTotals[]>("/reports/summary")).reverse(); // newest first
  const sum = (k: "expected" | "collected" | "outstanding") => history.reduce((a, h) => a + h[k], 0);
  const rate = (c: number, e: number) => (e ? `${Math.round((c / e) * 100)}%` : "-");

  return (
    <>
      <div className="mb-6 hidden print:block">
        <p className="text-xs font-semibold uppercase tracking-[0.28em]">The Deed Hostels</p>
        <h1 className="text-2xl font-bold">Monthly income report</h1>
        <p className="text-sm">Generated {formatDate(todayISO())}</p>
      </div>

      <PageHeader
        title="Reports"
        description="Monthly income for the last 12 months. Use Print to save a PDF."
        actions={
          <>
            <a href="/api/reports/export?type=summary" className={buttonClasses({ variant: "outline" })}>
              <Download className="h-4 w-4" />
              Export CSV
            </a>
            <PrintButton />
          </>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader title="Income summary" description="Expected rent is based on tenants in residence each month at the unit's current rent." className="print:hidden" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-5 py-3 font-semibold">Month</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Expected</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Collected</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Outstanding</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Rate</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Paid / Part / Unpaid</th>
                <th scope="col" className="px-5 py-3 print:hidden"><span className="sr-only">Export</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((h) => (
                <tr key={h.month}>
                  <td className="px-5 py-3 font-medium">{monthLabel(h.month)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatKES(h.expected)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatKES(h.collected)}</td>
                  <td className={`px-3 py-3 text-right tabular-nums ${h.outstanding > 0 ? "font-semibold text-danger" : ""}`}>{formatKES(h.outstanding)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{rate(h.collected, h.expected)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {h.paid} / {h.partial} / {h.unpaid}
                  </td>
                  <td className="px-5 py-3 text-right print:hidden">
                    <a href={`/api/reports/export?type=month&month=${h.month}`} className="text-sm font-medium text-primary hover:underline">
                      CSV
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold">
                <td className="px-5 py-3">Total</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatKES(sum("expected"))}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatKES(sum("collected"))}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatKES(sum("outstanding"))}</td>
                <td className="px-3 py-3 text-right tabular-nums">{rate(sum("collected"), sum("expected"))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </>
  );
}
