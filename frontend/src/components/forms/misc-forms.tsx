"use client";

import { useRef, useState, useTransition } from "react";
import { KeyRound, Loader2, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/use-api";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { CredentialsModal } from "@/components/forms/tenant-forms";

function ErrorLine({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger">
      {error}
    </p>
  );
}

/** Landlord-only delete with a confirm step. Sends DELETE `${endpoint}/${id}` to the API. */
export function DeleteButton({
  endpoint,
  id,
  confirm,
  label = "Delete",
  iconOnly = false,
}: {
  /** API collection path, e.g. "/payments". */
  endpoint: string;
  id: string;
  confirm: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [pending, start] = useTransition();
  const call = useApi();
  return (
    <Button
      variant="ghost"
      size={iconOnly ? "icon" : "sm"}
      disabled={pending}
      aria-label={label}
      title={label}
      className="text-danger hover:bg-danger/10"
      onClick={() => {
        if (!window.confirm(confirm)) return;
        start(async () => {
          const res = await call("DELETE", `${endpoint}/${id}`);
          if (res.ok) toast.success("Deleted.");
          else toast.error(res.error);
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {!iconOnly && label}
    </Button>
  );
}

export function AnnouncementForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const call = useApi();
  const [error, setError] = useState("");
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold">Post a notice</h2>
      <p className="mt-1 text-sm text-muted-foreground">Appears on every tenant's notice board.</p>
      <form
        ref={ref}
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setError("");
          start(async () => {
            const res = await call("POST", "/announcements", { title: String(f.get("title")), body: String(f.get("body")) });
            if (!res.ok) return setError(res.error);
            toast.success("Notice posted.");
            ref.current?.reset();
          });
        }}
      >
        <Field label="Title" htmlFor="an-title">
          <Input id="an-title" name="title" required minLength={3} maxLength={120} placeholder="e.g. Water shutdown on Saturday" />
        </Field>
        <Field label="Message" htmlFor="an-body">
          <Textarea id="an-body" name="body" required minLength={5} maxLength={3000} />
        </Field>
        <ErrorLine error={error} />
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Post notice
        </Button>
      </form>
    </Card>
  );
}

export function CaretakerForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const call = useApi();
  const [error, setError] = useState("");
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold">Add a caretaker</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Caretakers can manage tenants, payments and complaints. They can't delete records or see financial reports.
      </p>
      <form
        ref={ref}
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setError("");
          start(async () => {
            const res = await call<{ email: string; password: string }>("POST", "/caretakers", { name: String(f.get("name")), email: String(f.get("email")), phone: String(f.get("phone")) });
            if (!res.ok) return setError(res.error);
            ref.current?.reset();
            setCreds(res.data!);
          });
        }}
      >
        <Field label="Full name" htmlFor="ct-name">
          <Input id="ct-name" name="name" required minLength={2} autoComplete="off" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="ct-email">
            <Input id="ct-email" name="email" type="email" required autoComplete="off" />
          </Field>
          <Field label="Phone" htmlFor="ct-phone">
            <Input id="ct-phone" name="phone" type="tel" inputMode="tel" required placeholder="0712 345 678" />
          </Field>
        </div>
        <ErrorLine error={error} />
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create caretaker
        </Button>
      </form>
      <CredentialsModal open={!!creds} onClose={() => setCreds(null)} title="Caretaker account created" email={creds?.email} password={creds?.password ?? ""} />
    </Card>
  );
}

export function CaretakerActions({ id, name, email, active }: { id: string; name: string; email: string; active: boolean }) {
  const [pending, start] = useTransition();
  const call = useApi();
  const [pw, setPw] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await call("PATCH", `/caretakers/${id}`, { active: !active });
            if (res.ok) toast.success(active ? `${name} deactivated.` : `${name} reactivated.`);
            else toast.error(res.error);
          })
        }
      >
        {active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
        {active ? "Deactivate" : "Reactivate"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Generate a new temporary password for ${name}?`)) return;
          start(async () => {
            const res = await call<{ password: string }>("POST", `/caretakers/${id}/reset-password`);
            if (res.ok) setPw(res.data!.password);
            else toast.error(res.error);
          });
        }}
      >
        <KeyRound className="h-3.5 w-3.5" />
        Reset password
      </Button>
      <CredentialsModal open={pw !== null} onClose={() => setPw(null)} title="New temporary password" email={email} password={pw ?? ""} />
    </div>
  );
}

export function StaffProfileForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const [pending, start] = useTransition();
  const call = useApi();
  const [error, setError] = useState("");
  const [newEmail, setNewEmail] = useState(email);
  const emailChanged = newEmail.trim().toLowerCase() !== email;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setError("");
        start(async () => {
          const res = await call("PATCH", "/auth/profile", {
            name: String(f.get("name")),
            email: String(f.get("email")),
            phone: String(f.get("phone")),
            currentPassword: emailChanged ? String(f.get("currentPassword") ?? "") : undefined,
          });
          if (!res.ok) return setError(res.error);
          toast.success("Profile updated.");
        });
      }}
    >
      <Field label="Full name" htmlFor="sp-name">
        <Input id="sp-name" name="name" required minLength={2} defaultValue={name} autoComplete="name" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email (used to sign in)" htmlFor="sp-email">
          <Input id="sp-email" name="email" type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="username" />
        </Field>
        <Field label="Phone" htmlFor="sp-phone">
          <Input id="sp-phone" name="phone" type="tel" inputMode="tel" required defaultValue={phone} />
        </Field>
      </div>
      {emailChanged && (
        <Field label="Current password" htmlFor="sp-pw" hint="Required to change your sign-in email.">
          <Input id="sp-pw" name="currentPassword" type="password" required autoComplete="current-password" />
        </Field>
      )}
      <ErrorLine error={error} />
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save profile
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const call = useApi();
  const [error, setError] = useState("");
  return (
    <form
      ref={ref}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const next = String(f.get("next"));
        if (next !== String(f.get("confirm"))) return setError("The new passwords don't match.");
        setError("");
        start(async () => {
          const res = await call("POST", "/auth/change-password", { current: String(f.get("current")), next });
          if (!res.ok) return setError(res.error);
          toast.success("Password changed.");
          ref.current?.reset();
        });
      }}
    >
      <Field label="Current password" htmlFor="pw-cur">
        <Input id="pw-cur" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="pw-new" hint="At least 8 characters, with a letter and a number.">
          <Input id="pw-new" name="next" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm new password" htmlFor="pw-conf">
          <Input id="pw-conf" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
      </div>
      <ErrorLine error={error} />
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Update password
      </Button>
    </form>
  );
}

export function PhoneForm({ phone }: { phone: string }) {
  const [pending, start] = useTransition();
  const call = useApi();
  const [error, setError] = useState("");
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const v = String(new FormData(e.currentTarget).get("phone"));
        setError("");
        start(async () => {
          const res = await call("PUT", "/me/phone", { phone: v });
          if (!res.ok) return setError(res.error);
          toast.success("Phone number updated.");
        });
      }}
    >
      <Field label="Phone number" htmlFor="ph" error={error} className="flex-1">
        <Input id="ph" name="phone" type="tel" inputMode="tel" required defaultValue={phone} />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save
      </Button>
    </form>
  );
}
