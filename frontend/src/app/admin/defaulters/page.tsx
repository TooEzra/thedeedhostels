import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { MonthPicker } from "@/components/controls";
import { DefaultersList, pickDefaulters, toPayOptions } from "@/components/defaulters";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { AlertTriangle, Users } from "lucide-react";
import { formatKES, monthLabel, parseMonthParam } from "@/lib/format";
import { serverGet } from "@/lib/server-api";
import type { RentRoll } from "@/lib/types";

export const metadata: Metadata = { title: "Defaulters" };

export default async function DefaultersPage({ searchParams }: { searchParams: { month?: string } }) {
  const month = parseMonthParam(searchParams.month);
  const { rows } = await serverGet<RentRoll>(`/rent/roll?month=${month}`);
  const defaulters = pickDefaulters(rows);
  const owed = defaulters.reduce((a, r) => a + r.balance, 0);
  const unpaid = defaulters.filter((r) => r.status === "unpaid").length;

  return (
    <>
      <PageHeader
        title="Defaulters"
        description={`Tenants with rent still owing for ${monthLabel(month)}. "Remind" opens WhatsApp with a message ready to send.`}
        actions={<MonthPicker month={month} />}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total owed" value={formatKES(owed)} tone={owed ? "danger" : "success"} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Tenants owing" value={defaulters.length} icon={<Users className="h-5 w-5" />} hint={`${unpaid} haven't paid anything`} />
        <StatCard
          label="Part-paid"
          value={defaulters.length - unpaid}
          tone="warning"
          icon={<MessageSquare className="h-5 w-5" />}
          hint="Balance still to clear"
          />
      </div>
      <Card className="overflow-hidden">
        <DefaultersList rows={defaulters} month={month} payOptions={toPayOptions(rows)} />
      </Card>
    </>
  );
}
