import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, ReceiptText, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/forms/login-form";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { getMe } from "@/lib/server-api";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getMe();
  if (user) redirect(user.role === "tenant" ? "/tenant" : "/admin");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" aria-hidden />
        <div className="relative [&_span]:!text-primary-foreground [&_span.bg-primary]:!bg-white/15">
          <Logo />
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Home is simpler when rent is clear.</h1>
          <p className="mt-4 text-primary-foreground/80">Pay history, receipts and maintenance requests for tenants. A clear view of who has paid for caretakers and landlords.</p>
          <ul className="mt-8 space-y-4 text-sm">
            {[
              [ReceiptText, "Every payment recorded, every receipt on hand"],
              [Bell, "Notices from management, right on your phone"],
              [ShieldCheck, "Your data is visible only to you and your caretaker"],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof ReceiptText;
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <I className="h-4 w-4" />
                  </span>
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/60">© {new Date().getFullYear()} THE DEED HOSTELS</p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">Sign in to your tenant or management account.</p>
          <LoginForm />
          <p className="mt-6 text-center text-xs text-muted-foreground">Forgot your password? Ask your caretaker to reset it for you.</p>
        </div>
      </main>
    </div>
  );
}
