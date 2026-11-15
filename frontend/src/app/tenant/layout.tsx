import { TenantShell } from "@/components/tenant-shell";
import { requireTenant } from "@/lib/server-api";

// Per-user pages: never prerender at build time.
export const dynamic = "force-dynamic";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  await requireTenant();
  return <TenantShell>{children}</TenantShell>;
}
