import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { DeleteButton } from "@/components/forms/misc-forms";
import { MoveOutButton, ResetPasswordButton, TenantFormButton, UnitFormButton } from "@/components/forms/tenant-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { cn, formatDate, formatKES } from "@/lib/format";
import { getMe, serverGet } from "@/lib/server-api";
import { UNIT_TYPE_LABEL, type TenantDTO, type UnitDTO } from "@/lib/types";

export const metadata: Metadata = { title: "Tenants & Units" };

export default async function TenantsPage({ searchParams }: { searchParams: { view?: string; past?: string } }) {
  const view = searchParams.view === "units" ? "units" : "tenants";
  const showPast = searchParams.past === "1";
  const [user, tenants, units] = await Promise.all([getMe(), serverGet<TenantDTO[]>("/tenants"), serverGet<UnitDTO[]>("/units")]);
  const active = tenants.filter((t) => t.isActive);
  const list = showPast ? tenants.filter((t) => !t.isActive) : active;
  const vacant = units.filter((u) => u.status === "vacant");
  const isLandlord = user?.role === "landlord";

  const tab = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn("rounded-lg px-4 py-2 text-sm font-medium", isActive ? "bg-card shadow-card" : "text-muted-foreground hover:text-foreground")}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Tenants & Units"
        description={`${active.length} tenants · ${vacant.length} of ${units.length} units vacant`}
        actions={view === "tenants" ? <TenantFormButton units={vacant} /> : <UnitFormButton />}
      />

      <div className="mb-5 inline-flex rounded-xl bg-muted p-1" role="navigation" aria-label="Section">
        {tab("/admin/tenants", "Tenants", view === "tenants")}
        {tab("/admin/tenants?view=units", "Units", view === "units")}
      </div>

      {view === "tenants" ? (
        <>
          <div className="mb-3 flex gap-2 text-sm">
            <Link href="/admin/tenants" className={cn("font-medium", !showPast ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
              Current
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link href="/admin/tenants?past=1" className={cn("font-medium", showPast ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
              Moved out
            </Link>
          </div>
          <Card className="overflow-hidden">
            {list.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title={showPast ? "No past tenants" : "No tenants yet"}
                text={showPast ? "Tenants you move out will be listed here with their history kept." : "Add your first tenant to give them a login and start tracking rent."}
                action={!showPast ? <TenantFormButton units={vacant} /> : undefined}
              />
            ) : (
              <ul className="divide-y">
                {list.map((t) => (
                  <li key={t._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{t.name}</p>
                        <Badge tone="neutral">Unit {t.unitNumber}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {t.phone} · {t.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatKES(t.rent)}/month · Moved in {formatDate(t.moveInDate)}
                        {t.moveOutDate ? ` · Moved out ${formatDate(t.moveOutDate)}` : ""}
                      </p>
                    </div>
                    {t.isActive && (
                      <div className="flex flex-wrap items-center gap-2">
                        <TenantFormButton
                          tenant={t}
                          units={[...units.filter((u) => u._id === t.unitId), ...vacant]}
                        />
                        <ResetPasswordButton tenant={t} />
                        <MoveOutButton tenant={t} />
                      </div>
                    )}
                    {!t.isActive && isLandlord && (
                      <DeleteButton
                        endpoint="/tenants"
                        id={t._id}
                        label="Delete permanently"
                        confirm={`Permanently delete ${t.name}? This also deletes their payment history, requests and login, changes past income reports, and can't be undone.`}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <Card className="overflow-hidden">
          {units.length === 0 ? (
            <EmptyState icon={<Building2 className="h-6 w-6" />} title="No units yet" text="Add the rooms or houses you rent out." action={<UnitFormButton />} />
          ) : (
            <ul className="divide-y">
              {units.map((u) => (
                <li key={u._id} className="flex items-center justify-between gap-3 p-4 sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">Unit {u.unitNumber}</p>
                      <Badge tone={u.status === "vacant" ? "warning" : "success"}>{u.status === "vacant" ? "Vacant" : "Occupied"}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {UNIT_TYPE_LABEL[u.type]} · {formatKES(u.monthlyRent)}/month{u.occupant ? ` · ${u.occupant}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <UnitFormButton unit={u} />
                    {isLandlord && u.status === "vacant" && (
                      <DeleteButton endpoint="/units" id={u._id} iconOnly label="Delete unit" confirm={`Delete unit ${u.unitNumber}? This can't be undone.`} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
