"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useLogout } from "@/lib/use-api";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { cn, initials } from "@/lib/format";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  landlordOnly?: boolean;
  badge?: "attention";
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/defaulters", label: "Defaulters", icon: AlertTriangle },
  { href: "/admin/tenants", label: "Tenants & Units", icon: Users },
  { href: "/admin/complaints", label: "Complaints", icon: MessageSquare, badge: "attention" },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, landlordOnly: true },
  { href: "/admin/caretakers", label: "Caretakers", icon: ShieldCheck, landlordOnly: true },
  { href: "/admin/profile", label: "My profile", icon: UserRound },
];

function NavLinks({ role, attention, collapsed, onNavigate }: { role: Role; attention: number; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV.filter((n) => !n.landlordOnly || role === "landlord").map((n) => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        const Icon = n.icon;
        const count = n.badge === "attention" ? attention : 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            title={collapsed ? n.label : undefined}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{n.label}</span>}
            {count > 0 && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground",
                  collapsed ? "absolute right-1.5 top-1.5 h-4 min-w-4 px-1 text-[10px]" : "ml-auto",
                )}
                aria-label={`${count} open requests`}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock({ name, role, collapsed }: { name: string; role: Role; collapsed: boolean }) {
  const logout = useLogout();
  return (
    <div className="border-t p-3">
      <div className={cn("flex items-center gap-3 rounded-xl p-2", collapsed && "justify-center p-0 pb-2")}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
          {initials(name)}
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-xs capitalize text-muted-foreground">{role}</p>
          </div>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={logout}
          title="Sign out"
          className={cn(
            "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}

export function AdminShell({
  user,
  attention,
  children,
}: {
  user: { name: string; role: Role };
  attention: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("deed.sidebar") === "1");
    } catch {
      /* storage unavailable: default expanded */
    }
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem("deed.sidebar", c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }

  return (
    <div className="min-h-screen md:flex">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex print:hidden",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center border-b px-4", collapsed ? "justify-center px-0" : "justify-between")}>
          <Link href="/admin" aria-label="Overview">
            <Logo compact={collapsed} />
          </Link>
        </div>
        <NavLinks role={user.role} attention={attention} collapsed={collapsed} />
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
        <UserBlock name={user.name} role={user.role} collapsed={collapsed} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-card shadow-card">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Logo />
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks role={user.role} attention={attention} collapsed={false} onNavigate={() => setOpen(false)} />
            <UserBlock name={user.name} role={user.role} collapsed={false} />
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur md:px-8 print:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/admin" className="md:hidden">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl p-4 pb-16 md:p-8">{children}</main>
      </div>
    </div>
  );
}
