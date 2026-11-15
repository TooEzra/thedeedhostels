import type { Types } from "mongoose";
import { connectDB } from "../db";
import {
  Payment,
  Profile,
  Tenant,
  Unit,
  type IPayment,
  type IProfile,
  type ITenant,
  type IUnit,
  type WithId,
} from "../models";
import {
  currentMonth,
  dueDateFor,
  daysOverdue,
  daysUntilDue,
  lastMonths,
  monthEnd,
  monthOf,
  monthStart,
  shiftMonth,
} from "../lib/format";
import type { PaymentDTO, PaymentStatus, RentRow } from "../lib/types";

export function statusFor(paid: number, rent: number): PaymentStatus {
  if (paid >= rent) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

/**
 * Rent roll for one month: every tenant who was in residence during `month`,
 * their rent (the unit's current monthly rent), what they paid and the balance.
 */
export async function getRentRows(month: string): Promise<RentRow[]> {
  await connectDB();
  const start = monthStart(month);
  const end = monthEnd(month);
  const tenants = await Tenant.find({
    moveInDate: { $lte: end },
    $or: [{ isActive: true }, { moveOutDate: { $gte: start } }],
  }).lean<WithId<ITenant>[]>();
  if (tenants.length === 0) return [];

  const [profiles, units, sums] = await Promise.all([
    Profile.find({ _id: { $in: tenants.map((t) => t.profileId) } }).lean<WithId<IProfile>[]>(),
    Unit.find({ _id: { $in: tenants.map((t) => t.unitId) } }).lean<WithId<IUnit>[]>(),
    Payment.aggregate<{ _id: Types.ObjectId; paid: number; last: Date }>([
      { $match: { month } },
      { $group: { _id: "$tenantId", paid: { $sum: "$amount" }, last: { $max: "$paidOn" } } },
    ]),
  ]);

  const pMap = new Map(profiles.map((p) => [String(p._id), p]));
  const uMap = new Map(units.map((u) => [String(u._id), u]));
  const sMap = new Map(sums.map((s) => [String(s._id), s]));
  const overdue = daysOverdue(month);
  const dueISO = dueDateFor(month).toISOString();

  return tenants
    .map((t): RentRow => {
      const unit = uMap.get(String(t.unitId));
      const rent = unit?.monthlyRent ?? 0;
      const s = sMap.get(String(t._id));
      const paid = s?.paid ?? 0;
      const status = statusFor(paid, rent);
      return {
        tenantId: String(t._id),
        name: pMap.get(String(t.profileId))?.name ?? "Unknown",
        phone: t.phone,
        unitId: String(t.unitId),
        unitNumber: unit?.unitNumber ?? "-",
        rent,
        paid,
        balance: Math.max(0, rent - paid),
        status,
        daysOverdue: status === "paid" ? 0 : overdue,
        dueDate: dueISO,
        lastPaidOn: s?.last ? s.last.toISOString() : undefined,
      };
    })
    .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }));
}

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

export function totalsFromRows(month: string, rows: RentRow[]): MonthTotals {
  return {
    month,
    expected: rows.reduce((a, r) => a + r.rent, 0),
    collected: rows.reduce((a, r) => a + r.paid, 0),
    outstanding: rows.reduce((a, r) => a + r.balance, 0),
    tenants: rows.length,
    paid: rows.filter((r) => r.status === "paid").length,
    partial: rows.filter((r) => r.status === "partial").length,
    unpaid: rows.filter((r) => r.status === "unpaid").length,
  };
}

export async function getHistory(n: number, from: string = currentMonth()): Promise<MonthTotals[]> {
  const months = lastMonths(n, from);
  const all = await Promise.all(months.map((m) => getRentRows(m)));
  return months.map((m, i) => totalsFromRows(m, all[i]));
}

export async function getOccupancy(): Promise<{ occupied: number; total: number; rate: number }> {
  await connectDB();
  const [total, occupied] = await Promise.all([
    Unit.countDocuments({}),
    Unit.countDocuments({ status: "occupied" }),
  ]);
  return { occupied, total, rate: total ? Math.round((occupied / total) * 100) : 0 };
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

/** A tenant's month-by-month ledger (newest first), from move-in (max 24 months back) to now. */
export async function getTenantLedger(tenant: WithId<ITenant>): Promise<LedgerMonth[]> {
  await connectDB();
  const [unit, payments, staff] = await Promise.all([
    Unit.findById(tenant.unitId).lean<WithId<IUnit>>(),
    Payment.find({ tenantId: tenant._id }).sort({ paidOn: -1 }).lean<WithId<IPayment>[]>(),
    Profile.find({}, "name").lean<WithId<IProfile>[]>(),
  ]);
  const names = new Map(staff.map((p) => [String(p._id), p.name]));
  const rent = unit?.monthlyRent ?? 0;
  const now = currentMonth();
  const first = [monthOf(tenant.moveInDate), shiftMonth(now, -23)].sort().at(-1)!;

  const byMonth = new Map<string, PaymentDTO[]>();
  for (const p of payments) {
    const dto: PaymentDTO = {
      _id: String(p._id),
      tenantId: String(p.tenantId),
      month: p.month,
      amount: p.amount,
      method: p.method,
      referenceCode: p.referenceCode,
      paidOn: p.paidOn.toISOString(),
      recordedByName: p.recordedBy ? names.get(String(p.recordedBy)) : undefined,
    };
    byMonth.set(p.month, [...(byMonth.get(p.month) ?? []), dto]);
  }

  const out: LedgerMonth[] = [];
  for (let m = first; m <= now; m = shiftMonth(m, 1)) {
    const list = byMonth.get(m) ?? [];
    const paid = list.reduce((a, p) => a + p.amount, 0);
    const status = statusFor(paid, rent);
    out.push({
      month: m,
      rent,
      paid,
      balance: Math.max(0, rent - paid),
      status,
      daysOverdue: status === "paid" ? 0 : daysOverdue(m),
      dueDate: dueDateFor(m).toISOString(),
      daysUntilDue: daysUntilDue(m),
      payments: list,
    });
  }
  return out.reverse();
}
