import type { Types } from "mongoose";
import { connectDB } from "../db";
import {
  Announcement,
  Payment,
  Profile,
  Property,
  Tenant,
  Ticket,
  TicketReply,
  Unit,
  type IAnnouncement,
  type IPayment,
  type IProfile,
  type IProperty,
  type ITenant,
  type ITicket,
  type ITicketReply,
  type IUnit,
  type WithId,
} from "../models";
import type {
  AnnouncementDTO,
  PaymentDTO,
  TenantDTO,
  TicketDTO,
  TicketPriority,
  TicketStatus,
  UnitDTO,
} from "../lib/types";

const iso = (d?: Date) => (d ? d.toISOString() : undefined);

export async function getProperty(): Promise<WithId<IProperty> | null> {
  await connectDB();
  return Property.findOne().lean<WithId<IProperty>>();
}

export async function listUnits(): Promise<UnitDTO[]> {
  await connectDB();
  const [units, tenants] = await Promise.all([
    Unit.find().lean<WithId<IUnit>[]>(),
    Tenant.find({ isActive: true }).lean<WithId<ITenant>[]>(),
  ]);
  const profiles = await Profile.find({ _id: { $in: tenants.map((t) => t.profileId) } }, "name").lean<WithId<IProfile>[]>();
  const pName = new Map(profiles.map((p) => [String(p._id), p.name]));
  const occupant = new Map(tenants.map((t) => [String(t.unitId), pName.get(String(t.profileId))]));
  return units
    .map((u) => ({
      _id: String(u._id),
      unitNumber: u.unitNumber,
      type: u.type,
      monthlyRent: u.monthlyRent,
      status: u.status,
      occupant: occupant.get(String(u._id)),
    }))
    .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }));
}

export async function listTenants(opts: { activeOnly?: boolean } = {}): Promise<TenantDTO[]> {
  await connectDB();
  const tenants = await Tenant.find(opts.activeOnly ? { isActive: true } : {}).lean<WithId<ITenant>[]>();
  const [profiles, units] = await Promise.all([
    Profile.find({ _id: { $in: tenants.map((t) => t.profileId) } }).lean<WithId<IProfile>[]>(),
    Unit.find({ _id: { $in: tenants.map((t) => t.unitId) } }).lean<WithId<IUnit>[]>(),
  ]);
  const pMap = new Map(profiles.map((p) => [String(p._id), p]));
  const uMap = new Map(units.map((u) => [String(u._id), u]));
  return tenants
    .map((t): TenantDTO => ({
      _id: String(t._id),
      profileId: String(t.profileId),
      name: pMap.get(String(t.profileId))?.name ?? "Unknown",
      email: pMap.get(String(t.profileId))?.email ?? "",
      phone: t.phone,
      idNumber: t.idNumber,
      unitId: String(t.unitId),
      unitNumber: uMap.get(String(t.unitId))?.unitNumber ?? "-",
      rent: uMap.get(String(t.unitId))?.monthlyRent ?? 0,
      moveInDate: t.moveInDate.toISOString(),
      moveOutDate: iso(t.moveOutDate),
      isActive: t.isActive,
    }))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }));
}

export async function getUnitForTenant(tenant: WithId<ITenant>): Promise<UnitDTO | null> {
  await connectDB();
  const u = await Unit.findById(tenant.unitId).lean<WithId<IUnit>>();
  if (!u) return null;
  return { _id: String(u._id), unitNumber: u.unitNumber, type: u.type, monthlyRent: u.monthlyRent, status: u.status };
}

export async function getPaymentForTenant(paymentId: string, tenantId: Types.ObjectId): Promise<PaymentDTO | null> {
  await connectDB();
  if (!/^[a-f0-9]{24}$/.test(paymentId)) return null;
  const p = await Payment.findOne({ _id: paymentId, tenantId }).lean<WithId<IPayment>>();
  if (!p) return null;
  const rec = p.recordedBy ? await Profile.findById(p.recordedBy, "name").lean<WithId<IProfile>>() : null;
  return {
    _id: String(p._id),
    tenantId: String(p.tenantId),
    month: p.month,
    amount: p.amount,
    method: p.method,
    referenceCode: p.referenceCode,
    paidOn: p.paidOn.toISOString(),
    recordedByName: rec?.name,
  };
}

async function tenantInfo(ids: Types.ObjectId[]) {
  const tenants = await Tenant.find({ _id: { $in: ids } }).lean<WithId<ITenant>[]>();
  const [profiles, units] = await Promise.all([
    Profile.find({ _id: { $in: tenants.map((t) => t.profileId) } }, "name").lean<WithId<IProfile>[]>(),
    Unit.find({ _id: { $in: tenants.map((t) => t.unitId) } }).lean<WithId<IUnit>[]>(),
  ]);
  const pMap = new Map(profiles.map((p) => [String(p._id), p.name]));
  const uMap = new Map(units.map((u) => [String(u._id), u.unitNumber]));
  return new Map(
    tenants.map((t) => [
      String(t._id),
      { name: pMap.get(String(t.profileId)) ?? "Unknown", unitNumber: uMap.get(String(t.unitId)) ?? "-" },
    ]),
  );
}

function toTicketDTO(
  t: WithId<ITicket>,
  info: Map<string, { name: string; unitNumber: string }>,
  replyCount: number,
  replies?: WithId<ITicketReply>[],
): TicketDTO {
  const i = info.get(String(t.tenantId));
  return {
    _id: String(t._id),
    tenantId: String(t.tenantId),
    tenantName: i?.name ?? "Unknown",
    unitNumber: i?.unitNumber ?? "-",
    category: t.category,
    description: t.description,
    photoUrl: t.photoUrl,
    priority: t.priority,
    status: t.status,
    staffUnread: t.staffUnread,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    replyCount,
    replies: replies?.map((r) => ({
      _id: String(r._id),
      authorName: r.authorName,
      authorRole: r.authorRole,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function listTickets(
  filter: { status?: TicketStatus; priority?: TicketPriority; tenantId?: Types.ObjectId } = {},
): Promise<TicketDTO[]> {
  await connectDB();
  const q: Record<string, unknown> = {};
  if (filter.status) q.status = filter.status;
  if (filter.priority) q.priority = filter.priority;
  if (filter.tenantId) q.tenantId = filter.tenantId;
  const tickets = await Ticket.find(q).sort({ updatedAt: -1 }).limit(200).lean<WithId<ITicket>[]>();
  if (tickets.length === 0) return [];
  const ids = tickets.map((t) => t._id);
  const [info, counts] = await Promise.all([
    tenantInfo(tickets.map((t) => t.tenantId)),
    TicketReply.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { ticketId: { $in: ids } } },
      { $group: { _id: "$ticketId", n: { $sum: 1 } } },
    ]),
  ]);
  const cMap = new Map(counts.map((c) => [String(c._id), c.n]));
  const rank: Record<TicketPriority, number> = { high: 0, medium: 1, low: 2 };
  return tickets
    .map((t) => toTicketDTO(t, info, cMap.get(String(t._id)) ?? 0))
    .sort((a, b) => {
      const resolved = Number(a.status === "resolved") - Number(b.status === "resolved");
      if (resolved) return resolved;
      return Number(b.staffUnread) - Number(a.staffUnread) || rank[a.priority] - rank[b.priority];
    });
}

/** Tickets with full reply threads for one tenant (tenant-facing, always scoped). */
export async function listTicketsWithReplies(tenantId: Types.ObjectId): Promise<TicketDTO[]> {
  await connectDB();
  const tickets = await Ticket.find({ tenantId }).sort({ createdAt: -1 }).lean<WithId<ITicket>[]>();
  if (tickets.length === 0) return [];
  const [info, replies] = await Promise.all([
    tenantInfo([tenantId]),
    TicketReply.find({ ticketId: { $in: tickets.map((t) => t._id) } }).sort({ createdAt: 1 }).lean<WithId<ITicketReply>[]>(),
  ]);
  return tickets.map((t) => {
    const mine = replies.filter((r) => String(r.ticketId) === String(t._id));
    return toTicketDTO(t, info, mine.length, mine);
  });
}

export async function getTicket(id: string): Promise<TicketDTO | null> {
  await connectDB();
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  const t = await Ticket.findById(id).lean<WithId<ITicket>>();
  if (!t) return null;
  const [info, replies] = await Promise.all([
    tenantInfo([t.tenantId]),
    TicketReply.find({ ticketId: t._id }).sort({ createdAt: 1 }).lean<WithId<ITicketReply>[]>(),
  ]);
  return toTicketDTO(t, info, replies.length, replies);
}

/** Sidebar badge: tickets that are still open or haven't been looked at by staff. */
export async function countAttention(): Promise<number> {
  await connectDB();
  return Ticket.countDocuments({ $or: [{ status: "open" }, { staffUnread: true }] });
}

export async function listAnnouncements(limit = 20): Promise<AnnouncementDTO[]> {
  await connectDB();
  const list = await Announcement.find().sort({ createdAt: -1 }).limit(limit).lean<WithId<IAnnouncement>[]>();
  return list.map((a) => ({
    _id: String(a._id),
    title: a.title,
    body: a.body,
    authorName: a.authorName,
    createdAt: a.createdAt.toISOString(),
  }));
}

export interface MonthPayment extends PaymentDTO {
  tenantName: string;
  unitNumber: string;
}

/** Every payment received for a given rent month, newest first (staff view). */
export async function listPaymentsForMonth(month: string): Promise<MonthPayment[]> {
  await connectDB();
  const payments = await Payment.find({ month }).sort({ paidOn: -1 }).lean<WithId<IPayment>[]>();
  if (payments.length === 0) return [];
  const [info, staff] = await Promise.all([
    tenantInfo([...new Set(payments.map((p) => String(p.tenantId)))].map((id) => payments.find((p) => String(p.tenantId) === id)!.tenantId)),
    Profile.find({ _id: { $in: payments.map((p) => p.recordedBy).filter(Boolean) } }, "name").lean<WithId<IProfile>[]>(),
  ]);
  const sMap = new Map(staff.map((s) => [String(s._id), s.name]));
  return payments.map((p) => ({
    _id: String(p._id),
    tenantId: String(p.tenantId),
    month: p.month,
    amount: p.amount,
    method: p.method,
    referenceCode: p.referenceCode,
    paidOn: p.paidOn.toISOString(),
    recordedByName: p.recordedBy ? sMap.get(String(p.recordedBy)) : undefined,
    tenantName: info.get(String(p.tenantId))?.name ?? "Unknown",
    unitNumber: info.get(String(p.tenantId))?.unitNumber ?? "-",
  }));
}

export interface CaretakerDTO {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export async function listCaretakers(): Promise<CaretakerDTO[]> {
  await connectDB();
  const list = await Profile.find({ role: "caretaker" }).sort({ createdAt: 1 }).lean<WithId<IProfile>[]>();
  return list.map((p) => ({
    _id: String(p._id),
    name: p.name,
    email: p.email,
    phone: p.phone,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  }));
}
