/**
 * Seed demo data: 1 property, 12 units, 1 landlord, 1 caretaker, 10 tenants,
 * 3 months of payments (paid / partial / unpaid mix), tickets, replies and notices.
 *
 * Usage:  npm run seed            (refuses to run if data already exists)
 *         npm run seed -- --force (WIPES the database first)
 */
import bcrypt from "bcryptjs";
import type { Model } from "mongoose";
import { connectDB } from "../src/db";
import {
  Announcement,
  Payment,
  Profile,
  Property,
  Tenant,
  Ticket,
  TicketReply,
  Unit,
  mongoose,
} from "../src/models";
import { currentMonth, formatKES, monthLabel, shiftMonth, todayISO } from "../src/lib/format";
import type { PayMethod, TicketCategory, TicketPriority, TicketStatus, UnitType } from "../src/lib/types";

// Typed as a plain list of `Model<any>` so calling a method on "one of the models" type-checks.
const ALL_MODELS: Model<any>[] = [Announcement, Payment, Profile, Property, Tenant, Ticket, TicketReply, Unit] as Model<any>[];

const DEMO_PASSWORD = "Deed@2026";
const force = process.argv.includes("--force");

const used = new Set<string>();
function mpesaCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  for (;;) {
    let s = "S" + "JKLMNPQRT"[Math.floor(Math.random() * 9)];
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    if (!used.has(s)) {
      used.add(s);
      return s;
    }
  }
}

const at = (iso: string, hours = 10) => new Date(`${iso}T${String(hours).padStart(2, "0")}:00:00+03:00`);
const daysAgo = (n: number, hours = 10) => {
  const d = new Date(`${todayISO()}T00:00:00+03:00`);
  d.setDate(d.getDate() - n);
  d.setHours(hours);
  return d;
};

async function main() {
  await connectDB();
  const db = mongoose.connection;
  const existing = await Profile.estimatedDocumentCount();
  if (existing > 0 && !force) {
    console.error(`Database "${db.name}" already has data. Re-run with  npm run seed -- --force  to WIPE it and reseed.`);
    process.exit(1);
  }
  if (force) {
    console.log(`Wiping "${db.name}"…`);
    await Promise.all(ALL_MODELS.map((m) => m.deleteMany({})));
  }
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()));

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---- Property & units
  const property = await Property.create({ name: "THE DEED HOSTELS", address: "Off Thika Road", city: "Nairobi" });
  const unitDefs: [string, UnitType, number][] = [
    ["A1", "single", 5000], ["A2", "single", 5000], ["A3", "single", 5000], ["A4", "single", 5000],
    ["B1", "bedsitter", 6500], ["B2", "bedsitter", 6500], ["B3", "bedsitter", 6500], ["B4", "bedsitter", 6500],
    ["C1", "one_bedroom", 9500], ["C2", "one_bedroom", 9500], ["C3", "one_bedroom", 9500], ["C4", "two_bedroom", 14000],
  ];
  const units = await Unit.insertMany(
    unitDefs.map(([unitNumber, type, monthlyRent]) => ({ propertyId: property._id, unitNumber, type, monthlyRent, status: "vacant" as const })),
  );
  const unitBy = new Map(units.map((u) => [u.unitNumber, u]));

  // ---- Staff
  const landlord = await Profile.create({ name: "James Ouma", email: "landlord@deedhostels.co.ke", phone: "0722000111", role: "landlord", passwordHash: hash });
  const caretaker = await Profile.create({ name: "Mary Atieno", email: "caretaker@deedhostels.co.ke", phone: "0733000222", role: "caretaker", passwordHash: hash });

  // ---- Tenants. `pay` = fraction of rent paid in [two months ago, last month, this month]
  const tenantDefs: { name: string; email: string; phone: string; unit: string; pay: [number, number, number]; method: PayMethod; split?: boolean }[] = [
    { name: "Wanjiku Kamau", email: "wanjiku.kamau@example.com", phone: "0712345678", unit: "A1", pay: [1, 1, 1], method: "mpesa" },
    { name: "Brian Otieno", email: "brian.otieno@example.com", phone: "0723456789", unit: "A2", pay: [1, 1, 1], method: "mpesa", split: true },
    { name: "Faith Chebet", email: "faith.chebet@example.com", phone: "0734567890", unit: "A3", pay: [1, 1, 1], method: "cash" },
    { name: "Kevin Mwangi", email: "kevin.mwangi@example.com", phone: "0745678901", unit: "A4", pay: [1, 1, 1], method: "mpesa" },
    { name: "Amina Hassan", email: "amina.hassan@example.com", phone: "0756789012", unit: "B1", pay: [1, 1, 1], method: "bank" },
    { name: "Peter Njoroge", email: "peter.njoroge@example.com", phone: "0767890123", unit: "B2", pay: [1, 1, 0.5], method: "mpesa" },
    { name: "Grace Akinyi", email: "grace.akinyi@example.com", phone: "0778901234", unit: "B3", pay: [1, 0.5, 0], method: "mpesa" },
    { name: "Samuel Kiprop", email: "samuel.kiprop@example.com", phone: "0789012345", unit: "C1", pay: [1, 0, 0], method: "mpesa" },
    { name: "Lucy Wambui", email: "lucy.wambui@example.com", phone: "0790123456", unit: "C2", pay: [1, 1, 0], method: "mpesa" },
    { name: "David Mutua", email: "david.mutua@example.com", phone: "0701234567", unit: "C3", pay: [1, 1, 1], method: "mpesa" },
  ];

  const now = currentMonth();
  const months = [shiftMonth(now, -2), shiftMonth(now, -1), now];
  const today = Number(todayISO().slice(8, 10));
  const tenants: Record<string, InstanceType<typeof Tenant>> = {};
  const profiles: Record<string, InstanceType<typeof Profile>> = {};

  for (const [i, t] of tenantDefs.entries()) {
    const unit = unitBy.get(t.unit)!;
    const profile = await Profile.create({ name: t.name, email: t.email, phone: t.phone, role: "tenant", passwordHash: hash });
    const tenant = await Tenant.create({
      profileId: profile._id,
      unitId: unit._id,
      phone: t.phone,
      idNumber: String(30000000 + i * 1234567),
      moveInDate: at(`${shiftMonth(now, -(4 + (i % 5)))}-01`, 9),
    });
    unit.status = "occupied";
    await unit.save();
    tenants[t.name] = tenant;
    profiles[t.name] = profile;

    for (const [mi, month] of months.entries()) {
      const fraction = t.pay[mi];
      if (fraction === 0) continue;
      const total = Math.round(unit.monthlyRent * fraction);
      const installments = t.split && fraction === 1 ? [Math.round(total * 0.6), total - Math.round(total * 0.6)] : [total];
      for (const [k, amount] of installments.entries()) {
        let day = 1 + ((i + k * 6) % 5) + (i === 9 ? 7 : 0); // David always pays late
        if (month === now) day = Math.min(day, today);
        await Payment.create({
          tenantId: tenant._id,
          month,
          amount,
          method: t.method,
          referenceCode: t.method === "cash" ? undefined : t.method === "bank" ? `BNK${mpesaCode().slice(2, 8)}` : mpesaCode(),
          paidOn: at(`${month}-${String(day).padStart(2, "0")}`, 11 + k),
          recordedBy: caretaker._id,
        });
      }
    }
  }

  // ---- Tickets
  const mk = async (
    who: string,
    category: TicketCategory,
    description: string,
    priority: TicketPriority,
    status: TicketStatus,
    ageDays: number,
    staffUnread: boolean,
    replies: [("staff" | "tenant"), string, number][] = [],
  ) => {
    const ticket = await Ticket.create({
      tenantId: tenants[who]._id,
      category,
      description,
      priority,
      status,
      staffUnread,
      createdAt: daysAgo(ageDays),
      updatedAt: daysAgo(Math.max(0, ageDays - 1)),
    });
    for (const [from, message, after] of replies) {
      const author = from === "staff" ? caretaker : profiles[who];
      await TicketReply.create({
        ticketId: ticket._id,
        authorId: author._id,
        authorName: author.name,
        authorRole: author.role,
        message,
        createdAt: daysAgo(Math.max(0, ageDays - after), 14),
      });
    }
  };

  await mk("Wanjiku Kamau", "plumbing", "The kitchen tap in my room has been leaking since yesterday and the floor is getting wet.", "high", "open", 0, true);
  await mk("Faith Chebet", "electrical", "The socket next to my bed sparks when I plug anything in. I have stopped using it.", "high", "in_progress", 3, false, [
    ["staff", "Thanks Faith, please don't use that socket. The electrician will come tomorrow morning.", 3],
    ["tenant", "Okay, I will be home from 9am.", 2],
  ]);
  await mk("Peter Njoroge", "noise", "There is very loud music from the unit next door after 11pm on weekends.", "medium", "open", 2, true);
  await mk("Grace Akinyi", "security", "The padlock on the main gate is broken and the gate does not lock at night.", "medium", "resolved", 9, false, [
    ["staff", "We have replaced the padlock today. Please let us know if there is any other issue.", 8],
    ["tenant", "Confirmed, it is locking properly now. Thank you!", 7],
  ]);
  await mk("Samuel Kiprop", "other", "Could the corridor outside C1 be repainted? The wall is peeling badly.", "low", "open", 5, false);

  // ---- Notices
  await Announcement.create({ title: "Water maintenance on Saturday", body: "Water will be off from 9am to 2pm this Saturday while the main tank is cleaned. Please store enough water the night before.", authorId: caretaker._id, authorName: caretaker.name, createdAt: daysAgo(4) });
  await Announcement.create({ title: "Rent due date reminder", body: "Rent is due by the 5th of every month. Please send your M-Pesa confirmation to the caretaker so your payment is recorded the same day.", authorId: landlord._id, authorName: landlord.name, createdAt: daysAgo(12) });

  console.log("\nSeeded THE DEED HOSTELS");
  console.log(`  Property: 1 · Units: ${units.length} (2 vacant) · Tenants: ${tenantDefs.length} · Tickets: 5 · Notices: 2`);
  console.log(`  Months of payments: ${months.map((m) => monthLabel(m)).join(", ")}`);
  console.log(`  Example unit rent: ${formatKES(5000)}`);
  console.log("\nSign-in (all accounts use the same demo password):");
  console.log(`  Landlord  landlord@deedhostels.co.ke   ${DEMO_PASSWORD}`);
  console.log(`  Caretaker caretaker@deedhostels.co.ke  ${DEMO_PASSWORD}`);
  console.log(`  Tenant    wanjiku.kamau@example.com    ${DEMO_PASSWORD}  (paid up)`);
  console.log(`  Tenant    samuel.kiprop@example.com    ${DEMO_PASSWORD}  (2 months behind)`);
  console.log("\nChange these passwords before using real data.\n");
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
