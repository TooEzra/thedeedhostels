import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { AnnouncementForm, DeleteButton } from "@/components/forms/misc-forms";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getMe, serverGet } from "@/lib/server-api";
import type { AnnouncementDTO } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const [user, list] = await Promise.all([getMe(), serverGet<AnnouncementDTO[]>("/announcements?limit=50")]);
  return (
    <>
      <PageHeader title="Announcements" description="Notices posted here show up on every tenant's dashboard." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <AnnouncementForm />
        </div>
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            {list.length === 0 ? (
              <EmptyState icon={<Megaphone className="h-6 w-6" />} title="No notices yet" text="Post your first notice, such as a water shutdown or a meeting date." />
            ) : (
              <ul className="divide-y">
                {list.map((a) => (
                  <li key={a._id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{a.title}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.authorName} · {formatDateTime(a.createdAt)}
                        </p>
                      </div>
                      {user?.role === "landlord" && (
                        <DeleteButton endpoint="/announcements" id={a._id} iconOnly label="Delete notice" confirm={`Delete the notice "${a.title}"?`} />
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{a.body}</p>
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
