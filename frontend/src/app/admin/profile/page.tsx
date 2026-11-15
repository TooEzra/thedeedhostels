import type { Metadata } from "next";
import { ChangePasswordForm, StaffProfileForm } from "@/components/forms/misc-forms";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/server-api";

export const metadata: Metadata = { title: "My profile" };

export default async function AdminProfile() {
  const user = await requireStaff();
  return (
    <>
      <PageHeader title="My profile" description="Your own details and password." actions={<Badge tone="info">{user.role === "landlord" ? "Landlord" : "Caretaker"}</Badge>} />
      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader title="Details" description="Your name and contact details as other people see them." />
          <div className="px-5 pb-5">
            <StaffProfileForm name={user.name} email={user.email} phone={user.phone ?? ""} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold">Change password</h2>
          <ChangePasswordForm />
        </Card>
      </div>
    </>
  );
}
