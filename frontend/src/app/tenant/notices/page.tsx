import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { requireTenant, serverGet } from "@/lib/server-api";
import type { AnnouncementDTO } from "@/lib/types";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Notices" };

export default async function TenantNotices() {
  await requireTenant();
  const list = await serverGet<AnnouncementDTO[]>("/announcements?limit=30");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notice board</h1>
        <p className="mt-1 text-sm text-muted-foreground">Updates from your caretaker and landlord.</p>
      </div>
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<Bell className="h-6 w-6" />} title="No notices right now" text="Important announcements will appear here." />
        </Card>
      ) : (
        list.map((n) => (
          <Card key={n._id} className="p-5">
            <h2 className="font-semibold">{n.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDate(n.createdAt)} · {n.authorName}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
          </Card>
        ))
      )}
    </div>
  );
}
