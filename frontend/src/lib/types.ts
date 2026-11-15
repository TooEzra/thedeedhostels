export const ROLES = ["tenant", "caretaker", "landlord"] as const;
export type Role = (typeof ROLES)[number];

export const UNIT_TYPES = ["bedsitter", "single", "one_bedroom", "two_bedroom"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];
export const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  bedsitter: "Bedsitter",
  single: "Single room",
  one_bedroom: "1 Bedroom",
  two_bedroom: "2 Bedroom",
};

export const PAY_METHODS = ["mpesa", "cash", "bank"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];
export const PAY_METHOD_LABEL: Record<PayMethod, string> = { mpesa: "M-Pesa", cash: "Cash", bank: "Bank" };

export const TICKET_CATEGORIES = ["plumbing", "electrical", "security", "noise", "other"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  security: "Security",
  noise: "Noise",
  other: "Other",
};

export const TICKET_STATUSES = ["open", "in_progress", "resolved"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const TICKET_PRIORITIES = ["low", "medium", "high"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export type PaymentStatus = "paid" | "partial" | "unpaid";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
}

export interface UnitDTO {
  _id: string;
  unitNumber: string;
  type: UnitType;
  monthlyRent: number;
  status: "occupied" | "vacant";
  occupant?: string;
}

export interface TenantDTO {
  _id: string;
  profileId: string;
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  unitId: string;
  unitNumber: string;
  rent: number;
  moveInDate: string;
  moveOutDate?: string;
  isActive: boolean;
}

export interface PaymentDTO {
  _id: string;
  tenantId: string;
  month: string;
  amount: number;
  method: PayMethod;
  referenceCode?: string;
  paidOn: string;
  recordedByName?: string;
}

export interface TicketReplyDTO {
  _id: string;
  authorName: string;
  authorRole: Role;
  message: string;
  createdAt: string;
}

export interface TicketDTO {
  _id: string;
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  category: TicketCategory;
  description: string;
  photoUrl?: string;
  priority: TicketPriority;
  status: TicketStatus;
  staffUnread: boolean;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  replies?: TicketReplyDTO[];
}

export interface AnnouncementDTO {
  _id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface RentRow {
  tenantId: string;
  name: string;
  phone: string;
  unitId: string;
  unitNumber: string;
  rent: number;
  paid: number;
  balance: number;
  status: PaymentStatus;
  daysOverdue: number;
  dueDate: string;
  lastPaidOn?: string;
}

// ---- API response shapes (mirror backend/src/services/*; the HTTP API is the contract between the two apps)

export interface MonthTotals {
  month: string;
  expected: number;
  collected: number;
  outstanding: number;
  tenants: number;
  paid: number;
  partial: number;
  unpaid: number;
}

export interface MonthPayment extends PaymentDTO {
  tenantName: string;
  unitNumber: string;
}

export interface LedgerMonth {
  month: string;
  rent: number;
  paid: number;
  balance: number;
  status: PaymentStatus;
  daysOverdue: number;
  dueDate: string;
  daysUntilDue: number;
  payments: PaymentDTO[];
}

export interface CaretakerDTO {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface RentOverview {
  month: string;
  rows: RentRow[];
  totals: MonthTotals;
  history: MonthTotals[];
  occupancy: { occupied: number; total: number; rate: number };
}

export interface RentRoll {
  month: string;
  rows: RentRow[];
  totals: MonthTotals;
  payments: MonthPayment[];
}

export interface TenantProfile {
  name: string;
  email: string;
  phone: string;
  moveInDate: string;
  unit: UnitDTO | null;
}

export interface ReceiptData {
  payment: PaymentDTO;
  unit: UnitDTO | null;
  tenantName: string;
}
