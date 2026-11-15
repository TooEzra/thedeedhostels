import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { CaretakerActions, CaretakerForm } from "@/components/forms/misc-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireLandlord, serverGet } from "@/lib/server-api";
import type { CaretakerDTO } from "@/lib/types";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Caretakers" };

export default async function CaretakersPage() {
  await requireLandlord();
  const list = await serverGet<CaretakerDTO[]>("/caretakers");
  return (
    <>
      <PageHeader title="Caretakers" description="Manage who can run the hostel day to day." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <CaretakerForm />
        </div>
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            {list.length === 0 ? (
              <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="No caretakers yet" text="Add a caretaker so they can record payments and handle requests." />
            ) : (
              <ul className="divide-y">
                {list.map((c) => (
                  <li key={c._id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{c.name}</p>
                      <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Deactivated"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {c.email}
                      {c.phone ? ` · ${c.phone}` : ""} · Added {formatDate(c.createdAt)}
                    </p>
                    <CaretakerActions id={c._id} name={c.name} email={c.email} active={c.isActive} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
