"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, LogOut as MoveOut, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/use-api";
import { Modal } from "@/components/modal";
import { CopyButton } from "@/components/controls";
import { Button, Field, Input, Select } from "@/components/ui";
import { formatKES, todayISO } from "@/lib/format";
import { UNIT_TYPES, UNIT_TYPE_LABEL, type TenantDTO, type UnitDTO, type UnitType } from "@/lib/types";

function ErrorLine({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger">
      {error}
    </p>
  );
}

export function CredentialsModal({
  open,
  onClose,
  title,
  email,
  password,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  email?: string;
  password: string;
}) {
  const text = `${email ? `Email: ${email}\n` : ""}Temporary password: ${password}`;
  return (
    <Modal open={open} onClose={onClose} title={title} description="Share these with the person now. The password won't be shown again, and they can change it from their profile.">
      <div className="space-y-2 rounded-xl bg-muted p-4 font-mono text-sm">
        {email && <p className="break-all">Email: {email}</p>}
        <p>
          Password: <span className="font-bold">{password}</span>
        </p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <CopyButton text={text} label="Copy details" />
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}

export function TenantFormButton({
  units,
  tenant,
}: {
  /** Vacant units, plus the tenant's own unit when editing. */
  units: UnitDTO[];
  tenant?: TenantDTO;
}) {
  const editing = !!tenant;
  const [open, setOpen] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const call = useApi();

  return (
    <>
      {editing ? (
        <Button variant="outline" size="sm" onClick={() => { setError(""); setOpen(true); }} aria-label={`Edit ${tenant.name}`}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      ) : (
        <Button onClick={() => { setError(""); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          Add tenant
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit tenant" : "Add tenant"} description={editing ? undefined : "A login is created for the tenant with a temporary password."}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setError("");
            start(async () => {
              const common = {
                name: String(f.get("name")),
                phone: String(f.get("phone")),
                idNumber: String(f.get("idNumber")),
                unitId: String(f.get("unitId")),
                moveInDate: String(f.get("moveInDate")),
              };
              if (editing) {
                const res = await call("PATCH", `/tenants/${tenant._id}`, common);
                if (!res.ok) return setError(res.error);
                toast.success("Tenant updated.");
                setOpen(false);
              } else {
                const res = await call<{ email: string; password: string }>("POST", "/tenants", { ...common, email: String(f.get("email")) });
                if (!res.ok) return setError(res.error);
                toast.success("Tenant added.");
                setOpen(false);
                setCreds(res.data!);
              }
            });
          }}
        >
          <Field label="Full name" htmlFor="t-name">
            <Input id="t-name" name="name" required minLength={2} defaultValue={tenant?.name} autoComplete="off" />
          </Field>
          {!editing && (
            <Field label="Email (used to sign in)" htmlFor="t-email">
              <Input id="t-email" name="email" type="email" required autoComplete="off" />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="t-phone">
              <Input id="t-phone" name="phone" type="tel" inputMode="tel" required defaultValue={tenant?.phone} placeholder="0712 345 678" />
            </Field>
            <Field label="ID / passport no." htmlFor="t-id">
              <Input id="t-id" name="idNumber" required defaultValue={tenant?.idNumber} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unit" htmlFor="t-unit" hint={units.length === 0 ? "No vacant units. Add a unit first." : undefined}>
              <Select id="t-unit" name="unitId" required defaultValue={tenant?.unitId ?? ""}>
                <option value="" disabled>
                  Select unit…
                </option>
                {units.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.unitNumber} · {UNIT_TYPE_LABEL[u.type]} · {formatKES(u.monthlyRent)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Move-in date" htmlFor="t-date">
              <Input id="t-date" name="moveInDate" type="date" required defaultValue={tenant ? tenant.moveInDate.slice(0, 10) : todayISO()} />
            </Field>
          </div>
          <ErrorLine error={error} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add tenant"}
            </Button>
          </div>
        </form>
      </Modal>
      <CredentialsModal open={!!creds} onClose={() => setCreds(null)} title="Tenant account created" email={creds?.email} password={creds?.password ?? ""} />
    </>
  );
}

export function MoveOutButton({ tenant }: { tenant: TenantDTO }) {
  const [pending, start] = useTransition();
  const call = useApi();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Move out ${tenant.name} from unit ${tenant.unitNumber}? Their account will be deactivated and the unit marked vacant. Payment history is kept.`)) return;
        start(async () => {
          const res = await call("POST", `/tenants/${tenant._id}/move-out`);
          if (res.ok) toast.success(`${tenant.name} moved out.`);
          else toast.error(res.error);
        });
      }}
    >
      <MoveOut className="h-3.5 w-3.5" />
      Move out
    </Button>
  );
}

export function ResetPasswordButton({ tenant }: { tenant: TenantDTO }) {
  const [pending, start] = useTransition();
  const call = useApi();
  const [pw, setPw] = useState<string | null>(null);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`Reset password for ${tenant.name}`}
        onClick={() => {
          if (!window.confirm(`Generate a new temporary password for ${tenant.name}?`)) return;
          start(async () => {
            const res = await call<{ password: string }>("POST", `/tenants/${tenant._id}/reset-password`);
            if (res.ok) setPw(res.data!.password);
            else toast.error(res.error);
          });
        }}
      >
        <KeyRound className="h-3.5 w-3.5" />
        Reset password
      </Button>
      <CredentialsModal open={pw !== null} onClose={() => setPw(null)} title="New temporary password" email={tenant.email} password={pw ?? ""} />
    </>
  );
}

export function UnitFormButton({ unit }: { unit?: UnitDTO }) {
  const editing = !!unit;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const call = useApi();
  return (
    <>
      {editing ? (
        <Button variant="outline" size="sm" onClick={() => { setError(""); setOpen(true); }} aria-label={`Edit unit ${unit.unitNumber}`}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      ) : (
        <Button variant="outline" onClick={() => { setError(""); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          Add unit
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit unit ${unit.unitNumber}` : "Add unit"}
        description={editing ? "Changing the rent applies to every month in the rent roll for this unit's tenant." : undefined}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setError("");
            start(async () => {
              const data = {
                unitNumber: String(f.get("unitNumber")),
                type: String(f.get("type")) as UnitType,
                monthlyRent: Number(f.get("monthlyRent")),
              };
              const res = editing ? await call("PATCH", `/units/${unit._id}`, data) : await call("POST", "/units", data);
              if (!res.ok) return setError(res.error);
              toast.success(editing ? "Unit updated." : "Unit added.");
              setOpen(false);
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unit number" htmlFor="u-num">
              <Input id="u-num" name="unitNumber" required maxLength={12} defaultValue={unit?.unitNumber} placeholder="e.g. A5" />
            </Field>
            <Field label="Type" htmlFor="u-type">
              <Select id="u-type" name="type" defaultValue={unit?.type ?? "bedsitter"}>
                {UNIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {UNIT_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Monthly rent (KES)" htmlFor="u-rent">
            <Input id="u-rent" name="monthlyRent" type="number" inputMode="numeric" min={500} required defaultValue={unit?.monthlyRent} />
          </Field>
          <ErrorLine error={error} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add unit"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
