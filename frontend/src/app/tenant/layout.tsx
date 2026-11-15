import { TenantShell } from "@/components/tenant-shell";
import { requireTenant } from "@/lib/server-api";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  await requireTenant();
  return <TenantShell>{children}</TenantShell>;
}
