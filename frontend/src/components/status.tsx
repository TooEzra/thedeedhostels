import { Badge } from "@/components/ui";
import {
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
  type PaymentStatus,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types";

// Traffic-light system, used everywhere:
//   payments: green = paid, amber = partial, red = unpaid
//   priority: red = high, amber = medium, green = low
const PAY = { paid: ["success", "Paid"], partial: ["warning", "Partial"], unpaid: ["danger", "Unpaid"] } as const;

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const [tone, label] = PAY[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const tone = status === "open" ? "info" : status === "in_progress" ? "warning" : "success";
  return <Badge tone={tone}>{TICKET_STATUS_LABEL[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const tone = priority === "high" ? "danger" : priority === "medium" ? "warning" : "success";
  return <Badge tone={tone}>{TICKET_PRIORITY_LABEL[priority]}</Badge>;
}
