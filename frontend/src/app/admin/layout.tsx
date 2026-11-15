import { AdminShell } from "@/components/admin-shell";
import { requireStaff, serverGet } from "@/lib/server-api";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const { count } = await serverGet<{ count: number }>("/tickets/attention");
  return (
    <AdminShell user={{ name: user.name, role: user.role }} attention={count}>
      {children}
    </AdminShell>
  );
}
