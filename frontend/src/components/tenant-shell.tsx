"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, LogOut, MessageSquarePlus, ReceiptText, UserRound } from "lucide-react";
import { useLogout } from "@/lib/use-api";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/tenant", label: "Home", icon: Home },
  { href: "/tenant/payments", label: "Payments", icon: ReceiptText },
  { href: "/tenant/requests", label: "Requests", icon: MessageSquarePlus },
  { href: "/tenant/notices", label: "Notices", icon: Bell },
  { href: "/tenant/profile", label: "Profile", icon: UserRound },
];

export function TenantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useLogout();
  const isActive = (href: string) => (href === "/tenant" ? pathname === "/tenant" : pathname.startsWith(href));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link href="/tenant">
            <Logo />
          </Link>
          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium",
                  isActive(n.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl p-4 pb-28 md:pb-12 print:p-0">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary/10")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
