"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/client-api";
import { useApi } from "@/lib/use-api";
import { Button, Card, Field, Select, Textarea } from "@/components/ui";
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABEL,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUSES,
  TICKET_STATUS_LABEL,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types";

export function NewTicketForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const call = useApi();
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold">New request or complaint</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tell the caretaker what needs attention. You can track the reply below.</p>
      <form
        ref={ref}
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const photo = f.get("photo");
          if (photo instanceof File && photo.size > 5 * 1024 * 1024) return setError("Photo is too large (max 5MB).");
          setError("");
          start(async () => {
            const res = await call("POST", "/me/tickets", f);
            if (!res.ok) return setError(res.error);
            toast.success("Sent to the caretaker.");
            ref.current?.reset();
            setFileName("");
          });
        }}
      >
        <Field label="Category" htmlFor="tk-cat">
          <Select id="tk-cat" name="category" required defaultValue="">
            <option value="" disabled>
              What is it about?
            </option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {TICKET_CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Describe the issue" htmlFor="tk-desc">
          <Textarea id="tk-desc" name="description" required minLength={10} maxLength={1500} placeholder="e.g. The kitchen tap in my room has been leaking since yesterday." />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border bg-card px-3.5 text-sm font-medium hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
            <ImagePlus className="h-4 w-4" />
            <span className="max-w-[12rem] truncate">{fileName || "Add photo (optional)"}</span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="urgent" className="h-4 w-4 accent-[hsl(var(--danger))]" />
            This is urgent
          </label>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send request
        </Button>
      </form>
    </Card>
  );
}

export function ReplyForm({ ticketId, scope, placeholder = "Write a reply…" }: { ticketId: string; scope: "staff" | "tenant"; placeholder?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const call = useApi();
  const [error, setError] = useState("");
  return (
    <form
      ref={ref}
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const message = String(new FormData(e.currentTarget).get("message") ?? "");
        setError("");
        start(async () => {
          const res = await call("POST", `${scope === "staff" ? "/tickets" : "/me/tickets"}/${ticketId}/replies`, { message });
          if (!res.ok) return setError(res.error);
          ref.current?.reset();
        });
      }}
    >
      <label htmlFor={`reply-${ticketId}`} className="sr-only">
        Reply
      </label>
      <Textarea id={`reply-${ticketId}`} name="message" required maxLength={1500} placeholder={placeholder} className="min-h-[80px]" />
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </div>
    </form>
  );
}

export function TicketControls({ ticketId, status, priority }: { ticketId: string; status: TicketStatus; priority: TicketPriority }) {
  const [pending, start] = useTransition();
  const call = useApi();
  const change = (patch: { status?: TicketStatus; priority?: TicketPriority }) =>
    start(async () => {
      const res = await call("PATCH", `/tickets/${ticketId}`, patch);
      if (res.ok) toast.success("Updated.");
      else toast.error(res.error);
    });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Status" htmlFor="tc-status">
        <Select id="tc-status" value={status} disabled={pending} onChange={(e) => change({ status: e.target.value as TicketStatus })}>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TICKET_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Priority" htmlFor="tc-priority">
        <Select id="tc-priority" value={priority} disabled={pending} onChange={(e) => change({ priority: e.target.value as TicketPriority })}>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {TICKET_PRIORITY_LABEL[p]}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

/** Clears the ticket's "unread" flag once the caretaker has opened it. */
export function MarkRead({ ticketId, unread }: { ticketId: string; unread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!unread) return;
    apiRequest("POST", `/tickets/${ticketId}/read`).then(() => router.refresh());
  }, [ticketId, unread, router]);
  return null;
}
