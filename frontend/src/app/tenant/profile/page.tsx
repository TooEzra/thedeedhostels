import type { Metadata } from "next";
import { ChangePasswordForm, PhoneForm } from "@/components/forms/misc-forms";
import { Card, CardHeader } from "@/components/ui";
import { requireTenant, serverGet } from "@/lib/server-api";
import { formatDate, formatKES } from "@/lib/format";
import { UNIT_TYPE_LABEL, type TenantProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Profile" };

export default async function TenantProfile() {
  await requireTenant();
  const p = await serverGet<TenantProfile>("/me/profile");
  const unit = p.unit;
  const details: [string, string][] = [
    ["Name", p.name],
    ["Email", p.email],
    ["Unit", unit ? `${unit.unitNumber} · ${UNIT_TYPE_LABEL[unit.type]}` : "-"],
    ["Monthly rent", unit ? formatKES(unit.monthlyRent) : "-"],
    ["Moved in", formatDate(p.moveInDate)],
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      <Card>
        <CardHeader title="Your unit & details" description="To change your name or email, ask your caretaker." />
        <dl className="divide-y px-5 pb-2 text-sm">
          {details.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="break-all text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Contact</h2>
        <PhoneForm phone={p.phone} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Change password</h2>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
