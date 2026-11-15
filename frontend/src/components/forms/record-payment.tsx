"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/use-api";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { currentMonth, formatKES, lastMonths, monthLabel, todayISO } from "@/lib/format";
import { PAY_METHODS, PAY_METHOD_LABEL, type PayMethod } from "@/lib/types";

export interface PayTenantOption {
  id: string;
  name: string;
  unitNumber: string;
  balance: number;
}

export function RecordPaymentButton({
  month,
  tenants,
  presetTenantId,
  label = "Record payment",
  variant = "primary",
  size = "md",
}: {
  month: string;
  tenants: PayTenantOption[];
  presetTenantId?: string;
  label?: string;
  variant?: "primary" | "outline" | "accent" | "secondary";
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const call = useApi();
  const [error, setError] = useState("");
  const [tenantId, setTenantId] = useState(presetTenantId ?? "");
  const [method, setMethod] = useState<PayMethod>("mpesa");
  const preset = tenants.find((t) => t.id === tenantId);
  const months = lastMonths(12, currentMonth()).reverse();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => {
          setError("");
          setTenantId(presetTenantId ?? "");
          setOpen(true);
        }}
      >
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record payment" description="Add a rent payment received from a tenant.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setError("");
            start(async () => {
              const res = await call("POST", "/payments", {
                tenantId: String(f.get("tenantId")),
                month: String(f.get("month")),
                amount: Number(f.get("amount")),
                method: String(f.get("method")) as PayMethod,
                referenceCode: String(f.get("referenceCode") ?? ""),
                paidOn: String(f.get("paidOn")),
              });
              if (!res.ok) return setError(res.error);
              toast.success("Payment recorded.");
              setOpen(false);
            });
          }}
        >
          <Field label="Tenant" htmlFor="pay-tenant">
            <Select id="pay-tenant" name="tenantId" required value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
              <option value="" disabled>
                Select tenant…
              </option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.unitNumber} · {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rent month" htmlFor="pay-month">
              <Select id="pay-month" name="month" defaultValue={month} required>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Amount (KES)"
              htmlFor="pay-amount"
              hint={preset && preset.balance > 0 ? `Balance for ${monthLabel(month)}: ${formatKES(preset.balance)}` : undefined}
            >
              <Input
                key={tenantId}
                id="pay-amount"
                name="amount"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                defaultValue={preset && preset.balance > 0 ? preset.balance : undefined}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Method" htmlFor="pay-method">
              <Select id="pay-method" name="method" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
                {PAY_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAY_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date received" htmlFor="pay-date">
              <Input id="pay-date" name="paidOn" type="date" required defaultValue={todayISO()} max={todayISO()} />
            </Field>
          </div>
          <Field
            label={method === "cash" ? "Reference (optional)" : method === "mpesa" ? "M-Pesa code" : "Bank reference"}
            htmlFor="pay-ref"
          >
            <Input
              id="pay-ref"
              name="referenceCode"
              required={method !== "cash"}
              maxLength={40}
              autoCapitalize="characters"
              placeholder={method === "mpesa" ? "e.g. SJK3L9M2QP" : ""}
            />
          </Field>
          {error && (
            <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save payment
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
